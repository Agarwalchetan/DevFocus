# MongoDB Connection Troubleshooting for Render

## Issue Fixed
The backend was failing with SSL handshake error when connecting to MongoDB Atlas.

## Changes Made

### 1. Updated `backend/database.py`
- Added support for both `MONGODB_URI` (Render) and `MONGO_URL` (local)
- Added SSL/TLS configuration using `certifi` for certificate validation
- Added connection timeout settings
- Added connection testing with ping command
- Added better error handling for index creation

### 2. Updated `backend/requirements.txt`
- Added `certifi==2023.11.17` for SSL certificate support

## What to Check in Render

### Environment Variable
Make sure your MongoDB connection string in Render includes proper SSL parameters:

**Correct Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Key Points:**
1. Use `mongodb+srv://` (NOT `mongodb://`)
2. Replace `<password>` with actual password
3. Add database name after `.mongodb.net/`
4. Ensure connection string has `retryWrites=true&w=majority`

### Verify MongoDB Atlas Settings

1. **Network Access**
   - Go to MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (Allow access from anywhere)
   - This is required for Render to connect

2. **Database User**
   - Go to MongoDB Atlas → Database Access
   - Ensure user has "Read and write to any database" privileges
   - Password must match the one in connection string

## Deploy Again

After these changes:

```bash
git add .
git commit -m "Fix MongoDB SSL connection for Render deployment"
git push origin main
```

Render will automatically redeploy with the fixes.
