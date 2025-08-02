import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { phone, message, type = 'notification' } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // For now, we'll just log the SMS (in a real implementation, integrate with SMS provider)
    console.log(`SMS to ${phone}: ${message}`)

    // Create a record in messages table to track SMS
    const { data: messageData, error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        content: message,
        sender_id: '00000000-0000-0000-0000-000000000001', // System sender
        receiver_id: null, // SMS doesn't have a specific receiver in our system
        is_sms: true,
        sms_status: 'sent',
        group_id: `sms_${type}_${Date.now()}`
      })

    if (messageError) {
      console.error('Error creating message record:', messageError)
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS queued for delivery',
        sms_id: messageData?.[0]?.id || null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('SMS function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* To configure SMS in production:
1. Set up an SMS provider (Twilio, AWS SNS, etc.)
2. Add the provider's API credentials as Supabase secrets
3. Replace the console.log with actual SMS sending logic
4. Update sms_status based on delivery results
*/