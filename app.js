// ===== MQTT CONFIGURATION =====
const options = {
    username: "Penetas_telur",
    password: "Farming123?",
    connectTimeout: 4000,
    clientId: "web_" + Math.random().toString(16).substr(2, 8),
    clean: true,
    reconnectPeriod: 5000,
};

const client = mqtt.connect(
    "wss://a518f7d82e9445599e1da781533eff86.s1.eu.hivemq.cloud:8884/mqtt",
    options
);

// ===== GLOBAL VARIABLES =====
let chart;
let dataPointCount = 0;
let temperatureHistory = [];

// ===== WAIT FOR DOM TO LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing dashboard...");
    
    // Initialize chart with delay to ensure canvas is ready
    setTimeout(() => {
        initChart();
    }, 100);
    
    // Initialize time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Set client ID
    const clientIdEl = document.getElementById("clientId");
    if (clientIdEl) {
        clientIdEl.innerHTML = options.clientId;
    }
    
    // Auto-reconnect handler
    setInterval(() => {
        if (!client.connected) {
            console.log("Attempting to reconnect...");
            client.reconnect();
        }
    }, 30000);
});

// ===== CHART INITIALIZATION =====
function initChart() {
    const canvas = document.getElementById('tempChart');
    if (!canvas) {
        console.error("Chart canvas not found!");
        return;
    }
    
    // Get canvas context
    const ctx = canvas.getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointStyle: 'circle'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#f59e0b',
                    bodyColor: '#e2e8f0',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 30,
                    max: 45,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: true
                    },
                    ticks: {
                        color: '#e2e8f0',
                        stepSize: 2,
                        callback: function(value) {
                            return value + '°C';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#94a3b8',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        display: true
                    },
                    ticks: {
                        color: '#e2e8f0',
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 8
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#94a3b8',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 500,
                easing: 'easeInOutQuart'
            },
            elements: {
                line: {
                    borderJoin: 'round'
                }
            }
        }
    });
    
    console.log("Chart initialized successfully");
    
    // Add sample data to test chart
    addSampleData();
}

// Add sample data for testing
function addSampleData() {
    if (!chart) return;
    
    // Add some initial sample data points
    const now = new Date();
    for (let i = 0; i < 5; i++) {
        const time = new Date(now.getTime() - (5 - i) * 3000);
        const timeLabel = time.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(36.5);
    }
    chart.update();
    dataPointCount = 5;
    const dataPointsEl = document.getElementById("dataPoints");
    if (dataPointsEl) {
        dataPointsEl.innerHTML = dataPointCount;
    }
}

// ===== TIME UPDATE =====
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    const dateString = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.innerHTML = `${dateString}<br><span style="font-size: 14px; color: #a0aec0;">${timeString}</span>`;
    }
}

// ===== MQTT CONNECTION HANDLER =====
client.on("connect", () => {
    console.log("Connected to MQTT broker");
    updateConnectionStatus(true);
    
    // Subscribe to all incubator topics
    client.subscribe("inkubator/#", (err) => {
        if (!err) {
            console.log("Subscribed to inkubator/#");
            showNotification("Connected to MQTT Broker", "success");
        } else {
            console.error("Subscription error:", err);
        }
    });
});

client.on("error", (err) => {
    console.error("MQTT Error:", err);
    updateConnectionStatus(false);
    showNotification("Connection Error: " + err.message, "error");
});

client.on("reconnect", () => {
    console.log("Reconnecting to MQTT broker...");
    updateConnectionStatus(false);
    const connectionStatus = document.getElementById("connectionStatus");
    if (connectionStatus) {
        connectionStatus.innerHTML = "● RECONNECTING";
        connectionStatus.className = "connection-badge offline";
    }
});

client.on("offline", () => {
    console.log("MQTT client offline");
    updateConnectionStatus(false);
});

// ===== UPDATE CONNECTION STATUS =====
function updateConnectionStatus(isConnected) {
    const statusEl = document.getElementById("connectionStatus");
    if (statusEl) {
        if (isConnected) {
            statusEl.innerHTML = "● ONLINE";
            statusEl.className = "connection-badge online";
        } else {
            statusEl.innerHTML = "● OFFLINE";
            statusEl.className = "connection-badge offline";
        }
    }
}

