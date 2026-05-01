import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
}

export const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  noIndex = false,
}: SEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (
      attribute: "name" | "property",
      key: string,
      content: string
    ) => {
      let meta = document.querySelector(
        `meta[${attribute}="${key}"]`
      ) as HTMLMetaElement;

      if (meta) {
        meta.setAttribute("content", content);
      } else {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
      }
    };

    // Truncate description to 160 chars for optimal display
    const truncatedDescription = description.length > 160 
      ? description.substring(0, 157) + '...' 
      : description;

    // Update standard meta tags
    updateMetaTag("name", "description", truncatedDescription);
    
    if (keywords) {
      updateMetaTag("name", "keywords", keywords);
    }

    if (noIndex) {
      updateMetaTag("name", "robots", "noindex, nofollow");
    } else {
      updateMetaTag("name", "robots", "index, follow");
    }

    // Update Open Graph meta tags
    updateMetaTag("property", "og:title", title);
    updateMetaTag("property", "og:description", truncatedDescription);
    updateMetaTag("property", "og:type", type);
    updateMetaTag("property", "og:site_name", "go2dubai.online");
    updateMetaTag("property", "og:locale", "en_US");

    // Use provided image or default OG image
    const ogImage = image || "https://go2dubai.online/og-image-new.png";
    updateMetaTag("property", "og:image", ogImage);
    updateMetaTag("property", "og:image:secure_url", ogImage);
    updateMetaTag("property", "og:image:width", "1200");
    updateMetaTag("property", "og:image:height", "630");
    updateMetaTag("property", "og:image:alt", title);

    if (url) {
      updateMetaTag("property", "og:url", url);
      
      // Update canonical link
      let canonical = document.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement;

      if (canonical) {
        canonical.setAttribute("href", url);
      } else {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        canonical.setAttribute("href", url);
        document.head.appendChild(canonical);
      }
    }

    // Update Twitter Card meta tags
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:site", "@produbai_eu");
    updateMetaTag("name", "twitter:title", title);
    updateMetaTag("name", "twitter:description", truncatedDescription);
    updateMetaTag("name", "twitter:image", ogImage);
    updateMetaTag("name", "twitter:image:alt", title);

    // WhatsApp specific - uses OG tags but let's ensure they're optimized
    // WhatsApp reads og:image, og:title, og:description

    // Cleanup function to reset title on unmount
    return () => {
      document.title = "go2dubai.online | book your stay in apartments in UAE";
    };
  }, [title, description, keywords, image, url, type, noIndex]);

  return null;
};

export default SEO;
