import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  websiteUrl: string;
  photosDirectoryUrl?: string;
}

interface ExtractedData {
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

async function fetchWebsiteContent(url: string): Promise<string> {
  console.log('Fetching website content from:', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  console.log('Fetched HTML length:', html.length);
  return html;
}

async function extractDataWithAI(html: string, websiteUrl: string): Promise<ExtractedData> {
  console.log('Extracting data with AI...');
  
  // Clean HTML - remove scripts, styles, and excessive whitespace
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 50000); // Limit to 50k chars for API

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const prompt = `Analyze this real estate property website HTML and extract the following information in JSON format. The website URL is: ${websiteUrl}

Extract these fields (use null if not found):
- name: The property/project name
- description: Full description of the property (detailed, can be multiple paragraphs)
- shortDescription: A brief 1-2 sentence summary
- priceFrom: Starting price as a number (no currency symbol, just the number)
- priceFormatted: Price as displayed on the website (e.g. "From AED 1,200,000")
- developer: The developer/builder name
- type: Property type (Apartment, Villa, Townhouse, Penthouse, etc.)
- bedrooms: Bedroom configuration (e.g. "1-3 BR", "Studio - 4 BR", "4 BR")
- areaSqm: Area size range (e.g. "45 - 120 sqm", "2,500 sqft")
- completionDate: Expected completion date or quarter (e.g. "Q4 2026", "2025")
- status: Status (Off-plan, Ready, Under Construction)
- features: Array of property features (e.g. ["Smart home technology", "Private pool", "Sea view"])
- amenities: Array of amenities (e.g. ["Swimming pool", "Gym", "Kids play area", "24/7 Security"])
- location: Area/neighborhood name (e.g. "Dubai Marina", "Downtown Dubai")

HTML Content:
${cleanHtml}

Respond ONLY with valid JSON, no explanation:`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a real estate data extraction expert. Extract property information from HTML and return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in AI response');
  }

  console.log('AI response:', content);

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', jsonStr);
    throw new Error('Failed to parse extracted data as JSON');
  }
}

async function fetchDropboxFolderImages(folderUrl: string): Promise<string[]> {
  console.log('Fetching Dropbox folder:', folderUrl);
  
  try {
    const response = await fetch(folderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.log('Could not fetch Dropbox folder directly');
      return [];
    }
    
    const html = await response.text();
    
    // Extract image URLs from the HTML
    const imageUrls: string[] = [];
    const regex = /https:\/\/[^"'\s]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"'\s]*/gi;
    const matches = html.match(regex);
    
    if (matches) {
      const uniqueUrls = [...new Set(matches)];
      imageUrls.push(...uniqueUrls.slice(0, 20)); // Limit to 20 images
    }
    
    console.log('Found image URLs:', imageUrls.length);
    return imageUrls;
  } catch (error) {
    console.error('Error fetching Dropbox folder:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ExtractRequest = await req.json();
    console.log('Extract request:', body);

    const { websiteUrl, photosDirectoryUrl } = body;

    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Website URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch and extract data from website
    console.log('Step 1: Fetching website content...');
    const html = await fetchWebsiteContent(websiteUrl);
    
    console.log('Step 2: Extracting data with AI...');
    const extractedData = await extractDataWithAI(html, websiteUrl);
    console.log('Extracted data:', extractedData);

    // Step 3: Fetch image URLs from Dropbox (but don't download yet)
    let imageUrls: string[] = [];
    if (photosDirectoryUrl) {
      console.log('Step 3: Fetching image URLs...');
      imageUrls = await fetchDropboxFolderImages(photosDirectoryUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extractedData,
        imageUrls,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Extract error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
