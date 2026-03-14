// Real Satellite Tracking with SGP4 Orbital Propagation
// Uses satellite.js library for TLE parsing and orbital calculations

class SatelliteTracker {
    constructor(viewer) {
        this.viewer = viewer;
        this.satellites = [];
        this.satelliteEntities = [];
        this.orbitalPaths = [];
        this.updateInterval = null;
        this.tleData = {};
        
        // Satellite type colors
        this.typeColors = {
            communications: Cesium.Color.BLUE,
            weather: Cesium.Color.YELLOW,
            military: Cesium.Color.RED,
            science: Cesium.Color.WHITE,
            navigation: Cesium.Color.CYAN,
            earth_observation: Cesium.Color.ORANGE,
            amateur: Cesium.Color.PURPLE,
            other: Cesium.Color.LIGHTGRAY
        };
        
        console.log('🛰️ SatelliteTracker initialized');
    }
    
    // Load real TLE data from CelesTrak
    async loadTLEData() {
        try {
            // Use stations group for ISS and space stations (smaller dataset)
            const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle');
            const tleText = await response.text();
            
            this.parseTLEData(tleText);
            console.log(`📡 Loaded ${Object.keys(this.tleData).length} satellites from TLE data`);
            
        } catch (error) {
            console.warn('Failed to load TLE data from CelesTrak, using fallback satellites:', error);
            // Use fallback satellites with approximate TLE data
            this.loadFallbackSatellites();
        }
    }
    
