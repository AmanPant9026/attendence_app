import sys
import os
import cv2
import pymysql
import numpy as np
from io import BytesIO
from PIL import Image
from datetime import datetime

def connect_to_db():
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='IHxalb#2',
            database='attendancesystem',
            cursorclass=pymysql.cursors.DictCursor
        )
        print("Database connection successful")
        return connection
    except pymysql.MySQLError as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def get_images_from_db(cursor):
    cursor.execute("SELECT id, image, student_id, course_id FROM images")
    db_images = cursor.fetchall()
    print("Images from database:", db_images)
    return db_images

def blob_to_image(blob_data):
    image_stream = BytesIO(blob_data)
    image = Image.open(image_stream)
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

orb = cv2.ORB_create()

def get_orb_features(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    keypoints, descriptors = orb.detectAndCompute(gray, None)
    return keypoints, descriptors

def match_images(keypoints1, descriptors1, keypoints2, descriptors2):
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = bf.knnMatch(descriptors1, descriptors2, k=2)

    good_matches = [m for m, n in matches if m.distance < 0.75 * n.distance]

    if len(good_matches) > 10:
        src_pts = np.float32([keypoints1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([keypoints2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

        _, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        matches_mask = mask.ravel().tolist()

        inliers = sum(matches_mask)
        return inliers

    return 0

def process_video_and_compare(video_path, course_id):
    if not os.path.exists(video_path):
        print(f"Error: The file {video_path} does not exist.")
        return

    db_connection = connect_to_db()
    cursor = db_connection.cursor()

    try:
        db_images = get_images_from_db(cursor)

        db_image_features = []
        for image_data in db_images:
            image_id = image_data['id']
            student_id = image_data['student_id']
            image_blob = image_data['image']
            db_image = blob_to_image(image_blob)
            keypoints, descriptors = get_orb_features(db_image)
            if descriptors is not None:
                db_image_features.append((image_id, student_id, course_id, keypoints, descriptors))

        cap = cv2.VideoCapture(video_path)
        frame_number = 0

        if not cap.isOpened():
            print("Error: Cannot open video.")
            return

        today_date = datetime.today().strftime('%Y-%m-%d')

        while True:
            ret, frame = cap.read()

            if not ret:
                break

            frame_number += 1
            print(f"Processing frame {frame_number}...")

            frame_keypoints, frame_descriptors = get_orb_features(frame)

            if frame_descriptors is None:
                continue

            matched_student_ids = set()
            for image_id, student_id, course_id, db_keypoints, db_descriptors in db_image_features:
                inliers = match_images(frame_keypoints, frame_descriptors, db_keypoints, db_descriptors)

                print(f"Inliers for student {student_id}: {inliers}")

                if inliers > 25:
                    matched_student_ids.add(student_id)

            for student_id in matched_student_ids:
                try:
                    update_query = """INSERT INTO attendance (student_id, course_id, date, status)
                                      VALUES (%s, %s, %s, 'Present')
                                      ON DUPLICATE KEY UPDATE status = 'Present';"""
                    print(f"Executing query: {update_query} with values {(student_id, course_id, today_date)}")
                    cursor.execute(update_query, (student_id, course_id, today_date))
                    db_connection.commit()
                    print(f"Updated attendance for student ID: {student_id} for course ID: {course_id} on date {today_date}")
                except pymysql.MySQLError as e:
                    db_connection.rollback()
                    print(f"Database error: {e}")
                except Exception as e:
                    print(f"Unexpected error: {e}")

    finally:
        cap.release()
        cursor.close()
        db_connection.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python video_compare.py <video_path> <course_id>")
    else:
        video_path = sys.argv[1]
        course_id = sys.argv[2]
        process_video_and_compare(video_path, course_id)
