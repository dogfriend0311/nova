import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("nova_user");
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const login = (rawUsername, rawPassword) => {
    const username = (rawUsername || "").trim();
    const password = (rawPassword || "").trim();
    if (username === "x0afterhoursx0" && password === "Chiefsfan87") {
      const userData = { username, role: "owner" };
      setUser(userData);
      localStorage.setItem("nova_user", JSON.stringify(userData));
      const profiles = JSON.parse(localStorage.getItem("member_profiles") || "[]");
      if (!profiles.find(p => p.username === username)) {
        profiles.push({ username, bio: "Nova Owner", top_banner_url: "", left_banner_url: "", right_banner_url: "", spotify_url: "", twitter_url: "", twitch_url: "", youtube_url: "", instagram_url: "" });
        localStorage.setItem("member_profiles", JSON.stringify(profiles));
      }
      return { success: true };
    }
    const users = JSON.parse(localStorage.getItem("nova_users") || "[]");
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      const userData = { username: found.username, role: found.role || "member" };
      setUser(userData);
      localStorage.setItem("nova_user", JSON.stringify(userData));
      return { success: true };
    }
    return { success: false, error: "Invalid username or password" };
  };

  const signup = (username, password) => {
    const users = JSON.parse(localStorage.getItem("nova_users") || "[]");
    if (users.find(u => u.username === username)) return { success: false, error: "Username already taken" };
    const newUser = { username, password, role: "member" };
    users.push(newUser);
    localStorage.setItem("nova_users", JSON.stringify(users));
    const profiles = JSON.parse(localStorage.getItem("member_profiles") || "[]");
    profiles.push({ username, bio: "", top_banner_url: "", left_banner_url: "", right_banner_url: "", spotify_url: "", twitter_url: "", twitch_url: "", youtube_url: "", instagram_url: "" });
    localStorage.setItem("member_profiles", JSON.stringify(profiles));
    const userData = { username, role: "member" };
    setUser(userData);
    localStorage.setItem("nova_user", JSON.stringify(userData));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("nova_user");
  };

  const updateUserRole = (targetUsername, newRole) => {
    const users = JSON.parse(localStorage.getItem("nova_users") || "[]");
    const idx = users.findIndex(u => u.username === targetUsername);
    if (idx !== -1) { users[idx].role = newRole; localStorage.setItem("nova_users", JSON.stringify(users)); return { success: true }; }
    return { success: false };
  };

  const canAccessDashboard = () => {
    if (!user) return false;
    return ["owner", "cofounder", "mod", "nabb_helper", "rbml_helper"].includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUserRole, canAccessDashboard, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};