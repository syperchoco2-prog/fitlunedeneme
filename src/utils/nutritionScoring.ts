import type {
  BarcodeProduct,
  DataQuality,
  ProcessingLevel,
  ScoringCategory,
} from '../types';

export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';
type NutriScoreSource = 'database' | 'derived' | 'unavailable';
type MetricId = 'energy' | 'sugar' | 'saturatedFat' | 'salt' | 'protein' | 'fiber';

type ScoringProduct = Pick<
  BarcodeProduct,
  | 'productName'
  | 'brand'
  | 'productCategory'
  | 'scoringCategory'
  | 'processingLevel'
  | 'hasAddedSugar'
  | 'hasSweetener'
  | 'dataQuality'
  | 'ingredients'
  | 'energyKcal'
  | 'fat'
  | 'saturatedFat'
  | 'carbs'
  | 'protein'
  | 'sugar'
  | 'salt'
  | 'fiber'
  | 'nutriscore'
>;

interface ComponentPoints {
  energy: number;
  sugar: number;
  saturatedFat: number;
  salt: number;
  sodium: number;
  fiber: number;
  protein: number;
  sweetener: number;
}

interface ComputedNutriScore {
  category: ScoringCategory;
  grade: NutriScoreGrade;
  nutritionScore: number;
  componentPoints: ComponentPoints;
}

export interface ResolvedNutriScore {
  grade?: NutriScoreGrade;
  source: NutriScoreSource;
  category?: ScoringCategory;
  nutritionScore?: number;
}

export interface FitluneInsight {
  id: string;
  text: string;
  weight: number;
}

export type FitluneScoreConfidence = 'high' | 'medium' | 'low';

export interface FitluneScore {
  score: number;
  label: string;
  color: string;
  gradient: string;
  positives: FitluneInsight[];
  negatives: FitluneInsight[];
  summary: string;
  nutriScore: ResolvedNutriScore;
  confidence: FitluneScoreConfidence;
  missingFields: string[];
  metricsUsed: string[];
  warnings: string[];
  scoringCategory?: ScoringCategory;
}

export const NUTRISCORE_STYLE: Record<NutriScoreGrade, { bg: string; text: string }> = {
  A: { bg: 'bg-[#1E8F4E]', text: 'text-white' },
  B: { bg: 'bg-[#7AC142]', text: 'text-white' },
  C: { bg: 'bg-[#F5C400]', text: 'text-zinc-900' },
  D: { bg: 'bg-[#EF7D00]', text: 'text-white' },
  E: { bg: 'bg-[#E63312]', text: 'text-white' },
};

const WATER_KEYWORDS = [
  'su',
  'water',
  'icme suyu',
  'kaynak suyu',
  'dogal kaynak suyu',
  'maden suyu',
  'mineral water',
  'sparkling water',
];

const FLAVORED_WATER_KEYWORDS = ['aromali', 'meyveli', 'flavored', 'flavoured', 'limonlu', 'portakalli', 'cilekli'];

const BEVERAGE_KEYWORDS = [
  'icecek',
  'iceceg',
  'drink',
  'beverage',
  'cola',
  'kola',
  'gazoz',
  'gazli',
  'soda',
  'limonata',
  'smoothie',
  'meyve suyu',
  'fruit juice',
  'juice',
  'nectar',
  'nektar',
  'enerji icecegi',
  'energy drink',
  'shake',
  'iced tea',
  'ice tea',
  'kahve icecegi',
  'coffee drink',
  'kombucha',
];

