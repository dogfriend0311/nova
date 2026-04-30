# ✅ Nova Setup Checklist & Troubleshooting

## 📋 Quick Checklist (Print This!)

Use this checklist to track your progress:

```
SETUP PROGRESS
═══════════════════════════════════════════════════════════

☐ STEP 1: Download & Test (5 min)
  ☐ Downloaded Node.js
  ☐ Verified with "node --version"
  ☐ Downloaded Nova files
  ☐ Ran "npm install"
  ☐ Ran "npm start" and saw website
  
☐ STEP 2: GitHub Setup (10 min)
  ☐ Created GitHub account (github.com)
  ☐ Created "nova" repository
  ☐ Downloaded GitHub Desktop
  ☐ Cloned repository to computer
  ☐ Copied Nova files into repository
  
☐ STEP 3: Upload to GitHub (5 min)
  ☐ Made initial commit in GitHub Desktop
  ☐ Pushed to GitHub ("Push origin" button)
  ☐ Verified files on GitHub.com
  
☐ STEP 4: Supabase Setup (15 min)
  ☐ Created Supabase account
  ☐ Created "nova" project
  ☐ Created 6 database tables (ran SQL)
  ☐ Copied Project URL
  ☐ Copied anon key
  ☐ Saved both keys somewhere safe!
  
☐ STEP 5: Vercel Setup (5 min)
  ☐ Created Vercel account (with GitHub)
  ☐ Connected GitHub repository
  
☐ STEP 6: Deploy to Vercel (10 min)
  ☐ Imported nova repository
  ☐ Added environment variables:
    ☐ REACT_APP_SUPABASE_URL
    ☐ REACT_APP_SUPABASE_ANON_KEY
    ☐ REACT_APP_SPORTS_API_KEY (demo_key)
    ☐ REACT_APP_ROBLOX_API_KEY (demo_key)
  ☐ Clicked Deploy
  ☐ Waited for completion
  ☐ Visited live link
  
☐ STEP 7: Local Setup (5 min)
  ☐ Created .env.local file
  ☐ Added Supabase keys to .env.local
  ☐ Tested locally with "npm start"

🎉 SETUP COMPLETE!
═══════════════════════════════════════════════════════════
```

---

## 🚨 Troubleshooting: Common Errors

### Error 1: "npm: command not found"

**What it means**: Node.js isn't installed or terminal isn't recognizing it

**How to fix**:
1. Close all terminals completely
2. Restart your computer (really!)
3. Open a new terminal
4. Try `node --version` again

**Still not working?**
- Reinstall Node.js from nodejs.org
- Make sure to restart after installing!

---

### Error 2: "npm install" hangs or takes forever

**What it means**: NPM is downloading files but stuck

**How to fix**:
```bash
# Press Ctrl+C to stop it
# Then try this:
npm install --legacy-peer-deps
```

**Still not working?**
```bash
# Delete node_modules folder and try again
rm -rf node_modules
npm install
```

---

### Error 3: "port 3000 already in use"

**What it means**: Something else is using port 3000

**How to fix**:
```bash
# Try a different port:
PORT=3001 npm start

# Or close what's using 3000:
# Look for terminal/app running Nova and close it
```

---

### Error 4: "Cannot find module" errors

**What it means**: npm install didn't work properly

**How to fix**:
```bash
# Delete everything and reinstall:
rm -rf node_modules package-lock.json
npm install
npm start
```

---

### Error 5: GitHub Desktop won't connect

**What it means**: GitHub account not authenticated

**How to fix**:
1. Open GitHub Desktop
2. Click "File" → "Options"
3. Go to "Accounts"
4. Sign out and sign back in
5. Re-authenticate

---

### Error 6: Vercel says "Build Failed"

**What it means**: Something wrong with the code or missing environment variables

**How to fix**:
1. Go to https://vercel.com/dashboard
2. Click on your "nova" project
3. Click "Deployments" tab
4. Click the failed deployment (red X)
5. Scroll down to see the error message
6. **Most common**: Missing environment variables
   - Add them in Project Settings → Environment Variables
   - Then redeploy

---

### Error 7: Website shows blank page

**What it means**: Website loaded but no content showing

**How to fix**:
1. Open browser DevTools: Press `F12` (Windows) or `Cmd+Option+I` (Mac)
2. Click "Console" tab
3. Look for red error messages
4. Take a screenshot of the error
5. Google the error message

**Common causes**:
- Missing environment variables
- Supabase URL or key is wrong
- JavaScript error in code

---

### Error 8: "REACT_APP_SUPABASE_URL is undefined"

**What it means**: Environment variables aren't being read

**How to fix**:

**For local development:**
1. Make sure .env.local file exists in root folder
2. Make sure it's named `.env.local` (with the dot!)
3. Restart npm (`npm start`)

**For Vercel:**
1. Go to Vercel dashboard
2. Click your nova project
3. Click "Settings"
4. Click "Environment Variables"
5. Add the variables there
6. Click "Redeploy"

