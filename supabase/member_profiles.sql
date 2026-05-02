-- Create member_profiles table
CREATE TABLE member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  bio TEXT,
  top_banner_url VARCHAR(255),
  left_banner_url VARCHAR(255),
  right_banner_url VARCHAR(255),
  spotify_url VARCHAR(255),
  twitter_url VARCHAR(255),
  twitch_url VARCHAR(255),
  youtube_url VARCHAR(255),
  instagram_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add role column to admin_users (if table exists)
ALTER TABLE IF EXISTS admin_users ADD COLUMN role VARCHAR(50) DEFAULT 'member';
