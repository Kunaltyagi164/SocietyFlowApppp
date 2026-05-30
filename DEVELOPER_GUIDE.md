# SocietyFlow Resident App — Developer Guide

This document explains the full architecture, folder structure, navigation model, state management, API integration, and key business logic so any developer or team can understand and extend the codebase quickly.

---

## 1. Project Overview

SocietyFlow Resident is a React Native app for apartment/society residents. It connects to a REST API backend and provides:

- Visitor management (register/approve visitors, pre-register upcoming guests)
- Bill payments and invoice history
- Complaints / work orders
- Community posts and discussions
- Polls and voting
- Society notices and documents
- Marketplace (buy/sell listings among residents)
- Emergency contacts and SOS alerts
- Profile and family member management
- Reports, parking, amenities booking, staff directory, CCTV alerts

---

## 2. Folder Structure

```
SocietyFlowResident/
├── index.js                        Entry point — registers App component
├── App.tsx                         Root component — wraps NotificationProvider + AppNavigator
├── app.json                        App metadata (name: SocietyFlowResident)
├── package.json                    Dependencies and scripts
├── android/                        Native Android project (Gradle)
├── src/
│   ├── screens/                    All screen components (see Section 4)
│   ├── components/                 Shared reusable UI components (see Section 5)
│   ├── navigation/                 Navigation config, sidebar, notification context
│   │   └── index.js
│   ├── services/                   API layer and business services (see Section 6)
│   │   ├── api.js                  All API calls (Axios)
│   │   ├── billingUtils.js         Bill status processing logic
│   │   ├── LocalNotificationService.js  In-app local notification engine
│   │   ├── NotificationService.js  Legacy notification helper
│   │   ├── socket.js               Socket.IO connection (with REST fallback)
│   │   ├── updateService.js        App update check logic
│   │   ├── visitorService.js       Visitor-related business logic helpers
│   │   └── voiceService.js         Voice bot speech synthesis
│   ├── hooks/
│   │   └── useAutoRefresh.js       Custom hook: auto-refresh data on interval
│   ├── theme/                      Design tokens: Colors, Radius, Shadow, Spacing, Gradients
│   │   └── index.js
│   ├── utils/
│   │   └── colors.js               COLORS / GRADIENTS / SHADOWS constants (used in Home)
│   └── assets/
│       ├── images/                 Logos, building illustration
│       └── sounds/                 Audio files for voice bot / alerts
```

---

## 3. Entry Point & App Shell

### `index.js`
Registers `App` component with React Native's AppRegistry under the name `SocietyFlowResident`.

### `App.tsx`
```
App
└── NotificationProvider (provides counts + loadCounts context)
    └── AppNavigator (root navigation + global sidebar + global back button)
```

---

## 4. Navigation Architecture (`src/navigation/index.js`)

The navigation is a **single file** that owns:

1. **React Navigation Stack** — all routes in one `Stack.Navigator`
2. **Bottom Tab Navigator** — `MainTabs` component (5 main tabs)
3. **Global Sidebar** — a `Sidebar` modal rendered at the root level (above NavigationContainer)
4. **Global Back Button** — floating overlay button shown on non-root push screens
5. **Global Swipe Gesture** — left-edge swipe (PanResponder) on root View opens sidebar
6. **NotificationContext** — React Context that tracks unread counts across tabs
7. **NavigationRef** — `createNavigationContainerRef()` used by sidebar and global back

### Route Names

