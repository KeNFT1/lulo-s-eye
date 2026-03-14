// WorldView - Spy Satellite Simulator (Fixed Version)
// Military-grade 3D Earth visualization with live data

// Configuration - ADD YOUR API KEYS HERE
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NTQ2N2RmOC1lYjczLTQyMDgtOWEzMy04NDY2YWU3ZjdiNWYiLCJpZCI6NDAzNTA5LCJpYXQiOjE3NzM0ODEzMTJ9.UmgxGBCO1zYXaIg9iO6eoJ3LdpAXLTUBliDFwuoCjZs'; // Get from: https://ion.cesium.com/signup
const GOOGLE_MAPS_API_KEY = 'AIzaSyBmQ5GnQO5L_H7Q8V2kN-X9bEa9c1d2f3g4'; // Demo key - replace with real one
const OPENWEATHERMAP_API_KEY = 'demo_weather_key'; // Get from: https://openweathermap.org/api

// Global state
let viewer;
let aircraft = [];
let satellites = [];
let satelliteTracker = null;
let weatherLayer = null;
let shadowBroker = null;
let currentMode = 'normal';
let layers = {
    aircraft: true,
    satellites: true,
    ships: true,
    jamming: true,
    cctv: true,
    weather: false,
    traffic: false,
    godMode: false,
    radar: false
};

// Make layers globally accessible
window.layers = layers;

// Initialize WorldView with robust error handling
async function initWorldView() {
    try {
        updateLoadingStatus('Initializing Cesium...');
        
        // Set Cesium Ion token
        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

        // Create the 3D viewer with minimal config to avoid failures
        viewer = new Cesium.Viewer('cesium-container', {
            // Disable UI elements that might cause issues
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
        });

        // Set initial camera position (NYC)
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 2000000)
        });

        updateLoadingStatus('Setting up visual enhancements...');
        setupBasicVisualEnhancements();
        
        updateLoadingStatus('Loading aircraft data...');
        try {
            await loadAircraftDataSafe();
        } catch (e) {
            console.warn('Aircraft data failed, continuing...', e);
            createAlert('Aircraft data unavailable', 'low');
        }
        
        updateLoadingStatus('Initializing satellite tracking...');
        try {
            await initializeSatellitesSafe();
        } catch (e) {
            console.warn('Satellite tracking failed, continuing...', e);
            createAlert('Satellite tracking offline', 'low');
        }
        
        updateLoadingStatus('Displaying entities...');
        // Force display aircraft and satellites
        if (aircraft.length > 0) {
            displayAircraft();
        }
        if (satellites.length > 0) {
            displaySatellites();
        }
        
        updateLoadingStatus('Setting up controls...');
        setupEventHandlers();
        
        updateLoadingStatus('Connecting to ShadowBroker...');
        // Initialize ShadowBroker integration
        shadowBroker = new ShadowBrokerIntegration(viewer);
        const shadowBrokerOnline = await shadowBroker.initialize();
        
        updateLoadingStatus('Finalizing systems...');
        
        // Start basic update cycles
        setInterval(updateTimestamp, 1000);
        setInterval(updateHUD, 5000);
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            if (shadowBrokerOnline) {
                createAlert('WORLDVIEW operational with live intelligence feeds', 'high');
            } else {
                createAlert('WORLDVIEW operational in fallback mode', 'medium');
            }
            console.log('🛰️ WORLDVIEW initialized - READY FOR OPERATIONS');
        }, 1000);
        
    } catch (error) {
        console.error('Failed to initialize WorldView:', error);
        document.getElementById('loading-status').textContent = 'Initialization failed - switching to backup systems...';
        
        // Fallback mode
        setTimeout(() => {
            initializeBackupMode();
        }, 2000);
    }
}

// Safe aircraft data loading with fallback
async function loadAircraftDataSafe() {
    try {
        const response = await fetch('https://opensky-network.org/api/states/all?extended=1');
        if (!response.ok) throw new Error('OpenSky API unavailable');
        
        const data = await response.json();
        if (data.states) {
            aircraft = data.states.slice(0, 50).map(state => ({
                callsign: state[1] ? state[1].trim() : 'UNKNOWN',
                longitude: state[5],
                latitude: state[6],
                altitude: state[7] ? state[7] * 3.28084 : 0, // Convert to feet
                velocity: state[9] ? state[9] * 2.237 : 0,   // Convert to mph
                track: state[10] || 0,
                country: state[2] || 'Unknown'
            })).filter(a => a.longitude && a.latitude);
            
            displayAircraft();
            console.log(`✈️ Loaded ${aircraft.length} aircraft`);
        }
    } catch (error) {
        console.warn('Aircraft loading failed:', error);
        // Create demo aircraft for fallback
        aircraft = createDemoAircraft();
        displayAircraft();
    }
}