const PLAIN_DAIRY_KEYWORDS = ['sut', 'milk', 'ayran', 'kefir'];
const SWEET_DAIRY_KEYWORDS = ['cikolatali', 'çikolatalı', 'muzlu', 'cilekli', 'çilekli', 'vanilyali', 'aromali', 'balli', 'meyveli'];
const CHEESE_KEYWORDS = ['peynir', 'cheese', 'kasar', 'kaşar', 'cheddar', 'mozzarella', 'gouda', 'parmesan', 'labne', 'lor'];
const FAT_NUT_SEED_KEYWORDS = [
  'zeytinyagi',
  'olive oil',
  'tereyagi',
  'butter',
  'margarin',
  'tahin',
  'fistik ezmesi',
  'peanut butter',
  'badem ezmesi',
  'almond butter',
  'findik ezmesi',
  'hazelnut butter',
  'badem',
  'almond',
  'ceviz',
  'walnut',
  'findik',
  'hazelnut',
  'fistik',
  'peanut',
  'kaju',
  'cashew',
  'kabak cekirdegi',
  'pumpkin seed',
  'chia',
  'keten tohumu',
  'flaxseed',
];

const SOUP_KEYWORDS = ['corba', 'çorba', 'soup', 'broth'];
const ADDITIVE_KEYWORDS = ['emulgator', 'emülgatör', 'stabilizator', 'stabilizatör', 'renklendirici', 'koruyucu', 'aroma verici'];
const ADDED_SUGAR_KEYWORDS = ['seker', 'şeker', 'glukoz', 'fruktoz', 'fructose', 'glucose', 'surup', 'şurup', 'bal', 'pekmez', 'maltodekstrin'];
const NON_NUTRITIVE_SWEETENER_KEYWORDS = [
  'aspartam',
  'aspartame',
  'asesulfam',
  'acesulfame',
  'sukraloz',
  'sucralose',
  'sakkarin',
  'saccharin',
  'stevia',
  'steviol',
  'siklamat',
  'cyclamate',
  'neotame',
  'advantame',
];

const FOOD_ENERGY_THRESHOLDS = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const FOOD_SUGAR_THRESHOLDS = [3.4, 6.8, 10.2, 13.6, 17, 20.4, 23.8, 27.2, 30.6, 34];
const FOOD_SATURATED_FAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FOOD_SALT_THRESHOLDS = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2];
const BEVERAGE_ENERGY_THRESHOLDS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270];
const BEVERAGE_SUGAR_THRESHOLDS = [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11];
const BEVERAGE_SATURATED_FAT_THRESHOLDS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const FOOD_FIBER_THRESHOLDS = [3.0, 4.1, 5.2, 6.3, 7.4];
const FOOD_PROTEIN_THRESHOLDS = [2.4, 4.8, 7.2, 9.6, 12];
const BEVERAGE_PROTEIN_THRESHOLDS = [1.2, 2.4, 3.6, 4.8, 6.0];
const SODIUM_THRESHOLDS_MG = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];

const METRIC_LABELS: Record<MetricId, string> = {
  energy: 'Enerji',
  sugar: 'Şeker',
  saturatedFat: 'Doymuş yağ',
  salt: 'Tuz',
  protein: 'Protein',
  fiber: 'Lif',
};

const DATA_QUALITY_LABELS: Record<DataQuality, string> = {
  verified_label: 'Etiket doğrulandı',
  partial_label: 'Kısmi etiket',
  estimated: 'Tahmini veri',
  legacy: 'Eski kayıt',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}%/+-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function toNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
}

function formatMetricValue(value: number, unit: 'g' | 'kcal'): string {
  const formatted = Number(value.toFixed(value < 10 ? 1 : 0)).toLocaleString('tr-TR', {
    maximumFractionDigits: value < 10 ? 1 : 0,
  });
  return `${formatted} ${unit}`;
}

function scoreByThresholds(value: number, thresholds: readonly number[]): number {
  return thresholds.reduce((points, threshold) => (value > threshold ? points + 1 : points), 0);
}

export function saltToSodiumMg(saltGrams: number): number {
  return Number((saltGrams * 400).toFixed(0));
}

function normalizeNutriGrade(value: string | undefined): NutriScoreGrade | undefined {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D' || value === 'E' ? value : undefined;
}

function getDataQuality(product: ScoringProduct): DataQuality {
  return product.dataQuality ?? 'estimated';
}

