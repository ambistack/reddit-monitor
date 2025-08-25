-- Reddit Monitor Database Setup
-- Run this in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  business_name TEXT,
  location TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitored_subreddits table
CREATE TABLE IF NOT EXISTS monitored_subreddits (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subreddit_name TEXT NOT NULL,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mentions table
CREATE TABLE IF NOT EXISTS mentions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subreddit TEXT NOT NULL,
  post_title TEXT NOT NULL,
  post_url TEXT NOT NULL,
  content TEXT,
  author TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  -- NEW COLUMNS for keyword context
  flagged_keyword TEXT,
  keyword_context TEXT,
  match_type TEXT CHECK (match_type IN ('keyword', 'location', 'business', 'industry'))
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Monitored subreddits policies
CREATE POLICY "Users can view own subreddits" ON monitored_subreddits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subreddits" ON monitored_subreddits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subreddits" ON monitored_subreddits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own subreddits" ON monitored_subreddits FOR DELETE USING (auth.uid() = user_id);

-- Mentions policies
CREATE POLICY "Users can view own mentions" ON mentions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own mentions" ON mentions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mentions" ON mentions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own mentions" ON mentions FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentions_user_id ON mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON mentions(created_at);
CREATE INDEX IF NOT EXISTS idx_monitored_subreddits_user_id ON monitored_subreddits(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Comments for documentation
COMMENT ON COLUMN mentions.flagged_keyword IS 'The specific keyword that caused this post to be flagged';
COMMENT ON COLUMN mentions.keyword_context IS 'Context snippet (150 chars) around the flagged keyword';
COMMENT ON COLUMN mentions.match_type IS 'Type of match: keyword, location, business, or industry';
