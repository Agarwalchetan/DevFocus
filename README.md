# DevFocus

DevFocus is a full-stack productivity and focus-tracking application built with **React (frontend)**, **FastAPI (backend)**, and **MongoDB**.
It supports authentication, task management, focus sessions, heatmaps, and real-time focus rooms via WebSockets.

---

## Tech Stack

**Frontend**

- React (CRA)
- CRACO
- Yarn
- Tailwind CSS

**Backend**

- FastAPI
- MongoDB (Motor)
- JWT Authentication
- WebSockets (Uvicorn)

---

## Project Structure

```
app/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── models.py
│   ├── server.py
│   ├── requirements.txt
│   ├── .env
│   └── venv/
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   ├── craco.config.js
│   ├── package.json
│   ├── yarn.lock
│   └── .env
│
└── README.md
```

---

## Prerequisites

Make sure these are installed:

- **Node.js** (v18+ recommended)
- **Yarn**
- **Python** (3.10+ recommended)
- **MongoDB** (local instance)

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=http://localhost:3000
```

---

### Frontend (`frontend/.env`)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

> ⚠️ Restart the frontend after changing `.env`.

---

## Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### Fix bcrypt warning (important)

```bash
pip uninstall bcrypt -y
pip install bcrypt==3.2.2
```

### Start backend server

```bash
python server.py
```

Backend runs on:

```
http://localhost:8001
```

Health check:

```
GET http://localhost:8001/api/health
```

---

## Frontend Setup (React)

```bash
cd frontend
yarn install
yarn start
```

Frontend runs on:

```
http://localhost:3000
```

---

## Running the App (Summary)

| Service  | Command            | URL                                            |
| -------- | ------------------ | ---------------------------------------------- |
| Backend  | `python server.py` | [http://localhost:8001](http://localhost:8001) |
| Frontend | `yarn start`       | [http://localhost:3000](http://localhost:3000) |
| MongoDB  | `mongod`           | localhost:27017                                |

Both frontend and backend must be running.

---

## Authentication Flow

1. Register user

   ```
   POST /api/auth/register
   ```

2. Login user

   ```
   POST /api/auth/login
   ```

3. Access protected routes using:

   ```
   Authorization: Bearer <JWT_TOKEN>
   ```

---

## Common Issues & Fixes

### 401 Unauthorized on login

- Wrong credentials
- Old password hash
- Clear users and re-register

```js
db.users.deleteMany({});
```

---

### CORS errors

Ensure backend `.env` contains:

```env
CORS_ORIGINS=http://localhost:3000
```

---

### VS Code import errors

Select correct interpreter:

```
backend/venv/Scripts/python.exe
```

---

## Emergent Cleanup Note

All Emergent-specific scripts, badges, configs, and tooling have been **fully removed**.
This project now runs **independently** without any Emergent dependency.

---

## Production Build

Frontend:

```bash
yarn build
```

Backend:

- Run with `uvicorn`
- Configure proper domain CORS
- Use environment-specific secrets

---

## License

MIT (or specify if different)

---
