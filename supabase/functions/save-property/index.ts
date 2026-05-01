import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation constants
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_SHORT_DESCRIPTION_LENGTH = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_ARRAY_ITEM_LENGTH = 200;
const MAX_IMAGES = 50;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_URL_LENGTH = 2000;
// Allow any valid URL for images (expanded from Dropbox-only)
const ALLOWED_IMAGE_DOMAINS: string[] = []; // Empty means allow all domains

interface PropertyData {
  name: string;
  description: string;
  shortDescription: string;
  priceFrom: number | null;
  priceFormatted: string | null;
  developer: string | null;
  type: string;
  bedrooms: string | null;
  areaSqm: string | null;
  completionDate: string | null;
  status: string;
  features: string[];
  amenities: string[];
  location: string | null;
}

interface SaveRequest {
  propertyData: PropertyData;
  heroVideoUrl?: string;
  youtubeUrl?: string;
  brochureUrl?: string;
  imageUrls: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validate URL format (allow any domain for flexibility)
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || url.length > MAX_URL_LENGTH) {
    return false;
  }
  try {
    const parsedUrl = new URL(url);
    // Allow any http/https URL
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

// Validate optional URL
function isValidOptionalUrl(url: string | undefined): boolean {
  if (!url) return true;
  if (typeof url !== 'string' || url.length > MAX_URL_LENGTH) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Sanitize string input
function sanitizeString(input: string | null | undefined, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

// Validate and sanitize string array
function validateAndSanitizeArray(arr: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map(item => item.trim().slice(0, maxItemLength));
}

// Validate numeric value
function validateNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num) || num < 0 || num > 1000000000) return null;
  return num;
}

