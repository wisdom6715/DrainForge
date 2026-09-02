import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { reverseGeocode, searchPlaces, type PlaceSuggestion } from "@/lib/geocode";

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
}

interface LocationPickerProps {
  value: PickedLocation;
  onChange: (location: PickedLocation) => void;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the input in sync if the location changes from outside (e.g. "Use my location").
  useEffect(() => {
    setQuery(value.address);
  }, [value.address]);

  const runSearch = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      try {
        const results = await searchPlaces(text, controller.signal);
        setSuggestions(results);
        setOpen(true);
      } catch {
        // Silently ignore aborted/failed searches — the user is still typing.
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
    runSearch(text);
  };

  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    setQuery(suggestion.displayName);
    setSuggestions([]);
    setOpen(false);
    onChange({ latitude: suggestion.latitude, longitude: suggestion.longitude, address: suggestion.displayName, accuracy: 30 });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is unavailable", { description: "Your browser doesn't support geolocation." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          setQuery(address);
          onChange({ latitude, longitude, address, accuracy });
        } catch {
          const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setQuery(fallback);
          onChange({ latitude, longitude, address: fallback, accuracy });
        } finally {
          setLocating(false);
        }
      },
      () => {
        toast.info("Couldn't get your location", { description: "Check location permission, or type your address instead." });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="rounded-2xl border border-[#ddd5e5] bg-[#f4eff8] p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#8d7ea8]"><MapPin size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d7ea8]">Location</p>
          <div className="relative mt-2">
            <Input
              value={query}
              onChange={(event) => handleInputChange(event.target.value)}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onBlur={() => {
                // Delay so a click on a suggestion registers before the list closes.
                setTimeout(() => setOpen(false), 150);
              }}
              placeholder="Start typing a street, landmark, or area…"
              className="rounded-xl border-[#ded8e4] bg-white text-sm text-[#403f58] placeholder:text-[#b1acba]"
            />
            {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#b1acba]" />}
            {open && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-[#e5e0e8] bg-white shadow-lg">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs text-[#5b5872] transition hover:bg-[#f4eff8]"
                  >
                    <MapPin size={13} className="mt-0.5 shrink-0 text-[#a896bc]" />
                    <span>{suggestion.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-[#858096]">Pick a suggestion as you type, or use your current location. Accuracy ± {Math.round(value.accuracy)}m.</p>
        </div>
      </div>
      <Button type="button" onClick={useMyLocation} disabled={locating} variant="outline" className="mt-5 rounded-full border-[#d8cfe0] bg-white/60 text-xs uppercase tracking-[0.16em] text-[#5b5872]">
        <Crosshair size={14} /> {locating ? "Locating…" : "Use my location"}
      </Button>
      <p className="mt-3 text-[10px] text-[#b1acba]">Search powered by OpenStreetMap</p>
    </div>
  );
}
