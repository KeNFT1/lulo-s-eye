// WorldView - Spy Satellite Simulator
// Military-grade 3D Earth visualization with live data

// Configuration - ADD YOUR API KEYS HERE
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NTQ2N2RmOC1lYjczLTQyMDgtOWEzMy04NDY2YWU3ZjdiNWYiLCJpZCI6NDAzNTA5LCJpYXQiOjE3NzM0ODEzMTJ9.UmgxGBCO1zYXaIg9iO6eoJ3LdpAXLTUBliDFwuoCjZs'; // Get from: https://ion.cesium.com/signup
const GOOGLE_MAPS_API_KEY = 'AIzaSyAL-bB_F3P3K8V2kH-R7X_bEa9c1d2f3g4'; // Demo key - replace with real one
const OPENWEATHERMAP_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY_HERE'; // Get from: https://openweathermap.org/api

// Global state
let viewer;
let aircraft = [];
let satellites = [];
let satelliteTracker = null;
let weatherLayer = null;
let currentMode = 'normal';
let layers = {
    aircraft: true,
    satellites: true,
    weather: false,
    traffic: false,
    cctv: false,
    godMode: false,
    radar: false
};

// Mission briefing data for major intelligence targets
const MISSION_BRIEFINGS = {
    'sfo': {
        cityName: 'San Francisco',
        coordinates: '37.7749°N, 122.4194°W',
        population: '875,000',
        facilities: ['Port Authority', 'Federal Building', 'Tech Corridors'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-SF-7749-ALPHA',
        notes: ['Silicon Valley proximity', 'Major shipping hub', '[REDACTED] presence confirmed']
    },
    'ldn': {
        cityName: 'London',
        coordinates: '51.5074°N, 0.1278°W',
        population: '9,540,000',
        facilities: ['Westminster', 'City Financial District', 'Thames Barrier'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-LN-5074-BRAVO',
        notes: ['NATO coordination hub', 'Financial center', 'Historic [REDACTED] operations']
    },
    'tyo': {
        cityName: 'Tokyo',
        coordinates: '35.6762°N, 139.6503°E',
        population: '37,400,000',
        facilities: ['Imperial Palace', 'Defense Ministry', 'Tech Research Centers'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-TK-3567-CHARLIE',
        notes: ['Advanced robotics development', 'Pacific fleet coordination', '[REDACTED] technology exports']
    },
    'nyc': {
        cityName: 'New York City',
        coordinates: '40.7128°N, 74.0060°W',
        population: '8,380,000',
        facilities: ['UN Headquarters', 'Federal Reserve', 'Wall Street Complex'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-NYC-4071-DELTA',
        notes: ['Global financial hub', 'International diplomacy', 'High-value [REDACTED] targets']
    },
    'paris': {
        cityName: 'Paris',
        coordinates: '48.8566°N, 2.3522°E',
        population: '12,200,000',
        facilities: ['Élysée Palace', 'Defense Ministry', 'Nuclear Research'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-PR-4885-ECHO',
        notes: ['EU coordination center', 'Nuclear capabilities', '[REDACTED] submarine base nearby']
    },
    'moscow': {
        cityName: 'Moscow',
        coordinates: '55.7558°N, 37.6173°E',
        population: '12,500,000',
        facilities: ['Kremlin Complex', 'Defense Headquarters', 'Space Command'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-MW-5575-FOXTROT',
        notes: ['Strategic command center', 'Space operations', 'High-priority [REDACTED] monitoring']
    },
    'beijing': {
        cityName: 'Beijing',
        coordinates: '39.9042°N, 116.4074°E',
        population: '21,700,000',
        facilities: ['Zhongnanhai', 'Military Commission', 'Tech Development Zones'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-BJ-3990-GOLF',
        notes: ['Political command center', 'Advanced tech development', '[REDACTED] cyber operations']
    },
    'sydney': {
        cityName: 'Sydney',
        coordinates: '33.8688°S, 151.2093°E',
        population: '5,310,000',
        facilities: ['Defense Headquarters', 'Port Operations', 'Intelligence Center'],
        threatLevel: Math.floor(Math.random() * 5) + 1,
        docNumber: 'INTEL-SY-3386-HOTEL',
        notes: ['Pacific defense hub', 'Maritime surveillance', '[REDACTED] partnership coordination']
    }
};

// Briefing system functions
function showMissionBriefing(cityCode) {
    const briefing = MISSION_BRIEFINGS[cityCode.toLowerCase()];
    if (!briefing) return;
    
    // Play alert sound
    if (window.audioManager) {
        window.audioManager.playAlert();
    }
    
    // Create briefing card
    const briefingCard = document.createElement('div');
    briefingCard.className = 'classified-card';
    briefingCard.innerHTML = `
        <div class="classified-close">&times;</div>
        <div class="classified-header">
            <h2>🛰️ Intelligence Briefing</h2>
            <div class="doc-number">Document: ${briefing.docNumber}</div>
        </div>
        <div class="briefing-content">
            <p><strong>Target:</strong> <span class="typewriter">${briefing.cityName}</span></p>
            <p><strong>Coordinates:</strong> <span class="decode-text">${briefing.coordinates}</span></p>
            <p><strong>Population:</strong> <span class="decode-text">${briefing.population}</span></p>
            <p><strong>Threat Level:</strong> <span style="color: ${getThreatColor(briefing.threatLevel)}">${'█'.repeat(briefing.threatLevel)} (${briefing.threatLevel}/5)</span></p>
            
            <h3>Key Facilities:</h3>
            <ul>
                ${briefing.facilities.map(facility => 
                    `<li class="decode-text">${facility}</li>`
                ).join('')}
            </ul>
            
            <h3>Intelligence Notes:</h3>
            <ul>
                ${briefing.notes.map(note => {
                    if (note.includes('[REDACTED]')) {
                        const parts = note.split('[REDACTED]');
                        return `<li>${parts[0]}<span class="redacted" data-text="CLASSIFIED">[REDACTED]</span>${parts[1] || ''}</li>`;
                    }
                    return `<li class="decode-text">${note}</li>`;
                }).join('')}
            </ul>
            
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
                Classification: UNCLASSIFIED<br>
                Auto-dismiss in <span id="briefing-countdown">15</span> seconds
            </div>
        </div>
    `;
    
    document.body.appendChild(briefingCard);
    
    // Start countdown timer
    let countdown = 15;
    const countdownEl = document.getElementById('briefing-countdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            closeBriefing(briefingCard);
        }
    }, 1000);
    
    // Close handlers
    briefingCard.querySelector('.classified-close').addEventListener('click', () => {
        clearInterval(countdownInterval);
        closeBriefing(briefingCard);
    });
    
    briefingCard.addEventListener('click', (e) => {
        if (e.target === briefingCard) {
            clearInterval(countdownInterval);
            closeBriefing(briefingCard);
        }
    });
    
    // Store interval for cleanup
    briefingCard.countdownInterval = countdownInterval;
    
    console.log(`📋 Mission briefing displayed: ${briefing.cityName}`);
}

function closeBriefing(briefingCard) {
    if (briefingCard.countdownInterval) {
        clearInterval(briefingCard.countdownInterval);
    }
    briefingCard.style.animation = 'documentSlideIn 0.5s ease-in reverse';
    setTimeout(() => {
        if (briefingCard.parentNode) {
            briefingCard.parentNode.removeChild(briefingCard);
        }
    }, 500);
}

function getThreatColor(level) {
    const colors = ['#00ff00', '#90ee90', '#ffff00', '#ff8c00', '#ff0000'];
    return colors[level - 1] || '#00ff00';
}

// Enhanced typing/decoding animation for entity popups
function createDecodedText(text, delay = 0) {
    const chars = text.split('');
    const scrambleChars = '█▓▒░█▓▒░█▓▒░';
    let scrambledText = '';
    
    // Initial scrambled version
    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') {
            scrambledText += ' ';
        } else {
            scrambledText += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const span = document.createElement('span');
            span.className = 'decode-text';
            span.textContent = text;
            span.style.animationDelay = `${delay}s`;
            resolve(span);
        }, delay * 1000);
    });
}

// New features state
let radarSweep = {
    active: false,
    angle: 0,
    canvas: null,
    ctx: null,
    detectedBlips: []
};

let selectedAircraft = null;
let aircraftTrails = new Map();
let alerts = [];
let alertSound = null;

// Initialize the application
async function initWorldView() {
    updateLoadingStatus('Initializing Cesium...');
    
    // Set Cesium Ion token
    if (CESIUM_ION_TOKEN === 'YOUR_CESIUM_ION_TOKEN_HERE') {
        console.warn('⚠️ Please set your Cesium Ion token in src/app.js');
    } else {
        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    }

    // Create the 3D viewer
    viewer = new Cesium.Viewer('cesium-container', {
        // Disable default UI elements for military aesthetic
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        
        // Enhanced graphics
        terrainProvider: await Cesium.createWorldTerrainAsync(),
        skyBox: new Cesium.SkyBox({
            sources: {
                positiveX: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                negativeX: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                positiveY: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                negativeY: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                positiveZ: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                negativeZ: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            }
        }),
        
        // Start at NYC for dramatic effect
        destination: Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 2000)
    });

    // Configure for intelligence operations
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.dynamicAtmosphereLighting = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0001;

    updateLoadingStatus('Loading aircraft data...');
    await loadAircraftData();
    
    updateLoadingStatus('Initializing satellite tracking system...');
    satelliteTracker = new SatelliteTracker(viewer);
    await satelliteTracker.initializeSatellites();
    createAlert('Satellite tracking system online', 'medium');
    
    updateLoadingStatus('Initializing weather systems...');
    weatherLayer = new WeatherLayer(viewer);
    if (OPENWEATHERMAP_API_KEY !== 'YOUR_OPENWEATHERMAP_API_KEY_HERE') {
        weatherLayer.setApiKey(OPENWEATHERMAP_API_KEY);
    }
    await weatherLayer.initialize();
    createAlert('Weather monitoring systems active', 'medium');
    
    updateLoadingStatus('Initializing visual enhancements...');
    setupPostProcessing();
    
    updateLoadingStatus('Establishing secure connection...');
    setupEventHandlers();
    
    updateLoadingStatus('Initializing radar systems...');
    initRadarSystem();
    
    updateLoadingStatus('Setting up alert system...');
    initAlertSystem();
    
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
    // Start data refresh cycles
    setInterval(updateAircraftData, 10000); // Every 10 seconds
    setInterval(updateTimestamp, 1000);     // Every second
    setInterval(updateRadarSweep, 50);      // 20 FPS radar sweep
    setInterval(updateHUD, 1000);           // Update HUD every second
    
    console.log('🛰️ WORLDVIEW initialized - READY FOR OPERATIONS');
}

