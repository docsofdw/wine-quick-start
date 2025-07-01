import type { APIRoute } from 'astro';
import WineContentAutomation from '../../scripts/daily-wine-automation.js';

// Ensure this runs server-side for cron jobs
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check for Vercel cron job or manual trigger with secret
    const authorization = request.headers.get('authorization');
    const cronSecret = import.meta.env.CRON_SECRET || 'wine-automation-secret-2024';
    
    // Verify this is a legitimate request
    // Vercel cron jobs don't send auth headers, so we check for the cron header
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const isVercelCron = vercelCronHeader === '1';
    const isManualWithSecret = authorization === `Bearer ${cronSecret}`;
    
    if (!isVercelCron && !isManualWithSecret) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - Missing cron header or invalid secret',
        received_headers: {
          authorization: authorization ? 'present' : 'missing',
          vercel_cron: vercelCronHeader || 'missing'
        }
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🕘 Cron job triggered: Starting wine automation...');
    console.log('Trigger type:', isVercelCron ? 'Vercel Cron' : 'Manual with secret');
    
    // Run the automation
    const automation = new WineContentAutomation();
    await automation.runDailyWorkflow();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Wine automation completed successfully',
      timestamp: new Date().toISOString(),
      trigger_type: isVercelCron ? 'vercel_cron' : 'manual'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('❌ Wine automation failed:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// Support GET for testing (requires secret)
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const isTest = url.searchParams.get('test') === 'true';
  const secretParam = url.searchParams.get('secret');
  const cronSecret = import.meta.env.CRON_SECRET || 'wine-automation-secret-2024';
  
  if (!isTest) {
    return new Response(JSON.stringify({
      error: 'Add ?test=true&secret=YOUR_SECRET for manual testing',
      info: 'This endpoint is designed for Vercel cron jobs'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (secretParam !== cronSecret) {
    return new Response(JSON.stringify({
      error: 'Invalid secret for manual testing'
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    console.log('🧪 Manual test: Starting wine automation...');
    
    const automation = new WineContentAutomation();
    await automation.runDailyWorkflow();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Wine automation test completed successfully',
      timestamp: new Date().toISOString(),
      trigger_type: 'manual_test'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('❌ Wine automation test failed:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};