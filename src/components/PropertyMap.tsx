import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useState, useCallback } from "react";
import { GoogleMapsLoader } from "./maps/GoogleMapsLoader";

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyName: string;
  address?: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

const PropertyMapContent = ({ latitude, longitude, propertyName, address }: PropertyMapProps) => {
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const center = { lat: latitude, lng: longitude };

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, "_blank");
  };

  const handleMarkerClick = useCallback(() => {
    setShowInfoWindow(true);
  }, []);

  const handleInfoWindowClose = useCallback(() => {
    setShowInfoWindow(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden h-[400px] border border-border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          options={mapOptions}
        >
          <Marker
            position={center}
            onClick={handleMarkerClick}
          />
          {showInfoWindow && (
            <InfoWindow
              position={center}
              onCloseClick={handleInfoWindowClose}
            >
              <div className="text-sm p-1">
                <div className="font-semibold text-foreground">{propertyName}</div>
                {address && (
                  <div className="mt-1 text-muted-foreground">{address}</div>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <button
        type="button"
        onClick={openInGoogleMaps}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <span className="sr-only">Otevřít {propertyName} v Google Maps</span>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 6.38 7.18 14.12 7.49 14.46.29.33.73.54 1.01.54s.72-.21 1.01-.54c.31-.34 7.49-8.08 7.49-14.46C20.5 3.81 16.69 0 12 0zm0 12c-1.93 0-3.5-1.57-3.5-3.5S10.07 5 12 5s3.5 1.57 3.5 3.5S13.93 12 12 12z" />
        </svg>
        Otevřít v Google Maps
      </button>
    </div>
  );
};

export const PropertyMap = (props: PropertyMapProps) => {
  return (
    <GoogleMapsLoader>
      <PropertyMapContent {...props} />
    </GoogleMapsLoader>
  );
};
