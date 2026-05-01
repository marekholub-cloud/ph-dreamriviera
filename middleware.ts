import { NextRequest, NextResponse } from 'next/server';

// Social media crawler user agents
const CRAWLER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'Pinterest',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
];

// Paths that should be checked for crawler OG rendering
const OG_PATHS = [
  '/nemovitost/',
  '/oblast/',
  '/blog/',
  '/projekty',
  '/kontakt',
  
  
  
  '/investice',
  
  
];

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|og/).*)',
  ],
};

export default function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;
  
  // Check if this is a crawler request
  const isCrawler = CRAWLER_AGENTS.some(agent => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );
  
  // Check if this path should have OG rendering
  const shouldRenderOG = OG_PATHS.some(path => 
    pathname === path || pathname.startsWith(path)
  );
  
  // If it's a crawler and a relevant path, redirect to OG renderer
  if (isCrawler && shouldRenderOG) {
    const ogUrl = new URL(
      `https://bulknhjwswhnxhnosbnv.supabase.co/functions/v1/og-renderer`
    );
    ogUrl.searchParams.set('path', pathname);
    
    // Fetch from OG renderer and return the response
    return NextResponse.rewrite(ogUrl);
  }
  
  // For all other requests, continue normally
  return NextResponse.next();
}