function getMetricValue(
  product: ScoringProduct,
  key: keyof Pick<ScoringProduct, 'energyKcal' | 'fat' | 'saturatedFat' | 'carbs' | 'protein' | 'sugar' | 'salt' | 'fiber'>,
): number | null {
  const value = toNumberOrNull(product[key]);
  if (value == null) {
    return null;
  }

  if (getDataQuality(product) === 'legacy' && value === 0) {
    return null;
  }

  return value;
}

function buildSearchText(product: ScoringProduct): string {
  return normalizeText(`${product.brand ?? ''} ${product.productName} ${product.productCategory ?? ''} ${product.ingredients ?? ''}`);
}

function inferHasAddedSugar(product: ScoringProduct, text: string): boolean {
  if (typeof product.hasAddedSugar === 'boolean') {
    return product.hasAddedSugar;
  }

  return hasKeyword(text, ADDED_SUGAR_KEYWORDS);
}

function inferHasSweetener(product: ScoringProduct, text: string): boolean {
  if (typeof product.hasSweetener === 'boolean') {
    return product.hasSweetener;
  }

  return hasKeyword(text, NON_NUTRITIVE_SWEETENER_KEYWORDS);
}

function inferProcessingLevel(product: ScoringProduct, text: string): ProcessingLevel | undefined {
  if (product.processingLevel) {
    return product.processingLevel;
  }

  if (hasKeyword(text, NON_NUTRITIVE_SWEETENER_KEYWORDS) || hasKeyword(text, ADDITIVE_KEYWORDS)) {
    return 'ultra_processed';
  }

  return undefined;
}

function isAlmostPlainWater(product: ScoringProduct): boolean {
  const energy = getMetricValue(product, 'energyKcal');
  const sugar = getMetricValue(product, 'sugar');
  const fat = getMetricValue(product, 'fat');
  const saturatedFat = getMetricValue(product, 'saturatedFat');
  const protein = getMetricValue(product, 'protein');
  const salt = getMetricValue(product, 'salt');

  return (
    (energy == null || energy <= 5) &&
    (sugar == null || sugar <= 0.5) &&
    (fat == null || fat <= 0.5) &&
    (saturatedFat == null || saturatedFat <= 0.1) &&
    (protein == null || protein <= 0.5) &&
    (salt == null || salt <= 0.1)
  );
}

function detectCategory(product: ScoringProduct): ScoringCategory {
  if (product.scoringCategory) {
    return product.scoringCategory;
  }

  const text = buildSearchText(product);
  const sugar = getMetricValue(product, 'sugar');
  const fat = getMetricValue(product, 'fat');
  const addedSugar = inferHasAddedSugar(product, text);
  const sweetener = inferHasSweetener(product, text);

  if (hasKeyword(text, WATER_KEYWORDS) && !hasKeyword(text, FLAVORED_WATER_KEYWORDS) && isAlmostPlainWater(product)) {
    return 'water';
  }

  if (hasKeyword(text, CHEESE_KEYWORDS)) {
    return 'cheese';
  }

  if (hasKeyword(text, FAT_NUT_SEED_KEYWORDS) && (fat == null || fat >= 25)) {
    return 'fat_nuts_seeds';
  }

  if (hasKeyword(text, PLAIN_DAIRY_KEYWORDS)) {
    if (addedSugar || sweetener || hasKeyword(text, SWEET_DAIRY_KEYWORDS) || (sugar != null && sugar > 6.5)) {
      return 'sweetened_dairy';
    }

    return 'plain_dairy';
  }

  if (hasKeyword(text, BEVERAGE_KEYWORDS) && !hasKeyword(text, SOUP_KEYWORDS)) {
    return 'beverage';
  }

  return 'general_food';
}

function gradeForScore(category: ScoringCategory, nutritionScore: number): NutriScoreGrade {
  if (category === 'water') {
    return 'A';
  }

  if (category === 'beverage' || category === 'sweetened_dairy') {
    if (nutritionScore <= 2) return 'B';
    if (nutritionScore <= 6) return 'C';
    if (nutritionScore <= 9) return 'D';
    return 'E';
  }

  if (category === 'fat_nuts_seeds') {
    if (nutritionScore <= -6) return 'A';
    if (nutritionScore <= 2) return 'B';
    if (nutritionScore <= 10) return 'C';
    if (nutritionScore <= 18) return 'D';
    return 'E';
  }

  if (nutritionScore <= 0) return 'A';
  if (nutritionScore <= 2) return 'B';
  if (nutritionScore <= 10) return 'C';
  if (nutritionScore <= 18) return 'D';
  return 'E';
}

