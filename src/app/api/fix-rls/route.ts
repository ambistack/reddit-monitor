import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Create a service role client (bypasses RLS)
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

    // First, let's try a simple approach - check if we can actually delete with service role
    console.log('Testing service role DELETE permissions...')
    
    // Get current user from the request to test permissions
    const { error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('Auth error (expected with service role):', authError.message)
    }

    // Try to get all policies for the table
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'monitored_subreddits')

    console.log('Current policies:', policies)
    console.log('Policy query error:', policyError)

    // Check if DELETE policy exists
    const deletePolicy = policies?.find(p => 
      p.cmd === 'DELETE' && 
      p.policyname.includes('delete')
    )

    if (deletePolicy) {
      return NextResponse.json({
        success: true,
        message: 'DELETE policy already exists',
        policyExists: true,
        existingPolicy: deletePolicy
      })
    }

    // If no DELETE policy exists, let's try to create one using a different approach
    // We'll try to use the service role to directly execute the SQL
    try {
      // Method 1: Try using the REST API to execute SQL
      const createPolicySQL = `
        CREATE POLICY "Users can delete their own monitored subreddits" 
        ON public.monitored_subreddits 
        FOR DELETE 
        TO authenticated 
        USING (auth.uid() = user_id);
      `

      // Since most Supabase instances don't allow exec_sql, let's try a different approach
      // We'll return instructions for manual setup instead
      return NextResponse.json({
        success: false,
        error: 'Automatic policy creation not available',
        message: 'Please create the policy manually',
        instructions: {
          step1: 'Go to your Supabase Dashboard',
          step2: 'Navigate to Authentication → Policies',
          step3: 'Find the monitored_subreddits table',
          step4: 'Click "New Policy"',
          step5: 'Use this SQL: ' + createPolicySQL.trim(),
          alternativeUrl: 'https://supabase.com/dashboard/project/syrmhzqbftrkosvknaxb/auth/policies'
        },
        sqlToExecute: createPolicySQL.trim()
      })

    } catch (sqlError) {
      console.error('SQL execution failed:', sqlError)
      
      return NextResponse.json({
        success: false,
        error: 'Could not execute SQL automatically',
        message: 'Manual policy creation required',
        sqlToExecute: `
          CREATE POLICY "Users can delete their own monitored subreddits" 
          ON public.monitored_subreddits 
          FOR DELETE 
          TO authenticated 
          USING (auth.uid() = user_id);
        `.trim()
      })
    }

  } catch (error) {
    console.error('Unexpected error in fix-rls:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Please create the DELETE policy manually in Supabase Dashboard'
    }, { status: 500 })
  }
}
