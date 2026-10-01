# GreenGrid EMIS - Phase 7 Enterprise Readiness & Setup Guide

This guide provides complete instructions for configuring, running, testing, and deploying the **GreenGrid: Smart Energy Management Information System (EMIS)** with Phase 7 Enterprise Readiness, Global Application Search, System Health Monitoring, Production Observability, UI/UX Consistency, and Production Deployment Preparation.

---

## 1. Prerequisites
- **Python**: Version 3.10 to 3.13 (Python 3.13 verified)
- **Node.js**: v18+ and npm v9+
- **Database**: SQLite (Local development default) or MySQL 8.0+ / PostgreSQL (Production)
- **PowerShell**: Windows PowerShell 5.1+ or PowerShell Core 7+

---

## 2. Development Setup

### Step 1: Open Project Directory
```powershell
cd "c:\Users\ASUS\OneDrive\Desktop\GREEN GRID"
```

### Step 2: Create & Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

*(If PowerShell script execution is restricted, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

### Step 3: Install Dependencies
```powershell
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

### Step 4: Configure Environment Variables
Copy `backend/.env.example` to `backend/.env` if not already present:
```powershell
Copy-Item backend\.env.example backend\.env
```

Review environment variables in `backend/.env`:
```env
DEBUG=True
SECRET_KEY=django-insecure-greengrid-production-ready-key
ALLOWED_HOSTS=localhost,127.0.0.1,greengrid.example
DB_ENGINE=django.db.backends.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Step 5: Apply Database Migrations
```powershell
cd backend
..\venv\Scripts\python.exe manage.py migrate
```

### Step 6: Run Development Backend Server
```powershell
..\venv\Scripts\python.exe manage.py runserver
```

---

## 3. Frontend Setup

### Step 1: Open Frontend Directory & Install Dependencies
```powershell
cd ..\frontend
npm install
```

### Step 2: Start Vite Development Server
```powershell
npm run dev
```
The application will be accessible at: `http://localhost:5173`

### Step 3: Production Build
```powershell
npm run build
```

---

## 4. Phase 7 Architecture & Enterprise Features

- **Global Application Search**:
  - `GET /api/search/?q=query`
  - Deep tenant-scoped search across facilities, meters, devices, active alerts, and utility invoices with instant live keyboard dropdown in `AppTopbar.jsx`.
- **Operational Health Endpoint**:
  - `GET /api/health/`
  - Real-time service status (`healthy`/`unhealthy`), database connectivity verification (`connected`/`disconnected`), and timestamp telemetry.
- **Production Observability & Logging**:
  - Structured console logger configured in `greengrid/settings.py` adhering to security standards (zero credential or JWT secret output).
- **UI/UX Consistency & Industrial B2B Aesthetic**:
  - Clean GreenGrid design system without purple gradients, fake logos, em dashes, or arbitrary placeholders.
- **Production Deployment Preparation**:
  - Full production deployment documentation in [`DEPLOYMENT.md`](file:///c:/Users/ASUS/OneDrive/Desktop/GREEN%20GRID/DEPLOYMENT.md) detailing Nginx reverse proxy, Gunicorn WSGI, Daphne ASGI, Redis WebSockets, PostgreSQL setup, and systemd services.

---

## 5. Verification & Quality Gate Commands
Run automated verification test suite and quality gate commands:
```powershell
cd ..\backend
..\venv\Scripts\python.exe manage.py check
..\venv\Scripts\python.exe manage.py makemigrations --check
..\venv\Scripts\python.exe manage.py test core

cd ..\frontend
npm run build
```
*(All 54 core unit tests pass cleanly, database migrations are in sync, and Vite production bundle compiles cleanly).*