| Route Name | Screen | Notes |
|---|---|---|
| Splash | SplashScreen | Initial loader |
| Login | LoginScreen | Auth entry |
| ChangePassword | ChangePasswordScreen | Force password reset |
| Main | MainStack → MainTabs | Bottom tab shell |
| HomeTab | HomeScreenModern | |
| BillsTab | BillsScreen | |
| VisitorsTab | VisitorsScreen | |
| MarketplaceTab | MarketplaceFeed | |
| CommunityTab | CommunityScreen | |
| ProfileTab | ProfileScreen | |
| Bills | BillsScreen | Stack push |
| Payment | PaymentScreen | Modal |
| InvoicePreview | InvoicePreviewScreen | |
| DocumentPreview | DocumentPreviewScreen | |
| Issues | ComplaintsScreen | |
| NewComplaint | NewComplaintScreen | Modal |
| DetailedComplaint | DetailedComplaintScreen | |
| Visitors | VisitorsScreen | Stack push |
| NewVisitor | NewVisitorScreen | Modal |
| PreRegisterForm | PreRegisterFormScreen | Modal |
| InviteFriend | InviteFriendScreen | Modal |
| UpcomingPreReg | UpcomingPreRegistrationsScreen | |
| Notifications | NotificationsScreen | |
| Notices | NoticesScreen | |
| Docs | DocumentsScreen | |
| Vendors | VendorsScreen | |
| Parking | ParkingScreen | |
| ParkingStats | ParkingStatsScreen | |
| Community | CommunityScreen | Stack push |
| Polls | PollingScreen | |
| Reports | ReportsScreen | |
| Amenities | AmenitiesBookingScreen | |
| CCTVAlerts | CCTVAlertsScreen | |
| Search | SearchScreen | |
| MarketplaceDetail | MarketplaceDetail | |
| NewListing | NewListing | Modal |
| Staff | StaffDirectoryScreen | |
| Emergency | EmergencyScreen | Slide from bottom |
| Profile | ProfileScreen | Stack push |
| ProfileManagement | ProfileManagementScreen | |
| FamilyMembers | FamilyMembersScreen | |

### Global Back Button Rules
Shown on all pushed screens **except**:
- Root routes: `Splash`, `Login`, `ChangePassword`, `Main`
- Tab roots: `HomeTab`, `BillsTab`, `VisitorsTab`, `MarketplaceTab`, `CommunityTab`, `ProfileTab`
- Screens with own back button: `Profile`, `ProfileManagement`, `FamilyMembers`, `Payment`, `InvoicePreview`, `PreRegisterForm`, `NewVisitor`, `ParkingStats`, `MarketplaceDetail`, `NewListing`, `Search`, `Staff`, `Amenities`, `CCTVAlerts`

---

## 5. Screen Inventory (`src/screens/`)

### Auth
| Screen | Purpose |
|---|---|
| SplashScreen | Token check, auto-login redirect |
| LoginScreen | Email/password login, stores token + user to AsyncStorage |
| ChangePasswordScreen | Forced on first login |

### Home
| Screen | Purpose |
|---|---|
| HomeScreenModern | Main dashboard — stats, announcements, quick actions, emergency alerts |

**HomeScreenModern key logic:**
- Loads user profile, bills, complaints, visitors, notices, community posts on mount
- Shows stat cards: Visitors count, Pending dues, Open complaints, Announcements
- Quick Actions: Add Visitor → Complaints → Reports → Emergency
- Polls emergency alerts every 15 seconds
- Polls pending visitors every 10 seconds (shows alert if new visitor arrives)
- Bell icon unread dot = `Math.max(contextUnread, LocalNotificationService.getUnreadCount())`
- `DashboardHeader` component renders menu (sidebar), logo, greeting, bell

### Bills
- `BillsScreen` — list bills by status tabs (All / Pending / Overdue / Paid)
- `PaymentScreen` — manual payment recording with Razorpay integration hook
- `InvoicePreviewScreen` — PDF-style invoice view

**Billing logic (`services/billingUtils.js`):**
- Processes raw bills from API with billing config (due date, grace period, late fee)
- Derives `pending` / `overdue` / `paid` status based on dates and config

### Visitors
- `VisitorsScreen` — list inside/pending/all visitors with check-in/out controls
- `NewVisitorScreen` — register a new visitor (name, phone, purpose, flat)
- `PreRegisterFormScreen` — pre-register upcoming visitor with expected date/time
- `InviteFriendScreen` — share invite link
- `UpcomingPreRegistrationsScreen` — list of pre-registered future visitors

### Complaints
- `ComplaintsScreen` — list open/resolved complaints
- `NewComplaintScreen` — file new complaint with category, description, photo
- `DetailedComplaintScreen` — view complaint status and history

### Community
- `CommunityScreen` — social feed of resident posts, like/comment
- Posts fetched from `/api/community/posts`
- Unread posts tracked in AsyncStorage (`community_unread_posts`)