---

### Error 9: Supabase tables not showing

**What it means**: Tables weren't created from SQL query

**How to fix**:
1. Go to Supabase SQL editor
2. Create a new query
3. Run just one table creation at a time:
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  level INT DEFAULT 1,
  avatar_url VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```
4. Click Run
5. If it works, do the next table
6. Keep going until all 6 tables exist

---

### Error 10: "Authentication failed" on GitHub Desktop

**What it means**: Git can't authenticate with GitHub

**How to fix**:
```bash
# Open terminal in Nova folder and try:
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Then try pushing again in GitHub Desktop
```

---

## 🔍 Debugging Steps (For Any Error)

Follow these steps when something doesn't work:

### Step 1: Read the error message
- Most error messages tell you exactly what's wrong
- Google the error message (add "javascript" to the search)

### Step 2: Check the basics
```bash
# Make sure Node.js is installed:
node --version

# Make sure you're in Nova folder:
ls  # or "dir" on Windows
# Should show: src, public, package.json, etc.

# Make sure npm is installed:
npm --version
```

### Step 3: Check environment variables
- Is `.env.local` file created?
- Does it have all 4 variables?
- Are the values correct (no extra spaces)?
- Did you restart npm after creating .env.local?

### Step 4: Check Supabase
- Go to https://app.supabase.com
- Click on your "nova" project
- Go to "Database" → "Tables"
- Do you see 6 tables? (members, gaming_clips, etc.)

### Step 5: Check Vercel
- Go to https://vercel.com/dashboard
- Click "nova" project
- Click "Deployments"
- Is the latest one green (success) or red (failed)?
- Click on it to see the error

### Step 6: Check your code
1. Open terminal in Nova folder
2. Run: `npm start`
3. Look for any error messages in red
4. Take a screenshot
5. Google the error

---

## 🆘 Still Stuck?

### Resources
1. **Google the error message** - Copy the exact error and search it
2. **ChatGPT** - Paste the error, ask "How do I fix this?"
3. **Stack Overflow** - Search your error there
4. **GitHub Issues** - Sometimes others had the same problem

### Creating a Good Help Request

When asking for help, include:
1. **What you were doing**: "Trying to run npm install"
2. **What happened**: "Got an error"
3. **The exact error message**: Copy and paste it
4. **What you've already tried**: "I restarted, I checked node --version"
5. **Screenshot if possible**: Pictures help a lot

Example:
```
I'm trying to deploy Nova to Vercel. I added the environment 
variables, clicked deploy, but got an error:

"ERR_SUPABASE_URL is not defined"

I already tried:
- Restarting npm
- Checking the .env.local file
- Verifying the URL is correct

Can someone help?
```

---

## ✨ Verification Checklist

Run these to confirm everything works:

### Local Testing
```bash
# Terminal in Nova folder:
npm start

# Should see:
# ✓ Compiled successfully
# Ready on http://localhost:3000
# Open browser and see the Nova website
```

### GitHub Check
```bash
# Go to https://github.com/yourusername/nova
# Should see:
# ✓ All your code files (src/, public/, package.json, etc.)
# ✓ Green "Code" button with file count
# ✓ Your commits listed
```

### Supabase Check
```
Go to https://app.supabase.com

Should see:
✓ Project "nova" listed
✓ Database section with 6 tables:
  - members
  - gaming_clips
  - favorite_songs
  - sports_stats
  - scores
  - roblox_stats
```

### Vercel Check
```
Go to https://vercel.com/dashboard

Should see:
✓ Project "nova" listed
✓ Latest deployment is green (success)
✓ Green link to live website
✓ Environment variables set
```

---

## 🎯 Quick Reference Card

```
COMMON COMMANDS
═══════════════════════════════════════════════════════════

# Start local development:
npm start

# Install packages:
npm install

# Stop running server:
Ctrl+C (then Y if asked)

# Create .env.local file:
Windows: Copy empty file, rename to .env.local
Mac/Linux: touch .env.local

# Push to GitHub (in GitHub Desktop):
1. Make changes to code
2. Write message in "Summary"
3. Click "Commit to main"
4. Click "Push origin"

KEY WEBSITES
═══════════════════════════════════════════════════════════

Node.js:          nodejs.org
GitHub:           github.com
GitHub Desktop:   desktop.github.com
Supabase:         supabase.com
Vercel:           vercel.com

YOUR PROJECTS
═══════════════════════════════════════════════════════════

GitHub Repo:   https://github.com/[username]/nova
Live Website:  https://nova-[random].vercel.app
Supabase:      https://app.supabase.com
Vercel:        https://vercel.com/dashboard
```

---

## 🎓 You're Learning!

Every error you fix makes you a better developer. Don't give up!

Remember:
- ✅ Google is your friend
- ✅ Error messages are helpful (read them!)
- ✅ Breaking something and fixing it is how you learn
- ✅ Everyone was a beginner once

---

*Happy coding! 🚀*
