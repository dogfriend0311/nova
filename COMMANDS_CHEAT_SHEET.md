# 🎮 Nova Commands Cheat Sheet

Print this out and keep it nearby while developing!

---

## 🖥️ BASIC TERMINAL COMMANDS

### Navigate Folders
```bash
# List files in current folder
ls                    (Mac/Linux)
dir                   (Windows)

# Go into a folder
cd FolderName

# Go up one folder
cd ..

# Go to home folder
cd ~

# Go to Nova project folder
cd /path/to/Nova      (adjust path)
```

### File Operations
```bash
# Create a new file
touch filename.txt    (Mac/Linux)
echo > filename.txt   (Windows)

# Create a folder
mkdir FolderName

# Delete a file
rm filename.txt       (Mac/Linux)
del filename.txt      (Windows)

# Delete a folder
rm -rf FolderName     (Mac/Linux)
rmdir FolderName      (Windows)

# Copy a file
cp file.txt copy.txt  (Mac/Linux)
copy file.txt copy.txt (Windows)
```

---

## 📦 NPM COMMANDS

### Install & Setup
```bash
# Install all dependencies (run in Nova folder)
npm install

# Install specific package
npm install package-name

# Install and save to package.json
npm install package-name --save

# Install with legacy mode (fixes some errors)
npm install --legacy-peer-deps
```

### Running Nova
```bash
# Start development server (opens browser automatically)
npm start

# Start on a different port (if 3000 is used)
PORT=3001 npm start   (Mac/Linux)
set PORT=3001 && npm start (Windows)

# Build for production
npm build

# Test the code
npm test
```

### Cleaning Up
```bash
# Remove node_modules folder (if errors happen)
rm -rf node_modules   (Mac/Linux)
rmdir /s node_modules (Windows)

# Remove package-lock.json
rm package-lock.json  (Mac/Linux)
del package-lock.json (Windows)

# Full reset (removes node_modules and lock file, then reinstall)
rm -rf node_modules package-lock.json && npm install (Mac/Linux)
rmdir /s node_modules && del package-lock.json && npm install (Windows)
```

---

## 📚 GIT COMMANDS (Using GitHub Desktop)

### Using GitHub Desktop (Recommended for Beginners)
```
1. Make changes to your code
2. Open GitHub Desktop
3. You'll see files changed
4. Write a message: "Added login feature"
5. Click "Commit to main"
6. Click "Push origin"
7. Done! Changes are on GitHub
```

### Using Terminal (Advanced)
```bash
# Check status of changes
git status

# Add all changed files
git add .

# Create a commit (save point)
git commit -m "Description of changes"

# Upload to GitHub
git push

# Pull latest changes from GitHub
git pull

# See commit history
git log

# Undo last commit (careful!)
git reset --soft HEAD~1

# Check which branch you're on
git branch
```

---

## 🌐 VERCEL COMMANDS

### Deploy from Terminal
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to staging (for testing)
vercel

# Deploy to production (live website)
vercel --prod

# Check deployment status
vercel --list

# See logs
vercel logs
```

### Deploy from GitHub (Automatic)
```
1. Push code to GitHub
2. Vercel automatically detects changes
3. Automatically builds and deploys
4. No commands needed!
```

---

## 🔐 ENVIRONMENT VARIABLES

### Create .env.local File
```bash
# Windows: Create in Nova folder, name it: .env.local
# Mac/Linux: In terminal, type:
touch .env.local

# Open with text editor and add:
REACT_APP_SUPABASE_URL=your_url_here
REACT_APP_SUPABASE_ANON_KEY=your_key_here
REACT_APP_SPORTS_API_KEY=demo_key
REACT_APP_ROBLOX_API_KEY=demo_key
```

**Important**: Don't commit .env.local to GitHub (contains secrets)!

---

## 🚀 TYPICAL WORKFLOW

### Day-to-Day Development

```bash
# Morning: Get latest code
git pull

# Start working
npm start

# Make changes to code...
# Test in browser at http://localhost:3000

# When done for the day:
# 1. Stop server (Ctrl+C in terminal)
# 2. Open GitHub Desktop
# 3. Commit changes: "Feature X complete"
# 4. Push origin
# 5. Done! Website updates automatically on Vercel
```

---

## 🧹 CLEANUP COMMANDS

### When Things Go Wrong

```bash
# Reset everything to fresh start:
rm -rf node_modules package-lock.json (Mac/Linux)
rmdir /s node_modules (Windows)
npm install
npm start

# Clear npm cache:
npm cache clean --force

# Verify Node.js is working:
node --version
npm --version

