
export async function GET() {
  try {
    // Test Reddit API connection from server-side (avoids CORS)
    const response = await fetch('https://www.reddit.com/r/test.json?limit=1', {
      headers: {
        'User-Agent': 'RedditMonitor/1.0 (Connection Test)'
      }
    })

    if (!response.ok) {
      return Response.json({ 
        connected: false, 
        error: `Reddit API returned ${response.status}`,
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    const data = await response.json()
    
    // Check if we got valid Reddit data structure
    const isValidResponse = data && data.data && Array.isArray(data.data.children)
    
    return Response.json({ 
      connected: isValidResponse,
      posts: data.data?.children?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Reddit connection test failed:', error)
    return Response.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
}
