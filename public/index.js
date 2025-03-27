// DOM elements
const notification = document.getElementById('notification');
const resultContainer = document.getElementById('result-container');
const scannedData = document.getElementById('scanned-data');
const resetBtn = document.getElementById('reset-btn');
const copyBtn = document.getElementById('copy-btn');
const loading = document.getElementById('loading');
const soundToggle = document.getElementById('sound-toggle');
const refreshBtn = document.getElementById('refresh-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Dashboard elements
const totalRegistrationsEl = document.getElementById('total-registrations');
const checkedInEl = document.getElementById('checked-in');
const notCheckedInEl = document.getElementById('not-checked-in');
const checkInRateEl = document.getElementById('check-in-rate');
const lastUpdatedEl = document.getElementById('last-updated');
const groupTableBody = document.getElementById('group-table-body');

// Initialize sounds
const beepSound = new Audio("beep.mp3");
const errorSound = new Audio("error.mp3");

// Create export controls
const exportControlsDiv = document.createElement('div');
exportControlsDiv.className = 'export-controls';
exportControlsDiv.innerHTML = `
    <button id="export-dropdown" class="btn btn-primary dropdown-toggle">
        Export Report <span class="caret"></span>
    </button>
    <div id="export-options" class="dropdown-menu">
        <a href="#" data-format="csv" class="dropdown-item">CSV</a>
        <a href="#" data-format="excel" class="dropdown-item">Excel</a>
        <a href="#" data-format="pdf" class="dropdown-item">PDF</a>
        <a href="#" data-format="png" class="dropdown-item">PNG</a>
    </div>
`;

// Add export controls next to refresh button
refreshBtn.parentNode.insertBefore(exportControlsDiv, refreshBtn.nextSibling);

// Store the latest stats data
let currentStats = null;

// Scanner configuration
const scannerConfig = {
    fps: 10,
    qrbox: {
        width: 250,
        height: 250,
    },
    aspectRatio: 1.0,
    formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX
    ]
};

// Initialize scanner
const scanner = new Html5QrcodeScanner("qr-reader", scannerConfig, false);
scanner.render(onScanSuccess, onScanFailure);

// Variables to prevent duplicate scans
let lastScanned = "";
let scanCooldown = false;
let scannerActive = true;

// Chart instances
let attendanceChart;
let hourlyChart;

// Initialize charts
function initCharts() {
    // Attendance pie chart
    const attendanceCtx = document.getElementById('attendance-chart').getContext('2d');
    attendanceChart = new Chart(attendanceCtx, {
        type: 'doughnut',
        data: {
            labels: ['Checked In', 'Not Checked In'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#06d6a0', '#ef476f'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '70%'
        }
    });
    
    // Hourly bar chart
    const hourlyCtx = document.getElementById('hourly-chart').getContext('2d');
    hourlyChart = new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Check-ins',
                data: [],
                backgroundColor: '#4361ee',
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Function to play beep sound
function playBeep(isError = false) {
    if (soundToggle.checked) {
        // Choose which sound to play based on success/error
        const sound = isError && errorSound ? errorSound : beepSound;
        
        // Reset the audio to the beginning (in case it's still playing)
        sound.currentTime = 0;
        
        // Play the sound
        sound.play().catch(e => {
            console.warn("Could not play sound: ", e);
        });
    }
}

// Function to show notification
function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.className = "notification";
    }, 3000);
}

// Handle successful scan
function onScanSuccess(decodedText, decodedResult) {
    console.log("Scanned:", decodedText);
    
    // Prevent duplicate or rapid scans
    if (scanCooldown || decodedText === lastScanned || !scannerActive) {
        return;
    }
    
    // Set cooldown
    scanCooldown = true;
    scannerActive = false;
    lastScanned = decodedText;
    
    // Show loading indicator
    loading.className = "loading-indicator show";
    
    // Process the scan data
    processScanData(decodedText);
    
    // Reset cooldown after delay
    setTimeout(() => {
        scanCooldown = false;
        scannerActive = true;
        loading.className = "loading-indicator";
    }, 3000);
}

// Handle scan failures
function onScanFailure(error) {
    // Only log critical errors
    if (error && !error.includes("No QR code found")) {
        console.error("Scan error:", error);
    }
}

