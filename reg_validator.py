import pandas as pd

def update_students_file():
    try:
        # Load data from both Excel files
        students_df = pd.read_excel('students.xlsx')
        submissions_df = pd.read_excel('submissions.xlsx')

        # Extract roll numbers from submissions.xlsx
        valid_roll_numbers = submissions_df['Roll Number'].astype(str).tolist()

        # Filter students who are in submissions.xlsx
        updated_students_df = students_df[students_df['Roll Number'].astype(str).isin(valid_roll_numbers)]

        # Save the updated data back to students.xlsx
        updated_students_df.to_excel('students.xlsx', index=False)
        print("Students.xlsx updated successfully. Invalid roll numbers removed.")
    
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    update_students_file()
