import React, { createContext, useState, useEffect } from 'react';
import { checkDailyLogin } from '../services/reputationService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyReward, setDailyReward] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('nova_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  // Daily login streak + coin/XP bonus — checked once per user per
  // session; checkDailyLogin() itself is a no-op if today's reward was
  // already claimed, so this is safe to run on every user change
  // (fresh login AND restoring an existing session on app boot).
  useEffect(() => {
    if (!user || user.role === 'guest') return;
    checkDailyLogin(user.username).then(reward => { if (reward) setDailyReward(reward); }).catch(() => {});
  }, [user]);

  // Online heartbeat: update every 30s while logged in.
  // Writes to Supabase (via db.updateLastSeen) so ANY device can see who's
  // online — not just this browser's own localStorage.
  useEffect(() => {
    if (!user || user.role === 'guest') return;

    const updateOnline = () => {
      import('../services/db').then(({ default: db }) => {
        db.updateLastSeen(user.username).catch(() => {});
      }).catch(() => {});
    };

    updateOnline();
    const interval = setInterval(updateOnline, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (rawUsername, rawPassword) => {
    const username = (rawUsername || '').trim();
    const password = (rawPassword || '').trim();

    // ── Hardcoded owner account ──
    if (username === 'x0afterhoursx0' && password === 'Chiefsfan87') {
      const userData = { username, role: 'owner' };
      setUser(userData);
      localStorage.setItem('nova_user', JSON.stringify(userData));
      const memberProfiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
      const alreadyLocal = memberProfiles.find(p => p.username === username);
      if (!alreadyLocal) {
        const newProfile = { username, bio: 'Nova Owner', top_banner_url: '', left_banner_url: '', right_banner_url: '', spotify_url: '', twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '' };
        memberProfiles.push(newProfile);
        localStorage.setItem('member_profiles', JSON.stringify(memberProfiles));
      }
      import('../services/db').then(({ default: db }) => {
        db.saveUser({ username, role: 'owner' }).catch(() => {});
        // Push the profile row to the shared DB too — not just this
        // device's localStorage — so it shows up cross-device right away
        // instead of only after this account visits its own profile page.
        if (!alreadyLocal) {
          db.saveMemberProfile({ username, bio: 'Nova Owner', top_banner_url: '', spotify_url: '', twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '' }).catch(() => {});
        }
      }).catch(() => {});
      return { success: true };
    }

    // ── Fast path: check this device's localStorage ──
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      const userData = { username: foundUser.username, role: foundUser.role || 'member' };
      setUser(userData);
      localStorage.setItem('nova_user', JSON.stringify(userData));
      // Async: sync latest role from Supabase (cross-device role changes)
      import('../services/db').then(({ default: db }) => {
        db.getUsers().then(supaUsers => {
          const supaUser = supaUsers.find(u => u.username === username);
          if (supaUser?.role && supaUser.role !== userData.role) {
            const updated = { ...userData, role: supaUser.role };
            setUser(updated);
            localStorage.setItem('nova_user', JSON.stringify(updated));
            const localUsers = JSON.parse(localStorage.getItem('nova_users') || '[]');
            const idx = localUsers.findIndex(u => u.username === username);
            if (idx >= 0) { localUsers[idx].role = supaUser.role; localStorage.setItem('nova_users', JSON.stringify(localUsers)); }
          }
        }).catch(() => {});
      }).catch(() => {});
      return { success: true };
    }

    // ── Cross-device fallback: verify against Supabase ──
    // Accounts created on a different device won't be in this browser's
    // localStorage, so we check the shared nova_users table in Supabase.
    try {
      const { default: db } = await import('../services/db');
      const sbUser = await db.checkCredential(username, password);
      if (sbUser) {
        const userData = { username: sbUser.username, role: sbUser.role || 'member' };
        setUser(userData);
        localStorage.setItem('nova_user', JSON.stringify(userData));
        // Cache on this device so the next login doesn't need the round-trip
        const localUsers = JSON.parse(localStorage.getItem('nova_users') || '[]');
        if (!localUsers.find(u => u.username === username)) {
          localUsers.push({ username, password, role: sbUser.role || 'member' });
          localStorage.setItem('nova_users', JSON.stringify(localUsers));
        }
        return { success: true };
      }
    } catch { /* Supabase unavailable — fall through */ }

    return { success: false, error: 'Invalid username or password' };
  };

  const loginAsGuest = () => {
    const userData = { username: 'Guest', role: 'guest' };
    setUser(userData);
    localStorage.setItem('nova_user', JSON.stringify(userData));
  };

  const signup = (username, password) => {
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    if (users.find(u => u.username === username)) return { success: false, error: 'Username already exists' };
    const newUser = { username, password, role: 'member' };
    users.push(newUser);
    localStorage.setItem('nova_users', JSON.stringify(users));
    // Persist to Supabase WITH the password so this account can log in
    // from any device — not just the one where it was created.
    import('../services/db').then(({ default: db }) => {
      db.saveUser({ username, password, role: 'member' }).catch(() => {});
      // Also push the starter profile row to the shared DB — not just
      // this device's localStorage — so the new member's page shows up
      // for everyone immediately, instead of only after they visit their
      // own profile page (which is what used to trigger the DB backfill).
      db.saveMemberProfile({ username, bio: '', top_banner_url: '', spotify_url: '', twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '' }).catch(() => {});
    }).catch(() => {});
    const memberProfiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    memberProfiles.push({ username, bio: '', top_banner_url: '', left_banner_url: '', right_banner_url: '', spotify_url: '', twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '' });
    localStorage.setItem('member_profiles', JSON.stringify(memberProfiles));
    const userData = { username, role: 'member' };
    setUser(userData);
    localStorage.setItem('nova_user', JSON.stringify(userData));
    return { success: true };
  };

  const logout = () => {
    if (user && user.role !== 'guest') {
      const online = JSON.parse(localStorage.getItem('nova_online') || '{}');
      delete online[user.username];
      localStorage.setItem('nova_online', JSON.stringify(online));
    }
    setUser(null);
    localStorage.removeItem('nova_user');
  };

  const updateUserRole = (targetUsername, newRole) => {
    // 1. Update this device's localStorage immediately
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const userIndex = users.findIndex(u => u.username === targetUsername);
    if (userIndex !== -1) {
      users[userIndex].role = newRole;
      localStorage.setItem('nova_users', JSON.stringify(users));
    }
    // 2. Persist to Supabase so the change takes effect on every device
    //    (the friend's next login will pick this up via the check in login())
    import('../services/db').then(({ default: db }) => {
      db.updateUserRole(targetUsername, newRole).catch(() => {});
    }).catch(() => {});
    return { success: true };
  };

  const hasPermission = (requiredRole) => {
    if (!user) return false;
    const permissions = {
      owner:         ['owner', 'cofounder', 'mod', 'vizta_helper', 'football_helper', 'member'],
      cofounder:     ['cofounder', 'mod', 'vizta_helper', 'football_helper', 'member'],
      mod:           ['mod', 'vizta_helper', 'football_helper', 'member'],
      vizta_helper:  ['vizta_helper', 'member'],
      football_helper: ['football_helper', 'member'],
      member:        ['member'],
      guest:         [],
    };
    return (permissions[user.role] || []).includes(requiredRole);
  };

  const canAccessDashboard = () => {
    if (!user) return false;
    return ['owner', 'cofounder', 'mod', 'vizta_helper', 'football_helper'].includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsGuest, signup, logout, updateUserRole, hasPermission, canAccessDashboard, loading, dailyReward, clearDailyReward: () => setDailyReward(null) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
