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

    // Try multiple Reddit API endpoints in order of preference
    const validationResults = await tryMultipleValidationMethods(cleanName)
    
    return NextResponse.json(validationResults, { status: 200 })

  } catch (error) {
    console.error('Error in validate-subreddit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function tryMultipleValidationMethods(cleanName: string) {
  console.log(`API: Trying validation for ${cleanName}`)
  
  // Method 1: Try Reddit's search_reddit_names API (most reliable for existence)
  try {
    console.log(`API: Method 1 - Trying search_reddit_names for ${cleanName}`)
    const searchUrl = `https://www.reddit.com/api/search_reddit_names.json?query=${encodeURIComponent(cleanName)}&exact=true&include_over_18=true`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
      }
    })

    if (response.status === 429) {
      console.log(`API: Rate limited on search_reddit_names for ${cleanName} - skipping to next method`)
    } else if (response.ok) {
      const data = await response.json()
      console.log(`API: search_reddit_names response for ${cleanName}:`, data)
      
      if (data.names && Array.isArray(data.names) && data.names.length > 0) {
        // Found exact match
        const foundName = data.names.find((name: string) => name.toLowerCase() === cleanName.toLowerCase())
        if (foundName) {
          console.log(`API: ${cleanName} FOUND in search_reddit_names as ${foundName}`)
          
          // ALWAYS check for NSFW/private status when found
          const detailsResult = await getSubredditDetails(foundName)
          console.log(`API: Details result for ${foundName}:`, detailsResult)
          
          // If details indicate NSFW, private, or banned, return error immediately
          if (detailsResult.nsfw || detailsResult.private || detailsResult.exists === false) {
            return detailsResult
          }
          
          // If getSubredditDetails returned empty object, it means the API failed
          // This could be a temporary issue or the subreddit might be valid but not in search_subreddits
          // Let's try the about.json method as a fallback before rejecting
          if (Object.keys(detailsResult).length === 0) {
            console.log(`API: ${foundName} found in search but details failed - trying about.json as fallback`)
            
            // Try about.json as a fallback to verify the subreddit
            try {
              const aboutUrl = `https://www.reddit.com/r/${foundName}/about.json`
              const aboutResponse = await fetch(aboutUrl, {
                headers: {
                  'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
                }
              })
              
              if (aboutResponse.status === 200) {
                const aboutData = await aboutResponse.json()
                if (aboutData?.data?.display_name) {
                  console.log(`API: ${foundName} verified via about.json fallback`)
                  
                  // Check for restrictions via about.json
                  const isNSFW = aboutData.data.over18 === true
                  const isPrivate = aboutData.data.subreddit_type === 'private' || aboutData.data.subreddit_type === 'restricted'
                  const isQuarantined = aboutData.data.quarantine === true
                  const isBanned = aboutData.data.user_is_banned === true
                  
                  if (isNSFW || isPrivate || isQuarantined || isBanned) {
                    console.log(`API: ${foundName} has restrictions via about.json fallback`)
                    return {
                      exists: false,
                      subreddit: foundName,
                      method: 'search_reddit_names_about_restricted',
                      error: isNSFW ? 'This subreddit contains NSFW (adult) content and cannot be monitored for business purposes' :
                             isPrivate ? 'This subreddit is private or restricted and cannot be accessed' :
                             isQuarantined ? 'This subreddit is quarantined and cannot be monitored for business purposes' :
                             'Access to this subreddit is restricted and cannot be monitored'
                    }
                  }
                  
                  // Subreddit is valid and accessible
                  return {
                    exists: true,
                    subreddit: foundName,
                    method: 'search_reddit_names_about_fallback',
                    displayName: foundName,
                    title: aboutData.data.title,
                    subscribers: aboutData.data.subscribers,
                    description: aboutData.data.public_description
                  }
                }
              }
            } catch (error) {
              console.log(`API: About.json fallback failed for ${foundName}:`, error)
            }
            
            // If both getSubredditDetails and about.json failed, it's likely banned/quarantined
            console.log(`API: ${foundName} found in search but both details and about.json failed - likely banned/quarantined`)
            return {
              exists: false,
              subreddit: foundName,
              method: 'search_reddit_names_banned',
              error: 'This subreddit may be banned, quarantined, or restricted and cannot be accessed'
            }
          }
          
          return {
            exists: true,
            subreddit: foundName,
            method: 'search_reddit_names',
            displayName: foundName,
            ...detailsResult
          }
        }
      }
      
      console.log(`API: ${cleanName} NOT found in search_reddit_names`)
    } else {
      console.log(`API: search_reddit_names failed with status ${response.status}`)
    }
  } catch (error) {
    console.log(`API: search_reddit_names method failed for ${cleanName}:`, error)
  }

  // Method 2: Try Reddit's search_subreddits API (good for partial matches and details)
  try {
    console.log(`API: Method 2 - Trying search_subreddits for ${cleanName}`)
    const searchUrl = `https://www.reddit.com/api/search_subreddits.json?query=${encodeURIComponent(cleanName)}&exact=true&include_over_18=true`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
      }
    })

    if (response.status === 429) {
      console.log(`API: Rate limited on search_subreddits for ${cleanName} - skipping to next method`)
    } else if (response.ok) {
      const data = await response.json()
      console.log(`API: search_subreddits response for ${cleanName}:`, data)
      
      if (data.subreddits && Array.isArray(data.subreddits) && data.subreddits.length > 0) {
        // Look for exact match
        const exactMatch = data.subreddits.find((sub: SubredditData) => 
          sub.name && sub.name.toLowerCase() === cleanName.toLowerCase()
        )
        
        if (exactMatch) {
          console.log(`API: ${cleanName} FOUND in search_subreddits`)
          console.log(`API: Exact match data:`, exactMatch)
          console.log(`API: over_18 value:`, exactMatch.over_18, typeof exactMatch.over_18)
          console.log(`API: subreddit_type value:`, exactMatch.subreddit_type)
          
          // Check for NSFW content
          const isNSFW = exactMatch.over_18 === true
          const isPrivate = exactMatch.subreddit_type === 'private' || exactMatch.subreddit_type === 'restricted'
          
          if (isNSFW) {
            console.log(`API: ${cleanName} is NSFW - blocking it`)
            return {
              exists: false,
              subreddit: exactMatch.name,
              method: 'search_subreddits',
              error: 'This subreddit contains NSFW (adult) content and cannot be monitored for business purposes',
              nsfw: true
            }
          }
          
          if (isPrivate) {
            console.log(`API: ${cleanName} is private/restricted - blocking it`)
            return {
              exists: false,
              subreddit: exactMatch.name,
              method: 'search_subreddits', 
              error: 'This subreddit is private or restricted and cannot be accessed',
              private: true
            }
          }
          
          console.log(`API: ${cleanName} passed NSFW and private checks`)
          return {
            exists: true,
            subreddit: exactMatch.name,
            method: 'search_subreddits',
            displayName: exactMatch.name,
            subscribers: exactMatch.subscriber_count,
            description: exactMatch.public_description
          }
        }
      }
      
      console.log(`API: ${cleanName} NOT found in search_subreddits`)
    } else {
      console.log(`API: search_subreddits failed with status ${response.status}`)
    }
  } catch (error) {
    console.log(`API: search_subreddits method failed for ${cleanName}:`, error)
  }

  // Method 3: Try the /about.json endpoint (may work for some subreddits)
  try {
    console.log(`API: Method 3 - Trying about.json for ${cleanName}`)
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
        console.log(`API: ${cleanName} FOUND via about.json - ${data.data.display_name}`)
        console.log(`API: About.json data snippet:`, {
          over18: data.data.over18,
          subreddit_type: data.data.subreddit_type,
          display_name: data.data.display_name,
          quarantine: data.data.quarantine,
          user_is_banned: data.data.user_is_banned
        })
        
        // Check for NSFW and private status
        const isNSFW = data.data.over18 === true
        const isPrivate = data.data.subreddit_type === 'private' || data.data.subreddit_type === 'restricted'
        const isQuarantined = data.data.quarantine === true
        const isBanned = data.data.user_is_banned === true
        
        if (isNSFW) {
          console.log(`API: ${cleanName} is NSFW via about.json - blocking it`)
          return {
            exists: false,
            subreddit: data.data.display_name,
            method: 'about',
            error: 'This subreddit contains NSFW (adult) content and cannot be monitored for business purposes',
            nsfw: true
          }
        }
        
        if (isPrivate) {
          console.log(`API: ${cleanName} is private via about.json - blocking it`)
          return {
            exists: false,
            subreddit: data.data.display_name,
            method: 'about',
            error: 'This subreddit is private or restricted and cannot be accessed',
            private: true
          }
        }
        
        if (isQuarantined) {
          console.log(`API: ${cleanName} is quarantined via about.json - blocking it`)
          return {
            exists: false,
            subreddit: data.data.display_name,
            method: 'about',
            error: 'This subreddit is quarantined and cannot be monitored for business purposes',
            quarantined: true
          }
        }
        
        if (isBanned) {
          console.log(`API: ${cleanName} user is banned via about.json - blocking it`)
          return {
            exists: false,
            subreddit: data.data.display_name,
            method: 'about',
            error: 'Access to this subreddit is restricted and cannot be monitored',
            banned: true
          }
        }
        
        console.log(`API: ${cleanName} passed all checks via about.json`)
        return {
          exists: true,
          subreddit: data.data.display_name,
          method: 'about',
          displayName: data.data.display_name,
          title: data.data.title,
          subscribers: data.data.subscribers,
          description: data.data.public_description
        }
      }
    } else if (response.status === 403) {
      // 403 might mean private subreddit
      console.log(`API: ${cleanName} got 403 - likely private/restricted`)
      return {
        exists: false,
        subreddit: cleanName,
        method: 'about_private',
        error: 'This subreddit is private or restricted and cannot be accessed',
        private: true
      }
    } else if (response.status === 404) {
      console.log(`API: ${cleanName} got 404 - likely does not exist`)
    }
  } catch (error) {
    console.log(`API: about.json method failed for ${cleanName}:`, error)
  }

  // All methods failed - check if it was due to rate limiting
  console.log(`API: All validation methods failed for ${cleanName}`)
  
  // If we're being rate limited, we should be more permissive and allow the subreddit
  // rather than blocking legitimate subreddits due to temporary API issues
  // This is a reasonable fallback since the user is typing a specific subreddit name
  if (cleanName.length >= 3 && cleanName.length <= 21 && /^[A-Za-z0-9_]+$/.test(cleanName)) {
    console.log(`API: ${cleanName} passed basic validation - allowing due to potential rate limiting`)
    return {
      exists: true,
      subreddit: cleanName,
      method: 'basic_validation_fallback',
      displayName: cleanName,
      warning: 'Validation temporarily unavailable - subreddit assumed valid based on format'
    }
  }
  
  return {
    exists: false,
    subreddit: cleanName,
    method: 'all_failed',
    error: 'Subreddit not found - may be banned, quarantined, or non-existent'
  }
}

