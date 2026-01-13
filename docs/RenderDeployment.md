# DevFocus Deployment Guide for Render.com

**Complete Step-by-Step Guide to Deploy DevFocus on Render**

**Author:** Chetan Agarwal  
**Last Updated:** January 13, 2026  
**Deployment Method:** Render.com (No Docker)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Prepare Your Repository](#step-1-prepare-your-repository)
4. [Step 2: Setup MongoDB Atlas](#step-2-setup-mongodb-atlas)
5. [Step 3: Deploy Backend on Render](#step-3-deploy-backend-on-render)
6. [Step 4: Deploy Frontend on Render](#step-4-deploy-frontend-on-render)
5. [Step 5: Connect Frontend to Backend](#step-5-connect-frontend-to-backend)
6. [Step 6: Test Your Deployment](#step-6-test-your-deployment)
7. [Optional: Custom Domain Setup](#optional-custom-domain-setup)
8. [Troubleshooting](#troubleshooting)
9. [Cost Breakdown](#cost-breakdown)

---

## 🌟 Overview

This guide will help you deploy DevFocus on Render.com, a modern cloud platform that makes deployment simple. We'll deploy:

- **Backend (FastAPI)** → Render Web Service
- **Frontend (React)** → Render Static Site
- **Database (MongoDB)** → MongoDB Atlas (Free Tier)

**Estimated Time:** 30-45 minutes  
**Estimated Cost:** $0 (Free tier) or $7-14/month (Production)

---

## ✅ Prerequisites

### Required Accounts

1. **GitHub Account** - To host your code
   - Sign up at [github.com](https://github.com)

2. **Render Account** - For deployment
   - Sign up at [render.com](https://render.com)
   - You can sign up using your GitHub account

3. **MongoDB Atlas Account** - For database
   - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

### What You'll Need

- ✅ Your DevFocus code pushed to GitHub
- ✅ Terminal/Command Line access
- ✅ A text editor
- ✅ 30-45 minutes of time

---

## 📦 Step 1: Prepare Your Repository

### 1.1 Push Code to GitHub

If you haven't already pushed your code to GitHub:

```bash
# Navigate to your project directory
cd d:\Codes\Projects\DevPulse\app

# Initialize git (if not already initialized)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit - Ready for Render deployment"

# Add remote repository (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/DevFocus.git

# Push to GitHub
git push -u origin main
```

### 1.2 Create Required Configuration Files

We need to create some Render-specific configuration files.

#### Create `render.yaml` in the root of your project

This file tells Render how to deploy your services.

Create a new file `d:\Codes\Projects\DevPulse\app\render.yaml`:

```yaml
# render.yaml - Render Blueprint Configuration
services:
  # Backend API Service
  - type: web
    name: devfocus-backend
    env: python
    region: oregon
    plan: free
    buildCommand: "cd backend && pip install -r requirements.txt"
    startCommand: "cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: ENVIRONMENT
        value: production
      - key: CORS_ORIGINS
        sync: false

  # Frontend Static Site
  - type: web
    name: devfocus-frontend
    env: static
    region: oregon
    buildCommand: "cd frontend && npm install && npm run build"
    staticPublishPath: frontend/build
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: REACT_APP_BACKEND_URL
        sync: false
```

#### Create Build Script for Backend

Create `d:\Codes\Projects\DevPulse\app\backend\build.sh`:

```bash
#!/bin/bash
# build.sh - Backend build script for Render

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Build complete!"
```

#### Create Start Script for Backend

Create `d:\Codes\Projects\DevPulse\app\backend\start.sh`:

```bash
#!/bin/bash
# start.sh - Backend start script for Render

echo "Starting DevFocus Backend..."
uvicorn server:app --host 0.0.0.0 --port $PORT
```

Make scripts executable:
```bash
chmod +x backend/build.sh
chmod +x backend/start.sh
```

### 1.3 Update `.gitignore`

Make sure you have a `.gitignore` file to exclude sensitive files:

```
# Python
__pycache__/
*.py[cod]
venv/
env/
*.egg-info/

# Node
node_modules/
npm-debug.log*
build/

# Environment files
.env
.env.local

# IDEs
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

### 1.4 Commit and Push

```bash
git add .
git commit -m "Add Render configuration files"
git push origin main
```

---

## 🗄️ Step 2: Setup MongoDB Atlas

Since Render doesn't provide a managed MongoDB service, we'll use MongoDB Atlas (free tier).

### 2.1 Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"**
3. Sign up with Google or create an account
4. Complete the registration

### 2.2 Create a New Cluster

1. After logging in, click **"Build a Database"**
2. Select **"M0 Free"** tier
3. Choose a **Cloud Provider** (AWS recommended)
4. Select a **Region** closest to your users (e.g., `us-west-2` Oregon)
5. Give your cluster a name: `devfocus-cluster`
6. Click **"Create"**

**⏱️ Wait 3-5 minutes** for the cluster to be created.

### 2.3 Create Database User

1. In the left sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `devfocus_admin`
5. Click **"Autogenerate Secure Password"** and **SAVE IT SECURELY**
6. Database User Privileges: Select **"Read and write to any database"**
7. Click **"Add User"**

### 2.4 Configure Network Access

1. In the left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ This is necessary for Render to connect
   - MongoDB Atlas has built-in security with username/password
4. Click **"Confirm"**

### 2.5 Get Connection String

1. Go back to **"Database"** in the sidebar
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Choose **Driver:** Python, **Version:** 3.6 or later
5. Copy the connection string - it looks like:
   ```
   mongodb+srv://devfocus_admin:<password>@devfocus-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Replace `<password>`** with the password you saved earlier
7. **Add database name** after `.mongodb.net/` like this:
   ```
   mongodb+srv://devfocus_admin:YOUR_PASSWORD@devfocus-cluster.xxxxx.mongodb.net/devfocus?retryWrites=true&w=majority
   ```

**Save this connection string - you'll need it for Render!**

---

## 🚀 Step 3: Deploy Backend on Render

### 3.1 Create New Web Service

1. Log in to [render.com](https://render.com)
2. From dashboard, click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Find and select your **DevFocus** repository
5. Click **"Connect"**

### 3.2 Configure Backend Service

Fill in the following settings:

**Basic Settings:**
- **Name:** `devfocus-backend`
- **Region:** Oregon (US West) - Same as MongoDB
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Python 3`

**Build & Deploy:**
- **Build Command:**
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt
  ```

- **Start Command:**
  ```bash
  uvicorn server:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- For testing: **Free** ($0/month)
- For production: **Starter** ($7/month) - Recommended

### 3.3 Configure Environment Variables

Scroll down to **"Environment Variables"** and add the following:

Click **"Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `PYTHON_VERSION` | `3.11.0` |
| `MONGODB_URI` | `mongodb+srv://devfocus_admin:YOUR_PASSWORD@devfocus-cluster.xxxxx.mongodb.net/devfocus?retryWrites=true&w=majority` |
| `JWT_SECRET` | (Click "Generate" or use: `python -c "import secrets; print(secrets.token_urlsafe(32))"`) |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |

**⚠️ Important:** Don't add `CORS_ORIGINS` yet - we'll add it after getting the frontend URL!

### 3.4 Deploy Backend

1. Click **"Create Web Service"**
2. Render will start building and deploying your backend
3. **Wait 5-10 minutes** for the initial deployment
4. Watch the logs for any errors

### 3.5 Get Backend URL

Once deployed successfully:
1. You'll see a green **"Live"** status
2. Copy your backend URL - it will look like:
   ```
   https://devfocus-backend.onrender.com
   ```
3. **Test it:** Visit `https://devfocus-backend.onrender.com/api/health`
4. You should see: `{"status":"healthy"}`

**✅ Backend is now live!**

---

## 🎨 Step 4: Deploy Frontend on Render

### 4.1 Create New Static Site

1. From Render dashboard, click **"New +"** → **"Static Site"**
2. Select your **DevFocus** repository again
3. Click **"Connect"**

### 4.2 Configure Frontend Service

Fill in the following settings:

**Basic Settings:**
- **Name:** `devfocus-frontend`
- **Branch:** `main`
- **Root Directory:** `frontend`

**Build & Deploy:**
- **Build Command:**
  ```bash
  npm install && npm run build
  ```

- **Publish Directory:**
  ```
  build
  ```

### 4.3 Configure Environment Variables

Add environment variable:

| Key | Value |
|-----|-------|
| `REACT_APP_BACKEND_URL` | `https://devfocus-backend.onrender.com` (your backend URL from Step 3.5) |

### 4.4 Configure Redirects/Rewrites

Render automatically handles client-side routing for React apps, but let's make sure:

1. Create `d:\Codes\Projects\DevPulse\app\frontend\public\_redirects` file:
   ```
   /*    /index.html   200
   ```

2. Commit and push:
   ```bash
   git add .
   git commit -m "Add Render redirects config"
   git push origin main
   ```

### 4.5 Deploy Frontend

1. Click **"Create Static Site"**
2. Render will start building and deploying
3. **Wait 5-10 minutes** for the build to complete
4. Watch the logs for any errors

### 4.6 Get Frontend URL

Once deployed successfully:
1. You'll see a green **"Live"** status
2. Copy your frontend URL - it will look like:
   ```
   https://devfocus-frontend.onrender.com
   ```

**✅ Frontend is now live!**

---

## 🔗 Step 5: Connect Frontend to Backend

### 5.1 Update Backend CORS

Now that we have the frontend URL, we need to allow it in our backend's CORS settings.

1. Go to your **Backend Service** in Render
2. Click **"Environment"** tab
3. Add new environment variable:

| Key | Value |
|-----|-------|
| `CORS_ORIGINS` | `https://devfocus-frontend.onrender.com` |

4. Click **"Save Changes"**
5. Render will automatically redeploy the backend

**⏱️ Wait 2-3 minutes** for the backend to redeploy.

### 5.2 Update Frontend Environment (if needed)

If you need to update the frontend's backend URL:

1. Go to your **Frontend Service** in Render
2. Click **"Environment"** tab
3. Verify `REACT_APP_BACKEND_URL` is correct
4. If you made changes, the site will auto-redeploy

---

## ✅ Step 6: Test Your Deployment

### 6.1 Test Frontend

1. Visit your frontend URL: `https://devfocus-frontend.onrender.com`
2. You should see the DevFocus landing page
3. Try to create an account:
   - Fill in Name, Username, Email, Password
   - Click "Create Account"
   - You should be logged in and redirected to your profile

### 6.2 Test Backend API

Test the health endpoint:
```bash
curl https://devfocus-backend.onrender.com/api/health
```

Expected response:
```json
{"status":"healthy"}
```

### 6.3 Test Full Flow

1. **Create Account** - Register a new user
2. **Login** - Sign in with credentials
3. **Create Task** - Add a new task
4. **Start Focus Session** - Start a timer
5. **View Profile** - Check your profile page
6. **Search Users** - Try the search feature

### 6.4 Check Logs

If something doesn't work:

**Backend Logs:**
1. Go to Render Dashboard → devfocus-backend
2. Click **"Logs"** tab
3. Look for errors

**Frontend Logs:**
1. Go to Render Dashboard → devfocus-frontend
2. Click **"Logs"** tab
3. Check build logs for errors

---

## 🌐 Optional: Custom Domain Setup

Want to use your own domain instead of `.onrender.com`?

### For Backend

1. Go to your backend service in Render
2. Click **"Settings"** → **"Custom Domain"**
3. Add your domain: `api.yourapp.com`
4. Add the provided DNS records to your domain provider:
   - Type: `CNAME`
   - Name: `api`
   - Value: `devfocus-backend.onrender.com`

### For Frontend

1. Go to your frontend service in Render
2. Click **"Settings"** → **"Custom Domain"**
3. Add your domain: `yourapp.com` or `www.yourapp.com`
4. Add the provided DNS records to your domain provider:
   - Type: `CNAME`
   - Name: `www` (or `@` for apex domain)
   - Value: `devfocus-frontend.onrender.com`

### Update Environment Variables

After setting up custom domains:

1. Update backend's `CORS_ORIGINS`:
   ```
   https://yourapp.com,https://www.yourapp.com
   ```

2. Update frontend's `REACT_APP_BACKEND_URL`:
   ```
   https://api.yourapp.com
   ```

---

## 🔧 Troubleshooting

### Issue 1: Backend Won't Start

**Error:** `Application startup failed`

**Solution:**
```bash
# Check if requirements.txt is in the right place
# Should be at: backend/requirements.txt

# Check Python version in Environment Variables
# Should be: PYTHON_VERSION=3.11.0
```

### Issue 2: Frontend Build Fails

**Error:** `npm ERR! Failed at the build script`

**Solution:**
```bash
# Make sure package.json has build script:
"scripts": {
  "build": "react-scripts build"
}

# Check Node version - Render uses Node 18 by default
# If you need specific version, add .nvmrc file:
echo "18" > frontend/.nvmrc
```

### Issue 3: MongoDB Connection Failed

**Error:** `MongooseServerSelectionError: Could not connect to any servers`

**Solution:**
1. Check MongoDB Atlas Network Access - should allow `0.0.0.0/0`
2. Verify database user password in connection string
3. Check connection string format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database?options
   ```

### Issue 4: CORS Errors

**Error:** `Access to fetch at 'https://...' has been blocked by CORS policy`

**Solution:**
1. Check backend's `CORS_ORIGINS` environment variable
2. Must include your frontend URL exactly:
   ```
   CORS_ORIGINS=https://devfocus-frontend.onrender.com
   ```
3. Restart backend service after updating

### Issue 5: API Calls Return 404

**Error:** API endpoints not found

**Solution:**
1. Check `REACT_APP_BACKEND_URL` in frontend environment
2. Must NOT have trailing slash:
   ```
   REACT_APP_BACKEND_URL=https://devfocus-backend.onrender.com
   ```
3. Redeploy frontend after updating

### Issue 6: Free Tier Sleep Mode

**Issue:** App is slow to load initially

**Explanation:**
- Render's free tier services "spin down" after 15 minutes of inactivity
- First request takes 30-60 seconds to "spin up"

**Solutions:**
1. **Upgrade to Starter ($7/month)** - No sleep mode
2. **Use a ping service** to keep it awake (limited effectiveness)
3. **Accept the delay** on first load

### Issue 7: JWT Token Errors

**Error:** `Invalid token` or `Token expired`

**Solution:**
1. Generate a new JWT_SECRET:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
2. Update in Render environment variables
3. Clear browser cookies and login again

---

## 💰 Cost Breakdown

### Free Tier (For Testing)

| Service | Cost | Limitations |
|---------|------|-------------|
| MongoDB Atlas M0 | $0/month | 512MB storage |
| Render Backend (Free) | $0/month | Spins down after 15min inactivity |
| Render Frontend (Free) | $0/month | 100GB bandwidth/month |
| **Total** | **$0/month** | Good for testing/demo |

### Production Tier (Recommended)

| Service | Cost | Features |
|---------|------|----------|
| MongoDB Atlas M10 | $0-9/month | 2GB storage, better performance |
| Render Backend (Starter) | $7/month | No spin down, 512MB RAM |
| Render Frontend (Free) | $0/month | 100GB bandwidth |
| **Total** | **~$7-16/month** | Production-ready |

### Enterprise Tier

| Service | Cost | Features |
|---------|------|----------|
| MongoDB Atlas M30 | $60/month | 8GB RAM, 40GB storage |
| Render Backend (Standard) | $25/month | 2GB RAM, autoscaling |
| Render Frontend (Starter) | $7/month | Custom headers, 400GB bandwidth |
| **Total** | **~$92/month** | High-traffic apps |

---

## 📝 Post-Deployment Checklist

- [ ] Both services show "Live" status in Render
- [ ] Frontend loads at your URL
- [ ] Can create a new account
- [ ] Can login successfully
- [ ] Backend health endpoint responds
- [ ] MongoDB connection working (data persists)
- [ ] All features tested (tasks, focus, profile)
- [ ] CORS configured correctly
- [ ] Environment variables secured
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Render)
- [ ] Monitoring/alerting set up (optional)

---

## 🎉 Congratulations!

Your DevFocus app is now live on Render!

**Your URLs:**
- Frontend: `https://devfocus-frontend.onrender.com`
- Backend API: `https://devfocus-backend.onrender.com`

### Next Steps

1. **Monitor Your App**
   - Check Render dashboard regularly
   - Review logs for errors
   - Monitor MongoDB Atlas metrics

2. **Set Up Monitoring**
   - Add Sentry for error tracking
   - Set up uptime monitoring (Uptime Robot)
   - Configure Render deploy notifications

3. **Optimize Performance**
   - Upgrade to paid tiers for better performance
   - Implement caching strategies
   - Optimize database queries

4. **Backup Strategy**
   - Set up automated MongoDB backups
   - Export user data regularly
   - Document recovery procedures

---

## 📞 Support

**Need Help?**

- 📧 Email: agar.chetan1@gmail.com
- 🐙 GitHub: [@AgarwalChetan](https://github.com/AgarwalChetan)
- 📖 Render Docs: [render.com/docs](https://render.com/docs)
- 📖 MongoDB Atlas Docs: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)

---

**Made with 🔥 by Chetan Agarwal**

**Deployed on Render.com** 🚀
