# DevFocus Frontend Deployment Guide for Render

## Option 1: Deploy Frontend as Separate Service (Recommended)

### Step 1: Delete Current Frontend Service
1. Go to Render Dashboard
2. Click on your current `devfocus-frontend` service
3. Settings → Delete Service

### Step 2: Create New Static Site

1. **Go to Render Dashboard** → Click **"New +"** → **"Static Site"**

2. **Connect Repository:**
   - Select your `DevFocus` repository
   - Click **"Connect"**

3. **Configure Service:**
   - **Name:** `devfocus-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`  ⬅️ IMPORTANT!
   - **Build Command:**
     ```bash
     npm install --legacy-peer-deps && npm run build
     ```
   - **Publish Directory:** `build`  ⬅️ Just `build`, not `frontend/build`
   - **Auto-Deploy:** Yes

4. **Add Environment Variable:**
   - Click **"Advanced"**
   - Add:
     - **Key:** `REACT_APP_BACKEND_URL`
     - **Value:** `https://devfocus-backend-xfkc.onrender.com` (your actual backend URL)

5. **Configure Rewrites (CRITICAL):**
   - Scroll to **"Redirects/Rewrites"**
   - Add rule:
     - **Source:** `/*`
     - **Destination:** `/index.html`
     - **Action:** `Rewrite`

6. **Click "Create Static Site"**

### Step 3: Wait for Deployment
- Watch the build logs
- Should complete in 3-5 minutes

### Step 4: Test
Visit: `https://your-frontend-url.onrender.com/u/AdminDevFocus`

---

## Option 2: Fix Current Deployment (Quick Fix)

### In Render Dashboard for Current Frontend Service:

1. **Settings → Build & Deploy:**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install --legacy-peer-deps && npm run build`
   - **Publish Directory:** `build` ⬅️ Remove the space! Should be exactly `build`

2. **Settings → Redirects/Rewrites:**
   - Ensure rule exists:
     - Source: `/*`
     - Destination: `/index.html`
     - Action: Rewrite

3. **Manual Deploy → Clear build cache & deploy**

---

## Common Issues & Solutions

### Issue: White screen on sub-routes
**Cause:** Rewrite rule not working
**Fix:** 
- Ensure Publish Directory is exactly `build` (no spaces!)
- Ensure Root Directory is `frontend`
- Rewrite rule must be `/*` → `/index.html`

### Issue: 404 on refresh
**Cause:** Missing rewrite rule
**Fix:** Add rewrite rule in Redirects/Rewrites section

### Issue: Environment variables not working  
**Cause:** Not prefixed with `REACT_APP_`
**Fix:** All React env vars must start with `REACT_APP_`

---

## Verification Checklist

After deployment, verify:

- [ ] Root page loads: `https://your-url.onrender.com/`
- [ ] Profile page works: `https://your-url.onrender.com/u/AdminDevFocus`
- [ ] Refresh on sub-route doesn't 404
- [ ] Page is not blank (white screen)
- [ ] Console has no errors (F12 → Console)
- [ ] Backend API calls work (check Network tab)

---

## Final Configuration Summary

**What should be in Render Dashboard:**

```
Service Type: Static Site
Name: devfocus-frontend
Branch: main
Root Directory: frontend
Build Command: npm install --legacy-peer-deps && npm run build
Publish Directory: build
```

**Redirects/Rewrites:**
```
Source: /*
Destination: /index.html
Action: Rewrite
```

**Environment Variables:**
```
REACT_APP_BACKEND_URL=https://devfocus-backend-xfkc.onrender.com
```

---

**The KEY is that Publish Directory must be `build` NOT `frontend/build` when Root Directory is `frontend`!**
