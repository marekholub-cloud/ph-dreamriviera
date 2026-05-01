// Affiliate code utility functions
// Strategy: "First Click Wins" - first affiliate code is preserved, subsequent ones are only tracked

import { supabase } from "@/integrations/supabase/client";

const AFFILIATE_COOKIE_NAME = 'affiliate_code';
const AFFILIATE_COOKIE_DAYS = 30;
const AFFILIATE_LOCALSTORAGE_KEY = 'cad_affiliate_code';

// Lead levels with their configuration
export const LEAD_LEVELS = {
  INFLUENCER: { level: 1, status: 'visitor', warmth: 50, coefficient: 0.5 },
  PERSONAL: { level: 2, status: 'lead', warmth: 75, coefficient: 0.75 },
  SUPERTIP: { level: 3, status: 'qualified', warmth: 100, coefficient: 1.0 },
} as const;

export type LeadLevelKey = keyof typeof LEAD_LEVELS;

// Calculate commission based on property value and lead level
export const calculateCommission = (
  propertyValueAed: number,
  leadLevel: LeadLevelKey,
  seminarAccepted: boolean = false,
  questionnaireCompletedIndependently: boolean = false
): { commission: number; qualified: boolean; reason?: string } => {
  const config = LEAD_LEVELS[leadLevel];
  const baseCommission = propertyValueAed * 0.01 * config.coefficient;

  // Level 3 requires either seminar acceptance or independent questionnaire completion
  if (leadLevel === 'SUPERTIP') {
    const qualified = seminarAccepted || questionnaireCompletedIndependently;
    return {
      commission: qualified ? baseCommission : 0,
      qualified,
      reason: qualified 
        ? undefined 
        : 'Level 3 vyžaduje přijetí pozvánky na seminář nebo vyplnění dotazníku bez zásahu obchodníka'
    };
  }

  return { commission: baseCommission, qualified: true };
};

// Get affiliate code from URL parameter
export const getAffiliateFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('aff');
};

// Get affiliate code from localStorage
export const getAffiliateFromLocalStorage = (): string | null => {
  try {
    return localStorage.getItem(AFFILIATE_LOCALSTORAGE_KEY);
  } catch {
    return null;
  }
};

// Set affiliate code in localStorage
export const setAffiliateLocalStorage = (code: string): void => {
  try {
    localStorage.setItem(AFFILIATE_LOCALSTORAGE_KEY, code);
  } catch (error) {
    console.error("Failed to save affiliate code to localStorage:", error);
  }
};

// Get affiliate code from cookie
export const getAffiliateFromCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === AFFILIATE_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Set affiliate code cookie
export const setAffiliateCookie = (code: string): void => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + AFFILIATE_COOKIE_DAYS);
  document.cookie = `${AFFILIATE_COOKIE_NAME}=${encodeURIComponent(code)};expires=${expirationDate.toUTCString()};path=/;SameSite=Lax`;
};

// Clear affiliate code (for admin testing purposes)
export const clearAffiliateCode = (): void => {
  try {
    localStorage.removeItem(AFFILIATE_LOCALSTORAGE_KEY);
    // Clear cookie by setting expiration to past
    document.cookie = `${AFFILIATE_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
    console.log("[Affiliate] Cleared affiliate code from storage");
  } catch (error) {
    console.error("Failed to clear affiliate code:", error);
  }
};

// Get stored affiliate code (from localStorage or cookie, NOT from URL)
export const getStoredAffiliateCode = (): string | null => {
  const localStorageAffiliate = getAffiliateFromLocalStorage();
  if (localStorageAffiliate) {
    return localStorageAffiliate;
  }
  return getAffiliateFromCookie();
};

// Get affiliate code - returns stored code (First Click Wins strategy)
// URL code is only used if no code is stored yet
export const getAffiliateCode = (): string | null => {
  // First check if we already have a stored code (First Click Wins)
  const storedCode = getStoredAffiliateCode();
  if (storedCode) {
    return storedCode;
  }
  
  // No stored code - check URL for first-time attribution
  const urlAffiliate = getAffiliateFromUrl();
  if (urlAffiliate) {
    // This is the first click - store it
    setAffiliateLocalStorage(urlAffiliate);
    setAffiliateCookie(urlAffiliate);
    return urlAffiliate;
  }
  
  return null;
};

// Track affiliate click - sends to backend for analytics
export const trackAffiliateClick = async (affiliateCode: string, isFirstClick: boolean): Promise<void> => {
  try {
    await supabase.functions.invoke("track-affiliate-click", {
      body: {
        affiliate_code: affiliateCode,
        page_url: window.location.href,
        is_first_click: isFirstClick
      }
    });
    console.log(`[Affiliate] Tracked click for ${affiliateCode}, first_click: ${isFirstClick}`);
  } catch (error) {
    console.error("Failed to track affiliate click:", error);
  }
};

// Initialize affiliate tracking (call on app load)
// Implements "First Click Wins" - only stores first affiliate, but tracks all clicks
export const initAffiliateTracking = (): void => {
  const urlAffiliate = getAffiliateFromUrl();
  if (!urlAffiliate) {
    return; // No affiliate in URL, nothing to do
  }

  const existingCode = getStoredAffiliateCode();
  const isFirstClick = !existingCode;
  
  if (isFirstClick) {
    // First click - store the affiliate code
    setAffiliateLocalStorage(urlAffiliate);
    setAffiliateCookie(urlAffiliate);
    console.log(`[Affiliate] First click: stored affiliate code ${urlAffiliate}`);
  } else if (existingCode !== urlAffiliate.toUpperCase() && existingCode !== urlAffiliate) {
    // Different affiliate code in URL - log but don't overwrite (First Click Wins)
    console.log(`[Affiliate] Subsequent click: keeping original ${existingCode}, ignoring ${urlAffiliate}`);
  }
  
  // Always track the click for analytics (even if not first)
  trackAffiliateClick(urlAffiliate, isFirstClick);
};

// Get referrer profile ID from affiliate code
export const getReferrerIdFromCode = async (affiliateCode: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('affiliate_code', affiliateCode)
      .maybeSingle();
    
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
};