// Aircraft tracking using OpenSky Network
async function loadAircraftData() {
    try {
        const response = await fetch('https://opensky-network.org/api/states/all');
        const data = await response.json();
        
        if (!data.states) return;
        
        viewer.entities.removeAll(); // Clear old aircraft
        aircraft = [];
        
        // Process up to 100 aircraft for performance
        const aircraftStates = data.states.slice(0, 100);
        
        aircraftStates.forEach((state, index) => {
            if (!state[5] || !state[6]) return; // No position data
            
            const [icao24, callsign, origin_country, time_position, last_contact, 
                   longitude, latitude, baro_altitude, on_ground, velocity, 
                   true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source] = state;
            
            if (on_ground) return; // Skip aircraft on ground
            
            const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, (geo_altitude || baro_altitude || 10000));
            
            const aircraftEntity = viewer.entities.add({
                name: callsign?.trim() || icao24,
                position: position,
                point: {
                    pixelSize: 6,
                    color: Cesium.Color.CYAN,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 1,
                    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                },
                label: {
                    text: callsign?.trim() || icao24,
                    font: '10pt Courier New',
                    fillColor: Cesium.Color.CYAN,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    show: layers.godMode
                },
                description: `
                    <div style="color: #00ff00; font-family: Courier New;">
                        <h3>🛩️ AIRCRAFT INTERCEPT</h3>
                        <p><strong>Callsign:</strong> ${callsign?.trim() || 'UNKNOWN'}</p>
                        <p><strong>ICAO24:</strong> ${icao24}</p>
                        <p><strong>Country:</strong> ${origin_country}</p>
                        <p><strong>Altitude:</strong> ${Math.round(geo_altitude || baro_altitude || 0)} meters</p>
                        <p><strong>Velocity:</strong> ${Math.round(velocity || 0)} m/s</p>
                        <p><strong>Heading:</strong> ${Math.round(true_track || 0)}°</p>
                        <p><strong>Squawk:</strong> ${squawk || 'N/A'}</p>
                    </div>
                `
            });
            
            const aircraftData = {
                entity: aircraftEntity,
                icao24: icao24,
                position: position,
                velocity: velocity || 0,
                heading: true_track || 0,
                positionHistory: [position], // For trails
                lastAlert: null,
                squawk: squawk,
                inView: false
            };
            
            aircraft.push(aircraftData);
            
            // Initialize trail for this aircraft
            if (!aircraftTrails.has(icao24)) {
                aircraftTrails.set(icao24, []);
            }
        });
        
        console.log(`✈️ Tracking ${aircraft.length} aircraft`);
        
    } catch (error) {
        console.error('Failed to load aircraft data:', error);
    }
}