# Check which folder you're in:
pwd                   (Mac/Linux)
cd                    (Windows)
```

---

## 🔍 DEBUGGING COMMANDS

### Find Information
```bash
# Check local IP (useful for testing on phone)
ipconfig             (Windows)
ifconfig             (Mac/Linux)

# Find process using port 3000
lsof -i :3000        (Mac/Linux)
netstat -ano | findstr :3000 (Windows)

# Kill process on port 3000
kill -9 <PID>        (Mac/Linux)
taskkill /PID <PID> /F (Windows)
```

---

## 📱 MOBILE TESTING

### Test on Your Phone Locally
```bash
# Find your computer's IP
ipconfig             (Windows)
ifconfig             (Mac/Linux)

# Start server (note the IP printed)
npm start

# On phone, visit:
http://[your-ip]:3000
# Example: http://192.168.1.100:3000
```

---

## 📋 QUICK COPY-PASTE COMMANDS

Use these when things break:

### Fix npm install issues
```bash
npm install --legacy-peer-deps
```

### Fix port already in use
```bash
PORT=3001 npm start
```

### Full reset
```bash
rm -rf node_modules package-lock.json && npm install
```

### Check what's running
```bash
npm list
```

### Stop running server
```
Press: Ctrl+C (then Y if asked)
```

---

## 📚 FILE REFERENCES

### Important Files to Know
```
Nova/
├── src/
│   ├── App.jsx           # Main app file
│   └── index.jsx         # Entry point
├── public/
│   └── index.html        # HTML template
├── .env.local            # Environment variables (don't commit!)
├── package.json          # Dependencies
└── vercel.json           # Vercel config
```

---

## 🎯 COMMAND BY SITUATION

### "I want to..."

**Start working locally**
```bash
npm start
```

**Add new package**
```bash
npm install package-name
```

**Save my work to GitHub**
```bash
# Using GitHub Desktop:
1. Write commit message
2. Click "Commit to main"
3. Click "Push origin"
```

**Deploy to Vercel**
```bash
# Push to GitHub, Vercel auto-deploys
git push
```

**Stop the server**
```bash
Ctrl+C (then Y)
```

**Fix errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Check if things work**
```bash
npm start
# Visit http://localhost:3000 in browser
```

**See what's changed**
```bash
git status
```

---

## ⚠️ THINGS NOT TO DO

```
❌ Don't commit .env.local to GitHub
❌ Don't delete node_modules manually (use npm)
❌ Don't close terminal while npm start is running
❌ Don't run npm commands outside Nova folder
❌ Don't edit package.json directly (use npm install)
❌ Don't share API keys on GitHub
```

---

## 💡 PRO TIPS

### Save Time
- Use arrow keys in terminal to repeat commands
- Type first few letters, press Tab to autocomplete
- Keep terminal open during development
- Don't close GitHub Desktop, it saves state

### Avoid Errors
- Always `npm install` first
- Always restart npm after .env.local changes
- Always commit working code
- Always test locally before pushing

### Debugging
- Read error messages carefully
- Google the error message
- Check console (F12 in browser)
- Check Vercel logs

---

## 🎓 LEARNING RESOURCES

While developing, keep these handy:
- Node.js docs: nodejs.org/docs
- React docs: react.dev
- npm docs: npmjs.com/docs
- Git cheat sheet: github.com/git-cheat-sheet
- Terminal cheat sheet: quickref.me/bash

---

## 🚨 EMERGENCY COMMANDS

If everything is broken:

```bash
# Nuclear option - start completely fresh
cd Nova
rm -rf node_modules package-lock.json
npm install
npm start
```

If that doesn't work:
1. Close all terminals
2. Restart your computer
3. Try again

If THAT doesn't work:
1. Delete Nova folder entirely
2. Download Nova fresh
3. Start from scratch

---

## 📌 BOOKMARK THESE

**In Browser Bookmarks Bar:**
- GitHub: github.com/yourusername/nova
- Vercel: vercel.com/dashboard
- Supabase: app.supabase.com
- Local: localhost:3000
- React Docs: react.dev
- This Guide!

---

## ✅ Checklist Before Pushing to Production

```
Before pushing to GitHub/Vercel:
☐ Tested locally with npm start
☐ No errors in console (F12)
☐ Updated .env variables if needed
☐ Committed changes with good message
☐ Git status shows "nothing to commit"
☐ Pushed to GitHub
☐ Vercel deployment is green
☐ Live website works
```

---

*Print this page and keep it on your desk! 📌*

**Happy coding!** 🚀
