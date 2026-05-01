import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OGImageRequest {
  propertySlug?: string;
  propertyName?: string;
  propertyLocation?: string;
  propertyPrice?: string;
  propertyImage?: string;
  propertyType?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Missing LOVABLE_API_KEY configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body: OGImageRequest = await req.json();
    console.log("OG Image request:", body);

    let propertyName = body.propertyName;
    let propertyLocation = body.propertyLocation;
    let propertyPrice = body.propertyPrice;
    let propertyImage = body.propertyImage;
    let propertyType = body.propertyType;

    // If slug provided, fetch property details
    if (body.propertySlug) {
      const { data: property, error } = await supabase
        .from("properties")
        .select(`
          name,
          price_formatted,
          type,
          hero_image_url,
          areas (name, city),
          property_images (image_url, sort_order)
        `)
        .eq("slug", body.propertySlug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching property:", error);
        return new Response(
          JSON.stringify({ error: "Property not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (property) {
        propertyName = property.name;
        const area = property.areas as unknown as { name: string; city: string } | null;
        propertyLocation = area ? `${area.name}, ${area.city}` : "Dubai";
        propertyPrice = property.price_formatted || "";
        propertyType = property.type || "";
        
        // Get hero image or first gallery image
        if (property.hero_image_url) {
          propertyImage = property.hero_image_url;
        } else if (property.property_images && property.property_images.length > 0) {
          const images = property.property_images as { image_url: string; sort_order: number | null }[];
          const sortedImages = images.sort((a, b) => 
            (a.sort_order || 0) - (b.sort_order || 0)
          );
          propertyImage = sortedImages[0].image_url;
        }
      }
    }

    if (!propertyImage) {
      // Fallback to default OG image instead of failing
      console.log("No property image found, returning default OG image");
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: "https://go2dubai.online/og-image-new.png",
          fallback: true,
          propertyName,
          propertyLocation,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating OG image for:", { propertyName, propertyLocation, propertyPrice, propertyImage });

    // Use Lovable AI to edit the image with text overlay
    const prompt = `Create a professional real estate social media sharing image. 
Take this property photo and add a sophisticated dark gradient overlay at the bottom (covering about 40% of the image from bottom).
On this overlay, add the following text in white:
- Main title: "${propertyName}" in large, elegant serif font
- Location: "${propertyLocation}" with a location pin icon, smaller text
- Price: "${propertyPrice}" in gold/amber color if available
- Add "DUBAI REALITY" branding in the top right corner in small, elegant text
The overall style should be luxurious, modern, and professional - suitable for WhatsApp and social media sharing.
Maintain 16:9 aspect ratio optimal for OG images (1200x630 pixels).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: propertyImage
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate OG image", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const generatedImage = aiResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in AI response:", aiResult);
      return new Response(
        JSON.stringify({ error: "No image generated", response: aiResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload to Supabase Storage
    const imageData = generatedImage.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    
    const fileName = `og-${body.propertySlug || Date.now()}.png`;
    const filePath = `og-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return base64 image if upload fails
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl: generatedImage,
          base64: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("property-images")
      .getPublicUrl(filePath);

    console.log("OG image uploaded:", publicUrl.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl.publicUrl,
        propertyName,
        propertyLocation
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-og-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
