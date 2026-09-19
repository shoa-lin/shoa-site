export type MapProvider = "google" | "apple" | "baidu" | "amap";

export interface MapLink {
  provider: MapProvider;
  href: string;
}

export const mapProviders: MapProvider[] = ["google", "apple", "baidu", "amap"];

export function buildMapLinks(query: string, city?: string): MapLink[] {
  const encodedQuery = encodeURIComponent(query);
  const encodedCity = city ? encodeURIComponent(city) : undefined;

  return [
    { provider: "google", href: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}` },
    { provider: "apple", href: `https://maps.apple.com/?q=${encodedQuery}` },
    {
      provider: "baidu",
      href: `https://api.map.baidu.com/place/search?query=${encodedQuery}${encodedCity ? `&region=${encodedCity}` : ""}&output=html&src=webapp.shoa-lin.food`,
    },
    {
      provider: "amap",
      href: `https://uri.amap.com/search?keyword=${encodedQuery}${encodedCity ? `&city=${encodedCity}` : ""}&src=shoa-lin-food`,
    },
  ];
}
