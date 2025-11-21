import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationData {
  country?: string;
  region?: string;
  city?: string;
  query?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ipAddress } = await req.json();
    console.log('Capturing location for user:', user.id, 'IP:', ipAddress);

    // Get location from IP using ip-api.com (free, no API key needed)
    let locationData: LocationData = {};
    
    if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== 'localhost') {
      try {
        const locationResponse = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,query`);
        const locationJson = await locationResponse.json();
        
        if (locationJson.status === 'success') {
          locationData = {
            country: locationJson.country,
            region: locationJson.regionName,
            city: locationJson.city,
            query: locationJson.query,
          };
          console.log('Location data retrieved:', locationData);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    }

    // Update user profile with location data
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        country: locationData.country || null,
        state: locationData.region || null,
        city: locationData.city || null,
        ip_address: ipAddress || null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    console.log('Location captured successfully for user:', user.id);

    return new Response(
      JSON.stringify({ success: true, location: locationData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in capture-user-location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});