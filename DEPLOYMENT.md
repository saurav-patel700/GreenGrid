# GreenGrid EMIS - Enterprise Deployment Guide

This guide details the production deployment architecture, security hardening, database configuration, ASGI/WebSocket deployment, environment variables, static file handling, and observability for **GreenGrid: Smart Energy Management**.

---

## 1. Production Architecture Overview

GreenGrid utilizes a multi-tier production architecture designed for high availability, security, and low-latency IoT telemetry processing:

```
[ Web Browsers & Mobile Clients ]
               │
               ▼
[ Nginx Reverse Proxy / Load Balancer ] ◄── SSL/TLS Termination & Static File Serving
         │                   │
  /api/* │                   │ /ws/* (WebSockets)
         ▼                   ▼
[ Gunicorn / WSGI ]   [ Daphne / ASGI ]
  (Django DRF)          (Django Channels)
         │                   │
         └─────────┬─────────┘
                   │
                   ▼
  [ Database & Memory Cache Layer ]
    • PostgreSQL / MySQL 8.0+
    • Redis Channel Layer & Cache
```

### Components Summary:
1. **Nginx Reverse Proxy**:
   - Handles SSL/TLS termination (HTTPS/WSS).
   - Serves built static frontend assets (`dist/`).
   - Proxies `/api/` traffic to Gunicorn/Daphne.
   - Upgrades `/ws/` connections for WebSocket channels.
2. **Django Backend Server (Gunicorn & Daphne)**:
   - **Gunicorn** handles HTTP REST API endpoints (`/api/*`).
   - **Daphne** (ASGI) manages real-time WebSockets (`/ws/org/<org_id>/live/`).
3. **Database & Redis**:
   - **PostgreSQL / MySQL**: Primary relational database store for multi-tenant organizations, facilities, meters, readings, utility bills, forecasts, carbon factors, and audit logs.
   - **Redis**: Channel layer for Django Channels WebSockets, background task queue, and caching.

---

## 2. Environment Configuration

All environment configurations are externalized into environment variables. Do **NOT** commit `.env` files with secret keys to source control.

### Required Production Environment Variables (`backend/.env`)

```env
# Django Core & Security Settings
SECRET_KEY=prod-super-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=greengrid.yourdomain.com,api.greengrid.yourdomain.com

# Database Configuration (PostgreSQL / MySQL)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=greengrid_production
DB_USER=greengrid_app_user
DB_PASSWORD=SecureProductionDatabasePassword123!
DB_HOST=127.0.0.1
DB_PORT=5432

# CORS & CSRF Origins
CORS_ALLOWED_ORIGINS=https://greengrid.yourdomain.com
CORS_ALLOW_ALL_ORIGINS=False
CSRF_TRUSTED_ORIGINS=https://greengrid.yourdomain.com

# JWT Authentication Lifetime
JWT_ACCESS_LIFETIME_MINUTES=30
JWT_REFRESH_LIFETIME_DAYS=7

# Channels & Redis Configuration
CHANNELS_BACKEND=redis
REDIS_URL=redis://127.0.0.1:6379/0

# Email Service
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=YOUR_SENDGRID_API_KEY
DEFAULT_FROM_EMAIL=noreply@greengrid.yourdomain.com
FRONTEND_URL=https://greengrid.yourdomain.com

# Media & Static Files
MEDIA_ROOT=/var/www/greengrid/media/
MEDIA_URL=/media/
STATIC_ROOT=/var/www/greengrid/static/
STATIC_URL=/static/
```

---

## 3. Database Setup & Migration

### PostgreSQL Initialization
```sql
CREATE DATABASE greengrid_production CHARACTER SET UTF8;
CREATE USER greengrid_app_user WITH PASSWORD 'SecureProductionDatabasePassword123!';
GRANT ALL PRIVILEGES ON DATABASE greengrid_production TO greengrid_app_user;
```

### Run Django Migrations & Verification
```bash
cd backend
python manage.py migrate
python manage.py check
```

---

## 4. Frontend Build & Static Asset Deployment

### Build React Frontend
```bash
cd frontend
npm install
npm run build
```
This generates the optimized production bundle inside `frontend/dist/`.

### Nginx Configuration Example (`/etc/nginx/sites-available/greengrid`)
```nginx
server {
    listen 80;
    server_name greengrid.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name greengrid.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/greengrid.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/greengrid.yourdomain.com/privkey.pem;

    root /var/www/greengrid/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy
    location /ws/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Static & Media Files
    location /static/ {
        alias /var/www/greengrid/static/;
    }

    location /media/ {
        alias /var/www/greengrid/media/;
    }
}
```

---

## 5. Running Production Services (Systemd)

### Gunicorn Service (`/etc/systemd/system/greengrid-api.service`)
```ini
[Unit]
Description=GreenGrid Gunicorn REST API Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/greengrid/backend
ExecStart=/var/www/greengrid/venv/bin/gunicorn greengrid.wsgi:application \
          --workers 4 \
          --bind 127.0.0.1:8000 \
          --log-level info \
          --access-logfile /var/log/greengrid/api-access.log \
          --error-logfile /var/log/greengrid/api-error.log

[Install]
WantedBy=multi-user.target
```

### Daphne ASGI Service for WebSockets (`/etc/systemd/system/greengrid-ws.service`)
```ini
[Unit]
Description=GreenGrid Daphne ASGI WebSocket Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/greengrid/backend
ExecStart=/var/www/greengrid/venv/bin/daphne -b 127.0.0.1 -p 8001 greengrid.asgi:application

[Install]
WantedBy=multi-user.target
```

---

## 6. Health Checks & Observability

- **Operational Health Endpoint**:
  `GET /api/health/`
  Returns:
  ```json
  {
    "status": "healthy",
    "service": "GreenGrid API Core",
    "version": "1.0.0",
    "database": "connected",
    "timestamp": "2026-09-30T16:15:00Z"
  }
  ```
- **Logging & Security**:
  - All standard log events write structured entries without leaking passwords, JWT tokens, or credentials.
  - Audit log entries track all sensitive tenant operations (logins, user role updates, utility bill generation, emergency stops, escalation updates).