// Demo aircraft for when API fails
function createDemoAircraft() {
    return [
        { callsign: 'UAL123', longitude: -74.0, latitude: 40.7, altitude: 35000, velocity: 520, track: 90, country: 'US' },
        { callsign: 'DAL456', longitude: -118.2, latitude: 34.0, altitude: 38000, velocity: 480, track: 270, country: 'US' },
        { callsign: 'BAW789', longitude: -0.1, latitude: 51.5, altitude: 41000, velocity: 550, track: 45, country: 'GB' },
        { callsign: 'AFR447', longitude: 2.3, latitude: 48.8, altitude: 39000, velocity: 510, track: 180, country: 'FR' },
        { callsign: 'LUF123', longitude: 8.5, latitude: 50.1, altitude: 37000, velocity: 495, track: 315, country: 'DE' },
        { callsign: 'JPA321', longitude: 139.7, latitude: 35.7, altitude: 41000, velocity: 540, track: 270, country: 'JP' },
        { callsign: 'SWA456', longitude: -97.0, latitude: 32.8, altitude: 36000, velocity: 505, track: 225, country: 'US' },
        { callsign: 'EAL789', longitude: -80.2, latitude: 25.8, altitude: 38000, velocity: 485, track: 45, country: 'US' }
    ];
}

// Create aircraft icon as data URL
function createAircraftIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    
    // Draw aircraft silhouette
    ctx.fillStyle = '#00FFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    
    // Simple aircraft shape
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(18, 20);
    ctx.lineTo(15, 18);
    ctx.lineTo(12, 22);
    ctx.lineTo(9, 18);
    ctx.lineTo(6, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Wings
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(18, 12);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    return canvas.toDataURL();
}

// Create satellite icon as data URL
function createSatelliteIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    
    // Draw satellite
    ctx.fillStyle = '#FFFF00';
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    
    // Main body
    ctx.fillRect(8, 8, 4, 4);
    ctx.strokeRect(8, 8, 4, 4);
    
    // Solar panels
    ctx.fillRect(4, 9, 3, 2);
    ctx.fillRect(13, 9, 3, 2);
    ctx.strokeRect(4, 9, 3, 2);
    ctx.strokeRect(13, 9, 3, 2);
    
    return canvas.toDataURL();
}

// Safe satellite initialization
async function initializeSatellitesSafe() {
    try {
        // Create simple satellite demo data if external data fails
        satellites = [
            { name: 'ISS', longitude: -45.0, latitude: 15.0, altitude: 408000 },
            { name: 'HUBBLE', longitude: 12.0, latitude: -23.0, altitude: 547000 },
            { name: 'GPS-1', longitude: 0.0, latitude: 0.0, altitude: 20200000 }
        ];
        
        displaySatellites();
        console.log(`🛰️ Loaded ${satellites.length} satellites`);
    } catch (error) {
        console.warn('Satellite initialization failed:', error);
    }
}

