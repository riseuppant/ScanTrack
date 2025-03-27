import pandas as pd

def remove_duplicates(file_path):
    try:
        # Load Excel data
        df = pd.read_excel(file_path)

        # Check for necessary columns
        required_columns = {'Name', 'Roll Number', 'NSS Group'}
        if not required_columns.issubset(df.columns):
            print(f"Missing one or more required columns: {required_columns}")
            return

        # Normalize Roll Number for case insensitivity
        df['Roll Number'] = df['Roll Number'].astype(str).str.strip().str.lower()

        # Find duplicates based on Roll Number
        duplicates = df[df.duplicated(subset='Roll Number', keep=False)]

        if duplicates.empty:
            print("✅ No duplicates found.")
            return

        print("🚨 Duplicate entries found:")
        print(duplicates)

        # Remove duplicates by keeping the first occurrence
        cleaned_df = df.drop_duplicates(subset='Roll Number', keep='first')

        # Save cleaned data to the same file
        cleaned_df.to_excel(file_path, index=False)
        print("✅ Duplicates removed. File updated successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")

# Example usage
remove_duplicates('students.xlsx')