function computeOfficialNutriScore(product: ScoringProduct): ComputedNutriScore | null {
  const category = detectCategory(product);

  if (category === 'water') {
    return {
      category,
      grade: 'A',
      nutritionScore: -15,
      componentPoints: {
        energy: 0,
        sugar: 0,
        saturatedFat: 0,
        salt: 0,
        sodium: 0,
        fiber: 0,
        protein: 0,
        sweetener: 0,
      },
    };
  }

  const energyKcal = getMetricValue(product, 'energyKcal');
  const sugar = getMetricValue(product, 'sugar');
  const saturatedFat = getMetricValue(product, 'saturatedFat');
  const protein = getMetricValue(product, 'protein');
  const salt = getMetricValue(product, 'salt');
  const fiber = getMetricValue(product, 'fiber');

  if (energyKcal == null || sugar == null || saturatedFat == null || protein == null || salt == null) {
    return null;
  }

  if (category !== 'beverage' && category !== 'sweetened_dairy' && fiber == null) {
    return null;
  }

  const energyKj = Number((energyKcal * 4.184).toFixed(1));
  const sodiumMg = saltToSodiumMg(salt);
  const sweetener = inferHasSweetener(product, buildSearchText(product));

  if (category === 'beverage' || category === 'sweetened_dairy') {
    const componentPoints: ComponentPoints = {
      energy: scoreByThresholds(energyKj, BEVERAGE_ENERGY_THRESHOLDS),
      sugar: scoreByThresholds(sugar, BEVERAGE_SUGAR_THRESHOLDS),
      saturatedFat: scoreByThresholds(saturatedFat, BEVERAGE_SATURATED_FAT_THRESHOLDS),
      salt: 0,
      sodium: scoreByThresholds(sodiumMg, SODIUM_THRESHOLDS_MG),
      fiber: 0,
      protein: scoreByThresholds(protein, BEVERAGE_PROTEIN_THRESHOLDS),
      sweetener: sweetener ? 4 : 0,
    };

    const nutritionScore =
      componentPoints.energy +
      componentPoints.sugar +
      componentPoints.saturatedFat +
      componentPoints.sweetener -
      componentPoints.protein;

    return {
      category,
      grade: gradeForScore(category, nutritionScore),
      nutritionScore,
      componentPoints,
    };
  }

  const componentPoints: ComponentPoints = {
    energy: scoreByThresholds(energyKj, FOOD_ENERGY_THRESHOLDS),
    sugar: scoreByThresholds(sugar, FOOD_SUGAR_THRESHOLDS),
    saturatedFat: scoreByThresholds(saturatedFat, FOOD_SATURATED_FAT_THRESHOLDS),
    salt: scoreByThresholds(salt, FOOD_SALT_THRESHOLDS),
    sodium: scoreByThresholds(sodiumMg, SODIUM_THRESHOLDS_MG),
    fiber: scoreByThresholds(fiber ?? 0, FOOD_FIBER_THRESHOLDS),
    protein: scoreByThresholds(protein, FOOD_PROTEIN_THRESHOLDS),
    sweetener: 0,
  };

  const negativePoints =
    componentPoints.energy + componentPoints.sugar + componentPoints.saturatedFat + componentPoints.salt;
  const proteinPointsAllowed = category === 'cheese' || negativePoints < 11;
  const positivePoints = componentPoints.fiber + (proteinPointsAllowed ? componentPoints.protein : 0);
  const nutritionScore = negativePoints - positivePoints;

  return {
    category,
    grade: gradeForScore(category, nutritionScore),
    nutritionScore,
    componentPoints,
  };
}

