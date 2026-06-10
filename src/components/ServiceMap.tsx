import React, { useState, useEffect, useRef } from 'react';
import { 
  Map as MapIcon, 
  MapPin, 
  Navigation, 
  Search, 
  Building2, 
  Utensils, 
  Briefcase, 
  Compass, 
  ExternalLink, 
  Maximize, 
  ChevronRight, 
  Info,
  Sliders,
  Check,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';

// Read API Key from platform secrets
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '';

// Default location to New York City (major re-entry resource hub)
const DEFAULT_LOCATION = { lat: 40.7128, lng: -74.0060 };

interface ServiceProvider {
  id: string;
  name: string;
  address: string;
  category: 'parole' | 'pantry' | 'job';
  phone?: string;
  lat: number;
  lng: number;
  rating?: number;
}

// Rich mock data used for NYC seed locations and Demo/Setup Mode
const MOCK_PROVIDERS: ServiceProvider[] = [
  // Parole / Corrections
  {
    id: 'm1',
    name: 'Manhattan Parole & Community Supervision',
    address: '314 Hudson St, New York, NY 10013',
    category: 'parole',
    phone: '(212) 235-1200',
    lat: 40.7259,
    lng: -74.0084,
    rating: 3.8
  },
  {
    id: 'm2',
    name: 'Brooklyn Metro Parole Office',
    address: '15 Second Ave, Brooklyn, NY 11215',
    category: 'parole',
    phone: '(718) 557-3400',
    lat: 40.6751,
    lng: -73.9902,
    rating: 3.5
  },
  {
    id: 'm3',
    name: 'Bronx District Parole Supervision',
    address: '900 Grand Concourse, Bronx, NY 10451',
    category: 'parole',
    phone: '(718) 402-1500',
    lat: 40.8262,
    lng: -73.9234,
    rating: 3.3
  },
  // Food Pantries / Community Kitchens
  {
    id: 'm4',
    name: 'The Bowery Mission - Food & Shelter',
    address: '227 Bowery, New York, NY 10002',
    category: 'pantry',
    phone: '(212) 674-0001',
    lat: 40.7219,
    lng: -73.9926,
    rating: 4.7
  },
  {
    id: 'm5',
    name: 'Holy Apostles Kitchen & Food Bank',
    address: '296 9th Ave, New York, NY 10001',
    category: 'pantry',
    phone: '(212) 924-0555',
    lat: 40.7485,
    lng: -74.0004,
    rating: 4.6
  },
  {
    id: 'm6',
    name: 'City Harvest Food Distribution',
    address: '150 52nd St, Brooklyn, NY 11232',
    category: 'pantry',
    phone: '(646) 437-1200',
    lat: 40.6432,
    lng: -74.0203,
    rating: 4.8
  },
  // Job Centers / Career Training
  {
    id: 'm7',
    name: 'Manhattan Workforce1 Career Center',
    address: '125 Barclay St, New York, NY 10007',
    category: 'job',
    phone: '(212) 341-3500',
    lat: 40.7135,
    lng: -74.0099,
    rating: 4.2
  },
  {
    id: 'm8',
    name: 'Brooklyn Workforce1 Career Development',
    address: '9 Bond St, Brooklyn, NY 11201',
    category: 'job',
    phone: '(718) 246-7700',
    lat: 40.6896,
    lng: -73.9841,
    rating: 4.0
  },
  {
    id: 'm9',
    name: 'Bronx Workforce1 Training Solutions',
    address: '400 E Fordham Rd, Bronx, NY 10458',
    category: 'job',
    phone: '(718) 960-7099',
    lat: 40.8601,
    lng: -73.8904,
    rating: 4.1
  }
];

// Inner Live Map Controller that integrates Places Library and Map Events
function LivePlacesSearchMap({ 
  userLocation, 
  category, 
  searchCity,
  onPlaceSelect,
  selectedPlace,
  setPlaces,
  places
}: {
  userLocation: google.maps.LatLngLiteral;
  category: 'all' | 'parole' | 'pantry' | 'job';
  searchCity: string;
  onPlaceSelect: (p: ServiceProvider | null) => void;
  selectedPlace: ServiceProvider | null;
  setPlaces: (p: ServiceProvider[]) => void;
  places: ServiceProvider[];
}) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!map || !userLocation) return;
    map.panTo(userLocation);
  }, [map, userLocation]);

  useEffect(() => {
    if (!placesLib || !map) return;

    // Define search terms matching categories
    let queryText = '';
    const citySuffix = searchCity.trim() ? ` in ${searchCity}` : '';

    if (category === 'parole') {
      queryText = `parole office state corrections probation department${citySuffix}`;
    } else if (category === 'pantry') {
      queryText = `food pantry soup kitchen food bank crisis support${citySuffix}`;
    } else if (category === 'job') {
      queryText = `workforce career center employment services job training${citySuffix}`;
    } else {
      queryText = `community services social support agency food pantry job center${citySuffix}`;
    }

    const currentCenter = map.getCenter() || userLocation;

    placesLib.Place.searchByText({
      textQuery: queryText,
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'types'],
      locationBias: { center: currentCenter, radius: 15000 },
      maxResultCount: 15,
    })
    .then(({ places: rawPlaces }) => {
      if (!rawPlaces) {
        setPlaces([]);
        return;
      }

      const mapped: ServiceProvider[] = rawPlaces.map((p, idx) => {
        let cat: 'parole' | 'pantry' | 'job' = 'pantry';
        const typesStr = p.types?.join(' ').toLowerCase() || '';
        if (typesStr.includes('court') || typesStr.includes('government') || queryText.includes('parole')) {
          cat = 'parole';
        } else if (typesStr.includes('job') || typesStr.includes('education') || queryText.includes('workforce') || queryText.includes('career')) {
          cat = 'job';
        }

        return {
          id: p.id || `live-${idx}`,
          name: p.displayName || 'Service Provider',
          address: p.formattedAddress || 'No address provided',
          category: cat,
          lat: p.location?.lat() || userLocation.lat,
          lng: p.location?.lng() || userLocation.lng,
          rating: p.rating || 4.0
        };
      });

      setPlaces(mapped);
    })
    .catch((err) => {
      console.error('Google Places Search failed:', err);
      // Fail gracefully: fallback to matching category mock data around center
      const filteredMocks = MOCK_PROVIDERS.filter(p => category === 'all' || p.category === category);
      setPlaces(filteredMocks);
    });
  }, [placesLib, map, category, searchCity, userLocation]);

  // Handle marker selection centering
  useEffect(() => {
    if (selectedPlace && map) {
      map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      map.setZoom(14);
    }
  }, [selectedPlace, map]);

  return (
    <>
      {/* Current location Marker */}
      {userLocation && (
        <AdvancedMarker position={userLocation} title="Your Location">
          <Pin background="#E11D48" glyphColor="#ffffff" scale={1.2}>
            <span className="text-[9px] font-bold font-mono">YOU</span>
          </Pin>
        </AdvancedMarker>
      )}

      {/* Discovered places Markers */}
      {places.map((place) => {
        const isSelected = selectedPlace?.id === place.id;
        let pinColor = '#D97706'; // Food Pantry: Amber
        if (place.category === 'parole') pinColor = '#141414'; // Parole: Dark Gray/Black
        if (place.category === 'job') pinColor = '#2563EB'; // Job: Blue

        return (
          <AdvancedMarker 
            key={place.id}
            position={{ lat: place.lat, lng: place.lng }}
            onClick={() => onPlaceSelect(place)}
          >
            <Pin 
              background={pinColor} 
              borderColor={isSelected ? '#FFFFFF' : pinColor}
              scale={isSelected ? 1.2 : 1.0}
            />
          </AdvancedMarker>
        );
      })}

      {/* Info Window for Selected Marker */}
      {selectedPlace && (
        <InfoWindow 
          position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
          onCloseClick={() => onPlaceSelect(null)}
        >
          <div className="p-1 min-w-[200px] text-[#141414] font-sans">
            <span className={`inline-block text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-sm mb-1.5 font-mono ${
              selectedPlace.category === 'parole' ? 'bg-zinc-800 text-white' :
              selectedPlace.category === 'job' ? 'bg-blue-100 text-blue-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              {selectedPlace.category === 'parole' ? 'Supervision Office' :
               selectedPlace.category === 'job' ? 'Job Center' :
               'Food Pantry'}
            </span>
            <h4 className="font-bold text-sm leading-tight text-neutral-900 mb-1">{selectedPlace.name}</h4>
            <p className="text-xs text-neutral-600 mb-2 leading-normal">{selectedPlace.address}</p>
            {selectedPlace.phone && (
              <p className="text-xs font-mono font-medium text-neutral-700">Phone: {selectedPlace.phone}</p>
            )}
            <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name + ' ' + selectedPlace.address)}`}
                target="_blank"
                rel="noreferrer referrer"
                className="text-[10px] font-bold text-amber-600 hover:text-amber-500 uppercase tracking-wider flex items-center gap-1"
              >
                Directions <ExternalLink size={10} />
              </a>
              {selectedPlace.rating && (
                <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-1 py-0.5 rounded">
                  ★ {selectedPlace.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function ServiceMap() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'parole' | 'pantry' | 'job'>('all');
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [activeSearchCity, setActiveSearchCity] = useState('');
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'default' | 'error'>('requesting');
  const [places, setPlaces] = useState<ServiceProvider[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<ServiceProvider | null>(null);

  // Load User Location via Geolocation API
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('granted');
        },
        (error) => {
          console.warn('Geolocation failed or rejected:', error);
          setUserLocation(DEFAULT_LOCATION);
          setLocationStatus('default');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setUserLocation(DEFAULT_LOCATION);
      setLocationStatus('default');
    }
  }, []);

  // Filter mock providers in mockup mode
  const filteredMockPlaces = MOCK_PROVIDERS.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchCity = activeSearchCity.trim() 
      ? p.address.toLowerCase().includes(activeSearchCity.toLowerCase()) 
      : true;
    return matchCat && matchCity;
  });

  const handleCitySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchCity(cityInput);
    
    if (hasValidKey && cityInput.trim()) {
      // In live mode, we set activeSearchCity to search center inside our controller
      // We will pan the map to center using Places lookup once it resolves
    } else if (!hasValidKey && cityInput.trim()) {
      // Show appropriate alert or notice
    }
  };

  const handlePlaceSelectAndCenter = (place: ServiceProvider) => {
    setSelectedPlace(place);
    if (!hasValidKey) {
      // In mockup mode, we simulate centering by selecting the place
    }
  };

  return (
    <div className="bg-white border border-[#141414] p-4 sm:p-6 shadow-sm overflow-hidden space-y-6">
      
      {/* Search Header and Category Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141414]/10 pb-6">
        <div className="space-y-1">
          <h4 className="text-xl font-bold flex items-center gap-2">
            <MapIcon size={20} className="text-[#141414]" /> Service Provider Map
          </h4>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
            {locationStatus === 'granted' ? 'Using Live Browser Location' : 'Using Fallback Center (New York, NY)'}
          </p>
        </div>

        {/* Custom City and Location Search Input */}
        <form onSubmit={handleCitySearchSubmit} className="flex gap-2 w-full md:w-auto max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
            <input 
              type="text" 
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Enter city (e.g. Brooklyn, Queens)"
              className="w-full text-xs font-medium uppercase tracking-wider bg-transparent border border-[#141414] py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-[#141414]/10 transition-colors placeholder:text-neutral-400"
            />
          </div>
          <button 
            type="submit" 
            className="bg-[#141414] text-[#E4E3E0] text-xs font-bold uppercase tracking-widest px-4 py-3 hover:opacity-90 select-none cursor-pointer"
          >
            Go
          </button>
        </form>
      </div>

      {/* Primary Category Select Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button 
          onClick={() => { setActiveCategory('all'); setSelectedPlace(null); }}
          className={`py-3 px-2 text-xs font-bold uppercase tracking-widest border transition-all select-none cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeCategory === 'all' 
              ? 'bg-[#141414] border-[#141414] text-white' 
              : 'border-neutral-200 hover:border-[#141414] text-neutral-600 hover:text-[#141414]'
          }`}
        >
          <Compass size={14} /> All Nearby
        </button>
        <button 
          onClick={() => { setActiveCategory('parole'); setSelectedPlace(null); }}
          className={`py-3 px-2 text-xs font-bold uppercase tracking-widest border transition-all select-none cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeCategory === 'parole' 
              ? 'bg-zinc-800 border-zinc-800 text-white' 
              : 'border-neutral-200 hover:border-[#141414] text-neutral-600 hover:text-zinc-800'
          }`}
        >
          <Building2 size={14} /> Parole Offices
        </button>
        <button 
          onClick={() => { setActiveCategory('pantry'); setSelectedPlace(null); }}
          className={`py-3 px-2 text-xs font-bold uppercase tracking-widest border transition-all select-none cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeCategory === 'pantry' 
              ? 'bg-amber-600 border-amber-600 text-white' 
              : 'border-neutral-200 hover:border-[#141414] text-neutral-600 hover:text-amber-600'
          }`}
        >
          <Utensils size={14} /> Food Pantries
        </button>
        <button 
          onClick={() => { setActiveCategory('job'); setSelectedPlace(null); }}
          className={`py-3 px-2 text-xs font-bold uppercase tracking-widest border transition-all select-none cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeCategory === 'job' 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'border-neutral-200 hover:border-[#141414] text-neutral-600 hover:text-blue-600'
          }`}
        >
          <Briefcase size={14} /> Job Centers
        </button>
      </div>

      {hasValidKey ? (
        /* Live Google Map Interactive Wrapper */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List panel */}
          <div className="lg:col-span-1 h-[500px] overflow-y-auto border border-[#141414]/10 space-y-2 pr-1 divide-y divide-neutral-100">
            {places.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 font-medium">
                No active service providers found in this area. Try searching another district or city.
              </div>
            ) : (
              places.map(place => (
                <div 
                  key={place.id}
                  onClick={() => handlePlaceSelectAndCenter(place)}
                  className={`p-4 transition-all duration-200 cursor-pointer text-left select-none ${
                    selectedPlace?.id === place.id 
                      ? 'bg-neutral-50 border-l-4 border-[#141414]' 
                      : 'hover:bg-neutral-50/50 border-l-4 border-transparent'
                  }`}
                >
                  <span className={`inline-block text-[8px] font-black uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-sm mb-1 ${
                    place.category === 'parole' ? 'bg-zinc-800 text-white' :
                    place.category === 'job' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {place.category === 'parole' ? 'Supervision' :
                     place.category === 'job' ? 'Job Center' :
                     'Food Pantry'}
                  </span>
                  <h5 className="font-bold text-neutral-900 text-sm mb-1 leading-tight">{place.name}</h5>
                  <p className="text-xs text-neutral-500 mb-2 leading-normal">{place.address}</p>
                  <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                    <span>★ {place.rating?.toFixed(1) || '4.0'}</span>
                    <span className="font-bold text-amber-600 flex items-center gap-0.5 hover:underline">
                      Focus on Map <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Interactive Map Box */}
          <div className="lg:col-span-2 relative h-[500px] border border-[#141414] rounded-sm shadow-inner overflow-hidden">
            <APIProvider apiKey={API_KEY} version="weekly" libraries={['places', 'marker', 'geometry', 'core']}>
              <Map
                defaultCenter={userLocation || DEFAULT_LOCATION}
                defaultZoom={12}
                mapId="DEMO_MAP_ID"
                clickableIcons={false}
                style={{ width: '100%', height: '100%' }}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                onClick={() => setSelectedPlace(null)}
              >
                <LivePlacesSearchMap 
                  userLocation={userLocation || DEFAULT_LOCATION}
                  category={activeCategory}
                  searchCity={activeSearchCity}
                  onPlaceSelect={setSelectedPlace}
                  selectedPlace={selectedPlace}
                  setPlaces={setPlaces}
                  places={places}
                />
              </Map>
            </APIProvider>

            {/* Float Floating Action Button: Locate Current Location */}
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  setLocationStatus('requesting');
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                      });
                      setLocationStatus('granted');
                    },
                    () => {
                      setLocationStatus('default');
                    }
                  );
                }
              }}
              className="absolute bottom-4 right-4 bg-[#141414] text-white p-3 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-lg select-none cursor-pointer"
              title="Locate Current Location"
            >
              <Navigation size={18} className="rotate-45" />
            </button>
          </div>
        </div>
      ) : (
        /* Demo/Visual Mockup View when Google Maps API Key is missing */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List panel */}
          <div className="lg:col-span-1 h-[500px] overflow-y-auto border border-[#141414]/10 space-y-2 pr-1 divide-y divide-neutral-100">
            <div className="bg-amber-50 p-3.5 border-b border-amber-200 text-amber-900 text-xs flex flex-col gap-1 rounded-sm mb-2">
              <span className="font-extrabold uppercase tracking-wider flex items-center gap-1 text-[10px]">
                <Info size={14} /> Demo Mode Enabled
              </span>
              <span>Showing seed service providers for New York City area. Enter your Maps Platform API Key to activate live geolocation lookups.</span>
            </div>
            {filteredMockPlaces.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 font-medium font-mono text-xs">
                No mock places found under this filter.
              </div>
            ) : (
              filteredMockPlaces.map(place => (
                <div 
                  key={place.id}
                  onClick={() => handlePlaceSelectAndCenter(place)}
                  className={`p-4 transition-all duration-200 cursor-pointer text-left select-none ${
                    selectedPlace?.id === place.id 
                      ? 'bg-neutral-50 border-l-4 border-[#141414]' 
                      : 'hover:bg-neutral-50/50 border-l-4 border-transparent'
                  }`}
                >
                  <span className={`inline-block text-[8px] font-black uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-sm mb-1 ${
                    place.category === 'parole' ? 'bg-zinc-800 text-white' :
                    place.category === 'job' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {place.category === 'parole' ? 'Supervision' :
                     place.category === 'job' ? 'Job Center' :
                     'Food Pantry'}
                  </span>
                  <h5 className="font-bold text-neutral-900 text-sm mb-1 leading-tight">{place.name}</h5>
                  <p className="text-xs text-neutral-500 mb-2 leading-normal">{place.address}</p>
                  <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                    <span>Phone: {place.phone || '(555) 012-3456'}</span>
                    <span className="font-bold text-neutral-800 flex items-center gap-0.5">
                      Select <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Setup Guide + Mock Map visual placeholder */}
          <div className="lg:col-span-2 relative h-[500px] border border-[#141414] rounded-sm overflow-hidden flex flex-col justify-between bg-neutral-50 p-6 md:p-8 space-y-6">
            
            {/* Visual background pattern simulating elements */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#141414_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10 max-w-xl space-y-4">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-black font-mono tracking-widest uppercase bg-zinc-800 text-white rounded-sm">
                <AlertTriangle size={12} className="text-amber-400" /> API KEY CONFIGURATION REQUIRED
              </div>
              <h3 className="text-2xl font-serif italic text-neutral-900 leading-tight">
                Unlock Interactive Maps & Live Nearby Geolocation
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Connect directly with Google Maps APIs to search live parole offices, legal assistance providers, local job training bureaus, and food support pantries based on your exact modern browser location, or anywhere in the world.
              </p>
            </div>

            <div className="relative z-10 bg-white border border-[#141414] p-5 space-y-3 shadow-sm rounded-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#141414]">
                How to set up your API Key:
              </h4>
              <ol className="text-xs text-neutral-700 space-y-2.5 pl-4 list-decimal leading-relaxed">
                <li>
                  Get a Google Maps Platform Key from the{' '}
                  <a 
                    href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink size={10} />
                  </a>
                </li>
                <li>
                  Paste your key directly into the{' '}
                  <strong className="text-neutral-900">"Enter your environment variable to continue"</strong> popup inside AI Studio when triggered.
                </li>
                <li>
                  <span className="font-semibold text-neutral-800">Or manually:</span> Open{' '}
                  <strong className="text-neutral-900">Settings</strong> (⚙️ gear icon, top-right panel in AI Studio) →{' '}
                  <strong className="text-neutral-900">Secrets</strong> → Add key with name{' '}
                  <code className="bg-neutral-150 px-1 py-0.5 rounded font-mono font-bold text-red-600 text-[11px]">GOOGLE_MAPS_PLATFORM_KEY</code> → Paste value and hit Save.
                </li>
              </ol>
            </div>

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200">
              <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">
                The platform rebuilds automatically inside the live canvas
              </div>
              <span className="text-[10px] bg-neutral-200 text-neutral-800 px-2 py-1 rounded font-mono font-bold uppercase tracking-wider">
                Demo Coordinates: NYC Fallback
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
