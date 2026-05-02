import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('nova_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    // Admin login
    if (username === 'x0afterhoursx0' && password === 'Chiefsfan87') {
      const userData = { 
        username, 
        role: 'owner',
        email: 'admin@nova.com'
      };
      setUser(userData);
      localStorage.setItem('nova_user', JSON.stringify(userData));
      return { success: true };
    }

    // Check users
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const foundUser = users.find(u => u.username === username && u.password === password);
    
    if (foundUser) {
      const userData = { 
        username: foundUser.username, 
        role: foundUser.role || 'member',
        email: foundUser.email
      };
      setUser(userData);
      localStorage.setItem('nova_user', JSON.stringify(userData));
      return { success: true };
    }

    return { success: false, error: 'Invalid credentials' };
  };

  const signup = (username, password, email) => {
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    if (users.find(u => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser = { username, password, email, role: 'member' };
    users.push(newUser);
    localStorage.setItem('nova_users', JSON.stringify(users));

    // Create member profile
    const memberProfiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    memberProfiles.push({
      username,
      bio: '',
      top_banner_url: '',
      left_banner_url: '',
      right_banner_url: '',
      spotify_url: '',
      socials: {}
    });
    localStorage.setItem('member_profiles', JSON.stringify(memberProfiles));

    const userData = { username, role: 'member', email };
    setUser(userData);
    localStorage.setItem('nova_user', JSON.stringify(userData));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nova_user');
  };

  const updateUserRole = (targetUsername, newRole) => {
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const userIndex = users.findIndex(u => u.username === targetUsername);
    if (userIndex !== -1) {
      users[userIndex].role = newRole;
      localStorage.setItem('nova_users', JSON.stringify(users));
      return { success: true };
    }
    return { success: false, error: 'User not found' };
  };

  const hasPermission = (requiredRole) => {
    if (!user) return false;
    
    const permissions = {
      owner: ['owner', 'cofounder', 'mod', 'nabb_helper', 'member'],
      cofounder: ['cofounder', 'mod', 'nabb_helper', 'member'],
      mod: ['mod', 'nabb_helper', 'member'],
      nabb_helper: ['nabb_helper', 'member'],
      member: ['member']
    };

    const userPerms = permissions[user.role] || [];
    return userPerms.includes(requiredRole);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      updateUserRole, 
      hasPermission,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
