import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { GoogleMapsLoader } from "./maps/GoogleMapsLoader";

export type PropertiesMapMarker = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  slug: string;
  propertyType?: string | null;
  heroImageUrl?: string | null;
  areaLabel?: string | null;
  priceFormatted?: string | null;
  bedrooms?: string | null;
  areaSqm?: string | null;
  developerLogoUrl?: string | null;
  developerName?: string | null;
};

// Custom marker icons as SVG data URLs for different property types
const createMarkerIcon = (color: string, symbol: string): google.maps.Icon => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28s20-13 20-28C40 9 31 0 20 0z" fill="${color}" filter="url(#shadow)"/>
      <circle cx="20" cy="18" r="12" fill="white" opacity="0.95"/>
      <text x="20" y="23" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="${color}">${symbol}</text>
    </svg>
  `;
  
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40, 48),
    anchor: new google.maps.Point(20, 48),
  };
};

// Property type to icon mapping
const getMarkerIcon = (propertyType?: string | null): google.maps.Icon => {
  const type = (propertyType || "").toLowerCase();
  
  if (type.includes("villa") || type.includes("vila")) {
    return createMarkerIcon("#10B981", "🏡"); // Green for villas
  }
  if (type.includes("penthouse")) {
    return createMarkerIcon("#8B5CF6", "✨"); // Purple for penthouses
  }
  if (type.includes("townhouse") || type.includes("řadový")) {
    return createMarkerIcon("#F59E0B", "🏘️"); // Amber for townhouses
  }
  if (type.includes("studio")) {
    return createMarkerIcon("#06B6D4", "🛋️"); // Cyan for studios
  }
  if (type.includes("duplex")) {
    return createMarkerIcon("#EC4899", "⬆️"); // Pink for duplexes
  }
  // Default: Apartment
  return createMarkerIcon("#3B82F6", "🏢"); // Blue for apartments
};

// Custom cluster renderer
const createClusterIcon = (count: number): string => {
  const size = count < 10 ? 40 : count < 100 ? 48 : 56;
  const fontSize = count < 10 ? 14 : count < 100 ? 16 : 18;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <filter id="clusterShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.25"/>
        </filter>
        <linearGradient id="clusterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366F1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4F46E5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#clusterGradient)" filter="url(#clusterShadow)"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 6}" fill="white" opacity="0.9"/>
      <text x="${size/2}" y="${size/2 + fontSize/3}" text-anchor="middle" font-size="${fontSize}" font-weight="600" font-family="Arial, sans-serif" fill="#4F46E5">${count}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export interface PropertiesGoogleMapHandle {
  fitBounds: () => void;
}

interface PropertiesGoogleMapProps {
  center: [number, number];
  zoom: number;
  markers: PropertiesMapMarker[];
  onOpenProperty: (slug: string) => void;
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

const PropertiesGoogleMapContent = forwardRef<PropertiesGoogleMapHandle, PropertiesGoogleMapProps>(
  ({ center, zoom, markers, onOpenProperty }, ref) => {
    const [selectedMarker, setSelectedMarker] = useState<PropertiesMapMarker | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const googleMarkersRef = useRef<google.maps.Marker[]>([]);
    const initialFitDoneRef = useRef(false);
    const mapCenter = { lat: center[0], lng: center[1] };

    const fitBoundsToMarkers = useCallback(() => {
      if (!mapRef.current || markers.length === 0) return;
      
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend({ lat: marker.lat, lng: marker.lng });
      });
      mapRef.current.fitBounds(bounds, 50);
      
      // Limit max zoom after fitBounds
      google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
        const currentZoom = mapRef.current?.getZoom();
        if (currentZoom && currentZoom > 14) {
          mapRef.current?.setZoom(14);
        }
      });
    }, [markers]);

    // Create markers and clusterer
    const setupClusterer = useCallback((map: google.maps.Map) => {
      // Clear existing markers and clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      googleMarkersRef.current.forEach(m => m.setMap(null));
      googleMarkersRef.current = [];

      // Create Google Maps markers
      const googleMarkers = markers.map((markerData) => {
        const marker = new google.maps.Marker({
          position: { lat: markerData.lat, lng: markerData.lng },
          icon: getMarkerIcon(markerData.propertyType),
        });

        marker.addListener("click", () => {
          setSelectedMarker(markerData);
        });

        return marker;
      });

      googleMarkersRef.current = googleMarkers;

      // Create or update clusterer
      if (clustererRef.current) {
        clustererRef.current.addMarkers(googleMarkers);
      } else {
        clustererRef.current = new MarkerClusterer({
          map,
          markers: googleMarkers,
          renderer: {
            render: ({ count, position }) => {
              const size = count < 10 ? 40 : count < 100 ? 48 : 56;
              return new google.maps.Marker({
                position,
                icon: {
                  url: createClusterIcon(count),
                  scaledSize: new google.maps.Size(size, size),
                  anchor: new google.maps.Point(size / 2, size / 2),
                },
                label: {
                  text: String(count),
                  color: "transparent",
                  fontSize: "0px",
                },
                zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
              });
            },
          },
        });
      }
    }, [markers]);

    const onMapLoad = useCallback((map: google.maps.Map) => {
      mapRef.current = map;
      
      // Setup clusterer
      setupClusterer(map);
      
      // Fit bounds immediately after map loads
      if (markers.length > 0 && !initialFitDoneRef.current) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach((marker) => {
          bounds.extend({ lat: marker.lat, lng: marker.lng });
        });
        map.fitBounds(bounds, 50);
        
        google.maps.event.addListenerOnce(map, "idle", () => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom > 14) {
            map.setZoom(14);
          }
        });
        initialFitDoneRef.current = true;
      }
    }, [markers, setupClusterer]);

    // Expose fitBounds via ref
    useImperativeHandle(ref, () => ({
      fitBounds: fitBoundsToMarkers,
    }));

    // Update markers when they change
    useEffect(() => {
      if (mapRef.current && markers.length > 0) {
        setupClusterer(mapRef.current);
        fitBoundsToMarkers();
        initialFitDoneRef.current = true;
      }
    }, [markers, fitBoundsToMarkers, setupClusterer]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (clustererRef.current) {
          clustererRef.current.clearMarkers();
        }
        googleMarkersRef.current.forEach(m => m.setMap(null));
      };
    }, []);

    const handleInfoWindowClose = useCallback(() => {
      setSelectedMarker(null);
    }, []);

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={handleInfoWindowClose}
          >
            <div className="w-64">
              {(selectedMarker.developerLogoUrl || selectedMarker.developerName) && (
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded-t-lg">
                  {selectedMarker.developerLogoUrl && (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={selectedMarker.developerLogoUrl}
                        alt={selectedMarker.developerName || "Developer"}
                        className="w-6 h-6 object-contain brightness-0 invert"
                      />
                    </div>
                  )}
                  {selectedMarker.developerName && (
                    <span className="text-white font-medium text-sm truncate">
                      {selectedMarker.developerName}
                    </span>
                  )}
                </div>
              )}
              {selectedMarker.heroImageUrl && (
                <img
                  src={selectedMarker.heroImageUrl}
                  alt={selectedMarker.name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-2">
                <h3 className="font-semibold text-gray-900 mb-1">{selectedMarker.name}</h3>
                {selectedMarker.areaLabel && (
                  <p className="text-sm text-gray-600 mb-2">{selectedMarker.areaLabel}</p>
                )}
                {(selectedMarker.bedrooms || selectedMarker.areaSqm) && (
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                    {selectedMarker.bedrooms && <span>Bedrooms: {selectedMarker.bedrooms}</span>}
                    {selectedMarker.areaSqm && <span>Area: {selectedMarker.areaSqm} m²</span>}
                  </div>
                )}
                {selectedMarker.priceFormatted && (
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="text-gray-500">From:</span>{" "}
                    <span className="font-semibold text-indigo-600">{selectedMarker.priceFormatted}</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onOpenProperty(selectedMarker.slug)}
                  className="w-full inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  View details
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  }
);

PropertiesGoogleMapContent.displayName = "PropertiesGoogleMapContent";

export const PropertiesGoogleMap = forwardRef<PropertiesGoogleMapHandle, PropertiesGoogleMapProps>(
  (props, ref) => {
    return (
      <GoogleMapsLoader>
        <PropertiesGoogleMapContent {...props} ref={ref} />
      </GoogleMapsLoader>
    );
  }
);

PropertiesGoogleMap.displayName = "PropertiesGoogleMap";
