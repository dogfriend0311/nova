# 🚀 Nova Setup Guide for Beginners

This is a **complete, beginner-friendly guide** to get Nova from your computer to the internet!

---

## 📋 What We'll Do (In Order)

1. ✅ **Download & Test Locally** (5 minutes)
2. ✅ **Create GitHub Account & Repository** (10 minutes)
3. ✅ **Upload Code to GitHub** (5 minutes)
4. ✅ **Create Supabase Account & Database** (15 minutes)
5. ✅ **Create Vercel Account** (5 minutes)
6. ✅ **Deploy to Vercel** (5 minutes)
7. ✅ **Connect Everything** (10 minutes)

**Total Time: ~1 hour**

---

## 🟢 STEP 1: Download & Test Locally

### 1.1 Download Node.js
1. Go to **https://nodejs.org**
2. Click the **LTS** (Long Term Support) button - it's the big green one
3. Run the installer and follow the prompts
4. Click "Next" → "Next" → "Install"
5. After installation, **restart your computer**

### 1.2 Verify Node.js Installed
1. Open **Command Prompt** (Windows) or **Terminal** (Mac/Linux)
   - Windows: Press `Windows key + R`, type `cmd`, hit Enter
   - Mac: Press `Cmd + Space`, type `terminal`, hit Enter

2. Type this and press Enter:
```bash
node --version
```

You should see something like `v18.17.0` - if you do, you're good!

### 1.3 Download Nova Files
1. Go to **https://github.com** (we'll set this up properly in Step 2)
2. For now, download my Nova files:
   - I'll provide you a ZIP file with everything
   - **Extract the ZIP** to a folder on your computer
   - Name the folder: `Nova` or `nova-project`

### 1.4 Open Terminal in Nova Folder
**Windows:**
1. Open the Nova folder
2. Press `Ctrl + L` (address bar will highlight)
3. Type `cmd` and press Enter
4. Terminal opens in that folder

**Mac/Linux:**
1. Right-click inside Nova folder
2. Select "Open in Terminal"

### 1.5 Install Dependencies
In the terminal, type this and press Enter:
```bash
npm install
```

This will take 2-3 minutes. You'll see lots of text flowing by - that's normal!

### 1.6 Run Locally
Type this and press Enter:
```bash
npm start
```

A browser window should open automatically showing Nova! 🎉

- If it doesn't, go to **http://localhost:3000**
- You should see the space theme with stars and the Nova logo
- **Don't close the terminal** - it needs to stay running

**Test passed?** Great! Press `Ctrl + C` in the terminal to stop it.

---

## 🟢 STEP 2: Create GitHub Account & Repository

GitHub is where we'll upload your code. Think of it like Google Drive, but for code.

### 2.1 Create GitHub Account
1. Go to **https://github.com/signup**
2. Enter your **email address**
3. Create a **password**
4. Choose a **username** (like: `yourusername` or `yourname-dev`)
5. Click "Create account"
6. Verify your email (check your email inbox, click the link GitHub sends)
7. Confirm you're human (solve the puzzle)

### 2.2 Create a New Repository
1. Go to **https://github.com/new**
2. For **Repository name**, type: `nova`
3. For **Description**, type: `Space Themed Social Gaming Hub`
4. Select **Public** (so Vercel can access it)
5. Check **"Add a README file"**
6. Click **"Create repository"** button

**Great!** You now have a GitHub repository.

---

## 🟢 STEP 3: Upload Code to GitHub

We'll use **GitHub Desktop** - it's easier than the command line for beginners!

### 3.1 Install GitHub Desktop
1. Go to **https://desktop.github.com**
2. Click **"Download"** button
3. Run the installer
4. When asked to sign in, use your GitHub username/password

### 3.2 Clone Your Repository
1. Open **GitHub Desktop**
2. Click **"File"** → **"Clone Repository"**
3. You'll see your `nova` repository in the list
4. Click it to select it
5. Choose where to save it (Desktop is fine)
6. Click **"Clone"**

Now you have a local copy of your GitHub repository!

### 3.3 Copy Nova Files
1. Open your Nova folder (with all the src, public, package.json files)
2. **Select ALL files** (Ctrl+A or Cmd+A)
3. **Copy** them (Ctrl+C or Cmd+C)
4. Open the cloned repository folder from Step 3.2
5. **Delete** the `README.md` file that's there
6. **Paste** all Nova files here
7. You should now see: `src/`, `public/`, `package.json`, etc.

