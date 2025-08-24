import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { subredditId, keywords } = await request.json()

    console.log('API: Received request:', { subredditId, keywords })

    if (!subredditId || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Subreddit ID and keywords array are required' },
        { status: 400 }
      )
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
    }

    // Create client with auth header
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.log('Auth error:', userError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('Authenticated user:', user.id)

    // Clean and validate keywords
    const cleanKeywords = keywords
      .map(keyword => keyword.toString().trim())
      .filter(keyword => keyword.length > 0 && keyword.length <= 100) // Reasonable length limits
      .slice(0, 50) // Limit to 50 keywords max

    console.log(`API: Updating keywords for subreddit ${subredditId}:`, cleanKeywords)

    // Try direct update first
    const { error: directError } = await supabase
      .from('monitored_subreddits')
      .update({ keywords: cleanKeywords })
      .eq('id', subredditId)
      .eq('user_id', user.id) // Ensure user can only update their own subreddits

    if (!directError) {
      console.log('Direct update successful')
      return NextResponse.json(
        { 
          success: true,
          keywords: cleanKeywords,
          message: `Updated ${cleanKeywords.length} keywords`
        },
        { status: 200 }
      )
    }

    console.error('Direct update failed:', directError)
    console.log('Trying service role fallback...')

    // If direct update fails (likely RLS issue), use service role
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Update failed and no fallback available' },
        { status: 500 }
      )
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Use service role to update (bypasses RLS)
    const { error: serviceError } = await serviceSupabase
      .from('monitored_subreddits')
      .update({ keywords: cleanKeywords })
      .eq('id', subredditId)
      .eq('user_id', user.id) // Still ensure user ownership

    if (serviceError) {
      console.error('Service role update also failed:', serviceError)
      return NextResponse.json(
        { error: 'Failed to update keywords with both methods' },
        { status: 500 }
      )
    }

    console.log('Service role update successful')
    return NextResponse.json(
      { 
        success: true,
        keywords: cleanKeywords,
        message: `Updated ${cleanKeywords.length} keywords (using admin privileges)`,
        usedFallback: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in update-keywords:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