    // Parse TLE data format
    parseTLEData(tleText) {
        const lines = tleText.split('\n').filter(line => line.trim());
        this.tleData = {};
        
        for (let i = 0; i < lines.length; i += 3) {
            if (i + 2 < lines.length) {
                const name = lines[i].trim();
                const line1 = lines[i + 1];
                const line2 = lines[i + 2];
                
                if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
                    this.tleData[name] = {
                        name: name,
                        line1: line1,
                        line2: line2,
                        type: this.classifySatellite(name)
                    };
                }
            }
        }
    }
    
    // Classify satellite by name patterns
    classifySatellite(name) {
        const upperName = name.toUpperCase();
        
        if (upperName.includes('ISS') || upperName.includes('STATION')) {
            return 'science';
        } else if (upperName.includes('GPS') || upperName.includes('GLONASS') || upperName.includes('GALILEO') || upperName.includes('BEIDOU')) {
            return 'navigation';
        } else if (upperName.includes('GOES') || upperName.includes('NOAA') || upperName.includes('METOP') || upperName.includes('WEATHER')) {
            return 'weather';
        } else if (upperName.includes('STARLINK') || upperName.includes('ONEWEB') || upperName.includes('IRIDIUM') || upperName.includes('INTELSAT')) {
            return 'communications';
        } else if (upperName.includes('LANDSAT') || upperName.includes('SENTINEL') || upperName.includes('WORLDVIEW')) {
            return 'earth_observation';
        } else if (upperName.includes('AMATEUR') || upperName.includes('OSCAR')) {
            return 'amateur';
        } else if (upperName.includes('MILITARY') || upperName.includes('DEFENSE') || upperName.includes('KH-')) {
            return 'military';
        }
        
        return 'other';
    }
    
    // Fallback satellites with approximate TLE data
    loadFallbackSatellites() {
        this.tleData = {
            'ISS (ZARYA)': {
                name: 'ISS (ZARYA)',
                line1: '1 25544U 98067A   23365.12345678  .00001234  00000-0  12345-4 0  9999',
                line2: '2 25544  51.6461 123.4567 0001234  12.3456  45.6789 15.48919876123456',
                type: 'science'
            },
            'HUBBLE SPACE TELESCOPE': {
                name: 'HUBBLE SPACE TELESCOPE',
                line1: '1 20580U 90037B   23365.12345678  .00000123  00000-0  12345-5 0  9999',
                line2: '2 20580  28.4687 234.5678 0001234  23.4567  56.7890 14.98765432123456',
                type: 'science'
            },
            'GPS IIF-3 (PRN 06)': {
                name: 'GPS IIF-3 (PRN 06)',
                line1: '1 40105U 14026A   23365.12345678 -.00000123  00000-0  00000+0 0  9999',
                line2: '2 40105  55.1234 345.6789 0001234  34.5678  67.8901  2.00561234123456',
                type: 'navigation'
            }
        };
    }
    
    // Calculate satellite position using SGP4
    calculateSatellitePosition(satrec, date) {
        try {
            const positionAndVelocity = satellite.propagate(satrec, date);
            
            if (positionAndVelocity.error) {
                return null;
            }
            
            const positionEci = positionAndVelocity.position;
            const velocityEci = positionAndVelocity.velocity;
            
            if (!positionEci) return null;
            
            // Convert ECI to geographic coordinates
            const gmst = satellite.gstime(date);
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);
            
            return {
                longitude: positionGd.longitude,
                latitude: positionGd.latitude,
                altitude: positionGd.height * 1000, // Convert km to meters
                velocity: velocityEci
            };
            
        } catch (error) {
            console.warn('Error calculating satellite position:', error);
            return null;
        }
    }
    
    // Calculate orbital path
    calculateOrbitalPath(satrec, steps = 60) {
        const path = [];
        const now = new Date();
        const timeStep = 90 * 60 * 1000; // 90 minutes in milliseconds (one orbit)
        
        for (let i = 0; i <= steps; i++) {
            const time = new Date(now.getTime() + (i * timeStep / steps));
            const position = this.calculateSatellitePosition(satrec, time);
            
            if (position) {
                path.push(Cesium.Cartesian3.fromDegrees(
                    Cesium.Math.toDegrees(position.longitude),
                    Cesium.Math.toDegrees(position.latitude),
                    position.altitude
                ));
            }
        }
        
        return path;
    }
    
    // Calculate satellite footprint (visibility area on ground)
    calculateFootprint(position, altitude) {
        const earthRadius = 6371000; // meters
        const horizonDistance = Math.sqrt(2 * earthRadius * altitude + altitude * altitude);
        const angularRadius = Math.acos(earthRadius / (earthRadius + altitude));
        
        const footprintRadius = earthRadius * angularRadius;
        
        return footprintRadius; // in meters
    }
    
    // Initialize satellite tracking
    async initializeSatellites() {
        await this.loadTLEData();
        this.createSatelliteEntities();
        this.startTracking();
    }
    
    // Create Cesium entities for satellites
    createSatelliteEntities() {
        this.clearSatellites();
        
        Object.values(this.tleData).forEach(satData => {
            try {
                const satrec = satellite.twoline2satrec(satData.line1, satData.line2);
                const now = new Date();
                const position = this.calculateSatellitePosition(satrec, now);
                
                if (!position) return;
                
                const cartesianPos = Cesium.Cartesian3.fromDegrees(
                    Cesium.Math.toDegrees(position.longitude),
                    Cesium.Math.toDegrees(position.latitude),
                    position.altitude
                );
                
                const color = this.typeColors[satData.type] || this.typeColors.other;
                
                // Create satellite entity
                const satelliteEntity = this.viewer.entities.add({
                    name: satData.name,
                    position: cartesianPos,
                    point: {
                        pixelSize: 6,
                        color: color,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 1,
                        heightReference: Cesium.HeightReference.NONE
                    },
                    label: {
                        text: satData.name,
                        font: '8pt Courier New',
                        fillColor: color,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -15),
                        show: false // Will be shown in god mode
                    },
                    description: this.generateSatelliteDescription(satData, position)
                });
                
                // Create orbital path
                const orbitPath = this.calculateOrbitalPath(satrec);
                if (orbitPath.length > 0) {
                    const orbitEntity = this.viewer.entities.add({
                        name: `${satData.name} Orbit`,
                        polyline: {
                            positions: orbitPath,
                            width: 2,
                            material: new Cesium.PolylineDashMaterialProperty({
                                color: color,
                                dashLength: 20.0,
                                dashPattern: parseInt('1111000011110000', 2)
                            }),
                            clampToGround: false
                        }
                    });
                    
                    this.orbitalPaths.push(orbitEntity);
                }
                
                // Create footprint circle
                const footprintRadius = this.calculateFootprint(position, position.altitude);
                const footprintEntity = this.viewer.entities.add({
                    name: `${satData.name} Footprint`,
                    position: cartesianPos,
                    ellipse: {
                        semiMajorAxis: footprintRadius,
                        semiMinorAxis: footprintRadius,
                        material: color.withAlpha(0.1),
                        outline: true,
                        outlineColor: color.withAlpha(0.3),
                        height: 0
                    }
                });
                
                this.satellites.push({
                    entity: satelliteEntity,
                    orbitPath: orbitEntity,
                    footprint: footprintEntity,
                    satrec: satrec,
                    data: satData
                });
                
                this.satelliteEntities.push(satelliteEntity);
                this.satelliteEntities.push(orbitEntity);
                this.satelliteEntities.push(footprintEntity);
                
            } catch (error) {
                console.warn(`Failed to create satellite entity for ${satData.name}:`, error);
            }
        });
        
        console.log(`🛰️ Created ${this.satellites.length} satellite entities`);
    }
    
    // Generate detailed satellite description
    generateSatelliteDescription(satData, position) {
        const altitudeKm = (position.altitude / 1000).toFixed(1);
        const lat = Cesium.Math.toDegrees(position.latitude).toFixed(4);
        const lon = Cesium.Math.toDegrees(position.longitude).toFixed(4);
        
        return `
            <div style="color: #00ff00; font-family: Courier New; min-width: 300px;">
                <h3>🛰️ SATELLITE INTERCEPT</h3>
                <p><strong>Name:</strong> ${satData.name}</p>
                <p><strong>Type:</strong> ${satData.type.toUpperCase()}</p>
                <p><strong>Position:</strong> ${lat}°, ${lon}°</p>
                <p><strong>Altitude:</strong> ${altitudeKm} km</p>
                <p><strong>Classification:</strong> UNCLASSIFIED</p>
                <p><strong>Status:</strong> TRACKING</p>
                <p><strong>TLE Epoch:</strong> ${satData.line1.substring(18, 32)}</p>
            </div>
        `;
    }
    
    // Start real-time tracking
    startTracking() {
        this.stopTracking(); // Clear any existing interval
        
        this.updateInterval = setInterval(() => {
            this.updateSatellitePositions();
        }, 1000); // Update every second
        
        console.log('🛰️ Started real-time satellite tracking');
    }
    
    // Stop tracking
    stopTracking() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // Update satellite positions
    updateSatellitePositions() {
        const now = new Date();
        
        this.satellites.forEach(sat => {
            try {
                const position = this.calculateSatellitePosition(sat.satrec, now);
                
                if (position) {
                    const cartesianPos = Cesium.Cartesian3.fromDegrees(
                        Cesium.Math.toDegrees(position.longitude),
                        Cesium.Math.toDegrees(position.latitude),
                        position.altitude
                    );
                    
                    // Update satellite position
                    sat.entity.position = new Cesium.ConstantProperty(cartesianPos);
                    
                    // Update footprint position
                    sat.footprint.position = new Cesium.ConstantProperty(cartesianPos);
                    
                    // Update description with new position
                    sat.entity.description = this.generateSatelliteDescription(sat.data, position);
                }
                
            } catch (error) {
                console.warn(`Failed to update position for ${sat.data.name}:`, error);
            }
        });
    }
    
    // Predict satellite passes for a given location
    predictPasses(longitude, latitude, hours = 1) {
        const passes = [];
        const now = new Date();
        const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
        const timeStep = 60000; // 1 minute steps
        
        this.satellites.forEach(sat => {
            const satellitePasses = this.calculatePassesForSatellite(
                sat.satrec, 
                longitude, 
                latitude, 
                now, 
                endTime, 
                timeStep
            );
            
            passes.push(...satellitePasses.map(pass => ({
                satellite: sat.data.name,
                ...pass
            })));
        });
        
        return passes.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }
    
    // Calculate passes for a specific satellite
    calculatePassesForSatellite(satrec, longitude, latitude, startTime, endTime, timeStep) {
        const passes = [];
        let currentPass = null;
        const minElevation = 10; // degrees
        
        for (let time = new Date(startTime); time <= endTime; time = new Date(time.getTime() + timeStep)) {
            const position = this.calculateSatellitePosition(satrec, time);
            
            if (!position) continue;
            
            const satLat = Cesium.Math.toDegrees(position.latitude);
            const satLon = Cesium.Math.toDegrees(position.longitude);
            const satAlt = position.altitude / 1000; // km
            
            // Calculate elevation angle from observer location
            const elevation = this.calculateElevation(latitude, longitude, satLat, satLon, satAlt);
            
            if (elevation > minElevation) {
                if (!currentPass) {
                    // Start of a new pass
                    currentPass = {
                        startTime: new Date(time),
                        maxElevation: elevation,
                        maxElevationTime: new Date(time),
                        path: []
                    };
                } else {
                    // Continue current pass
                    if (elevation > currentPass.maxElevation) {
                        currentPass.maxElevation = elevation;
                        currentPass.maxElevationTime = new Date(time);
                    }
                }
                
                currentPass.path.push({
                    time: new Date(time),
                    latitude: satLat,
                    longitude: satLon,
                    elevation: elevation
                });
                
            } else if (currentPass) {
                // End of current pass
                currentPass.endTime = new Date(time.getTime() - timeStep);
                passes.push(currentPass);
                currentPass = null;
            }
        }
        
        // Close any ongoing pass
        if (currentPass) {
            currentPass.endTime = new Date(endTime);
            passes.push(currentPass);
        }
        
        return passes;
    }
    
    // Calculate elevation angle from observer to satellite
    calculateElevation(obsLat, obsLon, satLat, satLon, satAltKm) {
        const R = 6371; // Earth radius in km
        
        // Convert to radians
        const lat1 = Cesium.Math.toRadians(obsLat);
        const lon1 = Cesium.Math.toRadians(obsLon);
        const lat2 = Cesium.Math.toRadians(satLat);
        const lon2 = Cesium.Math.toRadians(satLon);
        
        // Great circle distance
        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const groundDistance = R * c;
        
        // Elevation calculation
        const altitude = satAltKm;
        const elevation = Math.atan2(altitude - R, groundDistance) - Math.asin(R / (R + altitude));
        
        return Cesium.Math.toDegrees(elevation);
    }
    
    // Show/hide satellites
    setVisible(visible) {
        this.satelliteEntities.forEach(entity => {
            entity.show = visible;
        });
    }
    
    // Show/hide labels (god mode)
    setLabelsVisible(visible) {
        this.satellites.forEach(sat => {
            if (sat.entity.label) {
                sat.entity.label.show = visible;
            }
        });
    }
    
    // Clear all satellites
    clearSatellites() {
        this.satelliteEntities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        
        this.satellites = [];
        this.satelliteEntities = [];
        this.orbitalPaths = [];
    }
    
    // Cleanup
    destroy() {
        this.stopTracking();
        this.clearSatellites();
        console.log('🛰️ SatelliteTracker destroyed');
    }
}

// Export for use in app.js
window.SatelliteTracker = SatelliteTracker;