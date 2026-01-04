# PeeK App - Navigation & Interaction Schema

## App Overview

**App Name:** PeeK (GPS Tracker)
**Version:** 1.0.0
**Platform:** iOS & Android (React Native + Expo)

---

## Navigation Architecture

```
App Root
├── AuthNavigator (unauthenticated)
│   ├── Login
│   └── Register
│
├── OnboardingScreen (first-time users)
│   ├── ProfileTypeSelector
│   └── Profile Tutorial (Tracker/Community/Business/Explorer)
│
└── RootStackNavigator (authenticated + onboarded)
    ├── MainTabNavigator (5 tabs)
    │   ├── Map
    │   ├── Groups
    │   ├── [FAB: Create Event]
    │   ├── Messages
    │   └── Events
    │
    └── Modal Screens
        ├── EventDetail
        ├── Areas (List, Search, Detail, Create)
        ├── Chat, FoundChats, FoundChat
        ├── Devices Stack
        ├── Settings
        ├── UserProfile
        ├── Notifications
        └── TutorialViewer
```

---

## Tab Navigation (Bottom Bar)

| # | Tab | Icon | Screen | Purpose |
|---|-----|------|--------|---------|
| 1 | Map | `map` | MapScreen | Real-time locations, events, areas, group members |
| 2 | Groups | `people` | GroupsScreen | Manage groups, invitations, location sharing |
| 3 | **+** | FAB | AddEventScreen | Create new event (floating action button) |
| 4 | Messages | `chatbubble` | InboxScreen | Conversations, found object chats |
| 5 | Events | `alert-circle` | EventsScreen | Browse/filter events feed |

---

## Screen Details

### Authentication Flow

#### LoginScreen
- Email input
- Password input
- Login button (loading state)
- Link to Register
- PeeK logo with blur background

#### RegisterScreen
- Email, password, confirm password
- Terms acceptance
- Register button
- Link to Login

---

### Onboarding Flow

#### OnboardingScreen
1. **Step 1:** ProfileTypeSelector
   - Tracker (device tracking)
   - Community (neighborhood watch)
   - Business (fleet management)
   - Explorer (discovery)

2. **Step 2:** Profile-specific tutorial
   - TrackerOnboardingScreen
   - CommunityOnboardingScreen
   - BusinessOnboardingScreen
   - ExplorerOnboardingScreen

---

### Main Screens

#### MapScreen (Tab 1)
**Components:**
- MapView with markers, circles, polylines
- SlidingEventFeed (bottom drawer)
- GroupModeChip (active group indicator)
- EventFilterModal
- GroupMembersModal
- PulsingMarker (active locations)

**Interactions:**
- Tap marker → EventDetail
- Tap area circle → AreaDetail
- Tap group member → UserProfile
- Toggle GroupMode chip
- Slide event feed up/down
- Filter events

---

#### GroupsScreen (Tab 2)
**Tabs:**
1. My Groups - group cards with member count
2. Invitations - pending invites with accept/reject

**Interactions:**
- Tap group → GroupDetailScreen
- "View on Map" → activates group mode on map
- "Create Group" → CreateGroupScreen
- Accept/Reject invitations

---

#### InboxScreen (Tab 4)
**Tabs:**
1. Messages - conversations with users/groups
2. Found Objects - lost & found chats

**Features:**
- Unread badges (real-time via WebSocket)
- Last message preview
- Swipe to delete
- Search

**Interactions:**
- Tap conversation → ChatScreen
- Tap found object → FoundChatScreen

---

#### EventsScreen (Tab 5)
**Features:**
- Social feed style event list
- Event cards with type badges
- Reactions (like/dislike)
- Comment counts
- Filter modal
- Pull to refresh

**Event Types:**
| Type | Color | Icon |
|------|-------|------|
| THEFT | #FF3B30 (Red) | warning |
| LOST | #FF9500 (Orange) | search |
| ACCIDENT | #FFCC00 (Yellow) | car |
| FIRE | #FF2D55 (Pink) | flame |
| GENERAL | #007AFF (Blue) | megaphone |

**Interactions:**
- Tap event → EventDetailScreen
- React to event
- Filter by type/urgency/time

---

### Detail Screens

#### EventDetailScreen
- Full event info with map
- Creator info
- Comments section (with replies)
- Reactions
- Share button