function resolveStoredOrDerivedNutriScore(
  product: ScoringProduct,
  computed: ComputedNutriScore | null,
): ResolvedNutriScore {
  const storedGrade = normalizeNutriGrade(product.nutriscore);

  if (storedGrade) {
    return {
      grade: storedGrade,
      source: 'database',
      category: computed?.category ?? detectCategory(product),
      nutritionScore: computed?.grade === storedGrade ? computed.nutritionScore : undefined,
    };
  }

  if (computed) {
    return {
      grade: computed.grade,
      source: 'derived',
      category: computed.category,
      nutritionScore: computed.nutritionScore,
    };
  }

  return { source: 'unavailable', category: detectCategory(product) };
}

function getScoreTone(score: number): Pick<FitluneScore, 'label' | 'color' | 'gradient'> {
  if (score >= 85) {
    return { label: 'Çok İyi', color: 'text-emerald-600', gradient: 'from-emerald-400 to-emerald-600' };
  }

  if (score >= 70) {
    return { label: 'İyi', color: 'text-blue-600', gradient: 'from-blue-400 to-blue-600' };
  }

  if (score >= 55) {
    return { label: 'Dengeli', color: 'text-amber-600', gradient: 'from-amber-400 to-amber-600' };
  }

  if (score >= 35) {
    return { label: 'Dikkat', color: 'text-orange-600', gradient: 'from-orange-400 to-orange-600' };
  }

  return { label: 'Zayıf', color: 'text-red-600', gradient: 'from-red-400 to-red-600' };
}

function getCategoryLabel(category: ScoringCategory): string {
  switch (category) {
    case 'water':
      return 'su';
    case 'plain_dairy':
      return 'doğal süt ürünü';
    case 'sweetened_dairy':
      return 'şekerli süt ürünü';
    case 'cheese':
      return 'peynir';
    case 'fat_nuts_seeds':
      return 'yağ / ezme / kuruyemiş';
    case 'beverage':
      return 'içecek';
    default:
      return 'genel gıda';
  }
}

function limitInsights(insights: FitluneInsight[]): FitluneInsight[] {
  return insights
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3);
}

function joinItems(items: string[]): string {
  return items.join(', ');
}

function buildConfidence(
  usedMetricIds: MetricId[],
  missingFields: string[],
  product: ScoringProduct,
): { level: FitluneScoreConfidence; factor: number } {
  const coverage = usedMetricIds.length / Object.keys(METRIC_LABELS).length;
  const qualityWeight: Record<DataQuality, number> = {
    verified_label: 1,
    partial_label: 0.82,
    estimated: 0.62,
    legacy: 0.35,
  };
  const ratio = coverage * 0.72 + qualityWeight[getDataQuality(product)] * 0.28;

  if (ratio >= 0.78 && missingFields.length <= 2) {
    return { level: 'high', factor: 1 };
  }

  if (ratio >= 0.52) {
    return { level: 'medium', factor: 0.82 };
  }

  return { level: 'low', factor: 0.6 };
}