// Comprehensive input validation
function validateRequest(body: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const request = body as SaveRequest;

  // Validate propertyData exists
  if (!request.propertyData || typeof request.propertyData !== 'object') {
    return { isValid: false, errors: ['propertyData is required'] };
  }

  const { propertyData } = request;

  // Validate required name field
  if (!propertyData.name || typeof propertyData.name !== 'string' || propertyData.name.trim().length === 0) {
    errors.push('Property name is required');
  } else if (propertyData.name.length > MAX_NAME_LENGTH) {
    errors.push(`Property name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  // Validate description lengths
  if (propertyData.description && typeof propertyData.description === 'string' && propertyData.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }

  if (propertyData.shortDescription && typeof propertyData.shortDescription === 'string' && propertyData.shortDescription.length > MAX_SHORT_DESCRIPTION_LENGTH) {
    errors.push(`Short description must be ${MAX_SHORT_DESCRIPTION_LENGTH} characters or less`);
  }

  // Validate arrays
  if (propertyData.features && !Array.isArray(propertyData.features)) {
    errors.push('Features must be an array');
  } else if (Array.isArray(propertyData.features) && propertyData.features.length > MAX_ARRAY_ITEMS) {
    errors.push(`Features array must have ${MAX_ARRAY_ITEMS} items or less`);
  }

  if (propertyData.amenities && !Array.isArray(propertyData.amenities)) {
    errors.push('Amenities must be an array');
  } else if (Array.isArray(propertyData.amenities) && propertyData.amenities.length > MAX_ARRAY_ITEMS) {
    errors.push(`Amenities array must have ${MAX_ARRAY_ITEMS} items or less`);
  }

  // Validate image URLs
  if (!request.imageUrls) {
    // imageUrls is optional, skip validation
  } else if (!Array.isArray(request.imageUrls)) {
    errors.push('imageUrls must be an array');
  } else {
    if (request.imageUrls.length > MAX_IMAGES) {
      errors.push(`Maximum ${MAX_IMAGES} images allowed`);
    }
    
    const invalidUrls = request.imageUrls.filter((url, index) => {
      if (!isValidImageUrl(url)) {
        return true;
      }
      return false;
    });
    
    if (invalidUrls.length > 0) {
      errors.push('Some image URLs are invalid. URLs must be valid http/https URLs.');
    }
  }

  // Validate optional URLs
  if (!isValidOptionalUrl(request.heroVideoUrl)) {
    errors.push('Invalid hero video URL');
  }
  if (!isValidOptionalUrl(request.youtubeUrl)) {
    errors.push('Invalid YouTube URL');
  }
  if (!isValidOptionalUrl(request.brochureUrl)) {
    errors.push('Invalid brochure URL');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function downloadAndUploadImage(
  imageUrl: string,
  supabase: any,
  propertySlug: string,
  index: number
): Promise<string | null> {
  try {
    console.log('Downloading image:', imageUrl);
    
    // URL already validated, convert Dropbox share link to direct download link if needed
    let directUrl = imageUrl;
    if (imageUrl.includes('dropbox.com')) {
      directUrl = imageUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '').replace('?dl=1', '');
    }
    // Handle webp and other image formats from any domain

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Failed to download image:', response.status);
      return null;
    }

    // Check content-length header for size limit
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE_BYTES) {
      console.error('Image too large:', contentLength, 'bytes');
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Validate content type is an image
    if (!contentType.startsWith('image/')) {
      console.error('Invalid content type:', contentType);
      return null;
    }

    const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `${propertySlug}/image-${index}.${extension}`;

    const arrayBuffer = await response.arrayBuffer();
    
    // Double-check actual size after download
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      console.error('Image too large after download:', arrayBuffer.byteLength, 'bytes');
      return null;
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('property-images')
      .upload(fileName, uint8Array, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload image:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);

    console.log('Uploaded image:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Image download timed out');
    } else {
      console.error('Error processing image:', error);
    }
    return null;
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Save request received');

    // Validate all inputs
    const validation = validateRequest(body);
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const request = body as SaveRequest;
    const { propertyData, heroVideoUrl, youtubeUrl, brochureUrl, imageUrls } = request;

    // Sanitize all inputs
    const sanitizedName = sanitizeString(propertyData.name, MAX_NAME_LENGTH);
    const sanitizedDescription = sanitizeString(propertyData.description, MAX_DESCRIPTION_LENGTH);
    const sanitizedShortDescription = sanitizeString(propertyData.shortDescription, MAX_SHORT_DESCRIPTION_LENGTH);
    const sanitizedFeatures = validateAndSanitizeArray(propertyData.features, MAX_ARRAY_ITEMS, MAX_ARRAY_ITEM_LENGTH);
    const sanitizedAmenities = validateAndSanitizeArray(propertyData.amenities, MAX_ARRAY_ITEMS, MAX_ARRAY_ITEM_LENGTH);
    const sanitizedDeveloper = sanitizeString(propertyData.developer, MAX_NAME_LENGTH);
    const sanitizedLocation = sanitizeString(propertyData.location, MAX_NAME_LENGTH);
    const sanitizedType = sanitizeString(propertyData.type, 50) || 'Apartment';
    const sanitizedStatus = sanitizeString(propertyData.status, 50) || 'Off-plan';
    const sanitizedBedrooms = sanitizeString(propertyData.bedrooms, 20);
    const sanitizedAreaSqm = sanitizeString(propertyData.areaSqm, 50);
    const sanitizedCompletionDate = sanitizeString(propertyData.completionDate, 50);
    const sanitizedPriceFrom = validateNumeric(propertyData.priceFrom);
    const sanitizedPriceFormatted = sanitizeString(propertyData.priceFormatted, 100);

    const slug = generateSlug(sanitizedName);
    console.log('Generated slug:', slug);

    // Step 1: Find or create developer
    let developerId = null;
    if (sanitizedDeveloper) {
      const { data: existingDeveloper } = await supabase
        .from('developers')
        .select('id')
        .ilike('name', sanitizedDeveloper)
        .maybeSingle();

      if (existingDeveloper) {
        developerId = existingDeveloper.id;
      } else {
        const { data: newDeveloper, error: devError } = await supabase
          .from('developers')
          .insert({ name: sanitizedDeveloper })
          .select('id')
          .single();

        if (!devError && newDeveloper) {
          developerId = newDeveloper.id;
        }
      }
    }

    // Step 2: Find area by location
    let areaId = null;
    if (sanitizedLocation) {
      const { data: existingArea } = await supabase
        .from('areas')
        .select('id')
        .ilike('name', `%${sanitizedLocation}%`)
        .maybeSingle();

      if (existingArea) {
        areaId = existingArea.id;
      }
    }

    // Step 3: Download and upload images (with validated URLs only)
    console.log('Step 3: Processing images...');
    const uploadedImageUrls: string[] = [];
    const validImageUrls = (imageUrls || []).filter(url => isValidImageUrl(url)).slice(0, MAX_IMAGES);
    
    for (let i = 0; i < validImageUrls.length; i++) {
      const uploadedUrl = await downloadAndUploadImage(validImageUrls[i], supabase, slug, i);
      if (uploadedUrl) {
        uploadedImageUrls.push(uploadedUrl);
      }
    }

    // Step 4: Create property record
    console.log('Step 4: Creating property record...');
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        name: sanitizedName,
        slug,
        description: sanitizedDescription,
        short_description: sanitizedShortDescription,
        price_from: sanitizedPriceFrom,
        price_formatted: sanitizedPriceFormatted,
        type: sanitizedType,
        bedrooms: sanitizedBedrooms,
        area_sqm: sanitizedAreaSqm,
        completion_date: sanitizedCompletionDate,
        status: sanitizedStatus,
        features: sanitizedFeatures,
        amenities: sanitizedAmenities,
        developer_id: developerId,
        area_id: areaId,
        hero_video_url: heroVideoUrl || null,
        hero_image_url: uploadedImageUrls[0] || null,
        youtube_url: youtubeUrl || null,
        brochure_url: brochureUrl || null,
        is_published: false,
        is_featured: false,
      })
      .select()
      .single();

    if (propertyError) {
      console.error('Error creating property:', propertyError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create property' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Create property images records
    if (uploadedImageUrls.length > 0) {
      const imageRecords = uploadedImageUrls.map((url, index) => ({
        property_id: property.id,
        image_url: url,
        sort_order: index,
        alt_text: `${sanitizedName} - Image ${index + 1}`,
      }));

      await supabase.from('property_images').insert(imageRecords);
    }

    // Step 6: Generate OG image in background (fire and forget)
    console.log('Step 6: Triggering OG image generation...');
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (supabaseUrl && supabaseAnonKey) {
        // Fire and forget - don't await
        fetch(`${supabaseUrl}/functions/v1/generate-og-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ propertySlug: slug }),
        }).catch(err => console.error('OG image generation error:', err));
      }
    } catch (ogError) {
      console.error('Failed to trigger OG image generation:', ogError);
    }

    console.log('Save completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        property: {
          id: property.id,
          name: property.name,
          slug: property.slug,
        },
        imagesUploaded: uploadedImageUrls.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Save error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
