import { NextRequest, NextResponse } from 'next/server'

interface SubredditData {
  name: string
  over_18?: boolean
  subreddit_type?: string
  subscriber_count?: number
  public_description?: string
}

export async function POST(request: NextRequest) {
  try {
    const { subredditName } = await request.json()

    if (!subredditName) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    // Clean the subreddit name (remove r/ prefix if present)
    const cleanName = subredditName.replace(/^r\//, '').trim()
    
    if (!cleanName) {
      return NextResponse.json(
        { error: 'Invalid subreddit name' },
        { status: 400 }
      )
    }

    console.log(`API: Validating subreddit: ${cleanName}`)

    // Basic format validation
    if (cleanName.length < 3 || cleanName.length > 21) {
      return NextResponse.json(
        { 
          exists: false, 
          subreddit: cleanName,
          error: 'Subreddit names must be 3-21 characters long' 
        },
        { status: 200 }
      )
    }

    // Check for invalid characters
    if (!/^[A-Za-z0-9_]+$/.test(cleanName)) {
      return NextResponse.json(
        { 
          exists: false, 
          subreddit: cleanName,
          error: 'Subreddit names can only contain letters, numbers, and underscores' 
        },
        { status: 200 }
      )
    }

    // Try the simple about.json endpoint first - most reliable
    try {
      console.log(`API: Trying about.json for ${cleanName}`)
      const aboutUrl = `https://www.reddit.com/r/${cleanName}/about.json`
      
      const response = await fetch(aboutUrl, {
        headers: {
          'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
        }
      })

      console.log(`API: about.json response status for ${cleanName}: ${response.status}`)

      if (response.status === 200) {
        const data = await response.json()
        if (data?.data?.display_name) {
          console.log(`API: ${cleanName} FOUND via about.json`)
          
          // Check for restrictions
          const isNSFW = data.data.over18 === true
          const isPrivate = data.data.subreddit_type === 'private' || data.data.subreddit_type === 'restricted'
          const isQuarantined = data.data.quarantine === true
          
          if (isNSFW) {
            return NextResponse.json({
              exists: false,
              subreddit: data.data.display_name,
              method: 'about',
              error: 'This subreddit contains NSFW (adult) content and cannot be monitored for business purposes',
              nsfw: true
            })
          }
          
          if (isPrivate) {
            return NextResponse.json({
              exists: false,
              subreddit: data.data.display_name,
              method: 'about',
              error: 'This subreddit is private or restricted and cannot be accessed',
              private: true
            })
          }
          
          if (isQuarantined) {
            return NextResponse.json({
              exists: false,
              subreddit: data.data.display_name,
              method: 'about',
              error: 'This subreddit is quarantined and cannot be monitored for business purposes',
              quarantined: true
            })
          }
          
          // Subreddit is valid and accessible
          return NextResponse.json({
            exists: true,
            subreddit: data.data.display_name,
            method: 'about',
            displayName: data.data.display_name,
            title: data.data.title,
            subscribers: data.data.subscribers,
            description: data.data.public_description
          })
        }
      } else if (response.status === 403) {
        // 403 typically means private/restricted
        return NextResponse.json({
          exists: false,
          subreddit: cleanName,
          method: 'about_private',
          error: 'This subreddit is private or restricted and cannot be accessed',
          private: true
        })
      } else if (response.status === 404) {
        // 404 means subreddit doesn't exist
        return NextResponse.json({
          exists: false,
          subreddit: cleanName,
          method: 'about_not_found',
          error: 'Subreddit not found'
        })
      }
    } catch (error) {
      console.log(`API: about.json method failed for ${cleanName}:`, error)
    }

    // If about.json failed, try a simple posts check as fallback
    try {
      console.log(`API: Trying posts fallback for ${cleanName}`)
      const postsUrl = `https://www.reddit.com/r/${cleanName}/hot.json?limit=1`
      
      const response = await fetch(postsUrl, {
        headers: {
          'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
        }
      })

      if (response.status === 200) {
        const data = await response.json()
        if (data?.data?.children) {
          console.log(`API: ${cleanName} FOUND via posts fallback`)
          return NextResponse.json({
            exists: true,
            subreddit: cleanName,
            method: 'posts_fallback',
            displayName: cleanName,
            warning: 'Subreddit validation using fallback method'
          })
        }
      }
    } catch (error) {
      console.log(`API: posts fallback failed for ${cleanName}:`, error)
    }
    
    // All methods failed - subreddit likely doesn't exist
    return NextResponse.json({
      exists: false,
      subreddit: cleanName,
      method: 'all_failed',
      error: 'Subreddit not found or inaccessible'
    })

  } catch (error) {
    console.error('Error in validate-subreddit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
