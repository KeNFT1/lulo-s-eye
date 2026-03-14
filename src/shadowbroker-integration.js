// ShadowBroker Integration for WorldView
// Real-time intelligence data from ShadowBroker OSINT platform

class ShadowBrokerIntegration {
    constructor(viewer) {
        this.viewer = viewer;
        this.baseUrl = 'http://localhost:8000/api/live-data';
        this.refreshInterval = 30000; // 30 seconds
        this.lastUpdate = null;
        this.entities = {
            aircraft: new Map(),
            ships: new Map(),
            satellites: new Map(),
            jamming: new Map(),
            cctv: new Map()
        };
    }

    // Initialize ShadowBroker data feeds
    async initialize() {
        try {
            console.log('🔗 Connecting to ShadowBroker intelligence feeds...');
            await this.fetchLiveData();
            this.startAutoRefresh();
            console.log('✅ ShadowBroker integration active');
            return true;
        } catch (error) {
            console.error('❌ ShadowBroker initialization failed:', error);
            return false;
        }
    }

    // Fetch real-time intelligence data
    async fetchLiveData() {
        try {
            const response = await fetch(`${this.baseUrl}/fast`);
            if (!response.ok) throw new Error('API unavailable');
            
            const data = await response.json();
            this.lastUpdate = new Date().toISOString();
            
            // Process each data type
            this.processAircraft(data.tracked_flights || []);
            this.processShips(data.ships || []);
            this.processSatellites(data.satellites || []);
            this.processJamming(data.gps_jamming || []);
            this.processCCTV(data.cctv || []);
            
            // Update UI status
            this.updateStatus(data);
            
        } catch (error) {
            console.error('ShadowBroker fetch failed:', error);
        }
    }

    // Process aircraft intelligence
    processAircraft(aircraftData) {
        console.log('🛩️ Processing aircraft data:', aircraftData.length, 'aircraft');
        
        // Clear old aircraft
        this.entities.aircraft.forEach((entity, id) => {
            this.viewer.entities.remove(entity);
        });
        this.entities.aircraft.clear();

        aircraftData.forEach((aircraft, index) => {
            if (!aircraft.lng || !aircraft.lat) return;

            const alertCategory = aircraft.alert_category || 'Unknown';
            const alertColor = aircraft.alert_color || '#ffffff';
            const isHighValue = this.isHighValueTarget(aircraft);
            
            const entity = this.viewer.entities.add({
                id: `shadowbroker_aircraft_${index}`,
                position: Cesium.Cartesian3.fromDegrees(
                    aircraft.lng, 
                    aircraft.lat, 
                    (aircraft.alt || 35000) * 0.3048
                ),
                
                // Aircraft marker
                point: {
                    pixelSize: isHighValue ? 15 : 10,
                    color: Cesium.Color.fromCssColorString(alertColor),
                    outlineColor: isHighValue ? Cesium.Color.RED : Cesium.Color.WHITE,
                    outlineWidth: isHighValue ? 3 : 1,
                    heightReference: Cesium.HeightReference.NONE,
                    scaleByDistance: new Cesium.NearFarScalar(10000, 1.0, 1000000, 0.3)
                },
                
                // Intelligence label
                label: {
                    text: this.formatAircraftLabel(aircraft),
                    font: '12px Courier New',
                    fillColor: Cesium.Color.fromCssColorString(alertColor),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    show: window.layers ? window.layers.godMode : false,
                    scale: 0.8
                },

                // Flight path
                polyline: aircraft.heading ? {
                    positions: this.createFlightPath(aircraft),
                    width: 2,
                    material: Cesium.Color.fromCssColorString(alertColor).withAlpha(0.6),
                    show: window.layers ? window.layers.godMode : false
                } : undefined
            });

            this.entities.aircraft.set(`aircraft_${index}`, entity);
        });

        console.log(`🛩️ Updated ${aircraftData.length} aircraft with intelligence data`);
    }