// ===== UPDATE DEVICE STATUS (NO SPIN ANIMATION) =====
function updateStatus(id, value) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Element ${id} not found`);
        return;
    }

    // Normalize value
    let status = value.toString().toUpperCase();
    if (status === "1") status = "ON";
    if (status === "0") status = "OFF";
    
    el.innerText = status;
    
    // Remove any existing classes
    el.classList.remove("on", "off", "spin");
    
    // Add appropriate class
    if (status === "ON") {
        el.classList.add("on");
    } else {
        el.classList.add("off");
    }
    
    console.log(`Status updated: ${id} = ${status}`);
}

// ===== SHOW NOTIFICATION =====
function showNotification(message, type) {
    let notificationDiv = document.getElementById('floatingNotification');
    if (!notificationDiv) {
        notificationDiv = document.createElement('div');
        notificationDiv.id = 'floatingNotification';
        notificationDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(notificationDiv);
        
        if (!document.querySelector('#notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    if (type === "error") {
        notificationDiv.style.background = 'rgba(239, 68, 68, 0.95)';
        notificationDiv.style.border = '1px solid #ef4444';
        notificationDiv.style.color = 'white';
    } else if (type === "success") {
        notificationDiv.style.background = 'rgba(34, 197, 94, 0.95)';
        notificationDiv.style.border = '1px solid #22c55e';
        notificationDiv.style.color = 'white';
    } else {
        notificationDiv.style.background = 'rgba(245, 158, 11, 0.95)';
        notificationDiv.style.border = '1px solid #f59e0b';
        notificationDiv.style.color = 'white';
    }
    
    notificationDiv.innerHTML = message;
    notificationDiv.style.display = 'block';
    
    setTimeout(() => {
        if (notificationDiv) {
            notificationDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notificationDiv) {
                    notificationDiv.style.display = 'none';
                    notificationDiv.style.animation = '';
                }
            }, 300);
        }
    }, 3000);
}

// ===== MESSAGE HANDLER =====
client.on("message", (topic, message) => {
    const val = message.toString();
    console.log(`Received: ${topic} = ${val}`);
    
    switch(topic) {
        case "inkubator/suhu":
            const temp = parseFloat(val);
            if (!isNaN(temp) && chart) {
                // Update current temperature display
                const currentTempEl = document.getElementById("currentTemp");
                if (currentTempEl) {
                    currentTempEl.innerText = temp.toFixed(1);
                }
                
                // Update chart with timestamp
                const now = new Date();
                const timeLabel = now.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                // Add data to chart
                chart.data.labels.push(timeLabel);
                chart.data.datasets[0].data.push(temp);
                
                // Keep last 30 data points
                if (chart.data.labels.length > 30) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                
                // Update chart
                chart.update();
                
                // Update data point counter
                dataPointCount++;
                const dataPointsEl = document.getElementById("dataPoints");
                if (dataPointsEl) {
                    dataPointsEl.innerHTML = dataPointCount;
                }
                
                console.log(`Chart updated - Temp: ${temp}°C, Points: ${dataPointCount}`);
                
                // Check temperature range
                const lowValEl = document.getElementById("lowVal");
                const highValEl = document.getElementById("highVal");
                
                if (lowValEl && highValEl) {
                    const lowVal = parseFloat(lowValEl.innerText);
                    const highVal = parseFloat(highValEl.innerText);
                    
                    if (!isNaN(lowVal) && !isNaN(highVal)) {
                        if (temp < lowVal) {
                            showNotification(`⚠️ Warning: Temperature below setpoint (${temp}°C < ${lowVal}°C)`, "warning");
                        } else if (temp > highVal) {
                            showNotification(`⚠️ Warning: Temperature above setpoint (${temp}°C > ${highVal}°C)`, "warning");
                        }
                    }
                }
            }
            break;
            
        case "inkubator/lampu":
            updateStatus("lampu", val);
            break;
            
        case "inkubator/kipas":
            updateStatus("kipas", val);
            break;
            
        case "inkubator/low":
            const lowEl = document.getElementById("lowVal");
            if (lowEl) {
                const numVal = parseFloat(val).toFixed(1);
                lowEl.innerText = numVal;
                showNotification(`Setpoint LOW updated to ${numVal}°C`, "success");
            }
            break;
            
        case "inkubator/high":
            const highEl = document.getElementById("highVal");
            if (highEl) {
                const numVal = parseFloat(val).toFixed(1);
                highEl.innerText = numVal;
                showNotification(`Setpoint HIGH updated to ${numVal}°C`, "success");
            }
            break;
            
        default:
            console.log("Unknown topic:", topic);
    }
});

// ===== SEND COMMANDS =====
function kirimLow() {
    const inputEl = document.getElementById("setLow");
    if (!inputEl) return;
    
    const v = inputEl.value;
    if (!v || isNaN(v)) {
        showNotification("Please enter a valid temperature value", "error");
        return;
    }
    
    if (client.connected) {
        client.publish("inkubator/set/low", v.toString(), (err) => {
            if (err) {
                showNotification("Failed to send LOW setpoint", "error");
                console.error("Publish error:", err);
            } else {
                showNotification(`Sending LOW setpoint: ${v}°C`, "success");
                inputEl.value = "";
            }
        });
    } else {
        showNotification("MQTT not connected", "error");
    }
}

function kirimHigh() {
    const inputEl = document.getElementById("setHigh");
    if (!inputEl) return;
    
    const v = inputEl.value;
    if (!v || isNaN(v)) {
        showNotification("Please enter a valid temperature value", "error");
        return;
    }
    
    if (client.connected) {
        client.publish("inkubator/set/high", v.toString(), (err) => {
            if (err) {
                showNotification("Failed to send HIGH setpoint", "error");
                console.error("Publish error:", err);
            } else {
                showNotification(`Sending HIGH setpoint: ${v}°C`, "success");
                inputEl.value = "";
            }
        });
    } else {
        showNotification("MQTT not connected", "error");
    }
}

// ===== RESET CHART =====
function resetChart() {
    if (chart) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        dataPointCount = 0;
        const dataPointsEl = document.getElementById("dataPoints");
        if (dataPointsEl) {
            dataPointsEl.innerHTML = "0";
        }
        showNotification("Chart data reset", "success");
        console.log("Chart reset");
    }
}

console.log("Dashboard JavaScript loaded - Kipas tidak berputar, chart siap menampilkan data");
