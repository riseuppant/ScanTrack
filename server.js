const express = require("express");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const app = express();
const moment = require("moment");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const EXCEL_FILE = "students.xlsx";

// Ensure Excel File Exists
async function ensureExcelFile() {
    const workbook = new ExcelJS.Workbook();
    if (!fs.existsSync(EXCEL_FILE)) {
      const worksheet = workbook.addWorksheet("Sheet1");
      worksheet.columns = [
        { header: "Name", key: "name", width: 20 },
        { header: "Roll Number", key: "rollNumber", width: 15 },
        { header: "NSS Group", key: "nssGroup", width: 15 },
        { header: "Check-In Status", key: "status", width: 15 },
        { header: "Check-In Time", key: "checkInTime", width: 20 }
      ];
      await workbook.xlsx.writeFile(EXCEL_FILE);
    }
  }
ensureExcelFile();

// Update the Excel file structure to include timestamp
async function updateExcelStructure() {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(EXCEL_FILE);
      const worksheet = workbook.getWorksheet("Sheet1");
      
      // Check if the timestamp column already exists
      const headerRow = worksheet.getRow(1);
      let hasTimestamp = false;
      headerRow.eachCell((cell) => {
        if (cell.value === "Check-In Time") {
          hasTimestamp = true;
        }
      });
      
      if (!hasTimestamp) {
        // Add the timestamp column if it doesn't exist
        worksheet.getColumn(5).header = "Check-In Time";
        worksheet.getColumn(5).width = 20;
        // Save the updated structure
        await workbook.xlsx.writeFile(EXCEL_FILE);
        console.log("Excel structure updated to include timestamp column");
      }
    } catch (error) {
      console.error("Error updating Excel structure:", error);
    }
  }
  

// Call this function when the server starts
updateExcelStructure();

// Route to check if the roll number exists in Excel and record timestamp
app.post("/check_registration", async (req, res) => {
  try {
      const qrData = req.body.rollNumber || "";
      const scannedEvent = req.body.event || "";
      const expectedEvent = req.body.expectedEvent || "";
      
      // Handle both formats: either just roll number or comma-separated data
      let rollNumber, name, nssGroup, event;
      if (qrData.includes(",")) {
          // Format: name,rollNumber,nssGroup,event
          [name, rollNumber, nssGroup, event] = qrData.split(",").map(item => item.trim());
      } else {
          // Format: just roll number
          rollNumber = qrData.trim();
          event = scannedEvent;
      }

      if (!rollNumber) {
          return res.status(400).json({
              registered: false,
              message: "Invalid QR Code Data"
          });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(EXCEL_FILE);
      const worksheet = workbook.getWorksheet("Sheet1");
      
      let found = false;
      let alreadyCheckedIn = false;
      let studentName = "";
      let studentNssGroup = "";
      
      worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip Header
          
          if (row.getCell(2).value == rollNumber) {
              found = true;
              studentName = row.getCell(1).value;
              studentNssGroup = row.getCell(3).value;
              
              // Check if already checked in
              if (row.getCell(4).value === "Checked In") {
                  alreadyCheckedIn = true;
              }
              return;
          }
      });

      // Check if event matches the expected event
      if (found && event && expectedEvent && event !== expectedEvent) {
          return res.json({
              registered: true,
              eventMismatch: true,
              name: studentName,
              nssGroup: studentNssGroup,
              registeredEvent: event,
              message: "You have attended the wrong event"
          });
      }

      if (!found) {
          return res.json({
              registered: false,
              message: "You have not registered for the event"
          });
      }

      if (alreadyCheckedIn) {
          return res.json({
              registered: true,
              alreadyCheckedIn: true,
              name: studentName,
              nssGroup: studentNssGroup,
              message: "Already Checked In"
          });
      }

      // Current timestamp
      const timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
      
      // Update check-in status and timestamp
      worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip Header
          if (row.getCell(2).value == rollNumber) {
              row.getCell(4).value = "Checked In";
              row.getCell(5).value = timestamp; // Record the timestamp
              return;
          }
      });

      await workbook.xlsx.writeFile(EXCEL_FILE);
      
      return res.json({
          registered: true,
          name: studentName,
          nssGroup: studentNssGroup,
          checkInTime: timestamp,
          message: "Check-In Successful"
      });
  } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({
          registered: false,
          message: "Internal Server Error"
      });
  }
});


// Keep the original log_scan endpoint for backward compatibility
app.post("/log_scan", async (req, res) => {
    try {
      const qrData = req.body.qrData;
      let rollNumber, name, nssGroup;
      
      if (qrData.includes(",")) {
        [name, rollNumber, nssGroup] = qrData.split(",").map(item => item.trim());
      } else {
        // If it's just a roll number
        rollNumber = qrData.trim();
      }
  
      if (!rollNumber) {
        return res.status(400).json({ success: false, message: "Invalid QR Code Data" });
      }
  
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(EXCEL_FILE);
      const worksheet = workbook.getWorksheet("Sheet1");
      
      let found = false;
      // Current timestamp
      const timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip Header
        if (row.getCell(2).value == rollNumber) {
          if (row.getCell(4).value === "Checked In") {
            return res.json({ success: false, message: "Already Checked In" });
          }
          
          row.getCell(4).value = "Checked In";
          row.getCell(5).value = timestamp; // Add timestamp to log_scan endpoint too
          found = true;
          return;
        }
      });
  
      if (!found) {
        return res.status(404).json({ success: false, message: "You have not registered for the event" });
      }
  
      await workbook.xlsx.writeFile(EXCEL_FILE);
      return res.json({ success: true, message: "Check-In Successful" });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });
  

// New endpoint to get stats for the dashboard
app.get("/api/stats", async (req, res) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(EXCEL_FILE);
      const worksheet = workbook.getWorksheet("Sheet1");
      
      let totalRegistrations = 0;
      let checkedIn = 0;
      
      // Group data by NSS groups
      const groupStats = {};
      
      // Stats by hour for the chart
      const hourlyStats = {};
      const currentDate = moment().format("YYYY-MM-DD");
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        totalRegistrations++;
        
        // Get NSS group
        const nssGroup = row.getCell(3).value || "Unassigned";
        
        if (!groupStats[nssGroup]) {
          groupStats[nssGroup] = {
            total: 0,
            checkedIn: 0
          };
        }
        
        groupStats[nssGroup].total++;
        
        // Check if checked in
        if (row.getCell(4).value === "Checked In") {
          checkedIn++;
          groupStats[nssGroup].checkedIn++;
          
          // Get check-in time for hourly stats
          const checkInTime = row.getCell(5).value;
          if (checkInTime) {
            const checkInMoment = moment(checkInTime, "YYYY-MM-DD HH:mm:ss");
            // Only count check-ins from today
            if (checkInMoment.format("YYYY-MM-DD") === currentDate) {
              const hour = checkInMoment.format("HH:00");
              hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
            }
          }
        }
      });
      
      // Convert hourly stats to sorted array for the chart
      const hourlyData = [];
      const hours = Object.keys(hourlyStats).sort();
      for (const hour of hours) {
        hourlyData.push({ hour, count: hourlyStats[hour] });
      }
      
      res.json({
        totalRegistrations,
        checkedIn,
        notCheckedIn: totalRegistrations - checkedIn,
        checkInRate: totalRegistrations ? Math.round((checkedIn / totalRegistrations) * 100) : 0,
        groupStats,
        hourlyData
      });
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });
  

// Serve the dashboard HTML
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});