#### GroupDetailScreen
- Group info
- Members list
- Location sharing toggle
- Group chat access
- Remove member (owner)
- Leave/Delete group

#### AreaDetailScreen
- Area info with map circle
- Members list
- Join requests (admin)
- Notification settings
- Leave/Delete area

#### UserProfileScreen
- User info
- Public events list
- Profile privacy view

---

### Creation Screens

#### AddEventScreen (2 steps)
**Step 1:**
- Event type selector (5 types)
- Description textarea
- Image picker
- Urgent toggle
- Group selection (optional)

**Step 2:**
- MapLocationPicker
- Current location button
- Address search

#### CreateGroupScreen
- Group name
- Description (optional)
- Submit

#### CreateAreaScreen
- Area name
- MapLocationPicker with radius
- Submit

---

### Device Management

#### DevicesScreen
- Device list with status indicators
- Battery level, last position
- Pulsing animation for active devices

#### AddDeviceScreen
- Device name
- IMEI input
- Submit

#### AddTaggedObjectScreen
- Object name
- QR code generation

#### DeviceDetailScreen
- Device info
- Position history
- Edit/Delete

#### DeviceQRScreen
- Large QR code display
- Share button
- QR toggle (enable/disable)

---

### Chat Screens

#### ChatScreen
- MessageBubble list
- ChatInput with send button
- TypingIndicator
- Real-time via WebSocket

#### FoundChatScreen
- Similar to ChatScreen
- Status badges (Active/Resolved/Closed)
- Mark as recovered button

---

### Settings

#### SettingsScreen
**Sections:**
- Tutorials (with "New" badge for unviewed)
- Profile type management
- Area of Interest picker
- Theme settings
- Notification preferences
- Logout

---

## User Flows

### 1. First-Time User
```
App Launch → Login/Register → ProfileTypeSelector → Tutorial → MapScreen
```

### 2. Report Event
```
Any Tab → FAB (+) → AddEvent Step 1 → Step 2 (location) → Submit → EventsScreen
```

### 3. Create & Share Location in Group
```
Groups Tab → Create Group → Invite Members → GroupDetail → Toggle Location Sharing → Map shows group
```

### 4. Message Flow
```
Messages Tab → Tap Conversation → ChatScreen → Type & Send → Real-time delivery
```

### 5. Found Object Flow
```
Messages Tab → Found Objects → FoundChatScreen → Communicate → Mark Resolved
```

---

## Key Components

| Component | Purpose |
|-----------|---------|
| SlidingEventFeed | Bottom drawer with event list |
| EventFilterModal | Filter events by type/urgency |
| MapLocationPicker | Interactive location picker |
| GroupMembersModal | Show group members |
| GroupModeChip | Active group indicator |
| PulsingMarker | Animated map marker |
| MessageBubble | Chat message display |
| ChatInput | Message input with send |
| UnreadBadge | Unread count indicator |
| ActionSheet | Custom action sheet |

---

## State Management

### Contexts
- **AuthContext:** Authentication state, user, login/logout
- **OnboardingContext:** Onboarding status, profile type, tutorials viewed
- **ThemeContext:** Light/dark theme
- **ToastContext:** Notifications
- **PeekModeContext:** Peek mode toggle

### Stores (Zustand)
- **useDeviceStore:** Devices list, active device
- **useGroupStore:** Active group
- **useMapStore:** Selected area

---

## Color Palette

**Primary:** #007AFF
**Success:** #34C759
**Error:** #FF3B30
**Warning:** #FF9500
**Background:** #FFFFFF (light) / #000000 (dark)
**Text Primary:** #000000 (light) / #FFFFFF (dark)
**Text Secondary:** #8E8E93

---

## API Endpoints

```
/api/events      - Event CRUD
/api/devices     - Device management
/api/groups      - Group operations
/api/messages    - Messaging
/api/areas       - Area of Interest
/api/found-chats - Found object chats
/api/qr          - QR code operations
```

**WebSocket Events:**
- `new_message` - New chat message
- `user_location_update` - Group member location
- `typing` - User typing indicator

---

## Screen Count Summary

| Category | Count |
|----------|-------|
| Authentication | 2 |
| Onboarding | 6 |
| Main Tabs | 5 |
| Device Management | 4 |
| Event Screens | 2 |
| Group Screens | 3 |
| Detail/Modal | 11 |
| **Total** | **33** |
