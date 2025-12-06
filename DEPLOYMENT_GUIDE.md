# FAP NextGen - Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Create .gitignore file
```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
.vscode/
.idea/
```

### 2. Create README.md for GitHub
See README.md file in project root

### 3. Prepare for Vercel Deployment
- Ensure build command is correct
- Configure environment variables if needed
- Set up proper routing for SPA

---

## 🚀 Step-by-Step Deployment

### Step 1: Initialize Git Repository

```bash
cd "d:/FAP App/FAP_NextGen"
git init
git add .
git commit -m "Initial commit: FAP NextGen Application with all features"
```

### Step 2: Connect to GitHub

```bash
git remote add origin https://github.com/hssling/FAP_Nextgen_App.git
git branch -M main
git push -u origin main
```

**Note**: You may need to authenticate with GitHub. Use a Personal Access Token (PAT) if prompted.

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
cd "d:/FAP App/FAP_NextGen"
vercel
```

4. **Follow prompts**:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? **fap-nextgen-app**
   - Directory? **./
   - Override settings? **N**

5. **Production deployment**:
```bash
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/
2. Click "Add New" → "Project"
3. Import from GitHub: https://github.com/hssling/FAP_Nextgen_App
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click "Deploy"

---

## ⚙️ Vercel Configuration

Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures proper routing for the Single Page Application.

---

## 🔐 Environment Variables (if needed)

If you add any API keys or secrets later:

1. **Local Development**: Create `.env` file
2. **Vercel**: Add in Project Settings → Environment Variables

---

## 📦 Build Optimization

### Update package.json scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vercel --prod"
  }
}
```

### Optimize build:
The current Vite configuration should work well. If you need further optimization:

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          'icons': ['lucide-react']
        }
      }
    }
  }
}
```

---

## 🌐 Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

---

## 📊 Post-Deployment Checklist

- [ ] Verify app loads at Vercel URL
- [ ] Test all routes work correctly
- [ ] Test login functionality
- [ ] Test data persistence (IndexedDB)
- [ ] Test all forms and modals
- [ ] Test Resources page
- [ ] Test Community profile creation
- [ ] Test on mobile devices
- [ ] Check browser console for errors
- [ ] Verify animations work smoothly

---

## 🔄 Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch
- Create preview deployments for pull requests
- Run build checks before deployment

### To update the app:
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Vercel will automatically deploy the changes.

---

## 🐛 Troubleshooting

### Issue: Build fails on Vercel
**Solution**: Check build logs, ensure all dependencies are in package.json

### Issue: Routes return 404
**Solution**: Ensure `vercel.json` has proper rewrites configuration

### Issue: App works locally but not on Vercel
**Solution**: Check for hardcoded localhost URLs, use relative paths

### Issue: IndexedDB not working
**Solution**: IndexedDB works in browsers, ensure HTTPS is enabled (Vercel provides this)

---

## 📱 Testing Deployed App

### Test URLs (after deployment):
- Production: `https://fap-nextgen-app.vercel.app` (or your custom domain)
- Preview: `https://fap-nextgen-app-<hash>.vercel.app`

### Test Checklist:
1. Login as student
2. Create a family
3. Add members
4. Create village profile
5. Write reflection
6. Access resources
7. Generate report

---

## 📈 Monitoring

Vercel provides:
- **Analytics**: Page views, performance metrics
- **Logs**: Real-time function logs
- **Speed Insights**: Core Web Vitals

Access these in Vercel Dashboard → Your Project → Analytics/Logs

---

## 🔒 Security Considerations

1. **Authentication**: Currently using localStorage - consider upgrading to JWT with backend
2. **Data Privacy**: All data stored locally in browser (IndexedDB)
3. **HTTPS**: Automatically provided by Vercel
4. **CORS**: Not an issue for static site

---

## 📝 Documentation to Include

Files to push to GitHub:
- ✅ README.md (project overview)
- ✅ All source code
- ✅ package.json and package-lock.json
- ✅ .gitignore
- ✅ vercel.json (optional but recommended)
- ✅ Documentation in .gemini folder (optional)

---

## 🎉 Success Indicators

After successful deployment:
- ✅ GitHub repository is up to date
- ✅ Vercel shows "Ready" status
- ✅ App is accessible via Vercel URL
- ✅ All features work as expected
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Fast load times (<3s)

---

## 🚀 Quick Deploy Commands

```bash
# Initialize and push to GitHub
cd "d:/FAP App/FAP_NextGen"
git init
git add .
git commit -m "Initial commit: FAP NextGen Application"
git remote add origin https://github.com/hssling/FAP_Nextgen_App.git
git branch -M main
git push -u origin main

# Deploy to Vercel
npm install -g vercel
vercel login
vercel --prod
```

---

**Your app will be live at**: `https://fap-nextgen-app.vercel.app` (or similar)

**GitHub Repository**: https://github.com/hssling/FAP_Nextgen_App
