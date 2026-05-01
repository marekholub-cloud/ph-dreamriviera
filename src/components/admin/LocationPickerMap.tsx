import { GoogleMap, Marker } from "@react-google-maps/api";
import { useCallback } from "react";
import { GoogleMapsLoader } from "../maps/GoogleMapsLoader";

interface LocationPickerMapProps {
  center: [number, number];
  position: { lat: number; lng: number } | null;
  onLocationChange: (lat: number, lng: number) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: false,
};

const LocationPickerMapContent = ({ center, position, onLocationChange }: LocationPickerMapProps) => {
  const mapCenter = { lat: center[0], lng: center[1] };

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onLocationChange(e.latLng.lat(), e.latLng.lng());
      }
    },
    [onLocationChange]
  );

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={17}
      options={mapOptions}
      onClick={handleMapClick}
    >
      {position && (
        <Marker position={{ lat: position.lat, lng: position.lng }} />
      )}
    </GoogleMap>
  );
};

const LocationPickerMap = (props: LocationPickerMapProps) => {
  return (
    <GoogleMapsLoader>
      <LocationPickerMapContent {...props} />
    </GoogleMapsLoader>
  );
};

export default LocationPickerMap;
