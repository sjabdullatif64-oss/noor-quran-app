import React, { useState } from "react";
import { usePrayerTimes } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Search } from "lucide-react";
import { getCity, getCountry, setCity as saveCity, CITY_COUNTRY_MAP, PRESET_CITIES } from "@/lib/settings";

export function PrayerTimes() {
  const [city, setCity] = useState(() => getCity());
  const [country, setCountry] = useState(() => getCountry());
  const [searchInput, setSearchInput] = useState(() => {
    const c = getCity();
    const co = getCountry();
    return `${c}, ${co}`;
  });

  const { data, isLoading, error } = usePrayerTimes(city, country);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = searchInput.split(",");
    const newCity = parts[0]?.trim() ?? city;
    const newCountry = parts[1]?.trim() ?? country;
    setCity(newCity);
    setCountry(newCountry);
    saveCity(newCity);
  };

  const handlePresetCity = (presetCity: string) => {
    const presetCountry = CITY_COUNTRY_MAP[presetCity] ?? "Saudi Arabia";
    setCity(presetCity);
    setCountry(presetCountry);
    setSearchInput(`${presetCity}, ${presetCountry}`);
    saveCity(presetCity);
  };

  const prayers = [
    { id: "Fajr", name: "Fajr", icon: "🌅" },
    { id: "Sunrise", name: "Sunrise", icon: "☀️" },
    { id: "Dhuhr", name: "Dhuhr", icon: "🌤️" },
    { id: "Asr", name: "Asr", icon: "⛅" },
    { id: "Maghrib", name: "Maghrib", icon: "🌇" },
    { id: "Isha", name: "Isha", icon: "🌙" },
  ];

  // Determine current/next prayer
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let currentPrayerIdx = -1;
  if (data) {
    for (let i = prayers.length - 1; i >= 0; i--) {
      const t = data.timings[prayers[i].id] as string;
      const [h, m] = t.split(":").map(Number);
      if (nowMins >= h * 60 + m) { currentPrayerIdx = i; break; }
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto pb-24 md:pb-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">Prayer Times</h1>
        <p className="text-muted-foreground">Daily prayer times for your city.</p>
      </header>

      {/* Search */}
      <Card className="bg-card shadow-md border-border">
        <CardContent className="p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2" data-testid="form-search-location">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="City, Country (e.g. London, UK)"
                className="pl-10"
                data-testid="input-location"
              />
            </div>
            <Button type="submit" data-testid="button-search-location">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>

          {/* Preset cities */}
          <div className="flex flex-wrap gap-2">
            {PRESET_CITIES.map((c) => (
              <button
                key={c}
                onClick={() => handlePresetCity(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  city === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
                data-testid={`preset-city-${c.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {c}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {error ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">City not found</p>
            <p className="text-sm mt-1">Try "London, UK" or "Karachi, Pakistan"</p>
          </div>
        ) : isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-muted/50 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">{city}, {country}</span>
              </div>
              <span className="font-serif text-primary text-sm">
                {data?.date.hijri.day} {data?.date.hijri.month.en} {data?.date.hijri.year}
              </span>
            </div>
            <div className="divide-y divide-border">
              {prayers.map((prayer, idx) => {
                const time = data?.timings[prayer.id as keyof typeof data.timings] as string;
                const isCurrent = idx === currentPrayerIdx;
                const isNext = idx === (currentPrayerIdx + 1) % prayers.length;
                return (
                  <div
                    key={prayer.id}
                    className={`flex items-center justify-between px-6 py-5 transition-colors ${
                      isCurrent ? "bg-primary/5 border-l-4 border-l-primary" : isNext ? "bg-muted/20" : ""
                    }`}
                    data-testid={`prayer-row-${prayer.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{prayer.icon}</span>
                      <div>
                        <span className="text-lg font-medium text-foreground">{prayer.name}</span>
                        {isCurrent && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary rounded-full px-2 py-0.5">Current</span>
                        )}
                        {isNext && (
                          <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">Next</span>
                        )}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold font-serif ${isCurrent ? "text-primary" : "text-foreground"}`}>
                      {time?.replace(/ \(.*\)/, "")}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">{data?.date.readable}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
