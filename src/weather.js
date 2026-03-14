// Weather Layer for WorldView
// Provides cloud cover, temperature data, and weather visualization

class WeatherLayer {
    constructor(viewer) {
        this.viewer = viewer;
        this.weatherLayer = null;
        this.temperatureEntities = [];
        this.isVisible = false;
        this.apiKey = null; // Will be configured from app.js
        
        // Major cities for temperature markers
        this.majorCities = [
            { name: 'New York', lat: 40.7128, lon: -74.0060 },
            { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
            { name: 'London', lat: 51.5074, lon: -0.1278 },
            { name: 'Paris', lat: 48.8566, lon: 2.3522 },
            { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
            { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
            { name: 'Moscow', lat: 55.7558, lon: 37.6176 },
            { name: 'Beijing', lat: 39.9042, lon: 116.4074 },
            { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
            { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
            { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
            { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
            { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
            { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
            { name: 'Berlin', lat: 52.5200, lon: 13.4050 }
        ];
        
        console.log('🌤️ WeatherLayer initialized');
    }
    
    // Set OpenWeatherMap API key
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        console.log('🔑 Weather API key configured');
    }
    
    // Initialize weather layer
    async initialize() {
        try {
            await this.createCloudLayer();
            await this.loadTemperatureData();
            console.log('🌤️ Weather layer initialized');
        } catch (error) {
            console.warn('Failed to initialize weather layer:', error);
            this.createFallbackWeatherLayer();
        }
    }
    
    // Create cloud cover layer using tile service
    async createCloudLayer() {
        try {
            // Try OpenWeatherMap clouds layer first
            if (this.apiKey) {
                this.weatherLayer = this.viewer.scene.imageryLayers.addImageryProvider(
                    new Cesium.UrlTemplateImageryProvider({
                        url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${this.apiKey}`,
                        credit: 'OpenWeatherMap'
                    })
                );
                
                // Set transparency for overlay effect
                this.weatherLayer.alpha = 0.6;
                this.weatherLayer.show = false; // Hidden by default
                
            } else {
                // Use free weather tile service as fallback
                console.warn('No OpenWeatherMap API key, using fallback weather service');
                this.createFallbackWeatherLayer();
            }
            
        } catch (error) {
            console.warn('Failed to create OpenWeatherMap layer:', error);
            this.createFallbackWeatherLayer();
        }
    }
    
    // Fallback weather layer using simulated cloud patterns
    createFallbackWeatherLayer() {
        // Create a custom imagery provider with simulated clouds
        const customProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAGklEQVQIHWPY//8/Ay7AwMjIyKAKBJj+//8PAEIVAAD///8/AAAAAABJRU5ErkJggg==',
            credit: 'Simulated Weather Data'
        });
        
        this.weatherLayer = this.viewer.scene.imageryLayers.addImageryProvider(customProvider);
        this.weatherLayer.alpha = 0.3;
        this.weatherLayer.show = false;
        
        // Add some sample cloud entities to simulate weather patterns
        this.createSimulatedClouds();
    }
    
    // Create simulated cloud entities
    createSimulatedClouds() {
        const cloudRegions = [
            { lat: 40, lon: -100, size: 500000 }, // Central US
            { lat: 52, lon: 5, size: 300000 },    // Western Europe
            { lat: -10, lon: 140, size: 400000 }, // Northern Australia
            { lat: 35, lon: 135, size: 250000 },  // Japan
            { lat: 0, lon: -60, size: 600000 },   // Amazon
        ];
        
        cloudRegions.forEach((cloud, index) => {
            const cloudEntity = this.viewer.entities.add({
                name: `Weather System ${index + 1}`,
                position: Cesium.Cartesian3.fromDegrees(cloud.lon, cloud.lat, 5000),
                ellipse: {
                    semiMajorAxis: cloud.size,
                    semiMinorAxis: cloud.size * 0.7,
                    material: Cesium.Color.WHITE.withAlpha(0.4),
                    outline: false,
                    height: 5000
                }
            });
            
            this.temperatureEntities.push(cloudEntity);
        });
    }
    
    // Load temperature data for major cities
    async loadTemperatureData() {
        if (!this.apiKey) {
            this.createFallbackTemperatureData();
            return;
        }
        
        try {
            for (const city of this.majorCities) {
                const weatherData = await this.fetchCityWeather(city);
                if (weatherData) {
                    this.createTemperatureMarker(city, weatherData);
                }
                
                // Rate limiting - wait between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.warn('Failed to load temperature data:', error);
            this.createFallbackTemperatureData();
        }
    }
    
    // Fetch weather data for a specific city
    async fetchCityWeather(city) {
        if (!this.apiKey) return null;
        
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${this.apiKey}&units=metric`
            );
            
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                temperature: Math.round(data.main.temp),
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                description: data.weather[0].description,
                icon: data.weather[0].icon,
                windSpeed: data.wind?.speed || 0,
                windDirection: data.wind?.deg || 0
            };
            
        } catch (error) {
            console.warn(`Failed to fetch weather for ${city.name}:`, error);
            return null;
        }
    }
    
    // Create temperature marker for a city
    createTemperatureMarker(city, weatherData) {
        const temp = weatherData.temperature;
        
        // Color code by temperature
        let color;
        if (temp < 0) {
            color = Cesium.Color.LIGHTBLUE;
        } else if (temp < 10) {
            color = Cesium.Color.CYAN;
        } else if (temp < 20) {
            color = Cesium.Color.GREEN;
        } else if (temp < 30) {
            color = Cesium.Color.YELLOW;
        } else if (temp < 40) {
            color = Cesium.Color.ORANGE;
        } else {
            color = Cesium.Color.RED;
        }
        
        const temperatureEntity = this.viewer.entities.add({
            name: `${city.name} Weather`,
            position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 0),
            point: {
                pixelSize: 12,
                color: color,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
                text: `${temp}°C`,
                font: '12pt Courier New',
                fillColor: color,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                show: false // Hidden by default, shown in weather mode
            },
            description: this.generateWeatherDescription(city, weatherData)
        });
        
        this.temperatureEntities.push(temperatureEntity);
    }
    
    // Generate detailed weather description
    generateWeatherDescription(city, weatherData) {
        const windDir = this.getWindDirection(weatherData.windDirection);
        
        return `
            <div style="color: #00ff00; font-family: Courier New; min-width: 300px;">
                <h3>🌤️ WEATHER INTEL - ${city.name.toUpperCase()}</h3>
                <p><strong>Temperature:</strong> ${weatherData.temperature}°C</p>
                <p><strong>Conditions:</strong> ${weatherData.description}</p>
                <p><strong>Humidity:</strong> ${weatherData.humidity}%</p>
                <p><strong>Pressure:</strong> ${weatherData.pressure} hPa</p>
                <p><strong>Wind:</strong> ${weatherData.windSpeed} m/s ${windDir}</p>
                <p><strong>Coordinates:</strong> ${city.lat.toFixed(4)}°, ${city.lon.toFixed(4)}°</p>
                <p><strong>Status:</strong> MONITORING</p>
            </div>
        `;
    }
    
    // Convert wind direction to compass bearing
    getWindDirection(degrees) {
        if (!degrees) return 'CALM';
        
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                           'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }
    
    // Create fallback temperature data with realistic values
    createFallbackTemperatureData() {
        console.log('🌡️ Creating fallback temperature data');
        
        // Generate realistic temperatures based on latitude and season
        const currentMonth = new Date().getMonth(); // 0-11
        const isWinter = currentMonth === 0 || currentMonth === 1 || currentMonth === 11;
        
        this.majorCities.forEach(city => {
            // Base temperature calculation considering latitude and season
            let baseTemp = 20 - Math.abs(city.lat) * 0.5; // Colder near poles
            
            if (isWinter) {
                baseTemp -= city.lat > 0 ? 10 : -5; // Northern winter, Southern summer
            } else {
                baseTemp += city.lat > 0 ? 5 : -10; // Northern summer, Southern winter
            }
            
            // Add some randomness
            const temperature = Math.round(baseTemp + (Math.random() - 0.5) * 10);
            
            const weatherData = {
                temperature: temperature,
                humidity: Math.round(40 + Math.random() * 40),
                pressure: Math.round(1000 + Math.random() * 40),
                description: this.getRandomWeatherDescription(),
                windSpeed: Math.round(Math.random() * 15),
                windDirection: Math.round(Math.random() * 360)
            };
            
            this.createTemperatureMarker(city, weatherData);
        });
    }
    
    // Get random weather description for fallback data
    getRandomWeatherDescription() {
        const descriptions = [
            'clear sky', 'few clouds', 'scattered clouds', 'broken clouds',
            'overcast clouds', 'light rain', 'moderate rain', 'light snow',
            'mist', 'fog', 'partly cloudy'
        ];
        
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
    
    // Toggle weather layer visibility
    setVisible(visible) {
        this.isVisible = visible;
        
        // Toggle cloud layer
        if (this.weatherLayer) {
            this.weatherLayer.show = visible;
        }
        
        // Toggle temperature markers
        this.temperatureEntities.forEach(entity => {
            entity.show = visible;
            if (entity.label) {
                entity.label.show = visible;
            }
        });
        
        console.log(`🌤️ Weather layer: ${visible ? 'ENABLED' : 'DISABLED'}`);
    }
    
    // Update weather data
    async refresh() {
        console.log('🔄 Refreshing weather data...');
        
        // Clear existing temperature entities
        this.temperatureEntities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        this.temperatureEntities = [];
        
        // Reload temperature data
        await this.loadTemperatureData();
        
        // Restore visibility if weather layer was enabled
        if (this.isVisible) {
            this.setVisible(true);
        }
        
        console.log('✅ Weather data refreshed');
    }
    
    // Get current weather info for a location
    async getWeatherForLocation(latitude, longitude) {
        if (!this.apiKey) {
            return {
                error: 'No API key configured',
                fallback: true
            };
        }
        
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`
            );
            
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                temperature: Math.round(data.main.temp),
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                description: data.weather[0].description,
                windSpeed: data.wind?.speed || 0,
                windDirection: data.wind?.deg || 0,
                location: data.name || 'Unknown Location'
            };
            
        } catch (error) {
            console.warn('Failed to get weather for location:', error);
            return {
                error: error.message,
                fallback: true
            };
        }
    }
    
    // Clean up
    destroy() {
        // Remove weather layer
        if (this.weatherLayer) {
            this.viewer.scene.imageryLayers.remove(this.weatherLayer);
        }
        
        // Remove temperature entities
        this.temperatureEntities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        
        this.temperatureEntities = [];
        this.weatherLayer = null;
        
        console.log('🌤️ WeatherLayer destroyed');
    }
}

// Export for use in app.js
window.WeatherLayer = WeatherLayer;