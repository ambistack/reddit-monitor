# Reddit Monitor - AI Transfer Documentation

## 🎯 Project Overview

Reddit Monitor is a sophisticated business intelligence tool that tracks Reddit mentions across multiple subreddits. It uses keyword matching with intelligent context extraction to help businesses monitor their online presence and identify potential customers or discussions about their industry.

### Key Features
- **Smart Keyword Monitoring**: 150-character context extraction with yellow highlighting
- **Multi-Subreddit Tracking**: Monitor unlimited subreddits simultaneously
- **Advanced Filtering**: Checkbox-based subreddit and keyword filtering with preserved order
- **Context-Aware Flagging**: Tracks keyword, location, business name, and industry matches
- **Real-time Dashboard**: Live monitoring with sorting, filtering, and visual feedback
- **AI-Powered Suggestions**: Keyword and subreddit recommendations

## 🏗️ Technology Stack

### Frontend
- **Next.js 15.5.0** (App Router)
- **React 19.1.0**
- **TypeScript 5**
- **Tailwind CSS 4**

### Backend & Services
- **Supabase** (Database, Auth, RLS)
- **Reddit JSON API** (Public post fetching)
- **Apify** (Web scraping - optional)

### Key Dependencies
```json
{
  "@supabase/ssr": "^0.6.1",
  "@supabase/supabase-js": "^2.55.0",
  "apify": "^3.4.4",
  "apify-client": "^2.15.1"
}
```

## 📊 Database Schema

### Core Tables
1. **profiles** - User business information
2. **monitored_subreddits** - Subreddit tracking with keywords
3. **mentions** - Flagged Reddit posts with context

### Critical Database Migration
```sql
-- REQUIRED: Add keyword context fields
ALTER TABLE mentions 
ADD COLUMN flagged_keyword TEXT,
ADD COLUMN keyword_context TEXT,
ADD COLUMN match_type TEXT CHECK (match_type IN ('keyword', 'location', 'business', 'industry'));
```

## 🔧 Environment Setup

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APIFY_TOKEN=your_apify_token  # Optional
```

### Supabase Configuration
- **RLS Policies**: Must be configured for all tables
- **Service Role**: Required for cross-user operations
- **SSR Client**: Uses server-side rendering with cookies

## 🎨 Architecture Overview

### Frontend Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (9 endpoints)
│   ├── dashboard/         # Main application
│   ├── login/            # Authentication
│   └── onboarding/       # User setup
├── components/           # React Components
│   ├── KeywordManager.tsx     # Full-screen keyword editor
│   ├── SubredditManager.tsx   # Subreddit configuration
│   ├── KeywordContextDisplay.tsx  # Context visualization
│   └── ui/               # Reusable UI components
└── lib/                  # Utilities
    ├── keywordContext.ts      # Context extraction logic
    ├── supabase.ts           # Database client
    └── subredditSuggestions.ts
```

### Key API Endpoints
1. **`/api/monitor`** - Core Reddit scraping and analysis
2. **`/api/suggest-keywords`** - AI keyword generation
3. **`/api/update-keywords`** - Keyword management
4. **`/api/validate-subreddit`** - Subreddit validation
5. **`/api/clear-mentions`** - Data cleanup
6. **`/api/fix-mentions-rls`** - RLS policy debugging

## 🧠 Core Algorithm: Keyword Context Extraction

### Smart Matching System
```typescript
// Located: src/lib/keywordContext.ts
interface KeywordMatch {
  keyword: string
  position: number
  context: string  // 150 characters around match
  matchType: 'keyword' | 'location' | 'business' | 'industry'
}
```

### Context Extraction Logic
1. **Find keyword position** in post content
2. **Extract 150 characters** centered around keyword
3. **Add ellipsis** for truncated content
4. **Highlight keyword** with yellow background
5. **Classify match type** for visual organization

### Priority Matching Order
1. User-defined keywords (highest priority)
2. Business location
3. Business name
4. Industry terms

## 📱 User Interface Features

### Dashboard Components
- **Stats Cards**: Total mentions, subreddits, last check
- **Filter Bar**: "Sorting by: most recent • Filtered (X results)"
- **Advanced Filtering**: Checkbox dropdowns with z-index: 9999
- **Mention Cards**: Title, context box, metadata, Reddit link