### 3.4 Upload to GitHub
1. Go back to **GitHub Desktop**
2. You'll see a list of changes (all your files)
3. At the bottom left, you'll see a text box that says "Summary"
4. Type: `Initial Nova commit`
5. Click **"Commit to main"**
6. Click **"Push origin"** button at the top

**Congratulations!** Your code is now on GitHub! 🎉

You can verify by going to **https://github.com/yourusername/nova** in your browser.

---

## 🟢 STEP 4: Create Supabase Account & Database

Supabase is where your data will be stored (members, clips, songs, scores, etc.).

### 4.1 Create Supabase Account
1. Go to **https://supabase.com**
2. Click **"Start Your Project"** button
3. Click **"Sign Up"**
4. Choose **"Continue with GitHub"**
5. Authorize Supabase to access your GitHub
6. Fill in your details
7. Verify your email

### 4.2 Create a New Project
1. In Supabase, click **"New Project"**
2. For **Project name**, type: `nova`
3. For **Database password**, create a strong password (save it!)
4. Select **region** closest to you
5. Click **"Create new project"**

This takes about 2 minutes. You'll see a progress bar.

### 4.3 Create Tables
Once your project is created, you'll see the dashboard.

1. Click **"SQL Editor"** on the left sidebar
2. Click **"New Query"**
3. Copy this code and paste it into the SQL editor:

```sql
-- Members table
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

-- Gaming clips table
CREATE TABLE gaming_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(255),
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Favorite songs table
CREATE TABLE favorite_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(200) NOT NULL,
  spotify_url VARCHAR(255),
  added_at TIMESTAMP DEFAULT NOW()
);

-- Sports stats table
CREATE TABLE sports_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league VARCHAR(10) NOT NULL,
  team_id VARCHAR(50),
  team_name VARCHAR(100),
  season INT,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league VARCHAR(10) NOT NULL,
  game_id VARCHAR(100) UNIQUE,
  game_date DATE NOT NULL,
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  home_score INT,
  away_score INT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roblox stats table
CREATE TABLE roblox_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100),
  level INT DEFAULT 1,
  league_rank INT,
  points INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

4. Click **"Run"** button (it's green)
5. All tables are created! ✅

### 4.4 Get Your Supabase Keys
You need these keys to connect Nova to Supabase.

1. In Supabase, click **"Settings"** (bottom left)
2. Click **"API"** in the left menu
3. You'll see two keys:
   - **Project URL** - copy this
   - **anon public** key - copy this
4. **Save these somewhere safe** (notepad, password manager, etc.)

You'll use these keys in the next steps!

---

## 🟢 STEP 5: Create Vercel Account

Vercel is where Nova will live on the internet. It's like publishing your website.

### 5.1 Create Vercel Account
1. Go to **https://vercel.com/signup**
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub
4. Fill in any additional info

**Done!** You now have a Vercel account.

---

## 🟢 STEP 6: Deploy to Vercel

This is the exciting part - putting Nova on the internet!

### 6.1 Import Your GitHub Repository
1. Go to **https://vercel.com/new**
2. You should see your `nova` repository in the list
3. Click **"Import"** on the nova repository
4. Click **"Import"** again on the next screen

### 6.2 Add Environment Variables
Before deploying, you need to add your Supabase keys.

1. You'll see a section called **"Environment Variables"**
2. Add these variables:

**First Variable:**
- **Name:** `REACT_APP_SUPABASE_URL`
- **Value:** (paste your Project URL from Supabase)

**Second Variable:**
- **Name:** `REACT_APP_SUPABASE_ANON_KEY`
- **Value:** (paste your anon public key from Supabase)

**Third Variable (for now, dummy data):**
- **Name:** `REACT_APP_SPORTS_API_KEY`
- **Value:** `demo_key`

**Fourth Variable:**
- **Name:** `REACT_APP_ROBLOX_API_KEY`
- **Value:** `demo_key`

3. Click **"Deploy"** button

### 6.3 Wait for Deployment
1. You'll see a progress bar
2. The build might take 2-5 minutes
3. When done, you'll see **"Congratulations!"** message
4. Click the link to visit your live website! 🎉

Your Nova site is now live at: `https://nova-[random].vercel.app`

