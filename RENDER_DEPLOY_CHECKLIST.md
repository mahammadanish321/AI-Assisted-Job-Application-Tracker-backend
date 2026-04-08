# Render Deployment Checklist

Your backend is now **optimized for Render deployment**. Follow this checklist for a smooth deployment.

## Pre-Deployment (Do Once)

- [ ] Ensure all code is pushed to GitHub `main` branch
- [ ] Review all environment variables in `.env.example`
- [ ] Verify MongoDB Atlas cluster is set up and connection string is ready
- [ ] Create Google OAuth credentials for Gmail integration
- [ ] Generate secure JWT secrets (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

## Create Render Service

1. [ ] Go to [render.com](https://render.com)
2. [ ] Click "New +" → "Web Service"
3. [ ] Connect your GitHub repository
4. [ ] Select the repo: `mahammadanish321/AI-Assisted-Job-Application-Tracker-backend`
5. [ ] Configure the service:
   - **Name**: `job-tracker-backend`
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Standard (or higher for better performance)

## Add Environment Variables

In Render Dashboard → Your Service → Environment:

```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
FRONTEND_URL=https://your-frontend.vercel.app
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here
OPENAI_API_KEY=your-gemini-api-key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
```

## Deploy & Monitor

1. [ ] Click "Deploy" in Render
2. [ ] Monitor deployment in "Logs" tab
3. [ ] Look for these success messages:
   ```
   🚀 Server started on port 5000 (connecting to DB...)
   ✅ MongoDB Connected (XXms)
   ```
4. [ ] Once deployed, test health endpoint:
   ```bash
   curl https://your-service-name.onrender.com/health
   ```
   Should return: `{"status":"ok","db":"connected"}`

## Expected Timing

| Milestone | Time |
|-----------|------|
| Docker build starts | 0:00 |
| Dependencies installed | 2:00-4:00 |
| TypeScript compilation | 4:00-6:00 |
| Container ready | 6:00-8:00 |
| MongoDB connection | 6:00-10:00 |
| **Total** | **~8-10 min** |

## Verify Deployment Success

Test these endpoints:

```bash
# 1. Health check (should return 503 until DB connects, then 200)
curl https://your-service.onrender.com/health

# 2. Root endpoint
curl https://your-service.onrender.com/

# 3. List applications (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-service.onrender.com/api/applications
```

## Common Issues & Fixes

### Deployment Takes 20+ Minutes
- Check `node_modules` size in logs
- Verify `package.json` dependencies are optimized (no `googleapis`)
- Check `.npmrc` is being used

### Server Crashes Immediately
- Check MongoDB connection string format
- Verify all required env vars are set
- Check logs for specific error messages

### Health Check Returns 503
- Server is still connecting to MongoDB
- Wait 1-2 minutes and try again
- Check logs for connection errors

### Gmail Sync Fails
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Check OAuth redirect URIs include Render domain
- Verify user has Gmail API enabled in Google Cloud Console

## Performance Tips

1. **Monitor startup time**
   ```bash
   # View logs and note timestamps
   Render Dashboard → Logs → filter by "Server started"
   ```

2. **Keep MongoDB indexes**
   - Ensure `user` field is indexed on Application and Notification collections
   - Run: `db.applications.createIndex({ user: 1 })`

3. **Scale if needed**
   - Start with Standard plan
   - Upgrade to Pro+ if experiencing timeout errors
   - Consider MongoDB Atlas M10+ tier for better performance

4. **Set up auto-deploy**
   - Render automatically deploys on GitHub push
   - No manual deployment needed after initial setup

## Monitoring & Logs

### Real-Time Logs
Render Dashboard → Your Service → Logs

### Key Log Markers
```
[timestamp] 🚀 Server started on port 5000 - Server is ready
[timestamp] ✅ MongoDB Connected - Database connected
[timestamp] ⚠️ MongoDB Connection failed - Retrying...
[timestamp] ❌ Failed to connect to MongoDB - Check connection string
```

### Performance Metrics
Watch for startup durations:
- Server startup: Should be <100ms
- MongoDB connection: Should be <5000ms
- Total boot: Should be <10000ms

## After Deployment

1. [ ] Update `FRONTEND_URL` in frontend environment variables
2. [ ] Test full auth flow (login, Gmail sync, application creation)
3. [ ] Monitor logs for first 24 hours
4. [ ] Set up error monitoring (optional: Sentry, DataDog, etc.)
5. [ ] Enable auto-scaling if traffic spikes (Render Pro plan)

## Useful Commands

```bash
# View recent logs
curl https://api.render.com/v1/services/{service-id}/logs

# Trigger manual redeploy
# Push to main branch: git push origin main

# Check service status
curl https://api.render.com/v1/services/{service-id}
```

## Support

- Render Help: https://render.com/docs
- This project docs: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- Issues: Check server logs for error details

---

**Your backend is now Render deployment-ready!** Expected deployment time: ~8-10 minutes.