// Process scan data// Process scan data
function processScanData(data) {
    loading.className = "loading-indicator show";
    
    // Define the expected event name
    const expectedEvent = "Yoga Session"; // Change this to your event name
    
    // Parse QR data
    let rollNumber, name, nssGroup, event;
    if (data.includes(",")) {
      // Format: name,rollNumber,nssGroup,event
      [name, rollNumber, nssGroup, event] = data.split(",").map(item => item.trim());
    } else {
      // Format: just roll number
      rollNumber = data.trim();
      event = ""; // No event specified
    }
    
    fetch('/check_registration', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        rollNumber: data,
        event: event,
        expectedEvent: expectedEvent
      })
    })
    .then(response => response.json())
    .then(result => {
      loading.className = "loading-indicator";
      
      if (result.eventMismatch) {
        // Wrong event
        playBeep(true); // Play error sound
        showNotification("You have attended the wrong event!", "error");
        scannedData.textContent = `Roll Number: ${rollNumber || data}\nName: ${result.name || 'N/A'}\nStatus: Wrong Event\nRegistered for: ${result.registeredEvent || 'N/A'}`;
        resultContainer.className = "scan-result show";
        return;
      }
      
      if (result.registered) {
        // Registration exists
        playBeep(false); // Play success sound
        
        if (result.alreadyCheckedIn) {
          // Already checked in
          showNotification(`${result.name} has already checked in!`, "warning");
          scannedData.textContent = `Roll Number: ${rollNumber || data}\nName: ${result.name || 'N/A'}\nNSS Group: ${result.nssGroup || 'N/A'}\nStatus: Already Checked In`;
        } else {
          // Successful new check-in
          showNotification(`Welcome ${result.name}! Check-in successful.`, "success");
          scannedData.textContent = `Roll Number: ${rollNumber || data}\nName: ${result.name || 'N/A'}\nNSS Group: ${result.nssGroup || 'N/A'}\nStatus: Checked In`;
          
          // Update dashboard stats after successful check-in
          fetchStats();
        }
      } else {
        // Not registered
        playBeep(true); // Play error sound
        showNotification(result.message || "Not registered for this event.", "error");
        scannedData.textContent = `Roll Number: ${rollNumber || data}\nStatus: Not Registered`;
      }
      
      resultContainer.className = "scan-result show";
    })
    .catch(error => {
      console.error("Error:", error);
      loading.className = "loading-indicator";
      playBeep(true); // Play error sound
      showNotification("Connection error! Please try again.", "error");
    });
  }
const dev = String.fromCharCode(72, 97, 114, 100, 105, 107, 32, 66, 97, 116, 119, 97, 108);
console.log(`Developed by ${dev}`);  
// Fetch stats from server
async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }
        
        const stats = await response.json();
        currentStats = stats; // Store the stats for export
        updateDashboard(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        showNotification('Failed to fetch attendance stats', 'error');
    }
}

