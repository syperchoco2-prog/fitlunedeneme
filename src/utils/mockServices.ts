// ==========================================
// FitLune — Mock Servisler
// ==========================================

import type { Meal } from '../types';
import { generateId, getTodayStr } from './helpers';

/** Rastgele yemek verileri havuzu */
const YEMEK_HAVUZU = [
    { name: 'Kahvaltı', items: 'Yulaf ezmesi, bal, muz', calories: 380, protein: 12, carbs: 55, fat: 10, emoji: '🍳', time: '08:30' },
    { name: 'Kahvaltı', items: 'Menemen, peynir, zeytin', calories: 450, protein: 18, carbs: 20, fat: 28, emoji: '🍳', time: '09:00' },
    { name: 'Kahvaltı', items: 'Avokado tost, yumurta', calories: 520, protein: 22, carbs: 35, fat: 30, emoji: '🥑', time: '08:00' },
    { name: 'Öğle Yemeği', items: 'Izgara tavuk salata', calories: 650, protein: 45, carbs: 20, fat: 18, emoji: '🥗', time: '12:30' },
    { name: 'Öğle Yemeği', items: 'Mercimek çorbası, pilav', calories: 550, protein: 20, carbs: 70, fat: 12, emoji: '🍲', time: '13:00' },
    { name: 'Öğle Yemeği', items: 'Tavuk wrap, ayran', calories: 480, protein: 32, carbs: 45, fat: 15, emoji: '🌯', time: '13:30' },
    { name: 'Akşam Yemeği', items: 'Izgara somon, kuşkonmaz', calories: 400, protein: 38, carbs: 10, fat: 22, emoji: '🐟', time: '19:30' },
    { name: 'Akşam Yemeği', items: 'Kıymalı makarna', calories: 620, protein: 28, carbs: 65, fat: 22, emoji: '🍝', time: '20:00' },
    { name: 'Akşam Yemeği', items: 'Sebzeli tavuk sote', calories: 380, protein: 35, carbs: 18, fat: 14, emoji: '🍗', time: '19:00' },
    { name: 'Atıştırmalık', items: 'Protein bar, badem', calories: 250, protein: 18, carbs: 22, fat: 12, emoji: '🥜', time: '16:00' },
    { name: 'Atıştırmalık', items: 'Meyve tabağı', calories: 150, protein: 2, carbs: 35, fat: 1, emoji: '🍎', time: '15:30' },
    { name: 'Atıştırmalık', items: 'Yoğurt, granola', calories: 220, protein: 10, carbs: 30, fat: 8, emoji: '🥣', time: '10:30' },
];

/** Mock: AI fotoğraf analizi sonucu — rastgele bir yemek döndürür */
export function mockAnalyzeFood(date?: string): Meal {
    const random = YEMEK_HAVUZU[Math.floor(Math.random() * YEMEK_HAVUZU.length)];
    return {
        id: generateId(),
        ...random,
        date: date || getTodayStr(),
        source: 'ai' as const,
    };
}

/** Mock: Telefondan yakılan kalori verisi (ileride HealthKit/Google Fit) */
export function mockGetBurnedCalories(_date: string): number {
    // 200–500 arası rastgele
    return Math.floor(Math.random() * 300) + 200;
}

/** Mock: AI su önerisi (basit kilo × 0.033 formülü) */
export function mockGetWaterRecommendation(weight: number, _height: number, _activityLevel: string): number {
    const base = weight * 0.033;
    return Number(base.toFixed(1));
}