### Polling
- `PollingScreen` — Active/Closed tabs
- Active tab: loaded from `GET /api/polls` (voting eligible)
- Closed tab: loaded from `GET /api/polls/all` filtered to `is_active: false`
- Vote: `POST /api/polls/{id}/vote` with `{ option_index: number }`
- Results (progress bars, vote counts) only shown **after** the user votes (anti-bias)
- Winner badge shown only on closed polls
- `user_vote_index` normalization + local fallback state for immediate highlight

### Notifications
- Powered entirely by `LocalNotificationService` (no separate API — uses data from Home)
- Types: visitor, notice, community, bill
- Mark as read / Mark all read / Clear all
- Bell dot on Home synced on every Home focus + after notification generation

### Profile
- `ProfileScreen` — view/edit resident profile photo and details
- `ProfileManagementScreen` — submit profile update requests (admin-approved)
- `FamilyMembersScreen` — add/view family members linked to flat

### Other Screens
| Screen | Key Logic |
|---|---|
| ReportsScreen | Financial/activity reports with charts |
| DocumentsScreen | Society documents (cached in AsyncStorage) |
| VendorsScreen | Approved vendors list |
| ParkingScreen | Parking slot status |
| ParkingStatsScreen | Parking analytics |
| AmenitiesBookingScreen | Book society amenities (gym, pool, clubhouse) |
| CCTVAlertsScreen | CCTV-triggered security alerts |
| SearchScreen | Global search across residents/visitors/docs |
| StaffDirectoryScreen | Society staff list |
| EmergencyScreen | Emergency contacts + SOS trigger |
| NoticesScreen | Society notices/announcements |
| MarketplaceFeed / MarketplaceDetail / NewListing | P2P buy-sell marketplace |

---

## 6. API Layer (`src/services/api.js`)

### Base Config
```js
BASE_URL = 'http://api.societyflow.in:5000'
Uploads = 'http://api.societyflow.in'  // NO port for static files
Auth header: Authorization: Bearer <token>
Timeout: 15s
```

### Token Flow
1. Login → `POST /api/auth/login` → saves `token`, `user`, `society` to AsyncStorage
2. Axios request interceptor reads `token` from AsyncStorage and attaches as `Bearer`
3. Logout → `AsyncStorage.multiRemove(['token', 'user', 'society'])` → navigate to Login

### Key API Groups
| Group | Endpoints |
|---|---|
| Auth | `/api/auth/login`, `/api/auth/change-password` |
| Residents | `/api/me`, `/api/residents/me/family` |
| Bills | `/api/bills/my`, `/api/bills/config`, `/api/payments/manual` |
| Visitors | `/api/registrations`, `/api/registrations/{id}` |
| Complaints | `/api/complaints`, `/api/complaints/{id}` |
| Notices | `/api/notices` |
| Community | `/api/community/posts`, `/api/community/posts/{id}/comments` |
| Polls | `/api/polls` (active), `/api/polls/all`, `/api/polls/{id}/vote` |
| Notifications | `/api/notifications` |
| Documents | `/api/documents` |
| Vendors | `/api/vendors` |
| Parking | `/api/parking` |
| Emergency | `/api/emergency-contacts`, `/api/emergency-alerts`, `/api/sos` |
| Marketplace | `/api/marketplace/listings` |
| Reports | `/api/reports` |

### Photo URL Helper
```js
getPhotoUrl(photoPath)
// If path starts with /uploads → use http://api.societyflow.in (no port)
// Otherwise → prepend BASE_URL
```

---

## 7. State Management

There is **no Redux or Zustand**. State is handled through:

| Pattern | Used For |
|---|---|
| `useState` in screen | Local screen data |
| `useContext` (NotificationContext) | Cross-screen unread badge counts |
| `AsyncStorage` | Persistent: token, user, unread posts, acknowledged alerts, visitor counts |
| `navigation.addListener('focus', ...)` | Refresh data when tab/screen is focused |
| `setInterval` (polled) | Home emergency alerts (15s), visitor updates (10s) |

### NotificationContext
Defined and provided in `src/navigation/index.js`.

```
counts = {
  home: 0,          // Stay-exceeded + CCTV alerts
  bills: 0,         // Always 0 (bills show own badge)
  visitors: 0,      // Inside visitors count (from AsyncStorage)
  community: 0,     // Unread posts count (from AsyncStorage)
  profile: 0,       // Pending residents
  notifications: 0  // Total unread from /api/notifications
}
```

---