// Display aircraft on globe
function displayAircraft() {
    if (!viewer) return;
    
    console.log(`🛩️ Displaying ${aircraft.length} aircraft on globe`);
    
    // Clear existing aircraft entities
    const entities = viewer.entities.values;
    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i].id && entities[i].id.startsWith('aircraft_')) {
            viewer.entities.remove(entities[i]);
        }
    }
    
    // Add aircraft entities with enhanced visuals
    aircraft.forEach((plane, index) => {
        if (!plane.longitude || !plane.latitude) return;
        
        const altitude = (plane.altitude || 35000) * 0.3048; // Convert feet to meters
        
        viewer.entities.add({
            id: `aircraft_${index}`,
            position: Cesium.Cartesian3.fromDegrees(plane.longitude, plane.latitude, altitude),
            
            // Aircraft icon
            billboard: {
                image: createAircraftIcon(),
                show: layers.aircraft,
                scale: 0.8,
                color: Cesium.Color.CYAN,
                heightReference: Cesium.HeightReference.NONE,
                rotation: Cesium.Math.toRadians(plane.track || 0)
            },
            
            // Backup point if billboard fails
            point: {
                pixelSize: 12,
                color: Cesium.Color.CYAN,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE,
                show: layers.aircraft
            },
            
            // Aircraft label
            label: {
                text: `${plane.callsign || 'UNKNOWN'}\n${Math.round(plane.altitude || 35000)}ft\n${Math.round(plane.velocity || 500)}mph`,
                font: '12px Courier New',
                fillColor: Cesium.Color.CYAN,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                show: layers.godMode && layers.aircraft,
                scale: 0.8
            },
            
            // Flight path line
            polyline: {
                positions: [
                    Cesium.Cartesian3.fromDegrees(plane.longitude - 0.5, plane.latitude - 0.5, altitude),
                    Cesium.Cartesian3.fromDegrees(plane.longitude, plane.latitude, altitude)
                ],
                width: 2,
                material: Cesium.Color.CYAN.withAlpha(0.6),
                show: layers.aircraft && layers.godMode
            }
        });
    });
    
    console.log(`✈️ ${aircraft.filter(p => p.longitude && p.latitude).length} aircraft displayed`);
}

// Display satellites on globe
function displaySatellites() {
    if (!viewer) return;
    
    console.log(`🛰️ Displaying ${satellites.length} satellites on globe`);
    
    // Clear existing satellite entities
    const entities = viewer.entities.values;
    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i].id && entities[i].id.startsWith('satellite_')) {
            viewer.entities.remove(entities[i]);
        }
    }
    
    satellites.forEach((satellite, index) => {
        if (!satellite.longitude || !satellite.latitude) return;
        
        const altitude = satellite.altitude || 400000; // Default 400km
        
        viewer.entities.add({
            id: `satellite_${index}`,
            position: Cesium.Cartesian3.fromDegrees(satellite.longitude, satellite.latitude, altitude),
            
            // Satellite icon
            billboard: {
                image: createSatelliteIcon(),
                show: layers.satellites,
                scale: 0.6,
                color: Cesium.Color.YELLOW,
                heightReference: Cesium.HeightReference.NONE
            },
            
            // Backup point if billboard fails
            point: {
                pixelSize: 10,
                color: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.RED,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE,
                show: layers.satellites
            },
            
            // Satellite label
            label: {
                text: `${satellite.name || 'SAT'}\n${Math.round(altitude/1000)}km`,
                font: '10px Courier New',
                fillColor: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -15),
                show: layers.godMode && layers.satellites,
                scale: 0.8
            },
            
            // Orbital path approximation
            ellipse: {
                semiMajorAxis: 100000,
                semiMinorAxis: 100000,
                material: Cesium.Color.YELLOW.withAlpha(0.2),
                outline: true,
                outlineColor: Cesium.Color.YELLOW.withAlpha(0.5),
                show: layers.satellites && layers.godMode
            }
        });
    });
    
    console.log(`🛰️ ${satellites.length} satellites displayed`);
}

// Basic visual enhancements
function setupBasicVisualEnhancements() {
    if (!viewer) return;
    
    // Enhanced globe appearance
    viewer.scene.globe.enableLighting = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0001;
    
    // Dark space background
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    
    console.log('✨ Basic visual enhancements applied');
}

// Event handlers for user interaction
function setupEventHandlers() {
    // Setup navigation controls
    setupNavigationControls();
    
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        switch(event.key.toLowerCase()) {
            case '1':
                setVisualMode('normal');
                break;
            case '2':
                setVisualMode('nightvision');
                break;
            case '3':
                setVisualMode('thermal');
                break;
            case '4':
                setVisualMode('crt');
                break;
            case 'g':
                toggleGodMode();
                break;
            case 'h':
                toggleControlsOverlay();
                break;
            case 'f':
                toggleFullscreen();
                break;
            case 'a':
                toggleAircraftLayer();
                break;
            case 's':
                toggleSatelliteLayer();
                break;
            case 'w':
                toggleWeatherLayer();
                break;
            case 'n':
                toggleShipsLayer();
                break;
            case 'j':
                toggleJammingLayer();
                break;
            case 'c':
                toggleCCTVLayer();
                break;
            case 'l':
                const searchInput = document.getElementById('address-search');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
                break;
            case 'm':
                getCurrentLocation();
                break;
            case 'r':
                resetToNYC();
                break;
            case 'escape':
                hideControlsOverlay();
                break;
            case ' ':
                event.preventDefault();
                toggleTracking();
                break;
        }
    });
    
    // Quick navigation buttons
    const quickNavButtons = {
        'sfo-btn': () => flyToCity(-122.4194, 37.7749, 'San Francisco'),
        'ldn-btn': () => flyToCity(-0.1278, 51.5074, 'London'),
        'tyo-btn': () => flyToCity(139.6503, 35.6762, 'Tokyo'),
        'nyc-btn': () => flyToCity(-74.006, 40.7128, 'New York')
    };
    
    Object.entries(quickNavButtons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    });
    
    console.log('🎮 Event handlers initialized');
}

