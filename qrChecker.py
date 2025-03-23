import pandas as pd
import os
import re

# Load Excel file
excel_file = "students.xlsx"
df = pd.read_excel(excel_file)

# Folder where QR codes are saved
output_folder = "qr_codes"

# Track missing entries
missing_entries = []

# Check for each student
for index, row in df.iterrows():
    name = str(row['Name']).strip()
    roll_number = str(row['Roll Number']).strip()

    # Clean name for filename (to match QR files)
    clean_name = re.sub(r'[<>:"/\\|?*]', '', name.replace(" ", "_"))
    qr_filename = f"{clean_name}_{roll_number}.png"
    qr_path = os.path.join(output_folder, qr_filename)

    # Check if QR exists
    if not os.path.isfile(qr_path):
        missing_entries.append({'Name': name, 'Roll Number': roll_number})

# Save missing entries to a CSV
if missing_entries:
    missing_df = pd.DataFrame(missing_entries)
    missing_df.to_csv('missing_qr_codes.csv', index=False)
    print("Missing QR code details saved to 'missing_qr_codes.csv'")
else:
    print("All QR codes are present.")
