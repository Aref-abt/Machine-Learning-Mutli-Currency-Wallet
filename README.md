# ML-Enhanced Multi-Currency Virtual Wallet

A digital wallet system with ML-powered features for currency exchange optimization and fraud detection.

## Features

- Multi-currency wallet support (USD, MXN, PHP)
- ML-powered exchange rate predictions
- Check cashing integration
- Secure wallet-to-wallet transfers
- Fraud detection system
- Dark mode interface
- Mobile-first responsive design

## Tech Stack

- Frontend: Vue.js 3 with Composition API
- Backend: Node.js with Express
- Database: PostgreSQL
- ML: TensorFlow.js
- UI Framework: Vuetify

## Project Structure

```
├── frontend/           # Vue.js frontend application
├── backend/           # Node.js Express backend
└── docs/             # Documentation
```

## Setup Instructions

### Prerequisites

- Node.js >= 16
- PostgreSQL >= 14
- npm or yarn

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Database Setup
1. Create PostgreSQL database
2. Update .env file with database credentials
3. Run migrations: `npm run migrate`

## Development Timeline

- Day 1: Multi-Currency Wallet & Check Cashing Integration
- Day 2: Currency Exchange System
- Day 3: ML Features Implementation
- Day 4: Transfer System & Fraud Detection
