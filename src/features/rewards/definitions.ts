export type AwardRarity = "common" | "rare" | "epic" | "legendary";
export type AwardMaterial = "bronze" | "silver" | "gold" | "crystal" | "obsidian";
export type AwardCategory = "milestone" | "platform" | "retro" | "series" | "curator" | "verified";

/**
 * Condition types understood by the server-side evaluator (src/features/rewards/engine.ts).
 *  total_games         { min }                     unique owned copies
 *  platform_games      { platformId, min }
 *  generation_games    { generationId, min }
 *  retro_generations   { min }                     distinct retro generations with ≥1 copy
 *  retro_shelf_full    {}                          any retro generation reaching its shelf capacity
 *  series_count        { min }                     ≥min copies sharing one series/franchise
 *  goal_completed      { types?: string[] }        any personal goal at 100 %
 *  completed_games     { min }                     status = completed
 *  event               { type }                    curator actions recorded as activity events
 */
export type AwardSeed = {
  id: string;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  category: AwardCategory;
  conditionType: string;
  conditionConfig: Record<string, unknown>;
  rarity: AwardRarity;
  material: AwardMaterial;
  points: number;
  sortOrder: number;
};

const milestone = (n: number, rarity: AwardRarity, material: AwardMaterial, tr: string, en: string, sortOrder: number): AwardSeed => ({
  id: n === 1 ? "first-game" : `games-${n}`,
  title: { tr, en },
  description: {
    tr: n === 1 ? "Koleksiyonuna ilk oyununu ekle." : `Koleksiyonuna ${n} oyun kopyası ekle.`,
    en: n === 1 ? "Add the first game to your collection." : `Add ${n} game copies to your collection.`,
  },
  category: "milestone",
  conditionType: "total_games",
  conditionConfig: { min: n },
  rarity,
  material,
  points: Math.round(5 + Math.log2(n + 1) * 8),
  sortOrder,
});