// Legacy function - replaced by SatelliteTracker class
// This function is kept for compatibility but no longer used

// Initialize radar system
function initRadarSystem() {
    radarSweep.canvas = document.getElementById('radar-canvas');
    radarSweep.ctx = radarSweep.canvas.getContext('2d');
    
    // Set up high DPI canvas
    const rect = radarSweep.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    radarSweep.canvas.width = 400 * dpr;
    radarSweep.canvas.height = 400 * dpr;
    radarSweep.ctx.scale(dpr, dpr);
    
    console.log('📡 Radar system initialized');
}

// Update radar sweep animation
function updateRadarSweep() {
    if (!radarSweep.active) return;
    
    const ctx = radarSweep.ctx;
    const centerX = 200;
    const centerY = 200;
    const radius = 180;
    
    // Clear canvas
    ctx.clearRect(0, 0, 400, 400);
    
    // Draw radar circles
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    
    for (let r = 60; r <= radius; r += 60) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
    
    // Draw sweep line
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const sweepX = centerX + Math.cos(radarSweep.angle) * radius;
    const sweepY = centerY + Math.sin(radarSweep.angle) * radius;
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();
    
    // Draw sweep arc (fading trail)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, radarSweep.angle - Math.PI / 6, radarSweep.angle);
    ctx.closePath();
    ctx.fill();
    
    // Detect aircraft in sweep path
    detectAircraftInSweep();
    
    // Draw detected blips
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00ff00';
    radarSweep.detectedBlips = radarSweep.detectedBlips.filter(blip => {
        const age = Date.now() - blip.timestamp;
        if (age > 2000) return false; // Fade after 2 seconds
        
        const alpha = Math.max(0, 1 - age / 2000);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(blip.x, blip.y, 3, 0, Math.PI * 2);
        ctx.fill();
        return true;
    });
    
    // Update sweep angle (360° in 4 seconds)
    radarSweep.angle += (Math.PI * 2) / (4 * 20); // 20 FPS
    if (radarSweep.angle >= Math.PI * 2) {
        radarSweep.angle = 0;
    }
}

