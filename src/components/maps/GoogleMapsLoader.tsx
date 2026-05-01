import { LoadScript } from "@react-google-maps/api";
import { useGoogleMapsApiKey } from "@/hooks/useGoogleMapsApiKey";
import { Loader2 } from "lucide-react";

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = [];

export const GoogleMapsLoader = ({ children }: GoogleMapsLoaderProps) => {
  const { apiKey, isLoading, error } = useGoogleMapsApiKey();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/50 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/50 rounded-xl">
        <p className="text-muted-foreground text-sm">{error || "Mapa není k dispozici"}</p>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      {children}
    </LoadScript>
  );
};
