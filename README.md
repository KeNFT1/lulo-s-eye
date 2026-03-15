# 👁️ Lulo's Eye

<p align="center">
  <img src="assets/logo.jpg" alt="Lulo's Eye" width="300" />
</p>

**Real-Time Global Intelligence Platform**

A comprehensive OSINT (Open Source Intelligence) platform that provides real-time global situational awareness through an interactive 3D interface. The next generation of accessible intelligence gathering.

## 🛰️ Features

### **Live Intelligence Feeds**
- **Aircraft Tracking**: Real-time global flights with operator identification (CIA-linked, government, military)
- **Naval Intelligence**: Fleet positions including USS carriers and operational status
- **Satellite Constellation**: Live orbital tracking of reconnaissance and military satellites  
- **CCTV Surveillance**: 2,900+ live camera feeds from major cities worldwide
- **GPS Jamming Detection**: Real-time electronic warfare monitoring
- **Weather Systems**: Storm tracking and meteorological data

### **Advanced Navigation**
- **Global Address Search**: Natural language geocoding ("Times Square", "Eiffel Tower")
- **Coordinate Input**: Precise lat/lon navigation (51.5074, -0.1278)
- **Current Location**: GPS integration for local intelligence gathering
- **Real-Time Coordinates**: Live camera position display with meter-level accuracy

### **Military-Style Interface**
- **3D Earth Visualization**: Cesium-powered globe with realistic lighting
- **Visual Modes**: Optical, Night Vision, Thermal imaging filters
- **God Mode**: Enhanced overlays with detailed intelligence labels
- **Alert System**: Real-time notifications and status updates
- **Classification Markings**: Professional intelligence interface design

### **Interactive Intelligence**
- **Clickable Elements**: Click aircraft, ships, satellites, cameras for detailed info
- **Live Camera Feeds**: Modal windows with real-time CCTV streams
- **Layer Toggles**: Selectively display different intelligence types
- **Search Markers**: Visual indicators for navigation results

## 🎮 Controls

### **Navigation**
- **`L`** - Focus address search
- **`M`** - Go to current location  
- **`R`** - Reset to New York City
- **Quick Cities**: SFO, LDN, TYO, NYC buttons

### **Intelligence Layers**
- **`A`** - Toggle aircraft intelligence
- **`S`** - Toggle satellite constellation
- **`N`** - Toggle naval intelligence
- **`C`** - Toggle CCTV surveillance
- **`J`** - Toggle GPS jamming zones
- **`G`** - Toggle God Mode (enhanced labels)

### **Visual Modes**
- **`1`** - Optical mode
- **`2`** - Night vision mode
- **`3`** - Thermal imaging mode

## 🚀 Quick Start

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/KeNFT1/lulos-eye.git
cd lulos-eye

# Start a local web server
python3 -m http.server 8080

# Open browser to http://localhost:8080/index-working.html
```

### **With ShadowBroker Integration**
For full real-time intelligence feeds, run alongside [ShadowBroker](https://github.com/BigBodyCobain/Shadowbroker):

```bash
# Terminal 1: Start ShadowBroker
cd shadowbroker
docker-compose up -d

# Terminal 2: Start Lulo's Eye  
cd lulos-eye
python3 -m http.server 8080

# Access: http://localhost:8080/index-working.html
```

## 📡 Data Sources

- **Aircraft**: OpenSky Network + ShadowBroker intelligence annotations
- **Satellites**: Real orbital data with mission classification
- **Naval**: Fleet tracking with operational status
- **CCTV**: Global camera networks (TfL London, DOT highways, etc.)
- **Jamming**: GPS interference monitoring
- **Geocoding**: OpenStreetMap Nominatim

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6
- **3D Engine**: Cesium.js for WebGL globe visualization
- **Intelligence API**: ShadowBroker real-time feeds
- **Geocoding**: OpenStreetMap Nominatim
- **Geolocation**: Browser HTML5 Geolocation API

## 🔒 Security & Privacy

- **Open Source Intelligence**: All data sources are publicly available
- **No API Keys Required**: Core functionality works without registration
- **Privacy Respecting**: Location access requires explicit user consent
- **Classification Aware**: Proper UNCLASSIFIED markings for OSINT data

## 🎯 Use Cases

- **Situational Awareness**: Global intelligence monitoring
- **Flight Tracking**: Real-time aviation intelligence
- **Infrastructure Monitoring**: CCTV surveillance and transportation
- **Electronic Warfare**: GPS jamming detection and analysis
- **Research & Education**: Open source intelligence gathering
- **Emergency Response**: Real-time global event monitoring

## 🌍 Example Searches

Try these in the address search:
- `"Times Square, NYC"` - Urban surveillance hub
- `"51.5074, -0.1278"` - London coordinates  
- `"LAX Airport"` - Aviation intelligence
- `"Golden Gate Bridge"` - Critical infrastructure
- `"Pentagon"` - Government facility monitoring

## 👥 Credits

- **Created by**: Lulo Studios
- **Developed by**: Ken (KeNFT1) with AI assistance
- **Intelligence Platform**: ShadowBroker integration
- **3D Engine**: Cesium.js open source
- **Inspiration**: Next-generation OSINT accessibility

## ⚖️ Legal Disclaimer

This software is provided **"as is"**, without warranty of any kind, express or implied. By using Lulo's Eye, you acknowledge and agree to the following:

1. **Public Data Only** — All data displayed by this platform is sourced exclusively from publicly available, open-source intelligence (OSINT) feeds and APIs. No classified, proprietary, or non-public data is collected, stored, or displayed.

2. **No Warranty or Guarantee** — The authors and contributors make no representations or warranties regarding the accuracy, completeness, reliability, or timeliness of any data presented. Data is provided by third-party sources and may contain errors, omissions, or delays.

3. **Limitation of Liability** — In no event shall the authors, contributors, or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software. This includes, but is not limited to, any direct, indirect, incidental, special, exemplary, or consequential damages.

4. **Intended Use** — This tool is intended for educational, research, and informational purposes only. Users are solely responsible for ensuring their use of this software complies with all applicable local, state, national, and international laws and regulations.

5. **No Endorsement** — The display of any data (including but not limited to aircraft positions, vessel locations, satellite tracks, or surveillance feeds) does not constitute endorsement, verification, or validation of any entity, activity, or event.

6. **User Responsibility** — Users assume all risk associated with the use of this software. The authors are not responsible for any actions taken based on information provided by this platform.

7. **Third-Party Services** — This software integrates with third-party APIs and data sources, each governed by their own terms of service. Users are responsible for compliance with those terms.

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

**"Eyes everywhere, knowledge for all"** — The Lulo's Eye mission statement.