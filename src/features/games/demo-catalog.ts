/**
 * DEMO CATALOG — fictional titles used only when IGDB credentials are missing or for the
 * logged-out showcase. Every record is stored with dataSource = "demo" and an id prefixed
 * with "demo-", and is labelled "Demo Catalog" wherever it is displayed.
 */
export type DemoGame = {
  slug: string;
  title: string;
  year: number;
  platforms: number[]; // IGDB platform ids
  genres: string[];
  series?: string;
  developer: string;
  summary: { tr: string; en: string };
  palette: [string, string];
};

const s = (tr: string, en: string) => ({ tr, en });

export const DEMO_GAMES: DemoGame[] = [
  { slug: "ember-frontier", title: "Ember Frontier", year: 2003, platforms: [11], genres: ["Action", "Adventure"], series: "Frontier", developer: "Demo Studio North", summary: s("Kül kaplı bir sınırda hayatta kalma macerası.", "A survival adventure on an ash-covered frontier."), palette: ["#5a2a12", "#e08a3c"] },
  { slug: "void-protocol", title: "Void Protocol", year: 2004, platforms: [11, 6], genres: ["Shooter"], developer: "Demo Studio North", summary: s("Terk edilmiş bir yörünge istasyonunda taktik çatışma.", "Tactical firefights aboard an abandoned orbital station."), palette: ["#0f2a3a", "#4fb3d9"] },
  { slug: "titanfell-depths", title: "Titanfell Depths", year: 2007, platforms: [12], genres: ["Action"], series: "Titanfell", developer: "Demo Forge", summary: s("Dev makinelerin gömüldüğü derinliklere iniş.", "A descent into depths where giant machines lie buried."), palette: ["#2a2f20", "#a3b86c"] },
  { slug: "silent-grove", title: "Silent Grove", year: 2009, platforms: [12, 9], genres: ["Horror"], developer: "Demo Forge", summary: s("Sisli bir korulukta psikolojik gerilim.", "Psychological suspense in a fog-bound grove."), palette: ["#1b2a22", "#7da58c"] },
  { slug: "neon-horizons", title: "Neon Horizons", year: 2011, platforms: [12, 9, 6], genres: ["Racing"], developer: "Demo Velocity", summary: s("Gece şehirlerinde yüksek hızlı yarışlar.", "High-speed races through night cities."), palette: ["#2b0f3a", "#c45bf0"] },
  { slug: "crimson-tides", title: "Crimson Tides", year: 2012, platforms: [12, 9], genres: ["Strategy"], developer: "Demo Harbor", summary: s("Kızıl denizlerde filo komutası.", "Fleet command on crimson seas."), palette: ["#3a0f12", "#e0464f"] },
  { slug: "broken-skies", title: "Broken Skies", year: 2015, platforms: [49, 48, 6], genres: ["Action", "Flight"], developer: "Demo Aero", summary: s("Parçalanmış gökyüzü adaları arasında hava savaşı.", "Dogfights among shattered sky islands."), palette: ["#14243a", "#7fa8e0"] },
  { slug: "verdant", title: "Verdant", year: 2016, platforms: [49, 6], genres: ["Adventure"], developer: "Demo Grove", summary: s("Yeşile bürünmüş bir dünyayı yeniden keşif.", "Rediscovering a world reclaimed by green."), palette: ["#10301a", "#5fcf7d"] },
  { slug: "steel-requiem", title: "Steel Requiem", year: 2018, platforms: [49, 48], genres: ["Action", "RPG"], series: "Titanfell", developer: "Demo Forge", summary: s("Çelik zırhlı şövalyelerin son ağıtı.", "The last requiem of steel-clad knights."), palette: ["#222428", "#b9bec7"] },
  { slug: "ashen-covenant", title: "Ashen Covenant", year: 2021, platforms: [169, 167, 6], genres: ["RPG"], developer: "Demo Ember", summary: s("Kül ve yeminle örülmüş karanlık bir RPG.", "A dark RPG woven from ash and oaths."), palette: ["#2e1a10", "#d98a4a"] },
  { slug: "orbital", title: "Orbital", year: 2022, platforms: [169, 6], genres: ["Simulation"], developer: "Demo Aero", summary: s("Yörüngede istasyon kurma simülasyonu.", "A station-building simulation in orbit."), palette: ["#0c1a2c", "#6bb6ff"] },
  { slug: "last-light", title: "Last Light", year: 2023, platforms: [169, 167], genres: ["Horror", "Adventure"], developer: "Demo Grove", summary: s("Son ışık sönmeden önce bir kaçış.", "An escape before the last light fades."), palette: ["#1c1a14", "#f2d27a"] },
  { slug: "starfall-chronicles", title: "Starfall Chronicles", year: 1998, platforms: [7], genres: ["RPG"], series: "Starfall", developer: "Demo Atlas", summary: s("Bir gizem galaksisi. Bir keşif mirası.", "A galaxy of mystery. A legacy of discovery."), palette: ["#141a3c", "#8a7cf0"] },
  { slug: "shadow-realms", title: "Shadow Realms", year: 1999, platforms: [7], genres: ["Action", "Adventure"], developer: "Demo Atlas", summary: s("Gölgeler diyarında klasik bir macera.", "A classic adventure through realms of shadow."), palette: ["#151515", "#8e8e9e"] },
  { slug: "echoes-of-aeris", title: "Echoes of Aeris", year: 2002, platforms: [8], genres: ["RPG"], series: "Starfall", developer: "Demo Atlas", summary: s("Kayıp bir gök krallığından yankılar.", "Echoes from a lost sky kingdom."), palette: ["#10243a", "#7fd0f0"] },
  { slug: "bloodline", title: "Bloodline", year: 2004, platforms: [8], genres: ["Action"], developer: "Demo Ember", summary: s("Bir hanedanın kanlı mirası.", "The bloody legacy of a dynasty."), palette: ["#2a0a0c", "#d0343c"] },
  { slug: "frostpunker", title: "Frostpunker", year: 2005, platforms: [8, 6], genres: ["Strategy"], developer: "Demo Harbor", summary: s("Donmuş bir şehirde kaynak yönetimi.", "Resource management in a frozen city."), palette: ["#14222e", "#bfe3f2"] },
  { slug: "the-obsidian-path", title: "The Obsidian Path", year: 2008, platforms: [9], genres: ["Adventure"], developer: "Demo Grove", summary: s("Volkanik camdan bir yolda hac.", "A pilgrimage along a path of volcanic glass."), palette: ["#111014", "#a48be0"] },
  { slug: "dreamers-veil", title: "Dreamer's Veil", year: 2010, platforms: [9, 12], genres: ["Puzzle"], developer: "Demo Atlas", summary: s("Rüyalar arasında bulmaca yolculuğu.", "A puzzle journey between dreams."), palette: ["#2a1436", "#e09be8"] },
  { slug: "northwind", title: "Northwind", year: 2014, platforms: [48, 49, 6], genres: ["RPG"], developer: "Demo Harbor", summary: s("Kuzey rüzgârının taşıdığı bir destan.", "A saga carried by the northern wind."), palette: ["#132430", "#9ec6d8"] },
  { slug: "celestial-drift", title: "Celestial Drift", year: 2017, platforms: [48], genres: ["Racing"], developer: "Demo Velocity", summary: s("Takımyıldızlar arasında drift.", "Drifting between constellations."), palette: ["#0e1430", "#5a78ff"] },
  { slug: "riven-gate", title: "Riven Gate", year: 2019, platforms: [48, 6], genres: ["Action", "RPG"], developer: "Demo Ember", summary: s("Yarılmış bir kapının ardındaki dünya.", "The world beyond a riven gate."), palette: ["#2a1810", "#e0a050"] },
  { slug: "lumen", title: "Lumen", year: 2021, platforms: [167], genres: ["Adventure"], developer: "Demo Grove", summary: s("Işığı takip eden sessiz bir yolculuk.", "A quiet journey following the light."), palette: ["#1a1f2a", "#f0e6b0"] },
  { slug: "silent-paradox", title: "Silent Paradox", year: 2024, platforms: [167, 6], genres: ["Horror"], developer: "Demo Forge", summary: s("Zamanın kırıldığı sessiz bir paradoks.", "A silent paradox where time fractures."), palette: ["#0c0f14", "#7a8aa0"] },
  { slug: "chronicles-of-elysium", title: "Chronicles of Elysium", year: 2013, platforms: [6], genres: ["RPG", "Strategy"], developer: "Demo Atlas", summary: s("Elysium'un tarihine uzanan strateji RPG.", "A strategy RPG through Elysium's history."), palette: ["#1e1a10", "#d5b477"] },
  { slug: "iron-wake", title: "Iron Wake", year: 2016, platforms: [6], genres: ["Simulation"], developer: "Demo Harbor", summary: s("Demir zırhlı gemilerle okyanus seferi.", "An ocean voyage with ironclad ships."), palette: ["#14181c", "#8a9aa8"] },
  { slug: "the-black-atlas", title: "The Black Atlas", year: 2018, platforms: [6], genres: ["Adventure"], developer: "Demo Atlas", summary: s("Haritalanmamış toprakların kara atlası.", "The black atlas of uncharted lands."), palette: ["#0e0e10", "#c9b27a"] },
  { slug: "fractured-mind", title: "Fractured Mind", year: 2020, platforms: [6], genres: ["Puzzle", "Horror"], developer: "Demo Grove", summary: s("Parçalanmış bir zihinde bulmacalar.", "Puzzles inside a fractured mind."), palette: ["#1a1420", "#c08ad8"] },
  { slug: "emberlight", title: "Emberlight", year: 2022, platforms: [6], genres: ["Action"], series: "Frontier", developer: "Demo Studio North", summary: s("Közlerin ışığında bir sınır hikâyesi.", "A frontier tale by ember light."), palette: ["#2a140a", "#f09040"] },
  { slug: "voidlands", title: "Voidlands", year: 2023, platforms: [6], genres: ["Shooter"], developer: "Demo Studio North", summary: s("Boşluk topraklarında keşif ve çatışma.", "Exploration and conflict in the voidlands."), palette: ["#110c1c", "#8a6cf0"] },
  { slug: "synthesis", title: "Synthesis", year: 2019, platforms: [6], genres: ["Simulation"], developer: "Demo Velocity", summary: s("Yapay bir ekosistemi dengede tut.", "Keep an artificial ecosystem in balance."), palette: ["#0c1c1a", "#5ad0b0"] },
  { slug: "aeterna", title: "Aeterna", year: 2024, platforms: [6, 167], genres: ["RPG"], series: "Starfall", developer: "Demo Atlas", summary: s("Sonsuzluğa açılan bir RPG destanı.", "An RPG saga opening onto eternity."), palette: ["#141028", "#b0a0ff"] },
];