function buildInsights(
  product: ScoringProduct,
  category: ScoringCategory,
  processingLevel: ProcessingLevel | undefined,
  addedSugar: boolean,
  sweetener: boolean,
) {
  const positives: FitluneInsight[] = [];
  const negatives: FitluneInsight[] = [];
  const energy = getMetricValue(product, 'energyKcal');
  const sugar = getMetricValue(product, 'sugar');
  const saturatedFat = getMetricValue(product, 'saturatedFat');
  const salt = getMetricValue(product, 'salt');
  const protein = getMetricValue(product, 'protein');
  const fiber = getMetricValue(product, 'fiber');

  if (category === 'water') {
    positives.push({ id: 'water', text: 'Su bazlı ve çok düşük kalorili', weight: 8 });
  }

  if (category === 'plain_dairy' && sugar != null && sugar <= 5.5 && !addedSugar) {
    positives.push({ id: 'plain-dairy', text: `Doğal süt şekeri seviyesinde (${formatMetricValue(sugar, 'g')} / 100 g)`, weight: 6 });
  }

  if (protein != null) {
    if ((category === 'plain_dairy' && protein >= 3) || protein >= 5) {
      positives.push({ id: 'protein', text: `Protein iyi (${formatMetricValue(protein, 'g')} / 100 g)`, weight: protein + 2 });
    }
  }

  if (fiber != null && fiber >= 3) {
    positives.push({ id: 'fiber', text: `Lif iyi (${formatMetricValue(fiber, 'g')} / 100 g)`, weight: fiber + 1 });
  }

  if (salt != null && salt <= 0.3) {
    positives.push({ id: 'low-salt', text: `Tuz düşük (${formatMetricValue(salt, 'g')} / 100 g)`, weight: 5 });
  }

  if (energy != null) {
    const lowEnergyLimit = category === 'beverage' || category === 'sweetened_dairy' ? 30 : 120;
    if (energy <= lowEnergyLimit && category !== 'water') {
      positives.push({ id: 'low-energy', text: `Kalori yoğunluğu düşük (${formatMetricValue(energy, 'kcal')} / 100 g)`, weight: 3 });
    }
  }

  if (sugar != null) {
    if (category === 'sweetened_dairy' || category === 'beverage') {
      if (sugar >= 8) {
        negatives.push({ id: 'high-sugar', text: `Şeker yüksek (${formatMetricValue(sugar, 'g')} / 100 g)`, weight: sugar + 2 });
      }
    } else if (category !== 'plain_dairy' && sugar >= 8) {
      negatives.push({ id: 'high-sugar', text: `Şeker yüksek (${formatMetricValue(sugar, 'g')} / 100 g)`, weight: sugar + 2 });
    }
  }

  if (saturatedFat != null && saturatedFat >= 5) {
    negatives.push({ id: 'high-sat-fat', text: `Doymuş yağ yüksek (${formatMetricValue(saturatedFat, 'g')} / 100 g)`, weight: saturatedFat + 1 });
  }

  if (salt != null && salt >= 0.6) {
    negatives.push({ id: 'high-salt', text: `Tuz yüksek (${formatMetricValue(salt, 'g')} / 100 g)`, weight: salt * 10 + 2 });
  }

  if (energy != null) {
    const highEnergyLimit = category === 'beverage' || category === 'sweetened_dairy' ? 70 : 250;
    if (energy >= highEnergyLimit) {
      negatives.push({ id: 'high-energy', text: `Kalori yoğunluğu yüksek (${formatMetricValue(energy, 'kcal')} / 100 g)`, weight: energy / 25 + 1 });
    }
  }

  if (addedSugar) {
    negatives.push({ id: 'added-sugar', text: 'İlave şeker içeriyor', weight: 8 });
  }

  if (sweetener) {
    negatives.push({ id: 'sweetener', text: 'Tatlandırıcı içeriyor', weight: 6 });
  }

  if (processingLevel === 'ultra_processed') {
    negatives.push({ id: 'ultra-processed', text: 'Ultra işlenmiş görünüyor', weight: 7 });
  }

  return {
    positives: limitInsights(positives),
    negatives: limitInsights(negatives),
  };
}

function buildSummary(
  category: ScoringCategory,
  confidence: FitluneScoreConfidence,
  metricsUsed: string[],
  missingFields: string[],
  warnings: string[],
): string {
  const lead = `${getCategoryLabel(category)} kurallarıyla hesaplandı.`;

  if (confidence === 'high') {
    if (missingFields.length === 0) {
      return `${lead} Tüm ana besin verileri görünür durumda.`;
    }

    return `${lead} Çoğu temel veri var, eksik alanlar puanı sınırlı etkiliyor.`;
  }

  if (confidence === 'medium') {
    return `${lead} Kullanılan veriler: ${joinItems(metricsUsed)}. Eksik alanlar: ${joinItems(missingFields)}.`;
  }

  const warningText = warnings[0] ? ` ${warnings[0]}` : '';
  return `${lead} Eksik veriler nedeniyle puan temkinli tutuldu.${warningText}`;
}

