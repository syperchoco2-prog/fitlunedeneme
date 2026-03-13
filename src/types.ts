// ==========================================
// FitLune - Uygulama Veri Tipleri
// ==========================================

export type ScoringCategory =
  | 'water'
  | 'plain_dairy'
  | 'sweetened_dairy'
  | 'cheese'
  | 'fat_nuts_seeds'
  | 'beverage'
  | 'general_food';

export type ProcessingLevel = 'minimally_processed' | 'processed' | 'ultra_processed';

export type DataQuality = 'verified_label' | 'partial_label' | 'estimated' | 'legacy';

/** Öğün verisi - AI fotoğraf analizinden veya manuel girişten gelir */
export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string;
  time: string;
  emoji: string;
  date: string;
  source: 'ai' | 'manual' | 'barcode';
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  servingLabel?: string;
  ingredientWarnings?: IngredientWarning[];
}

export interface IngredientWarning {
  id: string;
  code: string;
  name: string;
  level: 'warning';
  title: string;
  summary: string;
  details: string;
  sourceLabel: string;
  disclaimer: string;
}

export interface BarcodeProduct {
  barcode: string;
  productName: string;
  imageUrl?: string;
  brand?: string;
  productCategory?: string;
  scoringCategory?: ScoringCategory;
  processingLevel?: ProcessingLevel;
  hasAddedSugar?: boolean | null;
  hasSweetener?: boolean | null;
  dataQuality?: DataQuality;
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  protein: number | null;
  sugar: number | null;
  salt: number | null;
  fiber: number | null;
  servingSizeG?: number;
  nutriscore?: 'A' | 'B' | 'C' | 'D' | 'E';
  ingredients?: string;
  allergens?: string[];
  nutritionBasis: 'per100g';
}

export type DeveloperBarcodeCaptureStatus = 'queued' | 'already_submitted' | 'already_exists';

export interface DeveloperBarcodeCaptureResponse {
  id: string;
  duplicate: boolean;
  status: DeveloperBarcodeCaptureStatus;
}

export interface DeveloperBarcodeSubmission {
  id: string;
  barcode: string;
  productName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
}

export interface PendingBarcodeReviewInput {
  barcode: string;
  productName: string;
  imageUrl?: string;
  brand?: string;
  productCategory?: string;
  scoringCategory?: ScoringCategory;
  processingLevel?: ProcessingLevel;
  hasAddedSugar?: boolean | null;
  hasSweetener?: boolean | null;
  dataQuality?: DataQuality;
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  protein: number | null;
  sugar: number | null;
  salt: number | null;
  fiber: number | null;
}

/** Günlük su verisi */
export interface DailyWater {
  date: string;
  amount: number;
}

/** Egzersiz verisi */
export interface Workout {
  id: string;
  type: string;
  duration: number;
  calories: number;
  date: string;
}

/** Adımsayar verisi */
export interface DailySteps {
  date: string;
  count: number;
}

/** Kullanıcı profil bilgileri */
export interface UserProfile {
  name: string;
  email: string;
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  dailyCalorieGoal: number;
  dailyWaterGoal: number;
  dailyBurnGoal: number;
  isPro: boolean;
}

/** Uygulama ayarları */
export interface AppSettings {
  notificationsEnabled: boolean;
  waterReminder: boolean;
  mealReminder: boolean;
  darkMode: boolean;
}

/** Günlük görev */
export interface DailyTask {
  id: string;
  text: string;
  done: boolean;
  pts: number;
  date: string;
}

/** AppContext state */
export interface AppState {
  selectedDate: string;
  meals: Meal[];
  waterLog: DailyWater[];
  workouts: Workout[];
  stepsLog: DailySteps[];
  dailyTasks: DailyTask[];
  userProfile: UserProfile;
  appSettings: AppSettings;
  toasts: ToastMessage[];
}

/** Toast mesajı */
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/** Reducer action tipleri */
export type AppAction =
  | { type: 'SET_DATE'; payload: string }
  | { type: 'ADD_MEAL'; payload: Meal }
  | { type: 'REMOVE_MEAL'; payload: string }
  | { type: 'ADD_WATER'; payload: { date: string; amount: number } }
  | { type: 'SET_WATER'; payload: { date: string; amount: number } }
  | { type: 'ADD_WORKOUT'; payload: Workout }
  | { type: 'REMOVE_WORKOUT'; payload: string }
  | { type: 'SET_STEPS'; payload: { date: string; count: number } }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_WATER_GOAL'; payload: number }
  | { type: 'SET_CALORIE_GOAL'; payload: number }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: { id: string; date: string } }
  | { type: 'SET_DAILY_TASKS'; payload: DailyTask[] }
  | { type: 'RESET_APP' };