// Detect aircraft in radar sweep path
function detectAircraftInSweep() {
    if (!viewer) return;
    
    const cameraPos = viewer.camera.position;
    const cameraHeight = Cesium.Cartographic.fromCartesian(cameraPos).height;
    
    aircraft.forEach(ac => {
        if (!ac.entity || !ac.entity.show) return;
        
        const acPos = ac.entity.position.getValue(Cesium.JulianDate.now());
        if (!acPos) return;
        
        // Convert to screen space relative to camera
        const cameraCartographic = Cesium.Cartographic.fromCartesian(cameraPos);
        const acCartographic = Cesium.Cartographic.fromCartesian(acPos);
        
        // Simple 2D projection for radar display
        const deltaLon = acCartographic.longitude - cameraCartographic.longitude;
        const deltaLat = acCartographic.latitude - cameraCartographic.latitude;
        
        // Convert to radar screen coordinates
        const scale = Math.max(1, cameraHeight / 100000); // Scale based on altitude
        const x = 200 + (deltaLon * 57.2958) * (180 / scale); // Convert radians to degrees
        const y = 200 - (deltaLat * 57.2958) * (180 / scale);
        
        // Check if within radar range and in sweep path
        const dist = Math.sqrt((x - 200) * (x - 200) + (y - 200) * (y - 200));
        if (dist <= 180) {
            const angle = Math.atan2(y - 200, x - 200);
            const angleDiff = Math.abs(((angle - radarSweep.angle + Math.PI) % (Math.PI * 2)) - Math.PI);
            
            if (angleDiff < Math.PI / 12) { // Within sweep cone
                radarSweep.detectedBlips.push({
                    x: x,
                    y: y,
                    timestamp: Date.now(),
                    aircraft: ac
                });
                
                // Generate alert for new detection
                createAlert(`Aircraft detected: ${ac.entity.name}`, 'low');
            }
        }
    });
}

// Initialize alert system
function initAlertSystem() {
    // Create audio context for alert sounds
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        
        alertSound = {
            ctx: audioCtx,
            playBeep: function() {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.2);
            }
        };
    } catch (error) {
        console.warn('Audio context failed:', error);
        alertSound = { playBeep: () => {} }; // Fallback
    }
    
    console.log('🚨 Alert system initialized');
}

// Create new alert
function createAlert(message, priority = 'low') {
    const alertContainer = document.getElementById('alerts-container');
    
    // Remove oldest alerts if at max capacity
    const existingAlerts = alertContainer.children;
    while (existingAlerts.length >= 5) {
        alertContainer.removeChild(existingAlerts[0]);
    }
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert priority-${priority}`;
    
    const now = new Date();
    const timeString = now.toTimeString().substring(0, 8);
    
    alertElement.innerHTML = `
        <div class="alert-header">${getPriorityLabel(priority)}</div>
        <div class="alert-time">${timeString}</div>
        <div>${message}</div>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Play sound for medium/high priority alerts
    if (priority === 'medium' || priority === 'high') {
        alertSound.playBeep();
    }
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.style.animation = 'alertFadeOut 0.3s ease-out';
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertContainer.removeChild(alertElement);
                }
            }, 300);
        }
    }, 10000);
    
    console.log(`🚨 Alert: [${priority.toUpperCase()}] ${message}`);
}