export function resolveNutriScore(product: ScoringProduct): ResolvedNutriScore {
  return resolveStoredOrDerivedNutriScore(product, computeOfficialNutriScore(product));
}

export function calculateFitluneScore(product: ScoringProduct): FitluneScore {
  const category = detectCategory(product);
  const text = buildSearchText(product);
  const addedSugar = inferHasAddedSugar(product, text);
  const sweetener = inferHasSweetener(product, text);
  const processingLevel = inferProcessingLevel(product, text);
  const energy = getMetricValue(product, 'energyKcal');
  const sugar = getMetricValue(product, 'sugar');
  const saturatedFat = getMetricValue(product, 'saturatedFat');
  const salt = getMetricValue(product, 'salt');
  const protein = getMetricValue(product, 'protein');
  const fiber = getMetricValue(product, 'fiber');

  const usedMetricIds: MetricId[] = [];
  const missingFields: string[] = [];

  (Object.entries(METRIC_LABELS) as Array<[MetricId, string]>).forEach(([metricId, label]) => {
    const sourceKey: Record<MetricId, keyof Pick<ScoringProduct, 'energyKcal' | 'sugar' | 'saturatedFat' | 'salt' | 'protein' | 'fiber'>> = {
      energy: 'energyKcal',
      sugar: 'sugar',
      saturatedFat: 'saturatedFat',
      salt: 'salt',
      protein: 'protein',
      fiber: 'fiber',
    };
    if (getMetricValue(product, sourceKey[metricId]) == null) {
      missingFields.push(label);
    } else {
      usedMetricIds.push(metricId);
    }
  });

  let rawScore =
    category === 'water' ? 98 :
    category === 'plain_dairy' ? 68 :
    category === 'sweetened_dairy' ? 56 :
    category === 'beverage' ? 52 :
    category === 'cheese' ? 50 :
    category === 'fat_nuts_seeds' ? 58 :
    60;

  if (energy != null) {
    if (category === 'beverage' || category === 'sweetened_dairy') {
      if (energy <= 20) rawScore += 4;
      else if (energy <= 45) rawScore += 2;
      else if (energy >= 70) rawScore -= 5;
      else if (energy >= 110) rawScore -= 10;
    } else if (category !== 'water') {
      if (energy <= 120) rawScore += 2;
      if (energy >= 250) rawScore -= 6;
      if (energy >= 350) rawScore -= 10;
      if (energy >= 500) rawScore -= 14;
    }
  }

  if (sugar != null) {
    if (category === 'plain_dairy') {
      if (!addedSugar && sugar <= 5.5) rawScore += 4;
      if (sugar >= 7.5) rawScore -= 3;
    } else if (category === 'sweetened_dairy') {
      if (sugar <= 5) rawScore += 1;
      if (sugar >= 8) rawScore -= 6;
      if (sugar >= 12) rawScore -= 10;
      if (sugar >= 16) rawScore -= 14;
    } else if (category === 'beverage') {
      if (sugar <= 2) rawScore += 3;
      if (sugar >= 5) rawScore -= 5;
      if (sugar >= 8) rawScore -= 9;
      if (sugar >= 10) rawScore -= 13;
    } else {
      if (sugar <= 5) rawScore += 2;
      if (sugar >= 8) rawScore -= 4;
      if (sugar >= 12) rawScore -= 8;
      if (sugar >= 18) rawScore -= 14;
    }
  }

  if (saturatedFat != null) {
    if (saturatedFat <= 1.5) rawScore += 2;
    if (saturatedFat >= 3) rawScore -= 4;
    if (saturatedFat >= 5) rawScore -= 8;
    if (saturatedFat >= 8) rawScore -= 12;
  }

  if (salt != null) {
    if (salt <= 0.3) rawScore += 4;
    if (salt >= 0.6) rawScore -= 6;
    if (salt >= 1) rawScore -= 12;
    if (salt >= 1.5) rawScore -= 18;
  }

  if (protein != null) {
    if (category === 'plain_dairy') {
      if (protein >= 3) rawScore += 5;
      if (protein >= 6) rawScore += 3;
    } else {
      if (protein >= 5) rawScore += 4;
      if (protein >= 10) rawScore += 3;
    }
  }

  if (fiber != null) {
    if (fiber >= 3) rawScore += 5;
    if (fiber >= 6) rawScore += 3;
  }

  if (addedSugar) {
    rawScore -= 7;
  }

  if (sweetener) {
    rawScore -= 5;
  }

  if (processingLevel === 'minimally_processed') {
    rawScore += 4;
  } else if (processingLevel === 'processed') {
    rawScore -= 1;
  } else if (processingLevel === 'ultra_processed') {
    rawScore -= 8;
  }

  const warnings: string[] = [];
  if (getDataQuality(product) === 'legacy') {
    warnings.push('Bazı besin değerleri net olmadığı için hesaplama temkinli yapıldı.');
  }
  if (missingFields.length >= 3) {
    warnings.push('Temel besin verileri eksik olduğu için puan nötre yaklaştırıldı.');
  }
  if (!product.ingredients?.trim() && (product.hasAddedSugar == null || product.hasSweetener == null)) {
    warnings.push('İçindekiler bilgisi eksik olduğu için ilave şeker ve tatlandırıcı kontrolü sınırlı.');
  }

  const metricsUsed = usedMetricIds.map((metricId) => METRIC_LABELS[metricId]);
  const confidenceInfo = buildConfidence(usedMetricIds, missingFields, product);
  const score = clamp(Math.round(60 + (rawScore - 60) * confidenceInfo.factor), 4, 100);
  const tone = getScoreTone(score);
  const computedNutriScore = computeOfficialNutriScore(product);
  const nutriScore = resolveStoredOrDerivedNutriScore(product, computedNutriScore);
  const { positives, negatives } = buildInsights(product, category, processingLevel, addedSugar, sweetener);

  return {
    score,
    label: tone.label,
    color: tone.color,
    gradient: tone.gradient,
    positives,
    negatives,
    summary: buildSummary(category, confidenceInfo.level, metricsUsed, missingFields, warnings),
    nutriScore,
    confidence: confidenceInfo.level,
    missingFields,
    metricsUsed,
    warnings,
    scoringCategory: category,
  };
}

