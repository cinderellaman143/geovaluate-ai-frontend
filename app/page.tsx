'use client'; // This is a client component

import { useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { MapPin, Search, Bot, Loader2, ExternalLink } from 'lucide-react';

// --- Type Definitions for API Response ---
interface ReraListing {
  project_name: string;
  developer: string;
  details: string;
  source_url: string;
}

// --- Static variables for Google Maps ---
const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
};

const libraries: ('places')[] = ['places'];

const defaultCenter = {
  lat: 11.3410,
  lng: 77.7172
};

export default function HomePage() {
  // --- Backend URL ---
  const BACKEND_URL = 'https://geov-backend-service-688850732364.asia-south1.run.app/api/find-rera-listings';

  // State
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [selectedPlace, setSelectedPlace] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [listings, setListings] = useState<ReraListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load the Google Maps script
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Handlers
  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newCenter = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
        setCenter(newCenter);
        setSelectedPlace(place.formatted_address || '');
        setListings([]);
        setError(null);
        map?.panTo(newCenter);
        map?.setZoom(15);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPlace) {
      alert("Please select a location first.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setListings([]);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: selectedPlace }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok. The backend might have an error.');
      }

      const data = await response.json();
      setListings(data.listings);

    } catch (err) {
      setError('Failed to fetch listings. Please check the backend and try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">GeoValuate AI</h1>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Sign In</button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Search for RERA Listings</h2>
            {isLoaded && (
              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <div className="relative">
                  <input type="text" placeholder="Enter address, city, or pincode..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow" />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </Autocomplete>
            )}
            <button onClick={handleAnalyze} disabled={isAnalyzing || !selectedPlace || !isLoaded} className="mt-4 w-full flex items-center justify-center px-4 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed">
              {isAnalyzing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
              {isAnalyzing ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md flex-grow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">RERA Approved Listings</h3>
            {isAnalyzing && (
              <div className="text-center text-gray-500">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500" />
                <p className="mt-2">Searching for listings...</p>
              </div>
            )}
            {error && <div className="text-red-500 text-center">{error}</div>}
            
            {!isAnalyzing && !error && listings.length > 0 && (
              <div className="space-y-4">
                {listings.map((listing, index) => (
                  <div key={index} className="border-b pb-3 last:border-b-0">
                    <h4 className="font-bold text-gray-800">{listing.project_name}</h4>
                    <p className="text-sm text-gray-600">by {listing.developer}</p>
                    <p className="text-sm text-gray-500 mt-1">{listing.details}</p>
                    <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center mt-1">
                      View Source <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {!isAnalyzing && !error && listings.length === 0 && (
              <p className="text-center text-gray-500">No listings found, or your search results will appear here.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-200 rounded-xl shadow-md min-h-[400px] lg:min-h-0 flex items-center justify-center">
          {isLoaded && (
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12} onLoad={setMap} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}>
               <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -100%)' }}>
                 <MapPin className="text-red-500 w-10 h-10 animate-bounce" />
              </div>
            </GoogleMap>
          )}
        </div>
      </main>
    </div>
  );
}
