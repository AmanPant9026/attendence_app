import pymysql
import cv2
import sys

# Function to capture image from webcam
def capture_image():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open video device")
        return None

    ret, frame = cap.read()
    if not ret:
        print("Error: Could not read frame")
        return None

    cap.release()
    img_path = "captured_image.jpg"
    cv2.imwrite(img_path, frame)
    return img_path

# Function to convert image file to binary
def convert_to_binary(filename):
    with open(filename, 'rb') as file:
        binary_data = file.read()
    return binary_data

# Function to insert image binary and enrollment into MySQL database
def insert_image_to_db(enrollment, image_binary):
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='IHxalb#2',
        database='attendanceSystem'
    )
    try:
        cursor = conn.cursor()

        # SQL query to insert image and enrollment into the database
        sql_insert_query = """INSERT INTO images (image, student_id) VALUES (%s, %s)"""
        cursor.execute(sql_insert_query, (image_binary, enrollment))

        conn.commit()
        print("Image inserted successfully into database")

    except pymysql.MySQLError as error:
        print(f"Failed to insert image into MySQL table: {error}")

    finally:
        if conn:
            cursor.close()
            conn.close()

# Main execution block
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python upload_image.py <student_id>")
        sys.exit(1)

    student_id = sys.argv[1]  # Get student ID from command line arguments
    img_path = capture_image()

    if img_path:
        binary_image = convert_to_binary(img_path)
        insert_image_to_db(student_id, binary_image)