// Visual mode switching
function setVisualMode(mode) {
    currentMode = mode;
    
    if (!viewer) return;
    
    // Apply visual filters based on mode
    switch(mode) {
        case 'nightvision':
            document.body.style.filter = 'sepia(1) hue-rotate(60deg) saturate(3)';
            createAlert('Night vision mode activated', 'medium');
            break;
        case 'thermal':
            document.body.style.filter = 'sepia(1) hue-rotate(290deg) saturate(2)';
            createAlert('Thermal imaging mode activated', 'medium');
            break;
        default:
            document.body.style.filter = '';
            createAlert('Optical mode activated', 'medium');
    }
    
    // Update mode indicator
    const modeIndicator = document.querySelector('.mode-indicator');
    if (modeIndicator) {
        modeIndicator.textContent = mode.toUpperCase();
    }
}

// Toggle god mode (labels and overlays)
function toggleGodMode() {
    layers.godMode = !layers.godMode;
    
    if (!viewer) return;
    
    // Update all entity labels and enhanced visuals
    const entities = viewer.entities.values;
    entities.forEach(entity => {
        if (entity.id && entity.id.startsWith('aircraft_')) {
            if (entity.label) entity.label.show = layers.godMode && layers.aircraft;
            if (entity.polyline) entity.polyline.show = layers.aircraft && layers.godMode;
        } else if (entity.id && entity.id.startsWith('satellite_')) {
            if (entity.label) entity.label.show = layers.godMode && layers.satellites;
            if (entity.ellipse) entity.ellipse.show = layers.satellites && layers.godMode;
        }
    });
    
    createAlert(layers.godMode ? 'God mode enabled - Enhanced overlay active' : 'God mode disabled - Minimal display', 'medium');
}

// Fly to specific city
function flyToCity(longitude, latitude, cityName) {
    if (!viewer) return;
    
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 15000),
        duration: 3.0
    });
    
    createAlert(`Flying to ${cityName}`, 'medium');
}

// Reset camera to NYC
function resetToNYC() {
    flyToCity(-74.006, 40.7128, 'New York City');
}

// Create alert notifications
function createAlert(message, priority) {
    const alertContainer = document.getElementById('alert-system');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${priority}`;
    alert.innerHTML = `
        <span class="alert-time">${new Date().toLocaleTimeString()}</span>
        <span class="alert-message">${message}</span>
    `;
    
    alertContainer.appendChild(alert);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
    
    console.log(`🚨 Alert [${priority.toUpperCase()}]: ${message}`);
}

// Update loading status
function updateLoadingStatus(status) {
    const statusElement = document.getElementById('loading-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
    console.log(`📡 ${status}`);
}

// Update timestamp display
function updateTimestamp() {
    const timestampElement = document.getElementById('timestamp');
    if (timestampElement) {
        timestampElement.textContent = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }
}

// Update HUD information
function updateHUD() {
    // Update aircraft count
    const aircraftCount = document.querySelector('.stat-value[data-stat="aircraft"]');
    if (aircraftCount) {
        aircraftCount.textContent = aircraft.length;
    }
    
    // Update satellite count
    const satelliteCount = document.querySelector('.stat-value[data-stat="satellites"]');
    if (satelliteCount) {
        satelliteCount.textContent = satellites.length;
    }
    
    // Update current time
    const currentTime = document.querySelector('.stat-value[data-stat="time"]');
    if (currentTime) {
        currentTime.textContent = new Date().toLocaleTimeString();
    }
}

// Backup mode when full initialization fails
function initializeBackupMode() {
    document.getElementById('loading').style.display = 'none';
    
    // Show simplified interface
    const container = document.getElementById('cesium-container');
    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #000; color: #00ff00; font-family: monospace; text-align: center; flex-direction: column;">
            <h2>🛰️ WORLDVIEW - BACKUP MODE</h2>
            <p>Primary systems offline - operating in fallback configuration</p>
            <div style="margin: 20px 0;">
                <button onclick="location.reload()" style="background: #003300; color: #00ff00; border: 1px solid #00ff00; padding: 10px 20px; font-family: monospace;">
                    RETRY INITIALIZATION
                </button>
            </div>
            <div style="margin-top: 40px; font-size: 12px; opacity: 0.7;">
                <p>System Status: DEGRADED</p>
                <p>Aircraft Tracking: OFFLINE</p>
                <p>Satellite Network: OFFLINE</p>
                <p>3D Visualization: OFFLINE</p>
            </div>
        </div>
    `;
    
    createAlert('Operating in backup mode', 'high');
    console.log('🔴 WORLDVIEW running in backup mode');
}

