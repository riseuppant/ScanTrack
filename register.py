import pandas as pd

def add_nss_groups(main_file, nss_file):
    # Load both Excel files
    main_df = pd.read_excel(main_file)
    nss_df = pd.read_excel(nss_file)

    # Ensure case-insensitivity for Roll Numbers
    main_df['Roll Number'] = main_df['Roll Number'].str.strip().str.lower()
    nss_df['Roll Number'] = nss_df['Roll Number'].str.strip().str.lower()

    # Create a dictionary from the NSS DataFrame
    nss_dict = dict(zip(nss_df['Roll Number'], nss_df['NSS Group']))

    # Apply the dictionary lookup to fill in NSS Group
    main_df['NSS Group'] = main_df['Roll Number'].map(nss_dict)

    # Save back to the main file
    main_df.to_excel(main_file, index=False)
    print("NSS Groups added successfully.")

# Example usage
add_nss_groups(r"students.xlsx", r"Allstudents.xlsx")