// Update dashboard with stats data
function updateDashboard(stats) {
    // Update overview cards
    totalRegistrationsEl.textContent = stats.totalRegistrations;
    checkedInEl.textContent = stats.checkedIn;
    notCheckedInEl.textContent = stats.notCheckedIn;
    checkInRateEl.textContent = `${stats.checkInRate}%`;
    
    // Update attendance chart
    attendanceChart.data.datasets[0].data = [stats.checkedIn, stats.notCheckedIn];
    attendanceChart.update();
    
    // Update hourly chart
    if (stats.hourlyData && stats.hourlyData.length > 0) {
        hourlyChart.data.labels = stats.hourlyData.map(item => item.hour);
        hourlyChart.data.datasets[0].data = stats.hourlyData.map(item => item.count);
        hourlyChart.update();
    }
    
    // Update group table
    groupTableBody.innerHTML = '';
    if (stats.groupStats) {
        Object.entries(stats.groupStats).forEach(([group, data]) => {
            const rate = data.total ? Math.round((data.checkedIn / data.total) * 100) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${group}</td>
                <td>${data.total}</td>
                <td>${data.checkedIn}</td>
                <td>${rate}%</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${rate}%"></div>
                    </div>
                </td>
            `;
            
            groupTableBody.appendChild(row);
        });
    }
    
    // Update last updated timestamp
    lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
}

// Tab switching functionality
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Remove active class from all tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to selected tab
        btn.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        // If switching to dashboard tab, refresh stats
        if (tabId === 'dashboard') {
            fetchStats();
        }
    });
});

// Copy scanned data to clipboard
copyBtn.addEventListener('click', () => {
    if (scannedData.textContent) {
        navigator.clipboard.writeText(scannedData.textContent)
            .then(() => {
                showNotification("Data copied to clipboard!", "success");
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                showNotification("Failed to copy data", "error");
            });
    }
});

// Reset scanner
resetBtn.addEventListener('click', () => {
    resultContainer.className = "scan-result";
    scannedData.textContent = "";
    lastScanned = "";
    scannerActive = true;
});

// Event listeners
refreshBtn.addEventListener('click', fetchStats);

// Export dropdown toggle
document.getElementById('export-dropdown').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('export-options').classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!document.getElementById('export-dropdown').contains(e.target)) {
        document.getElementById('export-options').classList.remove('show');
    }
});

// Handle export option selection
document.querySelectorAll('#export-options a').forEach(option => {
    option.addEventListener('click', function(e) {
        e.preventDefault();
        const format = this.getAttribute('data-format');
        exportReport(format);
        document.getElementById('export-options').classList.remove('show');
    });
});

// Export report function
function exportReport(format) {
    if (!currentStats) {
        showNotification("No data available to export", "error");
        return;
    }
    
    loading.className = "loading-indicator show";
    
    switch(format) {
        case 'csv':
            exportToCSV(currentStats);
            break;
        case 'excel':
            exportToExcel(currentStats);
            break;
        case 'pdf':
            exportToPDF(currentStats);
            break;
        case 'png':
            exportToPNG();
            break;
    }
}

// CSV Export
function exportToCSV(data) {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers and date
    const currentDate = new Date().toLocaleString();
    csvContent += "Event Registration Report - " + currentDate + "\r\n\r\n";
    csvContent += "Overall Statistics\r\n";
    csvContent += "Total Registrations,Checked In,Not Checked In,Check-In Rate\r\n";
    csvContent += `${data.totalRegistrations},${data.checkedIn},${data.notCheckedIn},${data.checkInRate}%\r\n\r\n`;
    
    // Add group statistics
    csvContent += "Attendance by NSS Group\r\n";
    csvContent += "NSS Group,Total,Checked In,Check-In %\r\n";
    
    Object.entries(data.groupStats).forEach(([group, stats]) => {
        const rate = stats.total ? Math.round((stats.checkedIn / stats.total) * 100) : 0;
        csvContent += `${group},${stats.total},${stats.checkedIn},${rate}%\r\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "event_report_" + new Date().toISOString().slice(0,10) + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    loading.className = "loading-indicator";
    showNotification("Report exported to CSV successfully", "success");
}

// Excel Export
function exportToExcel(data) {
    fetch('/api/export/excel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "event_report_" + new Date().toISOString().slice(0,10) + ".xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        loading.className = "loading-indicator";
        showNotification("Report exported to Excel successfully", "success");
    })
    .catch(error => {
        console.error('Error exporting to Excel:', error);
        loading.className = "loading-indicator";
        showNotification("Failed to export to Excel", "error");
    });
}

// PDF Export
function exportToPDF(data) {
    fetch('/api/export/pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "event_report_" + new Date().toISOString().slice(0,10) + ".pdf";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        loading.className = "loading-indicator";
        showNotification("Report exported to PDF successfully", "success");
    })
    .catch(error => {
        console.error('Error exporting to PDF:', error);
        loading.className = "loading-indicator";
        showNotification("Failed to export to PDF", "error");
    });
}

// PNG Export (screenshot of dashboard)
function exportToPNG() {
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
        // Load html2canvas dynamically if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = function() {
            captureAndDownload();
        };
        script.onerror = function() {
            loading.className = "loading-indicator";
            showNotification("Failed to load screenshot library", "error");
        };
        document.head.appendChild(script);
    } else {
        captureAndDownload();
    }
    
    function captureAndDownload() {
        const dashboardElement = document.getElementById('dashboard-tab');
        
        html2canvas(dashboardElement).then(canvas => {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = "event_report_" + new Date().toISOString().slice(0,10) + ".png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            loading.className = "loading-indicator";
            showNotification("Dashboard exported as PNG successfully", "success");
        });
    }
}

// Initialize sound toggle from localStorage (if available)
if (localStorage.getItem('qrScannerSoundEnabled') === 'false') {
    soundToggle.checked = false;
}

// Save sound preference
soundToggle.addEventListener('change', () => {
    localStorage.setItem('qrScannerSoundEnabled', soundToggle.checked);
});

// Check if the browser supports camera access
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showNotification("Your browser doesn't support camera access. Please try another browser.", "error");
}

// Initialize dashboard
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // Auto-refresh stats every 2 minutes if dashboard tab is active
    setInterval(() => {
        if (document.getElementById('dashboard-tab').classList.contains('active')) {
            fetchStats();
        }
    }, 120000);
    });

// Responsive Page
function makeResponsive() {
  const width = window.innerWidth;
  const body = document.body;
  const header = document.querySelector('header');
  const main = document.querySelector('main');

  if (width < 600) {
    // Mobile layout
    body.style.fontSize = '14px';
    header.style.flexDirection = 'column';
    main.style.flexDirection = 'column';
  } else if (width < 1024) {
    // Tablet layout
    body.style.fontSize = '16px';
    header.style.flexDirection = 'row';
    main.style.flexDirection = 'column';
  } else {
    // Desktop layout
    body.style.fontSize = '18px';
    header.style.flexDirection = 'row';
    main.style.flexDirection = 'row';
  }
}

// Call the function on page load and window resize
window.addEventListener('load', makeResponsive);
window.addEventListener('resize', makeResponsive);
