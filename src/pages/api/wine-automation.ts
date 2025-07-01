import type { APIRoute } from 'astro';
import WineContentAutomation from '../../scripts/daily-wine-automation.js';

export const POST: APIRoute = async ({ request }) => {
  // Verify this is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🍷 Starting scheduled wine automation...');
    
    const automation = new WineContentAutomation();
    await automation.runDailyWorkflow();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Wine automation completed successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Wine automation failed:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Also support GET for manual testing (remove in production)
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ 
    message: 'Wine automation endpoint is ready. Use POST with proper auth.',
    schedule: 'Daily at 9:00 AM UTC'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};