import pandas as pd
import os
import re

def clean_filename(name):
    # Clean and sanitize names to avoid invalid characters
    return re.sub(r'[<>:"/\\|?*]', '', str(name).strip().replace(" ", "_"))

def check_qr_codes(excel_file, output_folder):
    try:
        # Load Excel data
        df = pd.read_excel(excel_file)
        missing_entries = []

        # Ensure the output folder exists
        if not os.path.exists(output_folder):
            print("QR Code folder not found. Please generate QR codes first.")
            return

        # Check for necessary columns
        required_columns = {'Name', 'Roll Number', 'NSS Group'}
        if not required_columns.issubset(df.columns):
            print(f"Missing one or more required columns: {required_columns}")
            return

        # Check for each student
        for index, row in df.iterrows():
            name = row.get('Name')
            roll_number = str(row.get('Roll Number')).strip()
            nss_group = row.get('NSS Group')

            # Validate data presence
            if pd.isnull(name) or pd.isnull(roll_number) or pd.isnull(nss_group):
                print(f"Skipping Row {index+1}: Missing data")
                continue

            # Generate QR filename
            clean_name = clean_filename(name)
            qr_filename = f"{clean_name}{roll_number}.png"
            qr_path = os.path.join(output_folder, qr_filename)

            # Check if QR exists
            if not os.path.isfile(qr_path):
                missing_entries.append({'Name': name, 'Roll Number': roll_number, 'NSS Group': nss_group})
                print(f"QR Missing for: {name} ({roll_number})")

        # Save missing entries if any
        if missing_entries:
            pd.DataFrame(missing_entries).to_csv('missing_qr_codes.csv', index=False)
            print("Missing QR code details saved to 'missing_qr_codes.csv'.")
        else:
            print("✅ All QR codes are present.")
    
    except Exception as e:
        print(f"An error occurred: {e}")

# Example usage
check_qr_codes('students.xlsx', 'qr_codes')
