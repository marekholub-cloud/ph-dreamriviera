import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price_from: number | null;
  price_formatted: string | null;
  developer_id: string | null;
  area_id: string | null;
  type: string;
  bedrooms: string | null;
  area_sqm: string | null;
  completion_date: string | null;
  status: string;
  features: string[];
  amenities: string[];
  hero_image_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface InsertRequest {
  propertyData: PropertyData;
  imageUrls?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: InsertRequest = await req.json();
    console.log('Admin insert request received');

    const { propertyData, imageUrls = [] } = body;

    if (!propertyData || !propertyData.name || !propertyData.slug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Property name and slug are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the property
    console.log('Inserting property:', propertyData.name);
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        name: propertyData.name,
        slug: propertyData.slug,
        description: propertyData.description,
        short_description: propertyData.short_description,
        price_from: propertyData.price_from,
        price_formatted: propertyData.price_formatted,
        developer_id: propertyData.developer_id,
        area_id: propertyData.area_id,
        type: propertyData.type,
        bedrooms: propertyData.bedrooms,
        area_sqm: propertyData.area_sqm,
        completion_date: propertyData.completion_date,
        status: propertyData.status,
        features: propertyData.features,
        amenities: propertyData.amenities,
        hero_image_url: propertyData.hero_image_url,
        latitude: propertyData.latitude,
        longitude: propertyData.longitude,
        is_published: true,
        is_featured: false,
      })
      .select()
      .single();

    if (propertyError) {
      console.error('Property insert error:', propertyError);
      return new Response(
        JSON.stringify({ success: false, error: propertyError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Property inserted:', property.id);

    // Insert images if provided
    if (imageUrls.length > 0) {
      const imageRecords = imageUrls.map((url, index) => ({
        property_id: property.id,
        image_url: url,
        alt_text: `${propertyData.name} image ${index + 1}`,
        sort_order: index,
      }));

      const { error: imagesError } = await supabase
        .from('property_images')
        .insert(imageRecords);

      if (imagesError) {
        console.error('Images insert error:', imagesError);
        // Don't fail the whole request, just log it
      } else {
        console.log('Images inserted:', imageUrls.length);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        property: {
          id: property.id,
          name: property.name,
          slug: property.slug,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin insert error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