export const ALLERGEN_CHIP_STYLE: Record<string, string> = {
  Gluten: 'bg-amber-100 text-amber-800 border-amber-200',
  Süt: 'bg-blue-100 text-blue-800 border-blue-200',
  Yumurta: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Kabuklu Deniz Ürünleri': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Balık: 'bg-sky-100 text-sky-800 border-sky-200',
  'Yer Fıstığı': 'bg-orange-100 text-orange-800 border-orange-200',
  Kuruyemiş: 'bg-stone-100 text-stone-800 border-stone-200',
  Soya: 'bg-lime-100 text-lime-800 border-lime-200',
  Susam: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Kereviz: 'bg-green-100 text-green-800 border-green-200',
  Hardal: 'bg-yellow-200 text-yellow-900 border-yellow-300',
  Lupine: 'bg-purple-100 text-purple-800 border-purple-200',
  Sülfit: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  Yumuşakça: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export const DEFAULT_ALLERGEN_CHIP = 'bg-rose-100 text-rose-800 border-rose-200';

export const EU_ALLERGEN_LIST = [
  'Gluten',
  'Süt',
  'Yumurta',
  'Kabuklu Deniz Ürünleri',
  'Balık',
  'Yer Fıstığı',
  'Kuruyemiş',
  'Soya',
  'Susam',
  'Kereviz',
  'Hardal',
  'Lupine',
  'Sülfit',
  'Yumuşakça',
] as const;

export const DATA_QUALITY_BADGE_STYLE: Record<DataQuality, string> = {
  verified_label: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial_label: 'border-sky-200 bg-sky-50 text-sky-700',
  estimated: 'border-amber-200 bg-amber-50 text-amber-700',
  legacy: 'border-zinc-200 bg-zinc-100 text-zinc-600',
};

export { DATA_QUALITY_LABELS };


