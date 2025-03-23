# QR Code Event Management System

## Overview

This project is a simple QR Code-based event registration and check-in system using HTML, JavaScript, Node.js, and Python. It allows event organizers to generate QR codes, verify registration, and monitor attendance using an Excel file.

## Features

- QR Code Generation using `qr.py`
- QR Code Check using `qrChecker.py`
- Frontend QR Code Scanner using HTML5 QR Code Library
- Registration and Check-In Management using Excel files
- Real-time Notifications for Valid and Invalid Check-Ins
- Support for Sound Alerts on Successful or Failed Scans

## Installation

### Prerequisites

Ensure you have the following installed:

- Node.js
- Python
- npm
- ExcelJS
- Express.js
- moment.js
- QR Code Libraries

### Clone the Repository

```bash
git clone <repo_link>
cd project-directory
```

### Install Backend Dependencies

```bash
npm install express exceljs moment
```

### Install Python Libraries

```bash
pip install qrcode[pil] pandas
```

## Usage

### 1. Generate QR Codes

To generate QR Codes, run the `qr.py` file. The codes will be saved in the `QR_Codes` folder.

```bash
python qr.py
```

### 2. Check for Missing QR Codes

To find any missing QR codes, run the `qrChecker.py` script. It will log missing codes in `missing_qr.csv`.

```bash
python qrChecker.py
```

### 3. Test Invalid QR Codes

A folder named `QR_new` contains test QR codes that do not match the actual event name. This ensures that if someone attempts to check in using a QR code from another event, it will be rejected.

### 4. Configure the Event Name

If you'd like to change the event name, go to **line 195 in ****`index.js`** and update the name as needed.

### 5. Start the Server

Start the Node.js server using the following command:

```bash
node server.js
```

The server will run at `http://localhost:3000`

### 6. Access the Web Application

Open your browser and go to:

```
http://localhost:3000
```

## Project Structure

```
├── public
│   ├── index.html       # Frontend UI
│   ├── index.js         # Frontend JavaScript
├── qr.py                 # QR Code Generator
├── qrChecker.py          # QR Code Checker
├── server.js             # Backend Server
├── students.xlsx         # Student Registration Data
├── QR_new                # Test QR Codes (Invalid Event Names)
└── README.md             # Project Documentation
```

## Contribution

Feel free to contribute by submitting issues or pull requests.

