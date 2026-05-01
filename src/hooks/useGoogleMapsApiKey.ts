import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGoogleMapsApiKeyResult {
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useGoogleMapsApiKey = (): UseGoogleMapsApiKeyResult => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-google-maps-key");

        if (fnError) {
          console.error("Error fetching Google Maps API key:", fnError);
          setError("Nepodařilo se načíst Google Maps API klíč");
          return;
        }

        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else {
          setError("Google Maps API klíč není nakonfigurován");
        }
      } catch (err) {
        console.error("Error fetching Google Maps API key:", err);
        setError("Nepodařilo se načíst Google Maps API klíč");
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  return { apiKey, isLoading, error };
};
