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
- npm >= 8 or yarn >= 1.22
- Git

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Aref-abt/Machine-Learning-Mutli-Currency-Wallet.git
   cd Machine-Learning-Mutli-Currency-Wallet
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the following variables in `backend/.env`:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=wallet_db
     DB_USER=your_username
     DB_PASSWORD=your_password
     JWT_SECRET=your_secret_key
     PORT=3000
     ```
   - Update the following variables in `frontend/.env`:
     ```
     VITE_API_URL=http://localhost:3000
     ```

### Database Setup

1. Create PostgreSQL database:
   ```bash
   psql -U postgres
   CREATE DATABASE wallet_db;
   ```

2. Run migrations:
   ```bash
   cd backend
   npm run migrate
   ```

### Backend Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   The server will run on http://localhost:3000

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at http://localhost:5173

## Running Tests

- Backend tests:
  ```bash
  cd backend
  npm run test
  ```

- Frontend tests:
  ```bash
  cd frontend
  npm run test
  ```

## Troubleshooting

- If you encounter database connection issues, ensure PostgreSQL is running and credentials are correct
- For `npm install` errors, try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- Make sure all required ports (3000, 5173, 5432) are available
