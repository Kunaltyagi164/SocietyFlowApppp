# SocietyFlow Resident App

A React Native mobile application for society/apartment residents to manage visitors, bills, complaints, community, polls, marketplace, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.74.1 |
| Language | JavaScript (JSX) |
| Navigation | React Navigation 6 (Native Stack + Bottom Tabs) |
| HTTP Client | Axios |
| Local Storage | AsyncStorage |
| UI Icons | MaterialCommunityIcons (react-native-vector-icons) |
| Gradients | react-native-linear-gradient |
| Real-time | Socket.IO client (fallback: REST polling) |
| Build | Android Gradle (Kotlin/Java bridge) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- JDK 17
- Android Studio + SDK
- ADB (for device deployment)

### Install & Run

```bash
# Install dependencies
npm install

# Start Metro bundler
npx react-native start

# Deploy to connected Android device (new terminal)
npm run android
```

### Wireless ADB (for wireless device)
```bash
adb connect 192.168.1.35:40895
adb reverse tcp:8081 tcp:8081
npm run android
```

---

## Backend

**Base URL:** `http://api.societyflow.in:5000`  
**Auth:** JWT Bearer token stored in AsyncStorage (`token` key)  
**Uploads URL:** `http://api.societyflow.in` (no port 5000 for static files)

> See `DEVELOPER_GUIDE.md` for full API inventory and screen-by-screen logic.

---

## Folder Structure

```
src/
  screens/        All screen components grouped by feature
  components/     Shared reusable UI components
  navigation/     Navigator config + global sidebar + notification context
  services/       API client, billing utils, notifications, socket
  hooks/          Custom React hooks
  theme/          Design tokens (colors, radius, shadow, spacing)
  utils/          Helper utilities and color constants
  assets/         Images, logos, sounds
```

---

## Package ID

`com.societyflowresident`
