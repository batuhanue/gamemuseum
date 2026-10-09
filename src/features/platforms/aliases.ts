const ALIASES: Record<string, string> = {
  "xbox": "xbox-og", "original xbox": "xbox-og", "xbox original": "xbox-og", "xbox og": "xbox-og", "xbox-og": "xbox-og",
  "xbox 360": "x360", "x360": "x360", "360": "x360",
  "xbox one": "xone", "xone": "xone", "xb1": "xone",
  "xbox series x": "xseries", "xbox series s": "xseries", "xbox series x|s": "xseries", "xbox series": "xseries", "series x": "xseries", "xsx": "xseries", "xseries": "xseries",
  "ps1": "ps1", "psx": "ps1", "playstation": "ps1", "playstation 1": "ps1", "ps one": "ps1",
  "ps2": "ps2", "playstation 2": "ps2",
  "ps3": "ps3", "playstation 3": "ps3",
  "ps4": "ps4", "playstation 4": "ps4",
  "ps5": "ps5", "playstation 5": "ps5",
  "steam": "pc-steam", "pc steam": "pc-steam", "pc-steam": "pc-steam",
  "epic": "pc-epic", "epic games": "pc-epic", "egs": "pc-epic", "pc-epic": "pc-epic",
  "gog": "pc-gog", "gog.com": "pc-gog", "pc-gog": "pc-gog",
  "pc": "pc-other", "windows": "pc-other", "pc other": "pc-other", "pc-other": "pc-other", "other pc": "pc-other",
};

/** Normalises free-text platform names from CSV files to generation ids. */
export function generationFromAlias(input: string | undefined | null): string | null {
  if (!input) return null;
  const k = input.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").replace(/play station/g, "playstation").trim();
  return ALIASES[k] ?? ALIASES[k.replace(/\s/g, "")] ?? null;
}