// Controls overlay functions
function toggleControlsOverlay() {
    const overlay = document.getElementById('controls-overlay');
    const hint = document.getElementById('help-hint');
    
    if (overlay.classList.contains('show')) {
        hideControlsOverlay();
    } else {
        showControlsOverlay();
    }
}

function showControlsOverlay() {
    const overlay = document.getElementById('controls-overlay');
    const hint = document.getElementById('help-hint');
    
    overlay.classList.add('show');
    hint.style.display = 'none';
    createAlert('Controls overlay opened', 'low');
}

function hideControlsOverlay() {
    const overlay = document.getElementById('controls-overlay');
    const hint = document.getElementById('help-hint');
    
    overlay.classList.remove('show');
    hint.style.display = 'block';
}

// Additional control functions
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        createAlert('Fullscreen mode enabled', 'medium');
    } else {
        document.exitFullscreen();
        createAlert('Fullscreen mode disabled', 'medium');
    }
}

function toggleAircraftLayer() {
    layers.aircraft = !layers.aircraft;
    
    if (!viewer) return;
    
    // Use ShadowBroker data if available, otherwise fallback to demo
    if (shadowBroker) {
        shadowBroker.showAircraft(layers.aircraft);
    } else {
        // Update fallback aircraft display
        const entities = viewer.entities.values;
        entities.forEach(entity => {
            if (entity.id && entity.id.startsWith('aircraft_')) {
                if (entity.billboard) entity.billboard.show = layers.aircraft;
                if (entity.point) entity.point.show = layers.aircraft;
                if (entity.label) entity.label.show = layers.godMode && layers.aircraft;
                if (entity.polyline) entity.polyline.show = layers.aircraft && layers.godMode;
            }
        });
        
        // If enabling and no aircraft exist, reload them
        if (layers.aircraft && aircraft.length > 0) {
            displayAircraft();
        }
    }
    
    updateHUD(); // Update aircraft count display
    createAlert(layers.aircraft ? 'Aircraft intelligence enabled' : 'Aircraft intelligence disabled', 'medium');
}

function toggleSatelliteLayer() {
    layers.satellites = !layers.satellites;
    
    if (!viewer) return;
    
    // Use ShadowBroker data if available, otherwise fallback to demo
    if (shadowBroker) {
        shadowBroker.showSatellites(layers.satellites);
    } else {
        // Update fallback satellite display
        const entities = viewer.entities.values;
        entities.forEach(entity => {
            if (entity.id && entity.id.startsWith('satellite_')) {
                if (entity.billboard) entity.billboard.show = layers.satellites;
                if (entity.point) entity.point.show = layers.satellites;
                if (entity.label) entity.label.show = layers.godMode && layers.satellites;
                if (entity.ellipse) entity.ellipse.show = layers.satellites && layers.godMode;
            }
        });
        
        // If enabling and no satellites exist, reload them
        if (layers.satellites && satellites.length > 0) {
            displaySatellites();
        }
    }
    
    updateHUD(); // Update satellite count display
    createAlert(layers.satellites ? 'Satellite constellation enabled' : 'Satellite constellation disabled', 'medium');
}

function toggleWeatherLayer() {
    layers.weather = !layers.weather;
    
    if (!viewer) return;
    
    if (layers.weather) {
        // Add demo weather markers
        addWeatherDemo();
    } else {
        // Remove weather entities
        const entities = viewer.entities.values;
        for (let i = entities.length - 1; i >= 0; i--) {
            if (entities[i].id && entities[i].id.startsWith('weather_')) {
                viewer.entities.remove(entities[i]);
            }
        }
    }
    
    createAlert(layers.weather ? 'Weather layer enabled' : 'Weather layer disabled', 'medium');
}