---

## 🟢 STEP 7: Update Your Code with Supabase Keys

Now that Vercel and Supabase are connected, let's make sure the connection works locally too.

### 7.1 Create .env.local File
1. Open your Nova folder
2. Create a new file called `.env.local` (note the dot at the start)
3. Add these lines:

```
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_SPORTS_API_KEY=demo_key
REACT_APP_ROBLOX_API_KEY=demo_key
```

Replace:
- `your_supabase_url_here` with your Supabase Project URL
- `your_anon_key_here` with your Supabase anon key

4. **Save the file**
5. **Do NOT commit this file to GitHub** (it's in .gitignore already)

### 7.2 Test Locally
1. Open terminal in Nova folder
2. Run: `npm start`
3. Website opens at http://localhost:3000
4. Everything should work!

---

## 📝 Summary of What You Did

```
✅ Downloaded Node.js
✅ Tested Nova locally
✅ Created GitHub account
✅ Created GitHub repository
✅ Uploaded Nova code to GitHub
✅ Created Supabase account
✅ Created Supabase database & tables
✅ Created Vercel account
✅ Deployed Nova to Vercel
✅ Connected Supabase to Nova
```

---

## 🔗 Your Links

**Save these links!**

- **GitHub Repository**: https://github.com/yourusername/nova
- **Live Website**: https://nova-[random].vercel.app
- **Supabase Project**: https://app.supabase.com
- **Vercel Project**: https://vercel.com/dashboard

---

## 🔄 How to Update Your Website (Future Changes)

Every time you make changes to Nova:

### Option 1: Using GitHub Desktop (Easiest)
1. Make changes to your code
2. Open GitHub Desktop
3. You'll see your changes
4. Write a message in "Summary" box (like "Added login page")
5. Click "Commit to main"
6. Click "Push origin"
7. **Vercel automatically deploys** the new version!

### Option 2: Command Line
```bash
# In your Nova folder, type these one by one:
git add .
git commit -m "Your message here"
git push
```

**That's it!** Vercel will automatically deploy your changes.

---

## 🆘 Troubleshooting

### "npm install" gives errors
```bash
# Try this:
npm install --legacy-peer-deps
```

### Vercel deployment fails
1. Go to https://vercel.com/dashboard
2. Click on your nova project
3. Click "Deployments" tab
4. Find the failed deployment
5. Click it to see the error message
6. Common fix: Missing environment variables (repeat Step 6.2)

### Supabase tables not created
1. Check that the SQL query ran without errors
2. Go to Supabase "Database" section
3. You should see all 6 tables listed
4. If not, run the SQL again

### Website shows blank page
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Check the Console tab for error messages
3. Take a screenshot of the error
4. Google the error message

---

## 🎓 Next Steps After Setup

Now that everything is deployed:

1. **Test the website**: Visit your live link and explore
2. **Follow the Development Guide**: See DEVELOPMENT_GUIDE.md
3. **Add your real API keys**:
   - Get Sports API key from ESPN/TheSportsDB
   - Get Roblox API key
   - Add them to Vercel environment variables
4. **Build features** following the phase-by-phase guide

---

## 📞 Need Help?

### Common Questions

**Q: Can I change my website URL?**
A: Yes! In Vercel, go to Settings → Domains to add a custom domain

**Q: How do I add a real domain (like novasocial.com)?**
A: Buy domain from GoDaddy/Namecheap, point it to Vercel

**Q: How often should I push to GitHub?**
A: After every feature or fix. Makes it easier to go back if something breaks

**Q: Can I invite collaborators?**
A: Yes! In GitHub repo Settings → Collaborators

**Q: How do I add real data to the database?**
A: Use Supabase Studio (the web interface) to add data, or build admin pages

---

## 🎉 Congratulations!

You now have:
- ✅ Code on GitHub
- ✅ Website on the internet
- ✅ Database in Supabase
- ✅ Automatic deployments

**You're officially a web developer!** 🚀

Go explore the Development Guide to learn what to build next.

---

*Questions? Stuck? Reread the section or google the error message. You've got this!*
