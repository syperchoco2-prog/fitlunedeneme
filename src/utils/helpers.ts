// ==========================================
// FitLune — Yardımcı Fonksiyonlar
// ==========================================

import type { Meal, UserProfile } from '../types';

const GUN_ISIMLERI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const GUN_KISA = ['Pa', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
const AY_ISIMLERI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Bugünün tarihini "YYYY-MM-DD" formatında döndürür */
export function getTodayStr(): string {
    const now = new Date();
    return formatDateToStr(now);
}

/** Date objesini "YYYY-MM-DD" formatına çevirir */
export function formatDateToStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" → Date objesine çevirir */
export function parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** "2026-03-05" → "5 Mart, Çarşamba" */
export function formatDateLong(dateStr: string): string {
    const date = parseDate(dateStr);
    const day = date.getDate();
    const month = AY_ISIMLERI[date.getMonth()];
    const dayName = GUN_ISIMLERI[date.getDay()];
    return `${day} ${month}, ${dayName}`;
}

/** "2026-03-05" → "5 Mar" */
export function formatDateShort(dateStr: string): string {
    const date = parseDate(dateStr);
    return `${date.getDate()} ${AY_ISIMLERI[date.getMonth()].substring(0, 3)}`;
}

/** "Bugün, 5 Mart" veya "5 Mart, Çarşamba" */
export function formatDateDisplay(dateStr: string): string {
    const today = getTodayStr();
    if (dateStr === today) {
        const date = parseDate(dateStr);
        return `Bugün, ${date.getDate()} ${AY_ISIMLERI[date.getMonth()]}`;
    }
    return formatDateLong(dateStr);
}

/** Haftanın günlerini döndürür (Pazartesi → Pazar, seçili tarihin haftası) */
export function getWeekDays(dateStr: string): { date: string; dayName: string; dayShort: string; dayNum: number; isToday: boolean }[] {
    const date = parseDate(dateStr);
    const today = getTodayStr();

    // Pazartesi'yi bul (getDay: 0=Pazar, 1=Pazartesi...)
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = formatDateToStr(d);
        days.push({
            date: dStr,
            dayName: GUN_ISIMLERI[d.getDay()],
            dayShort: GUN_KISA[d.getDay()],
            dayNum: d.getDate(),
            isToday: dStr === today,
        });
    }
    return days;
}

/** Belirli bir tarihin ayındaki tüm günleri döndürür */
export function getMonthDays(dateStr: string): { date: string; dayNum: number; isToday: boolean }[] {
    const date = parseDate(dateStr);
    const today = getTodayStr();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const dStr = formatDateToStr(d);
        days.push({
            date: dStr,
            dayNum: i,
            isToday: dStr === today,
        });
    }
    return days;
}

/** Ayın ilk gününün haftanın kaçıncı günü olduğunu döndürür (0=Pt, 6=Pa) */
export function getFirstDayOfMonth(dateStr: string): number {
    const date = parseDate(dateStr);
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const day = first.getDay();
    return day === 0 ? 6 : day - 1; // Pazartesi=0 ... Pazar=6
}

/** Ay ismini döndürür: "Mart 2026" */
export function getMonthLabel(dateStr: string): string {
    const date = parseDate(dateStr);
    return `${AY_ISIMLERI[date.getMonth()]} ${date.getFullYear()}`;
}

/** Belirli bir tarihteki öğünlerin toplam kalorisini hesapla */
export function calculateDailyCalories(meals: Meal[], date: string): number {
    return meals
        .filter(m => m.date === date)
        .reduce((sum, m) => sum + m.calories, 0);
}

/** Belirli bir tarihteki öğünleri filtrele */
export function getMealsForDate(meals: Meal[], date: string): Meal[] {
    return meals.filter(m => m.date === date);
}

/** BMR hesaplama — Mifflin-St Jeor formülü */
export function calculateBMR(profile: UserProfile): number {
    if (profile.gender === 'female') {
        return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }
    return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
}

/** TDEE hesaplama (BMR × aktivite katsayısı) ve hedefe göre kalori ayarlaması */
export function calculateTDEE(profile: UserProfile): number {
    const bmr = calculateBMR(profile);
    const multipliers: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    };
    
    let tdee = Math.round(bmr * (multipliers[profile.activityLevel] || 1.55));
    
    // Hedefe göre kalori ayarlaması
    if (profile.goal === 'lose') {
        tdee -= 500; // Kilo vermek için 500 kalori açık
    } else if (profile.goal === 'gain') {
        tdee += 500; // Kilo almak için 500 kalori fazlası
    }
    
    return Math.max(tdee, 1200); // Minimum 1200 kalori sınırı
}

/** Basit su önerisi hesaplama (kilo × 0.033) */
export function calculateWaterRecommendation(weight: number): number {
    return Number((weight * 0.033).toFixed(1));
}

/** Benzersiz ID oluştur */
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** Tarihi bir gün ileri / geri al */
export function shiftDate(dateStr: string, days: number): string {
    const date = parseDate(dateStr);
    date.setDate(date.getDate() + days);
    return formatDateToStr(date);
}

/** Haftayı ileri/geri kaydır */
export function shiftWeek(dateStr: string, weeks: number): string {
    return shiftDate(dateStr, weeks * 7);
}

