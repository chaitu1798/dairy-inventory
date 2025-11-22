# Deployment Guide - Dairy Inventory Management System

## Prerequisites
- GitHub account
- Vercel account (free)
- Railway/Render account (free tier available)
- Your Supabase credentials (already set up)

## Step 1: Push Code to GitHub

```powershell
# Initialize git if not already done
cd C:\Users\kaluv\Downloads\chaitu\dairy1

# Create a new repository on GitHub first, then:
git remote add origin <your-github-repo-url>
git branch -M main
git add .
git commit -m "Initial commit - Dairy Inventory System"
git push -u origin main
```

## Step 2: Deploy Backend (Railway - Recommended)

### Option A: Railway (Easiest)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `dairy1` repository
5. Railway will auto-detect the Node.js app

**Configure Environment Variables:**
- Click on your service → Variables
- Add these variables:
  ```
  SUPABASE_URL=https://fuslpbldfluzvksyjopi.supabase.co
  SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwYmxkZmx1enZrc3lqb3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjQ5OTEsImV4cCI6MjA3OTQwMDk5MX0.xgj6bhX5vJ7hELlf7KSOXhLS7Wre4MgAn80uDJjqg5M
  PORT=3001
  NODE_ENV=production
  ```

**Configure Build Settings:**
- Root Directory: `server`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

6. Deploy! Railway will give you a URL like: `https://your-app.railway.app`

### Option B: Render

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect your GitHub repo
4. Configure:
   - **Name**: dairy-backend
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Same as above

## Step 3: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

**Environment Variables:**
- Add this variable:
  ```
  NEXT_PUBLIC_API_URL=<your-backend-url-from-railway>
  ```
  Example: `https://your-app.railway.app`

5. Click "Deploy"

## Step 4: Update Frontend API URL

After deployment, you need to update the API base URL in your frontend:

**File**: `client/src/utils/api.ts`

Change:
```typescript
baseURL: 'http://localhost:3001'
```

To:
```typescript
baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
```

Then commit and push:
```powershell
git add .
git commit -m "Update API URL for production"
git push
```

Vercel will automatically redeploy.

## Step 5: Configure CORS on Backend

Update `server/src/index.ts` to allow your Vercel domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app' // Add your Vercel URL
  ],
  credentials: true
}));
```

Commit and push to trigger Railway redeploy.

## Step 6: Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Sign up for a new account
3. Test all features:
   - Dashboard
   - Products CRUD
   - Record Sales/Purchases/Expenses
   - View Reports

## Troubleshooting

### Backend Issues
- Check Railway/Render logs for errors
- Verify environment variables are set correctly
- Ensure Supabase allows connections from your backend IP

### Frontend Issues
- Check Vercel deployment logs
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for CORS errors

### Database Issues
- Go to Supabase → SQL Editor
- Run the `schema.sql` file if not already done
- Check if tables are created

## Custom Domain (Optional)

### For Frontend (Vercel):
1. Go to your project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### For Backend (Railway):
1. Go to Settings → Networking
2. Add custom domain
3. Update DNS records

## Monitoring

- **Vercel**: Automatic monitoring and analytics
- **Railway**: Built-in metrics and logs
- **Supabase**: Database metrics in dashboard

## Cost Estimate

- **Supabase**: Free tier (500MB database, 50,000 monthly active users)
- **Vercel**: Free tier (100GB bandwidth, unlimited deployments)
- **Railway**: Free tier ($5 credit/month, ~500 hours)

**Total**: $0/month for small usage!

## Next Steps

1. Set up automatic backups for Supabase
2. Configure email notifications
3. Add monitoring/alerting
4. Set up CI/CD pipelines
5. Add SSL certificates (automatic on Vercel/Railway)

---

**Your deployed app will be accessible at:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.railway.app`
