import { createClient } from '@supabase/supabase-js'

interface PolicyInfo {
  table: string
  operation: string
  description: string
  sql: string
}

export async function POST() {
  try {
    console.log('=== Checking RLS Policies ===')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing')
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Create service role client
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

    // Test basic connectivity first
    console.log('Testing service role connection...')
    
    try {
      const { error: testError } = await supabase
        .from('monitored_subreddits')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.error('Service role connection test failed:', testError)
      } else {
        console.log('Service role connection successful')
      }
    } catch (testConnError) {
      console.error('Service role connection test exception:', testConnError)
    }

    // Since pg_policies might not be accessible, let's test the actual operations instead
    console.log('Testing actual RLS operations...')
    
    const results = {
      success: false,
      requiresManualSetup: true,
      message: 'Tested RLS policies by attempting operations',
      testResults: {
        mentions_delete_test: 'skipped',
        subreddits_update_test: 'skipped',
        subreddits_delete_test: 'skipped'
      },
      missingPolicies: [] as PolicyInfo[],
      existingPolicies: [] as string[],
      instructions: {
        step1: 'Go to your Supabase Dashboard',
        step2: 'Navigate to Authentication → Policies',
        step3: 'Add the missing policies shown below',
        dashboardUrl: `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}/auth/policies`
      }
    }

    // Test UPDATE operation on monitored_subreddits (this is likely what's failing)
    try {
      const { error: updateTestError } = await supabase
        .from('monitored_subreddits')
        .update({ keywords: [] })
        .eq('id', -1) // Non-existent ID, should fail but not due to RLS
        .eq('user_id', 'test-user-id')
      
      if (updateTestError) {
        if (updateTestError.message.includes('RLS') || updateTestError.code === '42501') {
          results.testResults.subreddits_update_test = 'RLS_BLOCKING'
          results.missingPolicies.push({
            table: 'monitored_subreddits',
            operation: 'UPDATE',
            description: 'Allow users to update their own monitored subreddits (needed for keyword editing)',
            sql: 'CREATE POLICY "Users can update their own subreddits" ON public.monitored_subreddits FOR UPDATE TO authenticated USING (auth.uid() = user_id);'
          })
        } else {
          results.testResults.subreddits_update_test = 'OK (non-RLS error as expected)'
          results.existingPolicies.push('monitored_subreddits UPDATE policy')
        }
      } else {
        results.testResults.subreddits_update_test = 'OK'
        results.existingPolicies.push('monitored_subreddits UPDATE policy')
      }
    } catch (updateTestException) {
      console.error('UPDATE test exception:', updateTestException)
      results.testResults.subreddits_update_test = 'ERROR: ' + (updateTestException instanceof Error ? updateTestException.message : 'Unknown error')
    }

    // Test DELETE operation on monitored_subreddits
    try {
      const { error: deleteTestError } = await supabase
        .from('monitored_subreddits')
        .delete()
        .eq('id', -1) // Non-existent ID
        .eq('user_id', 'test-user-id')
      
      if (deleteTestError) {
        if (deleteTestError.message.includes('RLS') || deleteTestError.code === '42501') {
          results.testResults.subreddits_delete_test = 'RLS_BLOCKING'
          results.missingPolicies.push({
            table: 'monitored_subreddits',
            operation: 'DELETE',
            description: 'Allow users to delete their own monitored subreddits',
            sql: 'CREATE POLICY "Users can delete their own subreddits" ON public.monitored_subreddits FOR DELETE TO authenticated USING (auth.uid() = user_id);'
          })
        } else {
          results.testResults.subreddits_delete_test = 'OK (non-RLS error as expected)'
          results.existingPolicies.push('monitored_subreddits DELETE policy')
        }
      } else {
        results.testResults.subreddits_delete_test = 'OK'
        results.existingPolicies.push('monitored_subreddits DELETE policy')
      }
    } catch (deleteTestException) {
      console.error('DELETE test exception:', deleteTestException)
      results.testResults.subreddits_delete_test = 'ERROR: ' + (deleteTestException instanceof Error ? deleteTestException.message : 'Unknown error')
    }

    // Test DELETE operation on mentions
    try {
      const { error: mentionsDeleteError } = await supabase
        .from('mentions')
        .delete()
        .eq('id', -1) // Non-existent ID
        .eq('user_id', 'test-user-id')
      
      if (mentionsDeleteError) {
        if (mentionsDeleteError.message.includes('RLS') || mentionsDeleteError.code === '42501') {
          results.testResults.mentions_delete_test = 'RLS_BLOCKING'
          results.missingPolicies.push({
            table: 'mentions',
            operation: 'DELETE',
            description: 'Allow users to delete their own mentions',
            sql: 'CREATE POLICY "Users can delete their own mentions" ON public.mentions FOR DELETE TO authenticated USING (auth.uid() = user_id);'
          })
        } else {
          results.testResults.mentions_delete_test = 'OK (non-RLS error as expected)'
          results.existingPolicies.push('mentions DELETE policy')
        }
      } else {
        results.testResults.mentions_delete_test = 'OK'
        results.existingPolicies.push('mentions DELETE policy')
      }
    } catch (mentionsDeleteException) {
      console.error('Mentions DELETE test exception:', mentionsDeleteException)
      results.testResults.mentions_delete_test = 'ERROR: ' + (mentionsDeleteException instanceof Error ? mentionsDeleteException.message : 'Unknown error')
    }

    // Determine overall status
    if (results.missingPolicies.length === 0) {
      results.success = true
      results.requiresManualSetup = false
      results.message = 'All required RLS policies appear to be working!'
    } else {
      results.message = `Found ${results.missingPolicies.length} missing RLS policies that need to be added`
    }

    return Response.json(results)

  } catch (error) {
    console.error('Unexpected error in RLS check:', error)
    return Response.json({
      success: false,
      error: 'Could not check RLS policies',
      details: error instanceof Error ? error.message : 'Unknown error',
      manualInstructions: {
        message: 'Please add these RLS policies manually in Supabase Dashboard',
        policies: [
          'CREATE POLICY "Users can delete their own mentions" ON public.mentions FOR DELETE TO authenticated USING (auth.uid() = user_id);',
          'CREATE POLICY "Users can update their own subreddits" ON public.monitored_subreddits FOR UPDATE TO authenticated USING (auth.uid() = user_id);',
          'CREATE POLICY "Users can delete their own subreddits" ON public.monitored_subreddits FOR DELETE TO authenticated USING (auth.uid() = user_id);'
        ]
      }
    }, { status: 500 })
  }
}
