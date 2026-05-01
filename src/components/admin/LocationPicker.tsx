import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  propertyName?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Lazy load the map component
const LocationPickerMap = lazy(() => import('./LocationPickerMap'));

export const LocationPicker = ({ latitude, longitude, onLocationChange, propertyName }: LocationPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([8.5503244, -83.3784724]); // Dubai default
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (latitude && longitude) {
      setPosition({ lat: latitude, lng: longitude });
      setMapCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 4) return;
    const timeoutId = window.setTimeout(() => {
      searchLocation(searchQuery);
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng });
    onLocationChange(lat, lng);
    // Reverse geocode to get address
    reverseGeocode(lat, lng);
  }, [onLocationChange]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=cs`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const searchLocation = async (query?: string) => {
    const searchText = query || searchQuery;
    if (!searchText.trim()) return;
    
    setIsSearching(true);
    setShowResults(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5&accept-language=cs`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
      
      if (data.length === 0) {
        toast.info('Adresa nenalezena. Zkuste upřesnit.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('Chyba při vyhledávání adresy');
    } finally {
      setIsSearching(false);
    }
  };

  const fillFromPropertyName = async () => {
    if (!propertyName?.trim()) {
      toast.error('Vyplňte nejprve název nemovitosti');
      return;
    }
    
    setIsSearching(true);
    try {
      // Search with property name + Dubai/UAE for better results
      const searchText = `${propertyName}, Dubai, UAE`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1&accept-language=cs`
      );
      const data: SearchResult[] = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const latNum = parseFloat(result.lat);
        const lonNum = parseFloat(result.lon);
        setMapCenter([latNum, lonNum]);
        handleLocationChange(latNum, lonNum);
        setAddress(result.display_name);
        toast.success('Souřadnice doplněny z názvu nemovitosti');
      } else {
        toast.info('Adresa nenalezena. Zkuste vyhledat ručně.');
      }
    } catch (error) {
      console.error('Error geocoding property name:', error);
      toast.error('Chyba při vyhledávání');
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    const latNum = parseFloat(result.lat);
    const lonNum = parseFloat(result.lon);
    setMapCenter([latNum, lonNum]);
    handleLocationChange(latNum, lonNum);
    setAddress(result.display_name);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const openGoogleMapsSelector = () => {
    const lat = position?.lat || mapCenter[0];
    const lng = position?.lng || mapCenter[1];
    window.open(`https://www.google.com/maps/@${lat},${lng},15z`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Search input with autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Zadejte adresu (např. Al Hamra Village, Ras Al Khaimah)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => searchLocation()}
            disabled={isSearching}
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={openGoogleMapsSelector}
            title="Otevřít v Google Maps"
          >
            <MapPin className="w-4 h-4" />
          </Button>
          <Button 
            type="button" 
            variant="secondary"
            onClick={fillFromPropertyName}
            disabled={isSearching || !propertyName?.trim()}
            title="Vyplnit souřadnice z názvu nemovitosti"
            className="whitespace-nowrap"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Z názvu'}
          </Button>
        </div>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                onClick={() => selectResult(result)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-sm">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current address display */}
      {address && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Vybraná adresa:</span> {address}
          </p>
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden h-[300px] border border-border">
        <ErrorBoundary
          fallback={
            <div className="h-full w-full flex items-center justify-center bg-muted/30">
              <p className="text-sm text-muted-foreground">Mapa se nepodařila načíst.</p>
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="h-full w-full flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <LocationPickerMap
              center={mapCenter}
              position={position}
              onLocationChange={handleLocationChange}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      <p className="text-sm text-muted-foreground">
        Vyhledejte adresu nebo klikněte na mapu pro výběr polohy.
      </p>

      {/* Coordinates display */}
      {position && (
        <div className="flex gap-4 text-sm p-3 bg-muted/30 rounded-lg">
          <div>
            <span className="text-muted-foreground">Lat: </span>
            <span className="font-mono font-medium">{position.lat.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Lng: </span>
            <span className="font-mono font-medium">{position.lng.toFixed(6)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
