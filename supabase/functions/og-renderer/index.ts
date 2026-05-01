import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Social media crawler user agents
const CRAWLER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "WhatsApp",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "Discordbot",
  "Googlebot",
  "bingbot",
  "Applebot",
];

function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  return CRAWLER_AGENTS.some(agent => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateOGHtml(params: {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName?: string;
  type?: string;
}): string {
  const { title, description, image, url, siteName = "Dubaj Reality", type = "website" } = params;
  
  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:locale" content="cs_CZ">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  <!-- Redirect to actual page for browsers -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(url)}">
  <link rel="canonical" href="${escapeHtml(url)}">
</head>
<body>
  <p>Přesměrování na <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const userAgent = req.headers.get("user-agent") || "";
    const baseUrl = "https://go2dubai.online";
    
    console.log(`OG Renderer - Path: ${path}, User-Agent: ${userAgent.substring(0, 100)}`);
    
    // Default OG data for homepage
    let ogData = {
      title: "Dubaj Reality | Luxusní nemovitosti v Dubaji",
      description: "Investujte do luxusních nemovitostí v Dubaji. Široká nabídka apartmánů, vil a penthousů od prémiových developerů.",
      image: `${baseUrl}/og-image-new.png`,
      url: baseUrl,
      type: "website"
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the path and fetch appropriate data
    const pathParts = path.split("/").filter(Boolean);
    
    if (pathParts[0] === "nemovitost" && pathParts[1]) {
      // Property page
      const slug = pathParts[1];
      console.log(`Fetching property: ${slug}`);
      
      const { data: property, error } = await supabase
        .from("properties")
        .select(`
          name,
          short_description,
          description,
          price_formatted,
          type,
          hero_image_url,
          areas (name, city),
          property_images (image_url, sort_order)
        `)
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (property && !error) {
        const area = property.areas as unknown as { name: string; city: string } | null;
        const location = area ? `${area.name}, ${area.city}` : "Dubai";
        
        // Get hero image or first gallery image
        let image = property.hero_image_url;
        if (!image && property.property_images && property.property_images.length > 0) {
          const images = property.property_images as { image_url: string; sort_order: number | null }[];
          const sortedImages = images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          image = sortedImages[0].image_url;
        }
        
        ogData = {
          title: `${property.name} | ${location} | Dubaj Reality`,
          description: property.short_description || 
            property.description?.substring(0, 160) || 
            `Luxusní ${property.type || "nemovitost"} v lokalitě ${location}. ${property.price_formatted ? `Cena od ${property.price_formatted}.` : ""}`,
          image: image || `${baseUrl}/og-image-new.png`,
          url: `${baseUrl}/nemovitost/${slug}`,
          type: "product"
        };
        
        console.log(`Property found: ${property.name}`);
      } else {
        console.log(`Property not found: ${slug}`, error);
      }
    } else if (pathParts[0] === "oblast" && pathParts[1]) {
      // Area page
      const slug = pathParts[1];
      console.log(`Fetching area: ${slug}`);
      
      const { data: area, error } = await supabase
        .from("areas")
        .select("name, city, description, hero_image_url, image_url")
        .or(`name.ilike.%${slug.replace(/-/g, " ")}%,name.ilike.%${slug}%`)
        .maybeSingle();

      if (area && !error) {
        ogData = {
          title: `${area.name} | ${area.city} | Oblasti v Dubaji | Dubaj Reality`,
          description: area.description || `Objevte luxusní nemovitosti v oblasti ${area.name}, ${area.city}. Prémiové apartmány a vily od špičkových developerů.`,
          image: area.hero_image_url || area.image_url || `${baseUrl}/og-image-new.png`,
          url: `${baseUrl}/oblast/${slug}`,
          type: "website"
        };
        console.log(`Area found: ${area.name}`);
      }
    } else if (pathParts[0] === "developer" && pathParts[1]) {
      // Developer page
      const slug = pathParts[1];
      const decodedSlug = decodeURIComponent(slug);
      // Convert slug to search pattern (replace hyphens with spaces)
      const searchName = decodedSlug.replace(/-/g, " ");
      console.log(`Fetching developer: ${slug}, searchName: ${searchName}`);
      
      // Try multiple search patterns
      const { data: developers, error } = await supabase
        .from("developers")
        .select("name, description, logo_url")
        .or(`name.ilike.%${searchName}%,name.ilike.%${decodedSlug}%`);

      // Find best match - prefer exact match
      let developer = null;
      if (developers && developers.length > 0 && !error) {
        developer = developers.find(d => 
          d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === decodedSlug.toLowerCase()
        ) || developers.find(d => 
          d.name.toLowerCase().includes(searchName.toLowerCase())
        ) || developers[0];
      }

      if (developer) {
        ogData = {
          title: `${developer.name} | Developer | Dubaj Reality`,
          description: developer.description || `Projekty od developera ${developer.name}. Prémiové nemovitosti v Dubaji.`,
          image: `${baseUrl}/og-image-new.png`,
          url: `${baseUrl}/developer/${slug}`,
          type: "website"
        };
        console.log(`Developer found: ${developer.name}`);
      } else {
        console.log(`Developer not found: ${slug}`, error);
      }
    } else if (pathParts[0] === "projekty") {
      ogData = {
        title: "Projekty | Luxusní nemovitosti v Dubaji | Dubaj Reality",
        description: "Prohlédněte si naši kompletní nabídku luxusních nemovitostí v Dubaji. Apartmány, vily a penthousy od prémiových developerů.",
        image: `${baseUrl}/og-image-new.png`,
        url: `${baseUrl}/projekty`,
        type: "website"
      };
    } else if (pathParts[0] === "proc-dubaj") {
      ogData = {
        title: "Proč investovat v Dubaji? | Dubaj Reality",
        description: "Objevte výhody investování do nemovitostí v Dubaji. 0% daň z příjmu, stabilní ekonomika a rostoucí trh.",
        image: `${baseUrl}/og-image-new.png`,
        url: `${baseUrl}/proc-dubaj`,
        type: "article"
      };
    } else if (pathParts[0] === "investice") {
      ogData = {
        title: "Investice do nemovitostí | Dubaj Reality",
        description: "Investujte do lukrativních nemovitostí v Dubaji a Kostarice. Vysoké výnosy, minimální daně, profesionální servis.",
        image: `${baseUrl}/og-image-new.png`,
        url: `${baseUrl}/investice`,
        type: "website"
      };
    } else if (pathParts[0] === "kontakt" || pathParts[0] === "o-nas") {
      ogData = {
        title: "Kontakt | Dubaj Reality",
        description: "Kontaktujte nás pro nezávaznou konzultaci ohledně investic do nemovitostí v Dubaji. Jsme tu pro vás.",
        image: `${baseUrl}/og-image-new.png`,
        url: `${baseUrl}/${pathParts[0]}`,
        type: "website"
      };
    } else if (pathParts[0] === "blog") {
      if (pathParts[1]) {
        // Specific blog post
        const blogSlug = pathParts[1];
        const blogMeta: Record<string, { title: string; description: string; image: string }> = {
          "10-duvodu-proc-investovat-do-nemovitosti-v-dubaji": {
            title: "10 důvodů proč investovat do nemovitostí v Dubaji",
            description: "Zjistěte hlavní důvody, proč je Dubaj ideální destinací pro investice do nemovitostí. Od nulové daně po stabilní ekonomiku.",
            image: `${baseUrl}/og-image-new.png`
          },
          "developerske-plany": {
            title: "Developerské plány v Dubaji",
            description: "Přehled největších developerských projektů a plánů v Dubaji. Co se chystá a kam směřuje trh.",
            image: `${baseUrl}/og-image-new.png`
          },
          "dubaj-tahne": {
            title: "Dubaj táhne investory",
            description: "Proč stále více investorů směřuje své prostředky do nemovitostí v Dubaji.",
            image: `${baseUrl}/og-image-new.png`
          },
          "jak-koupit-byt-v-dubaji": {
            title: "Jak koupit byt v Dubaji",
            description: "Kompletní průvodce nákupem bytu v Dubaji. Od výběru nemovitosti po finální převod.",
            image: `${baseUrl}/og-image-new.png`
          }
        };
        
        const blogData = blogMeta[blogSlug];
        if (blogData) {
          ogData = {
            title: `${blogData.title} | Blog | Dubaj Reality`,
            description: blogData.description,
            image: blogData.image,
            url: `${baseUrl}/blog/${blogSlug}`,
            type: "article"
          };
        }
      } else {
        ogData = {
          title: "Blog | Investice do nemovitostí | Dubaj Reality",
          description: "Čtěte naše články o investicích do nemovitostí v Dubaji. Tipy, rady a novinky z trhu.",
          image: `${baseUrl}/og-image-new.png`,
          url: `${baseUrl}/blog`,
          type: "website"
        };
      }
    }

    const html = generateOGHtml(ogData);
    
    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });

  } catch (error: unknown) {
    console.error("Error in og-renderer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Return fallback OG HTML even on error
    const fallbackHtml = generateOGHtml({
      title: "ProDubai | Luxusní nemovitosti v Dubaji",
      description: "Investujte do luxusních nemovitostí v Dubaji.",
      image: "https://go2dubai.online/og-image-new.png",
      url: "https://go2dubai.online",
    });
    
    return new Response(fallbackHtml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});