    // Process naval intelligence
    processShips(shipsData) {
        // Clear old ships
        this.entities.ships.forEach((entity, id) => {
            this.viewer.entities.remove(entity);
        });
        this.entities.ships.clear();

        shipsData.forEach((ship, index) => {
            if (!ship.lng || !ship.lat) return;

            const isCarrier = ship.type === 'carrier';
            const isOperational = !ship.desc.includes('maintenance');
            
            const entity = this.viewer.entities.add({
                id: `shadowbroker_ship_${index}`,
                position: Cesium.Cartesian3.fromDegrees(ship.lng, ship.lat, 0),
                
                // Ship marker
                point: {
                    pixelSize: isCarrier ? 20 : 12,
                    color: isOperational ? Cesium.Color.BLUE : Cesium.Color.GRAY,
                    outlineColor: isCarrier ? Cesium.Color.RED : Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                
                // Ship intelligence
                label: {
                    text: `${ship.name}\n${ship.type.toUpperCase()}\n${ship.desc}`,
                    font: '10px Courier New',
                    fillColor: isOperational ? Cesium.Color.CYAN : Cesium.Color.GRAY,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -25),
                    show: window.layers ? window.layers.godMode : false,
                    scale: 0.8
                }
            });

            this.entities.ships.set(`ship_${index}`, entity);
        });

        console.log(`🚢 Updated ${shipsData.length} naval assets`);
    }

    // Process satellite constellation
    processSatellites(satelliteData) {
        // Clear old satellites
        this.entities.satellites.forEach((entity, id) => {
            this.viewer.entities.remove(entity);
        });
        this.entities.satellites.clear();

        // Limit to most important satellites to avoid clutter
        const importantSats = satelliteData
            .filter(sat => this.isImportantSatellite(sat))
            .slice(0, 50);

        importantSats.forEach((satellite, index) => {
            if (!satellite.lng || !satellite.lat) return;

            const missionColor = this.getSatelliteMissionColor(satellite.mission);
            const isRecon = satellite.mission.includes('recon') || satellite.mission.includes('sigint');
            
            const entity = this.viewer.entities.add({
                id: `shadowbroker_satellite_${index}`,
                position: Cesium.Cartesian3.fromDegrees(
                    satellite.lng, 
                    satellite.lat, 
                    satellite.alt_km * 1000
                ),
                
                // Satellite marker
                point: {
                    pixelSize: isRecon ? 12 : 8,
                    color: missionColor,
                    outlineColor: isRecon ? Cesium.Color.RED : Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.NONE
                },
                
                // Satellite intelligence
                label: {
                    text: `${satellite.name}\n${satellite.country}\n${satellite.mission.replace(/_/g, ' ').toUpperCase()}\nAlt: ${Math.round(satellite.alt_km)}km`,
                    font: '10px Courier New',
                    fillColor: missionColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -15),
                    show: window.layers ? window.layers.godMode : false,
                    scale: 0.7
                }
            });

            this.entities.satellites.set(`satellite_${index}`, entity);
        });