function getPriorityLabel(priority) {
    switch (priority) {
        case 'high': return '⚠️ CRITICAL';
        case 'medium': return '⚡ WARNING';
        case 'low': 
        default: return 'ℹ️ INFO';
    }
}

// Aircraft trail visualization
function showAircraftTrail(aircraftData) {
    if (!aircraftData || !aircraftData.icao24) return;
    
    const trailPositions = aircraftTrails.get(aircraftData.icao24) || [];
    if (trailPositions.length < 2) return;
    
    // Remove existing trail
    const existingTrail = viewer.entities.getById(`trail_${aircraftData.icao24}`);
    if (existingTrail) {
        viewer.entities.remove(existingTrail);
    }
    
    // Create new polyline trail
    const trailEntity = viewer.entities.add({
        id: `trail_${aircraftData.icao24}`,
        polyline: {
            positions: trailPositions,
            width: 2,
            material: new Cesium.Color(0, 1, 1, 0.7), // Cyan color with transparency
            clampToGround: false,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        }
    });
    
    console.log(`✈️ Showing trail for ${aircraftData.entity.name}`);
}

// Hide aircraft trail
function hideAircraftTrail(icao24) {
    const existingTrail = viewer.entities.getById(`trail_${icao24}`);
    if (existingTrail) {
        viewer.entities.remove(existingTrail);
    }
}

// Update HUD display
function updateHUD() {
    const aircraftCount = aircraft.filter(ac => ac.entity && ac.entity.show).length;
    const satelliteCount = satelliteTracker ? satelliteTracker.satellites.length : 0;
    
    document.getElementById('aircraft-count').textContent = aircraftCount;
    document.getElementById('satellite-count').textContent = satelliteCount;
}

// Visual enhancement shaders and post-processing
function setupPostProcessing() {
    // Create post-process stages for different viewing modes
    
    // Night Vision Goggles shader
    const nvgShader = new Cesium.PostProcessStage({
        fragmentShader: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;
            
            void main() {
                vec4 color = texture(colorTexture, v_textureCoordinates);
                
                // Convert to luminance
                float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                
                // Green phosphor effect
                vec3 nvgColor = vec3(0.0, lum * 2.0, 0.0);
                
                // Add noise for realism
                float noise = fract(sin(dot(v_textureCoordinates, vec2(12.9898, 78.233))) * 43758.5453);
                nvgColor += (noise - 0.5) * 0.1;
                
                // Vignette effect
                float dist = distance(v_textureCoordinates, vec2(0.5));
                float vignette = smoothstep(0.8, 0.2, dist);
                
                out_FragColor = vec4(nvgColor * vignette, 1.0);
            }
        `,
        name: 'NVG'
    });
    
    // FLIR thermal imaging shader  
    const flirShader = new Cesium.PostProcessStage({
        fragmentShader: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;
            
            void main() {
                vec4 color = texture(colorTexture, v_textureCoordinates);
                float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                
                // Thermal color mapping
                vec3 thermalColor;
                if (lum < 0.2) {
                    thermalColor = vec3(0.0, 0.0, 0.5); // Cold - blue
                } else if (lum < 0.4) {
                    thermalColor = vec3(0.0, 0.5, 0.8); // Cool - cyan
                } else if (lum < 0.6) {
                    thermalColor = vec3(1.0, 1.0, 0.0); // Warm - yellow
                } else {
                    thermalColor = vec3(1.0, 0.2, 0.0); // Hot - red
                }
                
                out_FragColor = vec4(thermalColor, 1.0);
            }
        `,
        name: 'FLIR'
    });
    
    viewer.scene.postProcessStages.add(nvgShader);
    viewer.scene.postProcessStages.add(flirShader);
    
    // Disable by default
    nvgShader.enabled = false;
    flirShader.enabled = false;
    
    // Store references for mode switching
    window.visualShaders = { nvgShader, flirShader };
}

// Update aircraft positions (simulated movement)
async function updateAircraftData() {
    // In a real implementation, this would fetch fresh data from OpenSky
    // For demo, we'll simulate aircraft movement
    aircraft.forEach(ac => {
        if (ac.entity && ac.velocity > 0) {
            // Simple movement simulation
            const currentPos = ac.entity.position.getValue(Cesium.JulianDate.now());
            const cartographic = Cesium.Cartographic.fromCartesian(currentPos);
            const oldHeight = cartographic.height;
            
            // Move aircraft based on heading and velocity
            const deltaLon = (ac.velocity * Math.sin(Cesium.Math.toRadians(ac.heading)) / 111000) * 0.01;
            const deltaLat = (ac.velocity * Math.cos(Cesium.Math.toRadians(ac.heading)) / 111000) * 0.01;
            
            // Simulate slight altitude changes
            const altChange = (Math.random() - 0.5) * 100; // ±50m variation
            const newHeight = Math.max(1000, oldHeight + altChange);
            
            const newPosition = Cesium.Cartesian3.fromDegrees(
                Cesium.Math.toDegrees(cartographic.longitude) + deltaLon,
                Cesium.Math.toDegrees(cartographic.latitude) + deltaLat,
                newHeight
            );
            
            ac.entity.position = new Cesium.ConstantProperty(newPosition);
            
            // Update position history for trails (keep last 20 positions)
            let trail = aircraftTrails.get(ac.icao24) || [];
            trail.push(newPosition);
            if (trail.length > 20) {
                trail = trail.slice(-20);
            }
            aircraftTrails.set(ac.icao24, trail);
            
            // Check for alerts
            checkAircraftAlerts(ac, oldHeight, newHeight);
        }
    });
}

