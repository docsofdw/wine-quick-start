import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Ensure this runs server-side
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get email from request body
    const body = await request.json();
    const { email } = body;
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email address' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Initialize Supabase client
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Server configuration error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get client IP and user agent for tracking
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Insert into database (or update if email exists)
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email: email.toLowerCase().trim(),
        status: 'active',
        source: 'website',
        ip_address: clientIP,
        user_agent: userAgent,
        subscribed_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) {
      console.error('Database error:', error);
      
      // Check if it's a duplicate email (already subscribed)
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'You\'re already subscribed!',
          alreadySubscribed: true
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to subscribe. Please try again.' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Success!
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully subscribed! Check your email for confirmation.',
      data: { email: email.toLowerCase().trim() }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

