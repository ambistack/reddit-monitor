import { createAdminClient } from '@/lib/supabase'
import { findFirstKeywordMatch } from '@/lib/keywordContext'

interface MonitoredSubreddit {
  user_id: string
  subreddit_name: string
  keywords: string[]
  profiles: {
    business_name: string
    location: string
    industry: string
  }
}

export async function POST() {
  try {
    console.log('=== Starting Reddit Monitor ===')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing')
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Create admin Supabase client
    const supabase = await createAdminClient()

    console.log('Fetching monitored subreddits...')
    
    // Get all users and their monitored subreddits
    const { data: monitoredSubs, error: subsError } = await supabase
      .from('monitored_subreddits')
      .select(`
        *,
        profiles (*)
      `)

    if (subsError) {
      console.error('Error fetching monitored subreddits:', subsError)
      return Response.json({ error: 'Failed to fetch monitored subreddits', details: subsError.message }, { status: 500 })
    }

    if (!monitoredSubs || monitoredSubs.length === 0) {
      console.log('No subreddits to monitor')
      return Response.json({ message: 'No subreddits to monitor' }, { status: 200 })
    }

    console.log(`Found ${monitoredSubs.length} subreddit configurations`)

    // Group by subreddit to avoid duplicate API calls
    const subredditGroups = (monitoredSubs as MonitoredSubreddit[]).reduce((acc, sub) => {
      if (!acc[sub.subreddit_name]) {
        acc[sub.subreddit_name] = []
      }
      acc[sub.subreddit_name].push(sub)
      return acc
    }, {} as Record<string, MonitoredSubreddit[]>)

    console.log(`Processing ${Object.keys(subredditGroups).length} unique subreddits`)

    const results = []

    // Process each unique subreddit using Reddit's JSON API
    for (const [subredditName, subs] of Object.entries(subredditGroups)) {
      try {
        console.log(`Fetching posts from r/${subredditName}...`)
        
        // Use Reddit's JSON API (no authentication required for public posts)
        const redditUrl = `https://www.reddit.com/r/${subredditName}/hot.json?limit=25`
        console.log(`Fetching: ${redditUrl}`)
        
        const response = await fetch(redditUrl, {
          headers: {
            'User-Agent': 'RedditMonitor/1.0 (by /u/YourUsername)'
          }
        })

        if (!response.ok) {
          console.error(`Failed to fetch r/${subredditName}: ${response.status} ${response.statusText}`)
          results.push({
            subreddit: subredditName,
            error: `HTTP ${response.status}: ${response.statusText}`
          })
          continue
        }

        const data = await response.json()
        const posts = data.data?.children || []
        
        console.log(`Found ${posts.length} posts in r/${subredditName}`)

        // Process posts for each user monitoring this subreddit
        for (const sub of subs) {
          const profile = sub.profiles
          if (!profile) continue

          const keywords = sub.keywords || []
          const location = profile.location?.toLowerCase() || ''
          const businessName = profile.business_name?.toLowerCase() || ''
          const industry = profile.industry?.toLowerCase() || ''

          console.log(`Filtering posts for ${profile.business_name} with keywords:`, keywords)

          // Filter posts by keywords and location - now with keyword tracking
          const relevantPosts = []
          
          for (const postWrapper of posts) {
            const post = postWrapper.data
            if (!post.title && !post.selftext) continue
            
            const content = (
              (post.title || '') + ' ' + 
              (post.selftext || '')
            )
            
            // Use new keyword matching function to get details
            const keywordMatch = findFirstKeywordMatch(
              content,
              keywords,
              location,
              businessName,
              industry
            )
            
            if (keywordMatch) {
              relevantPosts.push({
                post: postWrapper,
                keywordMatch
              })
            }
          }

          console.log(`Found ${relevantPosts.length} relevant posts for ${profile.business_name}`)

          // Save relevant posts to database with keyword context
          let savedCount = 0
          for (const { post: postWrapper, keywordMatch } of relevantPosts) {
            try {
              const post = postWrapper.data
              const postUrl = `https://reddit.com${post.permalink}`
              const postContent = post.selftext || ''
              
              // Check if this post already exists for this user
              const { data: existingMention } = await supabase
                .from('mentions')
                .select('id')
                .eq('user_id', sub.user_id)
                .eq('post_url', postUrl)
                .single()

              if (!existingMention) {
                // Insert new mention with keyword context
                const { error: insertError } = await supabase
                  .from('mentions')
                  .insert({
                    user_id: sub.user_id,
                    subreddit: subredditName,
                    post_title: post.title || 'No title',
                    post_url: postUrl,
                    content: postContent.slice(0, 500), // Limit content length
                    author: post.author || 'Unknown',
                    created_at: new Date(post.created_utc * 1000).toISOString(),
                    notified: false,
                    // New keyword context fields
                    flagged_keyword: keywordMatch.keyword,
                    keyword_context: keywordMatch.context,
                    match_type: keywordMatch.matchType
                  })

                if (!insertError) {
                  savedCount++
                  console.log(`Saved: "${post.title}" (flagged for: ${keywordMatch.keyword})`)
                } else {
                  console.error('Error inserting mention:', insertError)
                }
              } else {
                console.log(`Duplicate post skipped: "${post.title}"`)
              }
            } catch (insertErr) {
              console.error('Error saving post:', insertErr)
            }
          }

          results.push({
            user: profile.business_name,
            subreddit: subredditName,
            found: relevantPosts.length,
            saved: savedCount
          })
        }

        // Add a small delay between requests to be respectful to Reddit's API
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error processing r/${subredditName}:`, error)
        results.push({
          subreddit: subredditName,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('=== Monitor Complete ===')
    console.log('Results:', results)
    
    return Response.json({ 
      success: true, 
      results,
      message: `Processed ${Object.keys(subredditGroups).length} subreddits`
    })

  } catch (error) {
    console.error('Error in monitor API:', error)
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
