# DevFocus Production Deployment Guide

**Version:** 1.0.0  
**Last Updated:** January 13, 2026  
**Author:** Chetan Agarwal

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker](#quick-start-with-docker)
3. [Manual Deployment](#manual-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Security Considerations](#security-considerations)
7. [Deployment Options](#deployment-options)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Backup & Recovery](#backup--recovery)

---

## 🚀 Prerequisites

### System Requirements

- **OS:** Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **RAM:** Minimum 2GB (4GB+ recommended)
- **Storage:** Minimum 10GB free space
- **CPU:** 2 cores minimum

### Required Software

#### For Docker Deployment (Recommended)
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

#### For Manual Deployment
- [Python](https://www.python.org/downloads/) 3.10+
- [Node.js](https://nodejs.org/) 18+ with npm
- [MongoDB](https://www.mongodb.com/try/download/community) 6.0+ or MongoDB Atlas account

---

## 🐳 Quick Start with Docker

### 1. Clone the Repository

```bash
git clone https://github.com/AgarwalChetan/DevFocus.git
cd DevFocus/app
```

### 2. Configure Environment

```bash
# Copy environment templates
cp .env.example .env
cp frontend/.env.example frontend/.env

# Edit .env files with your configuration
nano .env
nano frontend/.env
```

**Important Environment Variables to Update:**

In `app/.env`:
```bash
# Generate a secure JWT secret
JWT_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Set MongoDB credentials
MONGO_USERNAME=admin
MONGO_PASSWORD=your_secure_password_here

# Set CORS origins (your frontend URL)
CORS_ORIGINS=http://localhost:3000
```

In `app/frontend/.env`:
```bash
# Point to your backend
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Build and Run

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend:** http://localhost
- **Backend API:** http://localhost:8001
- **MongoDB:** localhost:27017

### 5. Stop Services

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (⚠️ deletes data!)
docker-compose down -v
```

---

## 🔧 Manual Deployment

### Backend Setup

#### 1. Install Python Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Configure Environment

```bash
cp ../.env.example ../.env
# Edit .env with your settings
```

#### 3. Start MongoDB

**Option A: Local MongoDB**
```bash
# Ubuntu/Debian
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS with Homebrew
brew services start mongodb-community
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

#### 4. Run Backend Server

```bash
# Development
python server.py

# Production with Gunicorn
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001
```

### Frontend Setup

#### 1. Install Dependencies

```bash
cd frontend
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your backend URL
```

#### 3. Build for Production

```bash
# Create optimized production build
npm run build

# The build folder is ready to be deployed
```

#### 4. Serve with Nginx

**Install Nginx:**
```bash
# Ubuntu/Debian
sudo apt install nginx

# macOS
brew install nginx
```

**Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/devfocus
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/DevFocus/app/frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/devfocus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ⚙️ Environment Configuration

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ | `mongodb://localhost:27017/devfocus` |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ | `your-secret-key` |
| `JWT_EXPIRATION_HOURS` | Token expiration time | ❌ | `24` |
| `HOST` | Server host | ❌ | `0.0.0.0` |
| `PORT` | Server port | ❌ | `8001` |
| `CORS_ORIGINS` | Allowed CORS origins | ✅ | `http://localhost:3000` |
| `ENVIRONMENT` | Environment mode | ❌ | `production` |
| `DEBUG` | Enable debug mode | ❌ | `false` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | ✅ | `http://localhost:8001` |
| `REACT_APP_NAME` | Application name | ❌ | `DevFocus` |
| `REACT_APP_VERSION` | App version | ❌ | `1.0.0` |

---

## 🗄️ Database Setup

### Initial Setup

The application will automatically create collections and indexes on first run.

### Manual Database Initialization

```javascript
// Connect to MongoDB
mongosh

// Switch to database
use devfocus

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })
db.tasks.createIndex({ "userId": 1, "status": 1 })
db.focus_sessions.createIndex({ "userId": 1, "createdAt": -1 })
db.focus_rooms.createIndex({ "isActive": 1 })

// Verify indexes
db.users.getIndexes()
```

### MongoDB Atlas Setup

1. **Create Cluster:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Click "Build a Database"
   - Choose Free Tier (M0)
   - Select region closest to your users

2. **Configure Network Access:**
   - Click "Network Access"
   - Add IP Address
   - For development: `0.0.0.0/0` (allow all)
   - For production: Add your server's IP

3. **Create Database User:**
   - Click "Database Access"
   - Add New Database User
   - Choose password authentication
   - Save credentials securely

4. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your database user password
   - Update `MONGODB_URI` in `.env`

---

## 🔐 Security Considerations

### Essential Security Practices

#### 1. Environment Variables
```bash
# NEVER commit .env files to version control!
# Generate strong secrets:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 2. MongoDB Security
- ✅ Enable authentication
- ✅ Use strong passwords
- ✅ Restrict network access
- ✅ Enable SSL/TLS in production
- ✅ Regular backups

#### 3. CORS Configuration
```python
# Update CORS_ORIGINS in .env for production
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

#### 4. HTTPS/SSL
**Always use HTTPS in production!**

**Using Let's Encrypt with Nginx:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (added to cron automatically)
sudo certbot renew --dry-run
```

#### 5. Rate Limiting
Consider implementing rate limiting to prevent abuse:

```python
# Add to backend/server.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

#### 6. Security Headers
Already configured in nginx.conf:
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: XSS protection

---

## 🌐 Deployment Options

### Option 1: VPS Deployment (DigitalOcean, Linode, AWS EC2)

**Recommended Specs:**
- 2GB RAM minimum
- 2 vCPUs
- 25GB SSD

**Steps:**
1. Create VPS instance
2. Install Docker & Docker Compose
3. Clone repository
4. Configure environment
5. Run `docker-compose up -d`
6. Configure domain & SSL

**Cost:** ~$10-20/month

### Option 2: Platform as a Service (Heroku, Railway, Render)

**Heroku Example:**

1. **Install Heroku CLI**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Create Apps**
```bash
# Backend
heroku create devfocus-api
heroku addons:create mongolab:sandbox -a devfocus-api

# Frontend
heroku create devfocus-frontend
```

3. **Set Environment Variables**
```bash
heroku config:set JWT_SECRET=your-secret -a devfocus-api
heroku config:set CORS_ORIGINS=https://devfocus-frontend.herokuapp.com -a devfocus-api
```

4. **Deploy**
```bash
git push heroku main
```

**Cost:** Free tier available, ~$7/month for production

### Option 3: Serverless (Vercel Frontend + AWS Lambda Backend)

**Frontend on Vercel:**
```bash
cd frontend
npx vercel --prod
```

**Backend on AWS Lambda:**
Use [Mangum](https://mangum.io/) to wrap FastAPI:
```python
from mangum import Mangum
handler = Mangum(app)
```

**Cost:** Free tier generous, pay-as-you-go

### Option 4: Kubernetes (Scalable Production)

For high-traffic deployments, consider Kubernetes:
- Create Kubernetes manifests
- Use managed services (GKE, EKS, AKS)
- Implement horizontal pod autoscaling
- Use managed MongoDB (MongoDB Atlas)

---

## 📊 Monitoring & Maintenance

### Health Checks

**Backend Health Endpoint:**
```bash
curl http://localhost:8001/api/health
```

Add this endpoint to server.py:
```python
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
```

**Frontend Health:**
```bash
curl http://localhost/health
```

### Logging

**Backend Logs:**
```bash
# Docker
docker-compose logs -f backend

# Manual
tail -f backend/logs/app.log
```

**Nginx Logs:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Monitoring Tools

Consider integrating:
- **Sentry** - Error tracking
- **DataDog** - Application performance monitoring
- **Prometheus + Grafana** - Metrics & dashboards
- **Uptime Robot** - Uptime monitoring

### Database Maintenance

**Regular Tasks:**
```bash
# Backup (run daily)
mongodump --uri="mongodb://localhost:27017/devfocus" --out=/backups/$(date +%Y%m%d)

# Check database size
db.stats()

# Compact collections (reduces disk usage)
db.runCommand({ compact: 'users' })
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Docker Connection Refused

**Problem:** Can't connect to backend from frontend

**Solution:**
```yaml
# In docker-compose.yml, use service names for internal communication
environment:
  - REACT_APP_BACKEND_URL=http://backend:8001  # Not localhost!
```

#### 2. MongoDB Authentication Failed

**Problem:** `Authentication failed` error

**Solution:**
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify credentials in .env
# Recreate MongoDB with correct credentials
docker-compose down -v
docker-compose up -d
```

#### 3. CORS Errors

**Problem:** Browser shows CORS policy errors

**Solution:**
```python
# Update CORS_ORIGINS in .env
CORS_ORIGINS=http://localhost:3000,https://yourapp.com

# Restart backend
docker-compose restart backend
```

#### 4. Port Already in Use

**Problem:** `Port 8001 is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :8001  # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Kill process or change port in docker-compose.yml
```

#### 5. Build Fails - Out of Memory

**Problem:** Docker build fails with memory error

**Solution:**
```bash
# Increase Docker memory limit (Docker Desktop settings)
# Or build on machine with more RAM
# Or use multi-stage builds (already configured)
```

### Debug Mode

**Enable detailed logging:**

Backend:
```python
# In server.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

Frontend:
```bash
# Set in .env
REACT_APP_DEBUG=true
```

---

## 💾 Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="devfocus"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/$DB_NAME" \
          --out="$BACKUP_DIR/mongodb_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" "$BACKUP_DIR/mongodb_$DATE"
rm -rf "$BACKUP_DIR/mongodb_$DATE"

# Delete backups older than 30 days
find $BACKUP_DIR -name "mongodb_*.tar.gz" -mtime +30 -delete

echo "Backup completed: mongodb_$DATE.tar.gz"
```

**Schedule with Cron:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

### Restore from Backup

```bash
# Extract backup
tar -xzf mongodb_20260113_020000.tar.gz

# Restore
mongorestore --uri="mongodb://localhost:27017" \
             --drop \
             mongodb_20260113_020000/
```

---

## 📞 Support & Contact

**Developer:** Chetan Agarwal  
**Email:** agar.chetan1@gmail.com  
**GitHub:** [@AgarwalChetan](https://github.com/AgarwalChetan)

---

## 📝 License

This project is developed by Chetan Agarwal for DevFocus.

---

## 🎉 Congratulations!

Your DevFocus application is now production-ready! 

**Next Steps:**
1. Set up monitoring
2. Configure automated backups
3. Implement CI/CD pipeline
4. Load test before launch
5. Create disaster recovery plan

Happy deploying! 🚀
