import pandas as pd
import qrcode
import os
import re

# Load Excel file
excel_file = "students.xlsx"
df = pd.read_excel(excel_file)

# Output folder for QR codes
output_folder = "qr_codes"
os.makedirs(output_folder, exist_ok=True)

# Define the event name (modify this as needed)
event_name = "Sudha Vargese Session"

# Generate QR code for each student
for index, row in df.iterrows():
    name = str(row['Name']).strip()
    roll_number = str(row['Roll Number']).strip()
    nss_group = str(row['NSS Group']).strip()

    # Check for missing data
    if not name or not roll_number or not nss_group:
        print(f"Skipping row {index+1}: Missing data")
        continue

    # Clean name for filename (remove invalid characters)
    clean_name = re.sub(r'[<>:"/\\|?*]', '', name.strip())

    # Prevent overwriting by adding roll number if name is duplicated
    file_path = os.path.join(output_folder, f"{clean_name}{roll_number}.png")

    # Data for QR including event name
    qr_data = f"{name},{roll_number},{nss_group},{event_name}"

    # Generate and save QR code
    qr = qrcode.make(qr_data)
    qr.save(file_path)
    print(f"Saved QR for {name} ({roll_number}) - Event: {event_name}")

print("All QR codes generated successfully.")
