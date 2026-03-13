// ==========================================
// FitLune — LocalStorage Kalıcılık (Persistence)
// ==========================================

import type { AppState } from '../types';

const STORAGE_KEY = 'fitlune_app_data';

/** State'i localStorage'a kaydet */
export function saveState(state: AppState): void {
    try {
        // toasts kaydetmeye gerek yok (geçici veri)
        const toSave = { ...state, toasts: [] };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.warn('FitLune: localStorage kaydetme hatası', e);
    }
}

/** State'i localStorage'dan oku. Hata varsa null döndürür. */
export function loadState(): Partial<AppState> | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as Partial<AppState>;
    } catch (e) {
        console.warn('FitLune: localStorage okuma hatası', e);
        return null;
    }
}

/** localStorage'ı temizle (çıkış yap) */
export function clearState(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('FitLune: localStorage temizleme hatası', e);
    }
}