/** Belirli bir günün makro toplamlarını hesapla */
export function calculateDailyMacros(meals: Meal[], date: string): { protein: number; carbs: number; fat: number } {
    const dayMeals = meals.filter(m => m.date === date);
    return {
        protein: dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0),
        carbs: dayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0),
        fat: dayMeals.reduce((sum, m) => sum + (m.fat || 0), 0),
    };
}

/** Günlük kalori hedefinden ve kullanıcı hedeflerinden makro hedeflerini hesapla */
export function calculateMacroGoals(dailyCalorieGoal: number, profile?: UserProfile): { protein: number; carbs: number; fat: number } {
    // Eğer profil verilmişse kiloya göre protein ve yağ hesapla
    if (profile) {
        let proteinPerKg = 1.8; // Kilo koruma için
        if (profile.goal === 'lose') proteinPerKg = 2.2; // Kilo verirken kas kaybını önlemek için daha yüksek protein
        if (profile.goal === 'gain') proteinPerKg = 2.0;

        const protein = Math.round(profile.weight * proteinPerKg);
        const fat = Math.round(profile.weight * 0.9); // Kilo başına ~0.9g yağ
        
        const proteinCals = protein * 4;
        const fatCals = fat * 9;
        
        // Kalan kaloriler karbonhidrata
        const remainingCals = Math.max(0, dailyCalorieGoal - proteinCals - fatCals);
        const carbs = Math.round(remainingCals / 4);
        
        return { protein, carbs, fat };
    }
    
    // Fallback: Standart %30 Protein, %40 Karb, %30 Yağ
    return {
        protein: Math.round((dailyCalorieGoal * 0.30) / 4), // 1g protein = 4 kcal
        carbs: Math.round((dailyCalorieGoal * 0.40) / 4),   // 1g karb = 4 kcal
        fat: Math.round((dailyCalorieGoal * 0.30) / 9),     // 1g yağ = 9 kcal
    };
}

/** Saate ve kullanıcı verisine göre AI asistan mesajı üret */
export function getAIGreeting(
    name: string,
    hour: number,
    consumedCalories: number,
    calorieGoal: number,
    waterAmount: number,
    waterGoal: number
): { greeting: string; message: string } {
    // Zaman bazlı selam
    const greeting =
        hour < 12 ? `Günaydın, ${name}!` :
            hour < 18 ? `İyi günler, ${name}!` :
                `İyi akşamlar, ${name}!`;

    // Durum bazlı akıllı mesaj
    const calorieRatio = calorieGoal > 0 ? consumedCalories / calorieGoal : 0;
    const waterRatio = waterGoal > 0 ? waterAmount / waterGoal : 0;

    let message: string;

    if (waterRatio < 0.3 && hour > 12) {
        message = 'Bugün suyunu biraz ihmal etmişsin, hemen bir bardak suyla devam edelim! 💧';
    } else if (calorieRatio > 0.9) {
        message = 'Kalori hedefinize neredeyse ulaştınız! Geri kalan öğünlerde hafif beslenmeyi tercih edin. 🥗';
    } else if (calorieRatio === 0 && hour < 11) {
        message = 'Güne enerjik bir kahvaltıyla başlamaya ne dersin? Protein ağırlıklı beslenmeyi dene! 🍳';
    } else if (waterRatio >= 1 && calorieRatio >= 0.5) {
        message = 'Harika gidiyorsun! Su hedefini tamamladın, kalorilerin de dengeli. Böyle devam! 🎉';
    } else if (hour >= 20) {
        message = 'Gün bitmek üzere. Bugünü güzel kapattın, yarın yeni bir gün olacak! 🌙';
    } else if (hour < 12) {
        message = 'Bugün harika bir gün olacak! Hedeflerini takip etmeyi unutma. ☀️';
    } else {
        message = 'İlerleme kaydetmeye devam et. Her küçük adım büyük fark yaratır! 💪';
    }

    return { greeting, message };
}

/** Saate göre sıradaki öğünü belirle */
export function getNextMealSuggestion(hour: number, existingMeals: Meal[], date: string): {
    mealType: string;
    emoji: string;
    suggestion: string;
    suggestedCal: number;
} {
    const dayMeals = existingMeals.filter(m => m.date === date);
    const mealNames = dayMeals.map(m => m.name);

    // Saate göre öğün sırası
    const schedule = [
        { mealType: 'Kahvaltı', maxHour: 10, emoji: '🍳', suggestion: 'Yulaf & Muz', suggestedCal: 320 },
        { mealType: 'Ara Öğün', maxHour: 12, emoji: '🥜', suggestion: 'Protein Bar & Badem', suggestedCal: 200 },
        { mealType: 'Öğle Yemeği', maxHour: 15, emoji: '🥗', suggestion: 'Tavuk Salata', suggestedCal: 550 },
        { mealType: 'Atıştırmalık', maxHour: 17, emoji: '🍎', suggestion: 'Meyve Tabağı', suggestedCal: 150 },
        { mealType: 'Akşam Yemeği', maxHour: 21, emoji: '🐟', suggestion: 'Izgara Somon', suggestedCal: 450 },
    ];

    // Henüz girilmemiş ilk uygun öğünü bul
    for (const s of schedule) {
        if (!mealNames.includes(s.mealType) && hour <= s.maxHour) {
            return s;
        }
    }

    // Hepsi girilmişse veya gece geçmişse
    if (hour >= 21) {
        return { mealType: 'Tüm Öğünler Tamamlandı', emoji: '✅', suggestion: 'Bugün harika geçti!', suggestedCal: 0 };
    }

    // Fallback
    return schedule[schedule.length - 1];
}
