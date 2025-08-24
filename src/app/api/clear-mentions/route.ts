import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Force Clear Mentions (Service Role) ===')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing')
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get the user ID from the request body
    const { userId } = await request.json()
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    console.log(`Force clearing mentions for user: ${userId}`)

    // Create service role client (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Delete all mentions for this user using service role (bypasses RLS)
    const { data: deletedData, error: deleteError } = await supabase
      .from('mentions')
      .delete()
      .eq('user_id', userId)
      .select()

    if (deleteError) {
      console.error('Error force deleting mentions:', deleteError)
      return Response.json({ 
        error: 'Failed to force clear mentions', 
        details: deleteError.message 
      }, { status: 500 })
    }

    const deletedCount = deletedData?.length || 0
    console.log(`Force deleted ${deletedCount} mentions`)
    
    return Response.json({ 
      success: true, 
      cleared: deletedCount,
      message: `Force cleared ${deletedCount} old mentions using admin privileges`
    })

  } catch (error) {
    console.error('Error in force-clear-mentions API:', error)
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