// Check for aircraft alert conditions
function checkAircraftAlerts(aircraftData, oldHeight, newHeight) {
    const now = Date.now();
    
    // Check for emergency squawk codes
    if (aircraftData.squawk) {
        const squawk = aircraftData.squawk.toString();
        let alertPriority = null;
        let alertMessage = '';
        
        switch (squawk) {
            case '7500':
                alertPriority = 'high';
                alertMessage = `HIJACK ALERT: ${aircraftData.entity.name} squawking 7500`;
                break;
            case '7600':
                alertPriority = 'medium';
                alertMessage = `COMM FAILURE: ${aircraftData.entity.name} squawking 7600`;
                break;
            case '7700':
                alertPriority = 'high';
                alertMessage = `EMERGENCY: ${aircraftData.entity.name} squawking 7700`;
                break;
        }
        
        if (alertPriority && (!aircraftData.lastAlert || now - aircraftData.lastAlert > 60000)) {
            createAlert(alertMessage, alertPriority);
            aircraftData.lastAlert = now;
        }
    }
    
    // Check for unusual altitude changes (>500m/update cycle)
    const altChange = Math.abs(newHeight - oldHeight);
    if (altChange > 500 && (!aircraftData.lastAlert || now - aircraftData.lastAlert > 30000)) {
        const direction = newHeight > oldHeight ? 'climbing' : 'descending';
        createAlert(`Rapid altitude change: ${aircraftData.entity.name} ${direction} ${Math.round(altChange)}m`, 'medium');
        aircraftData.lastAlert = now;
    }
    
    // Check if aircraft entering view (first time detected)
    if (!aircraftData.inView) {
        aircraftData.inView = true;
        createAlert(`Aircraft entering view: ${aircraftData.entity.name}`, 'low');
    }
}

