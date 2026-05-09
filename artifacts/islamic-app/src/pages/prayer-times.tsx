import React, { useState } from "react";
import { usePrayerTimes } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Search } from "lucide-react";

export function PrayerTimes() {
  const [city, setCity] = useState("Jeddah");
  const [country, setCountry] = useState("Saudi Arabia");
  
  const [searchInput, setSearchInput] = useState("Jeddah, Saudi Arabia");

  const { data, isLoading, refetch } = usePrayerTimes(city, country);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = searchInput.split(",");
    if (parts.length >= 1) {
      setCity(parts[0].trim());
      if (parts.length > 1) {
        setCountry(parts[1].trim());
      }
    }
  };

  const prayers = [
    { id: "Fajr", name: "Fajr", icon: "🌅" },
    { id: "Sunrise", name: "Sunrise", icon: "☀️" },
    { id: "Dhuhr", name: "Dhuhr", icon: "🌤️" },
    { id: "Asr", name: "Asr", icon: "⛅" },
    { id: "Maghrib", name: "Maghrib", icon: "🌇" },
    { id: "Isha", name: "Isha", icon: "🌙" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">Prayer Times</h1>
        <p className="text-muted-foreground">Check daily prayer times for your location.</p>
      </header>

      <Card className="bg-card shadow-md border-border">
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-muted/50 border-b border-border flex justify-between items-center">
              <span className="font-medium text-foreground">{data?.date.readable}</span>
              <span className="font-serif text-primary">{data?.date.hijri.day} {data?.date.hijri.month.en} {data?.date.hijri.year}</span>
            </div>
            <div className="divide-y divide-border">
              {prayers.map((prayer) => {
                const time = data?.timings[prayer.id as keyof typeof data.timings] as string;
                // Simple logic to highlight current prayer
                const now = new Date();
                const [h, m] = time?.split(":") || ["0", "0"];
                const prayerTime = new Date();
                prayerTime.setHours(Number(h), Number(m), 0);
                
                return (
                  <div key={prayer.id} className={`flex items-center justify-between p-6 transition-colors hover:bg-muted/30`} data-testid={`prayer-row-${prayer.id}`}>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl opacity-50 grayscale">{prayer.icon}</span>
                      <span className="text-xl font-medium text-foreground">{prayer.name}</span>
                    </div>
                    <div className="text-2xl font-bold font-serif text-primary">
                      {time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}