function toggleShipsLayer() {
    layers.ships = !layers.ships;
    
    if (shadowBroker) {
        shadowBroker.showShips(layers.ships);
    }
    
    createAlert(layers.ships ? 'Naval intelligence enabled' : 'Naval intelligence disabled', 'medium');
}

function toggleJammingLayer() {
    layers.jamming = !layers.jamming;
    
    if (shadowBroker) {
        shadowBroker.showJamming(layers.jamming);
    }
    
    createAlert(layers.jamming ? 'GPS jamming zones enabled' : 'GPS jamming zones disabled', 'medium');
}

function toggleCCTVLayer() {
    layers.cctv = !layers.cctv;
    
    if (shadowBroker) {
        shadowBroker.showCCTV(layers.cctv);
    }
    
    createAlert(layers.cctv ? 'CCTV surveillance enabled' : 'CCTV surveillance disabled', 'medium');
}

// Add demo weather data
function addWeatherDemo() {
    const weatherPoints = [
        { name: 'Storm Front', lon: -95.0, lat: 39.0, type: 'storm' },
        { name: 'High Pressure', lon: -80.0, lat: 35.0, type: 'clear' },
        { name: 'Low Pressure', lon: -110.0, lat: 45.0, type: 'cloudy' },
        { name: 'Hurricane Watch', lon: -75.0, lat: 25.0, type: 'hurricane' }
    ];
    
    weatherPoints.forEach((weather, index) => {
        viewer.entities.add({
            id: `weather_${index}`,
            position: Cesium.Cartesian3.fromDegrees(weather.lon, weather.lat, 10000),
            point: {
                pixelSize: 15,
                color: getWeatherColor(weather.type),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE
            },
            label: {
                text: weather.name,
                font: '12px Courier New',
                fillColor: getWeatherColor(weather.type),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                show: layers.godMode
            }
        });
    });
}

// Get weather color based on type
function getWeatherColor(type) {
    switch(type) {
        case 'storm': return Cesium.Color.RED;
        case 'hurricane': return Cesium.Color.DARKRED;
        case 'cloudy': return Cesium.Color.GRAY;
        case 'clear': return Cesium.Color.GREEN;
        default: return Cesium.Color.WHITE;
    }
}

function toggleTracking() {
    // Toggle all tracking layers
    const allEnabled = layers.aircraft && layers.satellites;
    layers.aircraft = !allEnabled;
    layers.satellites = !allEnabled;
    
    toggleAircraftLayer();
    toggleSatelliteLayer();
    
    createAlert(allEnabled ? 'All tracking paused' : 'All tracking resumed', 'high');
}

// Enhanced visual modes
function setVisualMode(mode) {
    currentMode = mode;
    
    if (!viewer) return;
    
    // Apply visual filters based on mode
    switch(mode) {
        case 'nightvision':
            document.body.style.filter = 'sepia(1) hue-rotate(60deg) saturate(3) brightness(1.2)';
            createAlert('Night vision mode activated', 'medium');
            break;
        case 'thermal':
            document.body.style.filter = 'sepia(1) hue-rotate(290deg) saturate(2) contrast(1.5)';
            createAlert('Thermal imaging mode activated', 'medium');
            break;
        case 'crt':
            document.body.style.filter = 'sepia(0.2) contrast(1.8) brightness(0.8)';
            document.body.style.background = 'radial-gradient(circle, #001100 0%, #000000 70%)';
            createAlert('CRT monitor mode activated', 'medium');
            break;
        default:
            document.body.style.filter = '';
            document.body.style.background = '#000';
            createAlert('Optical mode activated', 'medium');
    }
    
    // Update mode indicator
    const modeIndicator = document.getElementById('mode-indicator');
    if (modeIndicator) {
        modeIndicator.textContent = mode.toUpperCase();
    }
}

// Help hint click handler
document.addEventListener('DOMContentLoaded', () => {
    const helpHint = document.getElementById('help-hint');
    if (helpHint) {
        helpHint.addEventListener('click', toggleControlsOverlay);
    }
});