## 8. Local Notification Service (`src/services/LocalNotificationService.js`)

This service generates in-app notifications **without extra API calls** by analyzing data already loaded by HomeScreenModern.

**How it works:**
1. HomeScreenModern loads visitors, notices, bills, community posts
2. Calls `LocalNotificationService.generateNotifications(data)`
3. Service compares current data against previously-seen IDs (stored in AsyncStorage)
4. New items → creates notification objects → stores in `local_notifications_list` key
5. NotificationsScreen reads from this list
6. `getUnreadCount()` returns count of `read: false` notifications
7. Home bell dot shows dot when count > 0

---

## 9. Socket.IO (`src/services/socket.js`)

Used for real-time updates. Backend must have Socket.IO server configured.

**Current behavior:**
- Attempts to connect to `http://api.societyflow.in:5000`
- If connection fails → falls back to REST polling (30-second interval)
- Emergency screen uses REST API directly (not socket)

---

## 10. Sidebar (`src/components/Sidebar.js`)

Full-screen drawer modal opened by:
- Left-edge swipe gesture (PanResponder in AppNavigator root)
- Menu (hamburger) button in DashboardHeader on Home

Contains grouped menu items navigating to all major screens.  
Shows unread community post badge and pending visitor badge.

---

## 11. Theme (`src/theme/index.js` and `src/utils/colors.js`)

Two color/token systems exist:
- `src/theme/index.js` — used by most screens: `Colors`, `Radius`, `Shadow`, `Spacing`, `GradientColors`
- `src/utils/colors.js` — used by Home dashboard: `COLORS`, `GRADIENTS`, `SHADOWS`

Both define royalBlue as primary brand color with freshGreen as accent.

---

## 12. Key Business Logic Notes

### Visitor Count on Home
The badge on Visitors tab is the number of visitors currently **inside** (checked-in), stored in `AsyncStorage['inside_visitors_count']` by VisitorsScreen and read by NotificationContext.

### Bill Status Derivation
Bills from `/api/bills/my` do not have status in the response. `billingUtils.processBills()` computes:
- `paid` — if `paid_at` exists
- `overdue` — if due date passed and no payment
- `pending` — due in the future

### Poll Voting
1. Check `GET /api/polls` → `user_voted: false` → show radio options
2. User taps → `POST /api/polls/{id}/vote` with `{ option_index: N }`
3. Response returns updated poll with `user_voted: true`, `user_vote_index: N`, new `vote_counts`
4. State updated immediately from response — no re-fetch
5. Progress bars and vote counts revealed after voting (anti-bias rule)

### Emergency SOS
`POST /api/sos` triggers an emergency alert that is visible to admin/security.  
Active alerts polled every 15 seconds on Home screen.

---

## 13. Build & Deploy

### Debug APK
```bash
cd android
.\gradlew.bat assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on Device (Wireless ADB)
```bash
# If multiple devices listed, target specific one:
adb -s "adb-461950c2-SwMeDk._adb-tls-connect._tcp" install -r app-debug.apk

# Or push + pm install (more reliable on wireless):
adb push app-debug.apk /data/local/tmp/app-debug.apk
adb shell pm install -r /data/local/tmp/app-debug.apk
```

### When App Shows "Unable to Load Script"
```bash
# 1. Reconnect port tunnel
adb reverse tcp:8081 tcp:8081

# 2. Restart app
adb shell am force-stop com.societyflowresident
adb shell am start -n com.societyflowresident/.MainActivity
```

---

## 14. Adding a New Screen

1. Create `src/screens/YourFeature/YourScreen.js`
2. Import it in `src/navigation/index.js`
3. Add `<Stack.Screen name="YourScreen" component={YourScreen} />` inside the Stack.Navigator
4. Add to Sidebar menu items in `src/components/Sidebar.js` if needed
5. If screen has its own back button, add route name to `routesWithOwnBackButton` in `src/navigation/index.js`

---

## 15. Environment / Config Checklist

| Item | Value |
|---|---|
| Backend API | `http://api.societyflow.in:5000` |
| Uploads CDN | `http://api.societyflow.in` |
| Package ID | `com.societyflowresident` |
| App Name | SocietyFlow Resident |
| Min SDK | Android 7+ (API 24) |
| Target SDK | Android 14 (API 34) |