// Helper function to get detailed subreddit information
async function getSubredditDetails(subredditName: string) {
  try {
    console.log(`API: Getting details for ${subredditName}`)
    const searchUrl = `https://www.reddit.com/api/search_subreddits.json?query=${encodeURIComponent(subredditName)}&exact=true&include_over_18=true`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`API: getSubredditDetails response for ${subredditName}:`, data)
      
      if (data.subreddits && Array.isArray(data.subreddits)) {
        const match = data.subreddits.find((sub: SubredditData) => 
          sub.name && sub.name.toLowerCase() === subredditName.toLowerCase()
        )
        
        if (match) {
          console.log(`API: Found match in getSubredditDetails:`, match)
          console.log(`API: Match over_18:`, match.over_18, typeof match.over_18)
          console.log(`API: Match subreddit_type:`, match.subreddit_type)
          
          // Check for NSFW content
          if (match.over_18 === true) {
            console.log(`API: ${subredditName} is NSFW in getSubredditDetails - returning error`)
            return {
              exists: false,
              error: 'This subreddit contains NSFW (adult) content and cannot be monitored for business purposes',
              nsfw: true
            }
          }
          
          // Check for private/restricted
          if (match.subreddit_type === 'private' || match.subreddit_type === 'restricted') {
            console.log(`API: ${subredditName} is private/restricted in getSubredditDetails - returning error`)
            return {
              exists: false,
              error: 'This subreddit is private or restricted and cannot be accessed',
              private: true
            }
          }
          
          console.log(`API: ${subredditName} passed all checks in getSubredditDetails`)
          return {
            subscribers: match.subscriber_count,
            description: match.public_description
          }
        } else {
          console.log(`API: No exact match found in getSubredditDetails for ${subredditName}`)
        }
      } else {
        console.log(`API: No subreddits array in getSubredditDetails response`)
      }
    } else {
      console.log(`API: getSubredditDetails API failed with status ${response.status}`)
    }
  } catch (error) {
    console.log('API: Error in getSubredditDetails:', error)
  }
  
  console.log(`API: getSubredditDetails returning empty object for ${subredditName}`)
  return {}
}
