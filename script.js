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

// ===== CHART CONFIGURATION =====
const ctx = document.getElementById('tempChart');
const chart = new Chart(ctx, {
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
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
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
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#f59e0b',
                bodyColor: '#e2e8f0',
                borderColor: '#f59e0b',
                borderWidth: 1
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#e2e8f0',
                    callback: function(value) {
                        return value + '°C';
                    }
                }
            },
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#e2e8f0'
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    }
});

let dataPointCount = 0;

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
    document.getElementById('currentTime').innerHTML = `${dateString}<br><span style="font-size: 14px; color: #a0aec0;">${timeString}</span>`;
}

setInterval(updateTime, 1000);
updateTime();

// ===== MQTT CONNECTION HANDLER =====
client.on("connect", () => {
    console.log("Connected to MQTT broker");
    updateConnectionStatus(true);
    
    // Subscribe to all incubator topics
    client.subscribe("inkubator/#", (err) => {
        if (!err) {
            console.log("Subscribed to inkubator/#");
            showNotification("Connected to MQTT Broker", "success");
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
    document.getElementById("connectionStatus").innerHTML = "● RECONNECTING";
});

client.on("offline", () => {
    console.log("MQTT client offline");
    updateConnectionStatus(false);
});

// ===== UPDATE CONNECTION STATUS =====
function updateConnectionStatus(isConnected) {
    const statusEl = document.getElementById("connectionStatus");
    if (isConnected) {
        statusEl.innerHTML = "● ONLINE";
        statusEl.className = "connection-badge online";
        document.getElementById("status").innerHTML = "Connected";
    } else {
        statusEl.innerHTML = "● OFFLINE";
        statusEl.className = "connection-badge offline";
        document.getElementById("status").innerHTML = "Disconnected";
    }
}

// ===== UPDATE DEVICE STATUS =====
function updateStatus(id, value, isFan = false) {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerText = value;
    
    if (value === "ON" || value === "1" || value === "on") {
        el.classList.add("on");
        el.classList.remove("off");
        
        // Add animation for fan
        if (isFan && id === "kipas") {
            el.classList.add("spin");
            // Add visual feedback for fan
            const fanIcon = document.querySelector('.status-icon');
            if (fanIcon) fanIcon.style.animation = 'spin 1s linear infinite';
        }
    } else {
        el.classList.add("off");
        el.classList.remove("on");
        
        if (isFan && id === "kipas") {
            el.classList.remove("spin");
            const fanIcon = document.querySelector('.status-icon');
            if (fanIcon) fanIcon.style.animation = 'none';
        }
    }
}

// ===== SHOW NOTIFICATION =====
function showNotification(message, type) {
    const statusDiv = document.getElementById("status");
    if (!statusDiv) return;
    
    statusDiv.innerHTML = message;
    statusDiv.style.color = type === "error" ? "#f87171" : "#4ade80";
    
    setTimeout(() => {
        if (statusDiv.innerHTML === message) {
            statusDiv.innerHTML = "System Online";
            statusDiv.style.color = "#94a3b8";
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
            if (!isNaN(temp)) {
                // Update current temperature display
                document.getElementById("currentTemp").innerText = temp.toFixed(1);
                
                // Update chart
                const now = new Date();
                const timeLabel = now.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                chart.data.labels.push(timeLabel);
                chart.data.datasets[0].data.push(temp);
                
                // Keep last 30 data points
                if (chart.data.labels.length > 30) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                
                chart.update();
                
                // Update data point counter
                dataPointCount++;
                document.getElementById("dataPoints").innerHTML = dataPointCount;
                
                // Check temperature range and show warning
                const lowVal = parseFloat(document.getElementById("lowVal").innerText);
                const highVal = parseFloat(document.getElementById("highVal").innerText);
                
                if (!isNaN(lowVal) && !isNaN(highVal)) {
                    if (temp < lowVal) {
                        showNotification(`⚠️ Warning: Temperature below setpoint (${temp}°C < ${lowVal}°C)`, "warning");
                    } else if (temp > highVal) {
                        showNotification(`⚠️ Warning: Temperature above setpoint (${temp}°C > ${highVal}°C)`, "warning");
                    }
                }
            }
            break;
            
        case "inkubator/lampu":
            updateStatus("lampu", val);
            break;
            
        case "inkubator/kipas":
            updateStatus("kipas", val, true);
            break;
            
        case "inkubator/low":
            document.getElementById("lowVal").innerText = parseFloat(val).toFixed(1);
            showNotification(`Setpoint LOW updated to ${val}°C`, "success");
            break;
            
        case "inkubator/high":
            document.getElementById("highVal").innerText = parseFloat(val).toFixed(1);
            showNotification(`Setpoint HIGH updated to ${val}°C`, "success");
            break;
            
        default:
            console.log("Unknown topic:", topic);
    }
});

// ===== SEND COMMANDS =====
function kirimLow() {
    const v = document.getElementById("setLow").value;
    if (!v || isNaN(v)) {
        showNotification("Please enter a valid temperature value", "error");
        return;
    }
    
    if (client.connected) {
        client.publish("inkubator/set/low", v.toString(), (err) => {
            if (err) {
                showNotification("Failed to send LOW setpoint", "error");
            } else {
                showNotification(`Sending LOW setpoint: ${v}°C`, "success");
                document.getElementById("setLow").value = "";
            }
        });
    } else {
        showNotification("MQTT not connected", "error");
    }
}

function kirimHigh() {
    const v = document.getElementById("setHigh").value;
    if (!v || isNaN(v)) {
        showNotification("Please enter a valid temperature value", "error");
        return;
    }
    
    if (client.connected) {
        client.publish("inkubator/set/high", v.toString(), (err) => {
            if (err) {
                showNotification("Failed to send HIGH setpoint", "error");
            } else {
                showNotification(`Sending HIGH setpoint: ${v}°C`, "success");
                document.getElementById("setHigh").value = "";
            }
        });
    } else {
        showNotification("MQTT not connected", "error");
    }
}

// ===== RESET CHART =====
function resetChart() {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    dataPointCount = 0;
    document.getElementById("dataPoints").innerHTML = "0";
    showNotification("Chart data reset", "success");
}

// ===== CLIENT ID DISPLAY =====
document.getElementById("clientId").innerHTML = options.clientId;

// ===== AUTO-RECONNECT HANDLER =====
setInterval(() => {
    if (!client.connected) {
        console.log("Attempting to reconnect...");
        client.reconnect();
    }
}, 30000);

console.log("Dashboard initialized successfully");