        console.log(`🛰️ Updated ${importantSats.length} key satellites`);
    }

    // Process GPS jamming zones
    processJamming(jammingData) {
        // Clear old jamming zones
        this.entities.jamming.forEach((entity, id) => {
            this.viewer.entities.remove(entity);
        });
        this.entities.jamming.clear();

        jammingData.forEach((zone, index) => {
            if (!zone.lng || !zone.lat) return;

            const severityColor = this.getJammingSeverityColor(zone.severity);
            const radius = zone.severity === 'high' ? 100000 : 50000; // meters
            
            const entity = this.viewer.entities.add({
                id: `shadowbroker_jamming_${index}`,
                position: Cesium.Cartesian3.fromDegrees(zone.lng, zone.lat, 1000),
                
                // Jamming zone
                ellipse: {
                    semiMajorAxis: radius,
                    semiMinorAxis: radius,
                    material: severityColor.withAlpha(0.3),
                    outline: true,
                    outlineColor: severityColor,
                    height: 1000
                },
                
                // Jamming marker
                point: {
                    pixelSize: 10,
                    color: severityColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2
                },
                
                label: {
                    text: `GPS JAMMING\n${zone.severity.toUpperCase()}\n${zone.degraded}/${zone.total} affected`,
                    font: '10px Courier New',
                    fillColor: severityColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -15),
                    show: window.layers ? window.layers.godMode : false,
                    scale: 0.8
                }
            });

            this.entities.jamming.set(`jamming_${index}`, entity);
        });

        console.log(`📡 Updated ${jammingData.length} GPS jamming zones`);
    }

    // Process CCTV camera feeds
    processCCTV(cctvData) {
        console.log('📹 Processing CCTV data:', cctvData.length, 'cameras');
        
        // Clear old cameras
        this.entities.cctv.forEach((entity, id) => {
            this.viewer.entities.remove(entity);
        });
        this.entities.cctv.clear();

        // Limit to reasonable number for performance - prioritize London/major cities
        const londonCameras = cctvData.filter(camera => 
            camera.source_agency === 'TfL' && camera.lat && camera.lon
        ).slice(0, 50);
        
        const otherCameras = cctvData.filter(camera => 
            camera.source_agency !== 'TfL' && camera.lat && camera.lon
        ).slice(0, 50);
        
        const camerasToShow = [...londonCameras, ...otherCameras];

        camerasToShow.forEach((camera, index) => {
            if (!camera.lon || !camera.lat) {
                console.warn('Skipping camera with no coordinates:', camera.id);
                return;
            }

            console.log(`Adding camera ${index}: ${camera.id} at ${camera.lat}, ${camera.lon}`);

            const entity = this.viewer.entities.add({
                id: `shadowbroker_cctv_${index}`,
                position: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, 100),
                
                // Camera marker - simple point works better than billboard
                point: {
                    pixelSize: 10,
                    color: Cesium.Color.ORANGE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    show: true // Always show initially
                },
                
                // Camera info
                label: {
                    text: `📹 ${camera.source_agency}\n${camera.direction_facing || 'Camera'}\nClick for live feed`,
                    font: '10px Courier New',
                    fillColor: Cesium.Color.ORANGE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -15),
                    show: window.layers ? window.layers.godMode : false,
                    scale: 0.8
                }
            });

            // Store camera data for modal
            entity.cctvData = camera;
            this.entities.cctv.set(`cctv_${index}`, entity);
        });

        // Set up click handlers for camera modals
        this.setupCCTVClickHandlers();
        
        console.log(`📹 Updated ${camerasToShow.length} CCTV cameras`);
    }

    // Setup click handlers for CCTV cameras
    setupCCTVClickHandlers() {
        if (!this.clickHandler) {
            this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
            
            this.clickHandler.setInputAction((click) => {
                const picked = this.viewer.scene.pick(click.position);
                
                if (picked && picked.id && picked.id.cctvData) {
                    this.openCCTVModal(picked.id.cctvData);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        }
    }

    // Open CCTV modal with live feed
    openCCTVModal(cctvData) {
        // Remove existing modal if any
        this.closeCCTVModal();
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'cctv-modal';
        modal.className = 'cctv-modal';
        
        modal.innerHTML = `
            <div class="cctv-modal-content">
                <div class="cctv-header">
                    <h3>📹 LIVE CCTV FEED</h3>
                    <button class="cctv-close" onclick="ShadowBrokerIntegration.closeCCTVModalGlobal()">✕</button>
                </div>
                <div class="cctv-info">
                    <div class="cctv-detail">
                        <strong>Agency:</strong> ${cctvData.source_agency}
                    </div>
                    <div class="cctv-detail">
                        <strong>Location:</strong> ${cctvData.direction_facing || 'Unknown'}
                    </div>
                    <div class="cctv-detail">
                        <strong>Coordinates:</strong> ${cctvData.lat.toFixed(4)}, ${cctvData.lon.toFixed(4)}
                    </div>
                    <div class="cctv-detail">
                        <strong>Last Updated:</strong> ${cctvData.last_updated ? new Date(cctvData.last_updated).toLocaleString() : 'Unknown'}
                    </div>
                    <div class="cctv-detail">
                        <strong>Refresh Rate:</strong> ${cctvData.refresh_rate_seconds}s
                    </div>
                </div>
                <div class="cctv-feed">
                    ${this.createCCTVFeed(cctvData)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add modal styles if not already added
        if (!document.getElementById('cctv-modal-styles')) {
            this.addCCTVModalStyles();
        }
        
        console.log(`📹 Opened CCTV feed: ${cctvData.source_agency} - ${cctvData.direction_facing}`);
    }

    // Close CCTV modal
    closeCCTVModal() {
        const modal = document.getElementById('cctv-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Make modal closer globally accessible
    static closeCCTVModalGlobal() {
        const modal = document.getElementById('cctv-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Create CCTV feed element
    createCCTVFeed(cctvData) {
        if (cctvData.media_type === 'video' && cctvData.media_url) {
            return `
                <video controls autoplay muted style="width: 100%; height: 300px; background: #000;">
                    <source src="${cctvData.media_url}" type="video/mp4">
                    <p style="color: #ff4444;">Video feed unavailable</p>
                </video>
                <div class="cctv-status">
                    <span class="live-indicator">🔴 LIVE</span>
                    <span>Auto-refresh every ${cctvData.refresh_rate_seconds}s</span>
                </div>
            `;
        } else if (cctvData.media_type === 'image' && cctvData.media_url) {
            return `
                <img src="${cctvData.media_url}" style="width: 100%; height: 300px; object-fit: cover; background: #000;" 
                     onload="this.style.opacity=1" style="opacity: 0; transition: opacity 0.3s;">
                <div class="cctv-status">
                    <span class="live-indicator">📸 STATIC</span>
                    <span>Updated: ${new Date(cctvData.last_updated).toLocaleTimeString()}</span>
                </div>
            `;
        } else {
            return `
                <div class="cctv-error">
                    <p>📡 Feed temporarily unavailable</p>
                    <p>Camera ID: ${cctvData.id}</p>
                </div>
            `;
        }
    }

    // Add modal CSS styles
    addCCTVModalStyles() {
        const styles = document.createElement('style');
        styles.id = 'cctv-modal-styles';
        styles.textContent = `
            .cctv-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            }
            
            .cctv-modal-content {
                background: linear-gradient(145deg, #001100, #002200);
                border: 2px solid #00ff00;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
            }
            
            .cctv-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #00ff00;
                background: rgba(0, 255, 0, 0.1);
            }
            
            .cctv-header h3 {
                margin: 0;
                color: #00ff00;
                font-family: 'Courier New', monospace;
                text-shadow: 0 0 10px #00ff00;
            }
            
            .cctv-close {
                background: rgba(255, 0, 0, 0.3);
                border: 1px solid #ff0000;
                color: #ff0000;
                padding: 8px 12px;
                font-family: 'Courier New', monospace;
                font-size: 16px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            }
            
            .cctv-close:hover {
                background: rgba(255, 0, 0, 0.5);
                box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
            }
            
            .cctv-info {
                padding: 15px 20px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                border-bottom: 1px solid #004400;
            }
            
            .cctv-detail {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #ccffcc;
            }
            
            .cctv-detail strong {
                color: #00ff00;
                display: block;
            }
            
            .cctv-feed {
                padding: 0;
                background: #000;
                position: relative;
            }
            
            .cctv-status {
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(0, 0, 0, 0.7);
                padding: 5px 10px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                color: #00ff00;
            }
            
            .live-indicator {
                animation: pulse 2s infinite;
            }
            
            .cctv-error {
                padding: 40px 20px;
                text-align: center;
                color: #ff4444;
                font-family: 'Courier New', monospace;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Create CCTV camera icon
    createCCTVIcon() {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        
        // Draw camera
        ctx.fillStyle = '#FF8800';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        // Camera body
        ctx.fillRect(8, 10, 8, 6);
        ctx.strokeRect(8, 10, 8, 6);
        
        // Camera lens
        ctx.beginPath();
        ctx.arc(6, 13, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Lens center
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(6, 13, 1, 0, 2 * Math.PI);
        ctx.fill();
        
        return canvas.toDataURL();
    }

    // Filter for important cameras (major cities, highways)
    isImportantCamera(camera) {
        if (!camera.source_agency) return false;
        
        // Prioritize certain agencies and locations
        const importantAgencies = ['TfL', 'DOT', 'CalTrans', 'NYCDOT', 'CHP'];
        const importantKeywords = ['highway', 'bridge', 'airport', 'downtown', 'central', 'main'];
        
        const hasImportantAgency = importantAgencies.some(agency => 
            camera.source_agency.toLowerCase().includes(agency.toLowerCase())
        );
        
        const hasImportantLocation = importantKeywords.some(keyword => 
            (camera.direction_facing || '').toLowerCase().includes(keyword)
        );
        
        return hasImportantAgency || hasImportantLocation;
    }

    // Helper methods
    formatAircraftLabel(aircraft) {
        const lines = [
            aircraft.callsign || 'UNKNOWN',
            `${Math.round(aircraft.alt || 0)}ft`,
            `${Math.round(aircraft.speed_knots || 0)}kts`
        ];
        
        if (aircraft.alert_category && aircraft.alert_category !== 'Unknown') {
            lines.push(aircraft.alert_category);
        }
        
        if (aircraft.alert_operator && aircraft.alert_operator !== aircraft.callsign) {
            lines.push(aircraft.alert_operator);
        }
        
        return lines.join('\n');
    }

    isHighValueTarget(aircraft) {
        const hvtCategories = [
            'Government', 'CIA Linked', 'Don\'t you know who I am?', 
            'People', 'Dictator Alert', 'Nuclear'
        ];
        return hvtCategories.includes(aircraft.alert_category) ||
               (aircraft.alert_operator && aircraft.alert_operator.includes('CIA'));
    }

    createFlightPath(aircraft) {
        if (!aircraft.heading) return [];
        
        const heading = aircraft.heading;
        const distance = 0.5; // degrees
        const endLng = aircraft.lng + Math.sin(Cesium.Math.toRadians(heading)) * distance;
        const endLat = aircraft.lat + Math.cos(Cesium.Math.toRadians(heading)) * distance;
        
        return [
            Cesium.Cartesian3.fromDegrees(aircraft.lng, aircraft.lat, (aircraft.alt || 35000) * 0.3048),
            Cesium.Cartesian3.fromDegrees(endLng, endLat, (aircraft.alt || 35000) * 0.3048)
        ];
    }

    isImportantSatellite(satellite) {
        const importantMissions = [
            'military_recon', 'sigint', 'early_warning', 'navigation', 'space_station'
        ];
        const importantCountries = ['USA', 'China', 'Russia'];
        
        return importantMissions.includes(satellite.mission) || 
               importantCountries.includes(satellite.country) ||
               satellite.name.includes('ISS');
    }

    getSatelliteMissionColor(mission) {
        const colors = {
            'military_recon': Cesium.Color.RED,
            'sigint': Cesium.Color.ORANGE,
            'early_warning': Cesium.Color.YELLOW,
            'navigation': Cesium.Color.GREEN,
            'space_station': Cesium.Color.CYAN,
            'commercial_imaging': Cesium.Color.BLUE
        };
        return colors[mission] || Cesium.Color.WHITE;
    }

    getJammingSeverityColor(severity) {
        const colors = {
            'low': Cesium.Color.YELLOW,
            'medium': Cesium.Color.ORANGE,
            'high': Cesium.Color.RED
        };
        return colors[severity] || Cesium.Color.GRAY;
    }

    updateStatus(data) {
        // Update the status panel numbers
        const aircraftCount = document.querySelector('.stat-value[data-stat="aircraft"]');
        if (aircraftCount) {
            aircraftCount.textContent = data.tracked_flights?.length || 0;
        }
        
        const shipsCount = document.querySelector('.stat-value[data-stat="ships"]');
        if (shipsCount) {
            shipsCount.textContent = data.ships?.length || 0;
        }
        
        const satelliteCount = document.querySelector('.stat-value[data-stat="satellites"]');
        if (satelliteCount) {
            satelliteCount.textContent = data.satellites?.length || 0;
        }
        
        const jammingCount = document.querySelector('.stat-value[data-stat="jamming"]');
        if (jammingCount) {
            jammingCount.textContent = data.gps_jamming?.length || 0;
        }
        
        const cctvCount = document.querySelector('.stat-value[data-stat="cctv"]');
        if (cctvCount) {
            cctvCount.textContent = data.cctv?.length || 0;
        }
        
        const timeStamp = document.querySelector('.stat-value[data-stat="time"]');
        if (timeStamp) {
            timeStamp.textContent = new Date().toLocaleTimeString();
        }

        const statusPanel = document.querySelector('.alert-container');
        if (statusPanel && this.lastUpdate) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-low';
            alert.innerHTML = `
                <span class="alert-time">${new Date().toLocaleTimeString()}</span>
                <span class="alert-message">ShadowBroker: ${data.tracked_flights?.length || 0} aircraft, ${data.ships?.length || 0} ships, ${data.satellites?.length || 0} satellites, ${data.gps_jamming?.length || 0} jamming zones, ${data.cctv?.length || 0} cameras</span>
            `;
            statusPanel.appendChild(alert);
            
            // Remove after 10 seconds
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 10000);
        }
    }

    startAutoRefresh() {
        setInterval(() => {
            this.fetchLiveData();
        }, this.refreshInterval);
    }

    // Toggle layers
    showAircraft(show) {
        this.entities.aircraft.forEach(entity => {
            entity.show = show;
        });
    }

    showShips(show) {
        this.entities.ships.forEach(entity => {
            entity.show = show;
        });
    }

    showSatellites(show) {
        this.entities.satellites.forEach(entity => {
            entity.show = show;
        });
    }

    showJamming(show) {
        this.entities.jamming.forEach(entity => {
            entity.show = show;
        });
    }

    showCCTV(show) {
        this.entities.cctv.forEach(entity => {
            entity.show = show;
            if (entity.point) entity.point.show = show;
            if (entity.billboard) entity.billboard.show = show;
        });
    }
}

// Export for use in main app
window.ShadowBrokerIntegration = ShadowBrokerIntegration;