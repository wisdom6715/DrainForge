/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

// A direct Google Maps API key (your own, from the Google Cloud Console —
// Maps JavaScript API + Geocoding API enabled) takes priority. Falls back
// to the platform proxy this project was originally scaffolded with, for
// environments where that proxy is actually reachable.
const DIRECT_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const FORGE_API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY as string | undefined;
const FORGE_BASE_URL =
  (import.meta.env.VITE_FRONTEND_FORGE_API_URL as string | undefined) ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let mapsScriptPromise: Promise<void> | null = null;

function buildScriptUrl(): string | null {
  if (DIRECT_API_KEY) {
    return `https://maps.googleapis.com/maps/api/js?key=${DIRECT_API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
  }
  if (FORGE_API_KEY) {
    return `${MAPS_PROXY_URL}/maps/api/js?key=${FORGE_API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
  }
  return null;
}

function loadMapScript(): Promise<void> {
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    const src = buildScriptUrl();
    if (!src) {
      reject(new Error("No Google Maps API key configured (set VITE_GOOGLE_MAPS_API_KEY)."));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.remove(); // Clean up immediately
      if (window.google?.maps) resolve();
      else reject(new Error("Google Maps script loaded but window.google.maps is unavailable."));
    };
    script.onerror = () => {
      reject(new Error("Failed to load the Google Maps script."));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    mapsScriptPromise = null; // allow retrying (e.g. after fixing the env var + reload)
    throw error;
  });

  return mapsScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  onError?: (error: Error) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  onError,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load Google Maps.";
      setLoadError(message);
      onError?.(error instanceof Error ? error : new Error(message));
      return;
    }
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
      mapId: "DEMO_MAP_ID",
    });
    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  if (loadError) {
    return (
      <div className={cn("grid w-full h-[500px] place-items-center bg-[#f3f0f6] px-6 text-center text-sm text-[#858096]", className)}>
        <div>
          <p className="font-medium text-[#5b5872]">Map couldn't load</p>
          <p className="mt-1 max-w-xs text-xs">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