export const AWARDS: AwardSeed[] = [
  milestone(1, "common", "bronze", "İlk Koleksiyon", "First Exhibit", 0),
  milestone(10, "common", "bronze", "Onluk Raf", "Ten on the Shelf", 1),
  milestone(25, "rare", "silver", "Küratör Adayı", "Curator Candidate", 2),
  milestone(50, "rare", "silver", "Galeri Sahibi", "Gallery Owner", 3),
  milestone(100, "epic", "gold", "Yüzlük Kulüp", "Hundred Club", 4),
  milestone(250, "epic", "crystal", "Arşiv Ustası", "Archive Master", 5),
  milestone(500, "legendary", "obsidian", "Müze Efsanesi", "Museum Legend", 6),
  {
    id: "first-xbox", title: { tr: "Yeşil Kanat", en: "Green Wing" },
    description: { tr: "İlk Xbox oyununu ekle.", en: "Add your first Xbox game." },
    category: "platform", conditionType: "platform_games", conditionConfig: { platformId: "xbox", min: 1 },
    rarity: "common", material: "bronze", points: 10, sortOrder: 10,
  },
  {
    id: "first-playstation", title: { tr: "Mavi Kanat", en: "Blue Wing" },
    description: { tr: "İlk PlayStation oyununu ekle.", en: "Add your first PlayStation game." },
    category: "platform", conditionType: "platform_games", conditionConfig: { platformId: "playstation", min: 1 },
    rarity: "common", material: "bronze", points: 10, sortOrder: 11,
  },
  {
    id: "first-pc", title: { tr: "Çelik Kanat", en: "Steel Wing" },
    description: { tr: "İlk PC oyununu ekle.", en: "Add your first PC game." },
    category: "platform", conditionType: "platform_games", conditionConfig: { platformId: "pc", min: 1 },
    rarity: "common", material: "bronze", points: 10, sortOrder: 12,
  },
  {
    id: "xbox-50", title: { tr: "Xbox Tutkunu", en: "Xbox Devotee" },
    description: { tr: "50 Xbox oyunu arşivle.", en: "Archive 50 Xbox games." },
    category: "platform", conditionType: "platform_games", conditionConfig: { platformId: "xbox", min: 50 },
    rarity: "epic", material: "gold", points: 40, sortOrder: 13,
  },
  {
    id: "playstation-50", title: { tr: "PlayStation Hayranı", en: "PlayStation Devotee" },
    description: { tr: "50 PlayStation oyunu arşivle.", en: "Archive 50 PlayStation games." },
    category: "platform", conditionType: "platform_games", conditionConfig: { platformId: "playstation", min: 50 },
    rarity: "epic", material: "gold", points: 40, sortOrder: 14,
  },
  {
    id: "pc-100", title: { tr: "PC Koleksiyoncu", en: "PC Collector" },
    description: { tr: "100 PC oyunu arşivle.", en: "Archive 100 PC games." },
    category: "platform", conditionType: "platform_games", conditionConfig: { platformId: "pc", min: 100 },
    rarity: "epic", material: "crystal", points: 45, sortOrder: 15,
  },
  {
    id: "ps2-25", title: { tr: "Altın Çağ", en: "Golden Era" },
    description: { tr: "PlayStation 2 rafında 25 oyun topla.", en: "Collect 25 games on the PlayStation 2 shelf." },
    category: "platform", conditionType: "generation_games", conditionConfig: { generationId: "ps2", min: 25 },
    rarity: "rare", material: "silver", points: 30, sortOrder: 16,
  },
  {
    id: "x360-25", title: { tr: "Yeşil Nesil", en: "Green Generation" },
    description: { tr: "Xbox 360 rafında 25 oyun topla.", en: "Collect 25 games on the Xbox 360 shelf." },
    category: "platform", conditionType: "generation_games", conditionConfig: { generationId: "x360", min: 25 },
    rarity: "rare", material: "silver", points: 30, sortOrder: 17,
  },
  {
    id: "retro-traveler", title: { tr: "Zaman Yolcusu", en: "Time Traveler" },
    description: { tr: "En az üç farklı eski konsol neslinden oyun ekle.", en: "Own games from at least three retro console generations." },
    category: "retro", conditionType: "retro_generations", conditionConfig: { min: 3 },
    rarity: "rare", material: "silver", points: 30, sortOrder: 20,
  },
  {
    id: "retro-shelf-full", title: { tr: "Retro Ustası", en: "Retro Master" },
    description: { tr: "Bir retro nesil rafını tamamen doldur.", en: "Fill a retro generation shelf to capacity." },
    category: "retro", conditionType: "retro_shelf_full", conditionConfig: {},
    rarity: "epic", material: "gold", points: 40, sortOrder: 21,
  },
  {
    id: "series-archivist", title: { tr: "Seri Arşivcisi", en: "Series Archivist" },
    description: { tr: "Aynı seriden en az üç oyun arşivle.", en: "Archive at least three games from one series." },
    category: "series", conditionType: "series_count", conditionConfig: { min: 3 },
    rarity: "rare", material: "silver", points: 25, sortOrder: 30,
  },
  {
    id: "series-complete", title: { tr: "Tam Koleksiyon", en: "Complete Set" },
    description: { tr: "Bir seri veya kişisel hedef listeni tamamla.", en: "Complete one of your series or custom goal lists." },
    category: "series", conditionType: "goal_completed", conditionConfig: { types: ["series", "custom"] },
    rarity: "legendary", material: "gold", points: 60, sortOrder: 31,
  },
  {
    id: "first-layout", title: { tr: "İlk Düzen", en: "First Arrangement" },
    description: { tr: "İlk özel raf düzenini kaydet.", en: "Save your first custom shelf arrangement." },
    category: "curator", conditionType: "event", conditionConfig: { type: "layout_saved" },
    rarity: "common", material: "bronze", points: 10, sortOrder: 40,
  },
  {
    id: "first-theme", title: { tr: "İç Mimar", en: "Interior Architect" },
    description: { tr: "Müzene ilk temayı uygula.", en: "Apply your first museum theme." },
    category: "curator", conditionType: "event", conditionConfig: { type: "theme_applied" },
    rarity: "common", material: "bronze", points: 10, sortOrder: 41,
  },
  {
    id: "first-showcase", title: { tr: "Kürator", en: "Curator" },
    description: { tr: "Ödül vitrinini veya müze sergisini ilk kez düzenle.", en: "Arrange your award showcase or an exhibit for the first time." },
    category: "curator", conditionType: "event", conditionConfig: { type: "showcase_created" },
    rarity: "common", material: "silver", points: 15, sortOrder: 42,
  },
  {
    id: "storyteller", title: { tr: "Anlatıcı", en: "Storyteller" },
    description: { tr: "Koleksiyonun için bir açıklama yaz.", en: "Write a description for your collection." },
    category: "curator", conditionType: "event", conditionConfig: { type: "description_written" },
    rarity: "common", material: "bronze", points: 10, sortOrder: 43,
  },
  {
    id: "open-doors", title: { tr: "Açık Kapılar", en: "Open Doors" },
    description: { tr: "Müzeni paylaşıma aç.", en: "Open your museum for sharing." },
    category: "curator", conditionType: "event", conditionConfig: { type: "museum_shared" },
    rarity: "rare", material: "crystal", points: 20, sortOrder: 44,
  },
  {
    id: "completionist-10", title: { tr: "Tamamlayıcı", en: "Completionist" },
    description: { tr: "Koleksiyonundaki 10 oyunu 'tamamlandı' olarak işaretle.", en: "Mark 10 games in your collection as completed." },
    category: "milestone", conditionType: "completed_games", conditionConfig: { min: 10 },
    rarity: "rare", material: "gold", points: 25, sortOrder: 7,
  },
];