// Setup navigation controls
function setupNavigationControls() {
    // Address search
    const searchInput = document.getElementById('address-search');
    const searchBtn = document.getElementById('search-btn');
    const myLocationBtn = document.getElementById('my-location-btn');
    
    if (searchInput && searchBtn) {
        // Search on button click
        searchBtn.addEventListener('click', () => {
            performAddressSearch(searchInput.value);
        });
        
        // Search on Enter key
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performAddressSearch(searchInput.value);
            }
        });
    }
    
    // My location button
    if (myLocationBtn) {
        myLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Update coordinates display
    if (viewer) {
        setupCoordinateTracking();
    }
}

// Perform address search using Nominatim (OpenStreetMap)
async function performAddressSearch(query) {
    if (!query.trim()) {
        createAlert('Please enter an address or coordinates', 'medium');
        return;
    }
    
    try {
        createAlert('Searching for location...', 'low');
        
        // Check if input looks like coordinates (lat,lon or lat lon)
        const coordMatch = query.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lon = parseFloat(coordMatch[2]);
            
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                flyToCoordinates(lat, lon, query);
                return;
            }
        }
        
        // Search using Nominatim (OpenStreetMap geocoding)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        
        if (!response.ok) {
            throw new Error('Search service unavailable');
        }
        
        const results = await response.json();
        
        if (results.length > 0) {
            const result = results[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            
            flyToCoordinates(lat, lon, result.display_name);
        } else {
            createAlert('Location not found. Try coordinates like "37.7749, -122.4194"', 'medium');
        }
        
    } catch (error) {
        console.error('Search error:', error);
        createAlert('Search failed. Try coordinates format: lat, lon', 'medium');
    }
}

// Fly to specific coordinates
function flyToCoordinates(lat, lon, locationName) {
    if (!viewer) return;
    
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 15000),
        duration: 3.0
    });
    
    // Add a temporary marker
    const marker = viewer.entities.add({
        id: 'search-result-marker',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 100),
        point: {
            pixelSize: 15,
            color: Cesium.Color.LIME,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
            text: locationName || 'Search Result',
            font: '12px Courier New',
            fillColor: Cesium.Color.LIME,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20)
        }
    });
    
    // Remove marker after 10 seconds
    setTimeout(() => {
        if (viewer.entities.getById('search-result-marker')) {
            viewer.entities.remove(marker);
        }
    }, 10000);
    
    createAlert(`Flying to: ${locationName || 'Coordinates'}`, 'medium');
}

// Get current location using browser geolocation
function getCurrentLocation() {
    if (!navigator.geolocation) {
        createAlert('Geolocation not supported by this browser', 'medium');
        return;
    }
    
    createAlert('Getting current location...', 'low');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const accuracy = Math.round(position.coords.accuracy);
            
            flyToCoordinates(lat, lon, `Current Location (±${accuracy}m)`);
        },
        (error) => {
            let message;
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Location access denied by user';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Location information unavailable';
                    break;
                case error.TIMEOUT:
                    message = 'Location request timed out';
                    break;
                default:
                    message = 'Unknown error getting location';
                    break;
            }
            createAlert(message, 'medium');
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
        }
    );
}

// Setup coordinate tracking
function setupCoordinateTracking() {
    if (!viewer) return;
    
    // Update coordinates on camera move
    viewer.camera.changed.addEventListener(() => {
        updateCoordinatesDisplay();
    });
    
    // Initial coordinate update
    updateCoordinatesDisplay();
}

// Update coordinates display
function updateCoordinatesDisplay() {
    if (!viewer) return;
    
    try {
        // Get camera position
        const cameraPosition = viewer.camera.positionWC;
        const cartographic = Cesium.Cartographic.fromCartesian(cameraPosition);
        
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const alt = cartographic.height / 1000; // Convert to kilometers
        
        // Update display
        const latElement = document.getElementById('current-lat');
        const lonElement = document.getElementById('current-lon');
        const altElement = document.getElementById('current-alt');
        
        if (latElement) latElement.textContent = lat.toFixed(5);
        if (lonElement) lonElement.textContent = lon.toFixed(5);
        if (altElement) altElement.textContent = alt.toFixed(1) + ' km';
        
    } catch (error) {
        console.warn('Error updating coordinates:', error);
    }
}

// Enhanced keyboard controls
function handleKeyboardNavigation(key) {
    switch(key.toLowerCase()) {
        case 'l': // Location search
            const searchInput = document.getElementById('address-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            break;
        case 'm': // My location
            getCurrentLocation();
            break;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛰️ Starting WORLDVIEW initialization...');
    initWorldView();
});