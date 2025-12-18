# GPS Tracker - JX10

Multi-platform GPS tracking application for JX10 devices with real-time monitoring.

## Project Structure

```
.
├── backend/          # Node.js backend server
│   ├── src/
│   │   ├── api/      # REST API routes and controllers
│   │   ├── tcp/      # TCP server for GPS devices (port 8841)
│   │   ├── websocket/ # WebSocket server for real-time updates
│   │   ├── config/   # Database and configuration
│   │   └── types/    # TypeScript types
│   └── prisma/       # Database schema and migrations
│
└── mobile/           # React Native + Expo mobile app
    └── src/
        ├── navigation/ # App navigation
        ├── screens/    # Screen components
        ├── services/   # API and WebSocket services
        ├── store/      # Zustand state management
        └── types/      # TypeScript types
```

## Tech Stack

### Backend
- Node.js + TypeScript
- Express (REST API)
- WebSocket (real-time communication)
- TCP Server (JX10 device communication on port 8841)
- PostgreSQL + Prisma ORM

### Frontend
- React Native
- Expo
- React Navigation
- React Native Maps
- Zustand (state management)
- Axios (HTTP client)

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Expo CLI

### Backend Setup

1. Start PostgreSQL:
```bash
docker-compose up -d
```

2. Configure environment:
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
```

3. Install dependencies:
```bash
npm install
```

4. Setup database:
```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Seed database with test data (optional):
```bash
npm run seed
```

6. Start development server:
```bash
npm run dev
```

The backend will run on:
- HTTP API: http://localhost:3000
- WebSocket: ws://localhost:3000/ws
- TCP Server: 0.0.0.0:8841

### Mobile Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Start Expo:
```bash
npm start
```

3. Run on platform:
```bash
npm run ios     # iOS
npm run android # Android
npm run web     # Web
```

## Test Credentials

The database can be seeded with 10 test users and sample events for development and testing.

### Test Users
All test users share the same password: `Test1234!`

| Name | Email |
|------|-------|
| Juan Pérez | juan.perez@test.com |
| María García | maria.garcia@test.com |
| Carlos López | carlos.lopez@test.com |
| Ana Martínez | ana.martinez@test.com |
| Pedro Rodríguez | pedro.rodriguez@test.com |
| Laura Fernández | laura.fernandez@test.com |
| Julio Sánchez | julio.sanchez@test.com |
| Sofía Gómez | sofia.gomez@test.com |
| Martín Díaz | martin.diaz@test.com |
| Valentina Torres | valentina.torres@test.com |

Each user has between 3 and 6 public events with random types (THEFT, LOST, ACCIDENT, FIRE) and statuses (IN_PROGRESS, CLOSED). Events are distributed within a 10km radius of Buenos Aires center for testing the map and event feed features.

To seed the database:
```bash
cd backend
npm run seed
```

## API Endpoints

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device by ID
- `POST /api/devices` - Create device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Positions
- `GET /api/positions` - List all positions
- `GET /api/positions/device/:deviceId` - Get positions by device
- `GET /api/positions/:id` - Get position by ID

## Database Schema

### Device
- id (UUID)
- imei (String, unique)
- name (String, optional)
- createdAt (DateTime)
- updatedAt (DateTime)

### Position
- id (UUID)
- deviceId (UUID, FK)
- latitude (Float)
- longitude (Float)
- altitude (Float, optional)
- speed (Float, optional)
- heading (Float, optional)
- timestamp (DateTime)
- createdAt (DateTime)

## Development Status

This is the initial skeleton. Implementation pending:
- [ ] JX10 protocol parser
- [ ] Real-time position updates via WebSocket
- [ ] Complete API implementation
- [ ] Mobile UI implementation
- [ ] Authentication & authorization
- [ ] Device management features
- [ ] Historical track visualization

## License

MIT