export const demoGameId = (slug: string) => `demo-${slug}`;

/** Ownership layout for the logged-out demo museum (never written to a user account). */
export const DEMO_OWNERSHIP: { slug: string; generationId: string; ownership: "physical" | "digital"; status: "completed" | "playing" | "backlog"; favorite?: boolean }[] = [
  { slug: "ember-frontier", generationId: "xbox-og", ownership: "physical", status: "completed", favorite: true },
  { slug: "void-protocol", generationId: "xbox-og", ownership: "physical", status: "completed" },
  { slug: "titanfell-depths", generationId: "x360", ownership: "physical", status: "completed" },
  { slug: "silent-grove", generationId: "x360", ownership: "physical", status: "backlog" },
  { slug: "neon-horizons", generationId: "x360", ownership: "physical", status: "playing" },
  { slug: "crimson-tides", generationId: "x360", ownership: "physical", status: "completed" },
  { slug: "broken-skies", generationId: "xone", ownership: "digital", status: "completed" },
  { slug: "verdant", generationId: "xone", ownership: "physical", status: "backlog" },
  { slug: "steel-requiem", generationId: "xone", ownership: "physical", status: "completed" },
  { slug: "ashen-covenant", generationId: "xseries", ownership: "physical", status: "playing", favorite: true },
  { slug: "orbital", generationId: "xseries", ownership: "digital", status: "backlog" },
  { slug: "last-light", generationId: "xseries", ownership: "physical", status: "completed" },
  { slug: "starfall-chronicles", generationId: "ps1", ownership: "physical", status: "completed", favorite: true },
  { slug: "shadow-realms", generationId: "ps1", ownership: "physical", status: "completed" },
  { slug: "echoes-of-aeris", generationId: "ps2", ownership: "physical", status: "completed" },
  { slug: "bloodline", generationId: "ps2", ownership: "physical", status: "completed" },
  { slug: "frostpunker", generationId: "ps2", ownership: "physical", status: "backlog" },
  { slug: "the-obsidian-path", generationId: "ps3", ownership: "physical", status: "completed" },
  { slug: "dreamers-veil", generationId: "ps3", ownership: "physical", status: "backlog" },
  { slug: "northwind", generationId: "ps4", ownership: "physical", status: "completed" },
  { slug: "celestial-drift", generationId: "ps4", ownership: "digital", status: "playing" },
  { slug: "riven-gate", generationId: "ps4", ownership: "physical", status: "completed" },
  { slug: "lumen", generationId: "ps5", ownership: "physical", status: "completed" },
  { slug: "silent-paradox", generationId: "ps5", ownership: "physical", status: "playing" },
  { slug: "aeterna", generationId: "ps5", ownership: "physical", status: "backlog", favorite: true },
  { slug: "chronicles-of-elysium", generationId: "pc-steam", ownership: "digital", status: "completed" },
  { slug: "iron-wake", generationId: "pc-steam", ownership: "digital", status: "backlog" },
  { slug: "the-black-atlas", generationId: "pc-steam", ownership: "digital", status: "completed" },
  { slug: "fractured-mind", generationId: "pc-steam", ownership: "digital", status: "playing" },
  { slug: "emberlight", generationId: "pc-epic", ownership: "digital", status: "completed" },
  { slug: "voidlands", generationId: "pc-gog", ownership: "digital", status: "backlog" },
  { slug: "synthesis", generationId: "pc-gog", ownership: "digital", status: "completed" },
  { slug: "aeterna", generationId: "pc-steam", ownership: "digital", status: "playing" },
];

export function demoPalette(catalogGameId: string): [string, string] | undefined {
  return DEMO_GAMES.find((g) => demoGameId(g.slug) === catalogGameId)?.palette;
}