// Event handlers for user interaction
function setupEventHandlers() {
    // Display mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchDisplayMode(mode);
            
            // Update button states
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Layer toggle buttons
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layer = btn.dataset.layer;
            toggleLayer(layer);
            btn.classList.toggle('active');
        });
    });
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const coords = JSON.parse(btn.dataset.coords);
            const cityCode = btn.textContent.toLowerCase(); // SFO, LDN, TYO, NYC
            flyToLocation(coords[0], coords[1], coords[2]);
            
            // Show mission briefing after a brief delay
            setTimeout(() => {
                showMissionBriefing(cityCode);
            }, 2500);
            
            // Play navigation ping
            if (window.audioManager) {
                window.audioManager.playPing();
            }
        });
    });
    
    // Search functionality
    document.getElementById('search-btn').addEventListener('click', performSearch);
    document.getElementById('search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case '1': switchDisplayMode('normal'); break;
            case '2': switchDisplayMode('nvg'); break;
            case '3': switchDisplayMode('flir'); break;
            case '4': switchDisplayMode('crt'); break;
            case '5': switchDisplayMode('anime'); break;
            case 'g': case 'G': toggleLayer('god-mode'); break;
            case 'w': case 'W': toggleLayer('weather'); break;
            case 'r': case 'R': resetView(); break;
            case 'f': case 'F': toggleFullscreen(); break;
        }
    });
    
    // Radar toggle button - skip if element doesn't exist
    const radarToggle = document.getElementById('radar-toggle');
    if (radarToggle) {
        radarToggle.addEventListener('click', () => {
            toggleLayer('radar');
            radarToggle.classList.toggle('active');
        });
    }
    
    // Audio controls
    setupAudioControls();
    
    // Entity click handler
    viewer.selectedEntityChanged.addEventListener(() => {
        if (viewer.selectedEntity) {
            showEntityPopup(viewer.selectedEntity);
            
            // Show aircraft trail if it's an aircraft
            const aircraftData = aircraft.find(ac => ac.entity === viewer.selectedEntity);
            if (aircraftData) {
                // Hide previous trail
                if (selectedAircraft && selectedAircraft !== aircraftData) {
                    hideAircraftTrail(selectedAircraft.icao24);
                }
                
                selectedAircraft = aircraftData;
                showAircraftTrail(aircraftData);
            } else {
                // Hide trail if selecting something else
                if (selectedAircraft) {
                    hideAircraftTrail(selectedAircraft.icao24);
                    selectedAircraft = null;
                }
            }
        } else {
            // Hide trail when deselecting
            if (selectedAircraft) {
                hideAircraftTrail(selectedAircraft.icao24);
                selectedAircraft = null;
            }
        }
    });
    
    // Ground click handler for satellite pass prediction
    viewer.cesiumWidget.screenSpaceEventHandler.setInputAction((click) => {
        const pickedPosition = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
        if (pickedPosition) {
            const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude);
            
            // Show satellite pass prediction for this location
            if (satelliteTracker) {
                showSatellitePassPrediction(longitude, latitude);
            }
        }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

// Show satellite pass prediction for a clicked location
function showSatellitePassPrediction(longitude, latitude) {
    const passes = satelliteTracker.predictPasses(longitude, latitude, 1); // Next 1 hour
    
    if (passes.length === 0) {
        createAlert(`No satellite passes predicted for ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° in the next hour`, 'low');
        return;
    }
    
    // Create pass prediction popup
    const popup = document.createElement('div');
    popup.className = 'satellite-pass-popup';
    popup.innerHTML = `
        <div class="pass-popup-content">
            <div class="pass-header">
                <h3>🛰️ SATELLITE PASS PREDICTION</h3>
                <span class="pass-close">&times;</span>
            </div>
            <div class="pass-location">
                <strong>Location:</strong> ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°
            </div>
            <div class="pass-list">
                ${passes.slice(0, 5).map(pass => `
                    <div class="pass-item">
                        <div class="pass-satellite">${pass.satellite}</div>
                        <div class="pass-time">
                            Start: ${pass.startTime.toLocaleTimeString()}<br>
                            Max: ${pass.maxElevationTime.toLocaleTimeString()} (${pass.maxElevation.toFixed(1)}°)<br>
                            End: ${pass.endTime.toLocaleTimeString()}
                        </div>
                    </div>
                `).join('')}
            </div>
            ${passes.length > 5 ? `<div class="pass-more">... and ${passes.length - 5} more passes</div>` : ''}
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Close handlers
    popup.querySelector('.pass-close').onclick = () => {
        popup.remove();
    };
    
    popup.onclick = (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    };
    
    // Auto close after 10 seconds
    setTimeout(() => {
        if (popup.parentNode) {
            popup.remove();
        }
    }, 10000);
    
    // Draw pass arcs for the first few satellites
    drawSatellitePassArcs(longitude, latitude, passes.slice(0, 3));
    
    console.log(`🛰️ Showing ${passes.length} satellite passes for ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
}

// Draw predicted satellite pass arcs
function drawSatellitePassArcs(longitude, latitude, passes) {
    // Remove old pass arc entities
    viewer.entities.values.forEach(entity => {
        if (entity.name && entity.name.includes('Pass Arc')) {
            viewer.entities.remove(entity);
        }
    });
    
    passes.forEach((pass, index) => {
        if (pass.path && pass.path.length > 0) {
            const positions = pass.path.map(point => 
                Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, 0)
            );
            
            const color = index === 0 ? Cesium.Color.YELLOW : 
                         index === 1 ? Cesium.Color.CYAN : Cesium.Color.ORANGE;
            
            const passArcEntity = viewer.entities.add({
                name: `${pass.satellite} Pass Arc`,
                polyline: {
                    positions: positions,
                    width: 3,
                    material: new Cesium.PolylineDashMaterialProperty({
                        color: color,
                        dashLength: 10.0,
                        dashPattern: parseInt('1100110011001100', 2)
                    }),
                    clampToGround: true
                }
            });
            
            // Remove arc after 30 seconds
            setTimeout(() => {
                if (viewer.entities.contains(passArcEntity)) {
                    viewer.entities.remove(passArcEntity);
                }
            }, 30000);
        }
    });
}

// Switch between visual display modes
function switchDisplayMode(mode) {
    currentMode = mode;
    
    // Reset all shaders
    if (window.visualShaders) {
        window.visualShaders.nvgShader.enabled = false;
        window.visualShaders.flirShader.enabled = false;
    }
    
    // Remove CSS filter effects
    document.getElementById('cesium-container').className = '';
    
    switch(mode) {
        case 'nvg':
            if (window.visualShaders) {
                window.visualShaders.nvgShader.enabled = true;
            }
            break;
        case 'flir':
            if (window.visualShaders) {
                window.visualShaders.flirShader.enabled = true;
            }
            break;
        case 'crt':
            document.getElementById('cesium-container').classList.add('crt-mode');
            break;
        case 'anime':
            document.getElementById('cesium-container').classList.add('anime-mode');
            break;
        case 'normal':
        default:
            // Normal view - no effects
            break;
    }
    
    console.log(`🎭 Display mode: ${mode.toUpperCase()}`);
}

