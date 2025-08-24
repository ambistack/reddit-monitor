-- Add keyword context fields to mentions table
-- Run this in your Supabase SQL Editor

ALTER TABLE mentions 
ADD COLUMN flagged_keyword TEXT,
ADD COLUMN keyword_context TEXT,
ADD COLUMN match_type TEXT CHECK (match_type IN ('keyword', 'location', 'business', 'industry'));

-- Add a comment for documentation
COMMENT ON COLUMN mentions.flagged_keyword IS 'The specific keyword that caused this post to be flagged';
COMMENT ON COLUMN mentions.keyword_context IS 'Context snippet (50 chars) around the flagged keyword';
COMMENT ON COLUMN mentions.match_type IS 'Type of match: keyword, location, business, or industry';