### Filtering System
```typescript
// Multi-dimensional filtering
const [filterBy, setFilterBy] = useState<{
  subreddits: string[]  // Preserves selection order
  keywords: string[]    // Preserves selection order
}>({ subreddits: [], keywords: [] })
```

### Context Display Format
```
[Badge] "keyword" [r/subreddit]  ← Only shows subreddit when filtering
...context with highlighted keyword...
```

## 🔄 Reddit Monitoring Process

### Data Flow
1. **Fetch subreddits** from `monitored_subreddits` table
2. **Call Reddit JSON API**: `https://reddit.com/r/{subreddit}/hot.json?limit=25`
3. **Apply keyword matching** using `findFirstKeywordMatch()`
4. **Extract context** with `extractKeywordContext()`
5. **Store mentions** with full context data
6. **Display results** with filtering/sorting

### Rate Limiting
- 1-second delay between subreddit requests
- User-Agent header for Reddit API compliance
- Duplicate detection prevents re-saving posts

## 🎛️ Advanced Features

### Full-Screen Keyword Manager
- **Modal overlay**: z-index: 2147483647 (maximum)
- **AI suggestions**: Generated based on business profile
- **Real-time updates**: Live preview of keyword changes

### Smart Filtering
- **Checkbox interface**: Visual selection with checkmarks
- **Clear all** functionality
- **Selection order preservation**: First clicked shows first
- **Multi-criteria filtering**: Subreddit + keyword combinations

### Context-Aware Display
- **Match type badges**: Color-coded by match reason
- **Subreddit badges**: Show only when relevant
- **150-character context**: Optimal readability

## ⚠️ Critical Implementation Notes

### Z-Index Management
```css
/* Dropdown menus must be above context boxes */
.dropdown-modal { z-index: 9999 !important; }
```

### TypeScript Interfaces
```typescript
interface Mention {
  id: number
  subreddit: string
  post_title: string
  post_url: string
  content: string
  author: string
  created_at: string
  flagged_keyword?: string | null      // NEW
  keyword_context?: string | null      // NEW  
  match_type?: 'keyword' | 'location' | 'business' | 'industry' | null  // NEW
}
```

### Error Handling
- **Supabase RLS fallback**: Service role API for failed operations
- **Reddit API resilience**: Graceful handling of rate limits
- **User feedback**: Toast notifications for all operations

## 🚀 Deployment Checklist

### Before Transfer
1. **Database migration** - Run the SQL migration
2. **Environment variables** - Set up Supabase credentials
3. **RLS policies** - Configure row-level security
4. **Test Reddit API** - Verify public JSON endpoint access

### Testing Priorities
1. **Monitor cycle**: Can it fetch and analyze Reddit posts?
2. **Keyword matching**: Does context extraction work?
3. **Filtering system**: Are dropdowns visible and functional?
4. **Mobile responsive**: Does the interface work on small screens?

### Performance Considerations
- **React 19 features**: Uses latest React concurrent features
- **Server-side rendering**: Full SSR with Supabase SSR client
- **Efficient filtering**: Client-side array operations for speed

## 📋 Feature Completion Status

### ✅ Fully Implemented
- Keyword context extraction (150 characters)
- Multi-subreddit monitoring
- Advanced checkbox filtering
- Visual highlighting system
- Full-screen keyword manager
- Reddit JSON API integration
- Supabase authentication and RLS

### 🔧 Areas for Enhancement
- Mobile optimization
- Real-time notifications
- Export functionality
- Analytics dashboard
- Webhook integrations

## 🎯 AI Transfer Notes

### Critical Files for AI Understanding
1. **`src/app/dashboard/page.tsx`** - Main dashboard logic
2. **`src/lib/keywordContext.ts`** - Core algorithm
3. **`src/app/api/monitor/route.ts`** - Reddit scraping engine
4. **`database-migration.sql`** - Required schema changes

### Key Concepts to Preserve
- **Selection order preservation** in filtering
- **Context extraction algorithm** (150 chars)
- **Z-index hierarchy** for modal visibility
- **RLS policy structure** for multi-tenant security

This project represents a mature, production-ready Reddit monitoring solution with sophisticated filtering and context analysis capabilities.