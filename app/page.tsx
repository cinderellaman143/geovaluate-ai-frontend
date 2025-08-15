// Forcing a new build on Vercel

'use client'; // This is a client component
// ... rest of the code

'use client'; // This is a client component

import { useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { MapPin, Search, Bot, Loader2, Star, ExternalLink } from 'lucide-react';

// --- Type Definitions for API Response ---
interface HedonicFactor {
  factor: string;
  score: number;
  justification: string;
}

interface AnalysisResult {
  address: string;
  fair_value_estimate: string;
  hedonic_analysis: HedonicFactor[];
  growth_trends: string;
  projected_appreciation: string;
  sources: string[];
}

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem', // Corresponds to rounded-xl
};

// Default center (Erode, Tamil Nadu)
const defaultCenter = {
  lat: 11.3410,
  lng: 77.7172
};

// --- Helper Component for Star Ratings ---
const StarRating = ({ score }: { score: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))}
  </div>
);


export default function HomePage() {
  // --- IMPORTANT: PASTE YOUR CLOUD RUN URL HERE ---
  const BACKEND_URL = 'https://geov-backend-service-688850732364.asia-south1.run.app/'; // Replace with your real URLLL

  // State for the map, autocomplete, and analysis
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [selectedPlace, setSelectedPlace] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load the Google Maps script
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  // Handlers for autocomplete
  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newCenter = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setCenter(newCenter);
        setSelectedPlace(place.formatted_address || '');
        setAnalysisResult(null); // Clear previous results
        setError(null);
        map?.panTo(newCenter);
        map?.setZoom(15);
      }
    }
  };

  // Handler for the analyze button
  const handleAnalyze = async () => {
    if (!selectedPlace) {
      alert("Please select a location first.");
      return;
    }
    if (BACKEND_URL.includes('xxxxxxxx')) {
        alert("Please update the BACKEND_URL in the code with your Cloud Run service URL.");
        return;
    }
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: selectedPlace,
          lat: center.lat,
          lng: center.lng,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok. The backend might be starting up or has an error.');
      }

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);

    } catch (err) {
      setError('Failed to fetch analysis. Please check your backend URL and ensure the server is running.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">GeoValuate AI</h1>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Input & Analysis */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Analyze a Property</h2>
            {isLoaded && (
              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter address, city, or pincode..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </Autocomplete>
            )}
            {!isLoaded && <p className="text-sm text-gray-500">Loading map tools...</p>}
            {loadError && <p className="text-sm text-red-500">Error loading Google Maps. Please check your API key.</p>}
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedPlace || !isLoaded}
              className="mt-4 w-full flex items-center justify-center px-4 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          
          {/* Analysis Results Section */}
          <div className="bg-white p-6 rounded-xl shadow-md flex-grow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis Report</h3>
            {isAnalyzing && (
              <div className="text-center text-gray-500">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500" />
                <p className="mt-2">Generating report from live AI...</p>
              </div>
            )}
            {error && <div className="text-red-500 text-center">{error}</div>}
            {analysisResult ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-600">Fair Value Estimate</h4>
                  <p className="text-blue-600 font-bold text-lg">{analysisResult.fair_value_estimate}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-600 mb-2">Hedonic Analysis</h4>
                  <div className="space-y-3">
                    {analysisResult.hedonic_analysis.map(item => (
                      <div key={item.factor}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">{item.factor}</span>
                          <StarRating score={item.score} />
                        </div>
                        <p className="text-gray-500 text-xs mt-1">{item.justification}</p>
                      </div>
                    ))}
                  </div>
                </div>
                 <div>
                  <h4 className="font-semibold text-gray-600">Growth Trends</h4>
                  <p className="text-gray-500">{analysisResult.growth_trends}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-600">Projected Appreciation</h4>
                  <p className="text-gray-500">{analysisResult.projected_appreciation}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-600">Sources</h4>
                  <ul className="list-none space-y-1 mt-1">
                    {analysisResult.sources.map(source => (
                      <li key={source}>
                        <a href={source} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center break-all">
                          {source} <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
               !isAnalyzing && !error && <p className="text-center text-gray-500">Your report will appear here.</p>
            )}
          </div>
        </div>

        {/* Right Column: Map */}
        <div className="lg:col-span-2 bg-gray-200 rounded-xl shadow-md min-h-[400px] lg:min-h-0 flex items-center justify-center">
          {loadError && <div className="text-red-500">Error loading map. Please check your API key.</div>}
          {!isLoaded && !loadError && <div className="text-gray-500">Loading Map...</div>}
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={12}
              onLoad={setMap}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
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
