# GreenGrid - Enterprise Smart Energy Management Information System (EMIS)

GreenGrid is a production-quality Smart Energy Management Information System (EMIS) designed for multi-facility commercial buildings, industrial manufacturing plants, campuses, and renewable energy operators.

---

## Technical Stack & Architecture

- **Backend Framework**: Python 3.13 + Django 6.1 + Django REST Framework (DRF)
- **Authentication**: JWT (JSON Web Tokens) with SimpleJWT, token rotation, and blacklisting
- **Real-Time WebSockets**: Django Channels + ASGI Daphne (Organization-scoped channel streams)
- **Frontend SPA**: React 18 + Vite + React Router DOM + Recharts + Lucide Icons
- **Database Support**: MySQL-ready via environment variables (`pymysql` wheel) with fallback to SQLite for local development
- **Design System**: Industrial B2B design palette (Deep Charcoal `#0F172A`, Energy Green `#059669`, Warning Amber `#D97706`, Critical Red `#DC2626`, Slate Blue `#0284C7`)

---

## Environment Variables (`backend/.env`)

```ini
DEBUG=True
SECRET_KEY=django-insecure-greengrid-production-ready-key
ALLOWED_HOSTS=localhost,127.0.0.1,greengrid.example

# Database (To use MySQL set DB_ENGINE=django.db.backends.mysql)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=greengrid_db
DB_USER=root
DB_PASSWORD=password
DB_HOST=127.0.0.1
DB_PORT=3306

# JWT Configuration
JWT_ACCESS_LIFETIME_MINUTES=60
JWT_REFRESH_LIFETIME_DAYS=7

# CORS & Frontend URLs
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## Quick Start & Setup Instructions

### 1. Backend Setup (Django & Virtual Environment)

```bash
# Activate virtual environment
.\venv\Scripts\activate

# Run database migrations
python backend/manage.py migrate

# Seed database with demo telemetry, facilities, submeters, and initial user account
python backend/manage.py seed_demo_data

# Run Django development server (Port 8000)
python backend/manage.py runserver 8000
```

### 2. Frontend Setup (React & Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite React development server (Port 5173)
npm run dev
```

---

## Authentication & Demo Account Credentials

- **Demo Manager Login**: `demomanager@apexenterprise.demo`
- **Demo Password**: `demo1234`
- **Registration**: Accessible via `/register` (automatically provisions Organization, User, and Admin role).

---

## Running Backend Security & RBAC Unit Tests

```bash
python backend/manage.py test core
```

### Verified Test Cases:
1. `test_01_registration_flow`: Verifies organization creation and admin JWT generation.
2. `test_02_login_flow_and_me_endpoint`: Verifies credential authentication and `/api/auth/me/`.
3. `test_03_cross_tenant_isolation`: Verifies that User A (Org A) cannot access Org B facilities or telemetry.
4. `test_04_role_based_access_control`: Verifies server-side RBAC restriction (Viewer role cannot manage facilities or invite users).
5. `test_05_disabled_user_cannot_login`: Verifies disabled users are blocked from authenticating.
6. `test_06_user_invitation_flow`: Verifies invitation token creation and activation.

---

## Key API Endpoints

- `POST /api/auth/register/` - Organization & admin registration
- `POST /api/auth/login/` - User authentication & JWT issuance
- `POST /api/auth/token/refresh/` - JWT access token refresh
- `GET  /api/auth/me/` - Current authenticated user details
- `POST /api/users/invite/` - Dispatches user invitation (Admin only)
- `POST /api/invitations/accept/` - Accepts token & activates account
- `GET  /api/dashboard/` - Multi-tenant aggregated energy metrics
- `GET  /api/audit-logs/` - Security audit trail (Admin only)
- `WS   /ws/org/<org_id>/?token=<jwt_access_token>` - Authenticated real-time WebSocket stream