// Toggle data layers
function toggleLayer(layer) {
    layers[layer] = !layers[layer];
    
    switch(layer) {
        case 'aircraft':
            aircraft.forEach(ac => {
                ac.entity.show = layers.aircraft;
            });
            break;
        case 'satellites':
            if (satelliteTracker) {
                satelliteTracker.setVisible(layers.satellites);
            }
            break;
        case 'weather':
            if (weatherLayer) {
                weatherLayer.setVisible(layers.weather);
            }
            break;
        case 'god-mode':
            // Toggle labels and additional info
            aircraft.forEach(ac => {
                if (ac.entity.label) {
                    ac.entity.label.show = layers.godMode;
                }
            });
            if (satelliteTracker) {
                satelliteTracker.setLabelsVisible(layers.godMode);
            }
            break;
        case 'radar':
            radarSweep.active = layers.radar;
            const radarCanvas = document.getElementById('radar-canvas');
            if (layers.radar) {
                radarCanvas.classList.add('active');
                createAlert('Radar sweep activated', 'low');
            } else {
                radarCanvas.classList.remove('active');
                createAlert('Radar sweep deactivated', 'low');
            }
            break;
    }
    
    console.log(`📡 Layer ${layer}: ${layers[layer] ? 'ENABLED' : 'DISABLED'}`);
}

// Navigation functions
function flyToLocation(longitude, latitude, altitude) {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
        duration: 2.0
    });
}

function resetView() {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 2000),
        duration: 2.0
    });
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Search functionality
function performSearch() {
    const query = document.getElementById('search').value.trim();
    if (!query) return;
    
    // Simple coordinate search (lat,lon format)
    const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        flyToLocation(lon, lat, 2000);
        return;
    }
    
    // City search (basic implementation)
    const cities = {
        'san francisco': [-122.4, 37.77],
        'london': [0.1276, 51.5074],
        'tokyo': [139.6917, 35.6895],
        'new york': [-74.006, 40.7128],
        'paris': [2.3522, 48.8566],
        'moscow': [37.6173, 55.7558],
        'beijing': [116.4074, 39.9042],
        'sydney': [151.2093, -33.8688]
    };
    
    const city = cities[query.toLowerCase()];
    if (city) {
        flyToLocation(city[0], city[1], 2000);
    } else {
        console.log('🔍 Location not found:', query);
    }
}

// Entity popup (enhanced version defined later in file)

// Utility functions
function updateTimestamp() {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    document.getElementById('timestamp').textContent = timestamp;
}

function updateLoadingStatus(status) {
    document.getElementById('loading-status').textContent = status;
}

// Audio controls setup
function setupAudioControls() {
    const muteBtn = document.getElementById('mute-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeLabel = document.getElementById('volume-label');
    
    if (!muteBtn || !volumeSlider || !volumeLabel || !window.audioManager) {
        console.warn('Audio controls not found or AudioManager not available');
        return;
    }
    
    // Mute button handler
    muteBtn.addEventListener('click', () => {
        const isMuted = window.audioManager.toggleMute();
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.classList.toggle('muted', isMuted);
    });
    
    // Volume slider handler
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value) / 100;
        window.audioManager.setVolume(volume);
        volumeLabel.textContent = `${e.target.value}%`;
    });
    
    // Start ambient audio after user interaction
    document.addEventListener('click', () => {
        if (window.audioManager && !window.audioManager.isAmbientPlaying) {
            window.audioManager.startAmbient();
        }
    }, { once: true });
    
    console.log('🔊 Audio controls initialized');
}

// Enhanced entity popup with decoding animation
function showEntityPopup(entity) {
    const popup = document.getElementById('entity-popup');
    const content = document.getElementById('popup-content');
    
    // Enhanced content with decoding animation
    const originalContent = entity.description || 'No additional information available.';
    
    // Apply decoding effect to the content
    const enhancedContent = originalContent.replace(
        /<p><strong>(.*?):<\/strong>\s*(.*?)<\/p>/g,
        '<p><strong>$1:</strong> <span class="decode-text">$2</span></p>'
    );
    
    content.innerHTML = enhancedContent;
    popup.style.display = 'block';
    
    // Play ping sound
    if (window.audioManager) {
        window.audioManager.playPing();
    }
    
    // Close popup handlers
    document.querySelector('.popup-close').onclick = () => {
        popup.style.display = 'none';
    };
    
    popup.onclick = (e) => {
        if (e.target === popup) {
            popup.style.display = 'none';
        }
    };
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initWorldView);

console.log('🛰️ WorldView loading...');