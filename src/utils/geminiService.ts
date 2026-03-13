// ==========================================
// FitLune — Gemini AI Kalori Analiz Servisi
// Model: gemini-3.1-flash-lite-preview
// ==========================================

import { GoogleGenAI } from '@google/genai';
import type { Meal } from '../types';
import { generateId, getTodayStr } from './helpers';

// Analiz sonucu tipi
export interface FoodAnalysisResult {
    tanindi: boolean;
    yemekAdi?: string;
    ogunTuru?: 'Kahvaltı' | 'Öğle Yemeği' | 'Akşam Yemeği' | 'Atıştırmalık';
    porsiyon?: string;
    kalori?: number;
    protein?: number;
    karbonhidrat?: number;
    yag?: number;
    lif?: number;
    emoji?: string;
    guven?: 'yuksek' | 'orta' | 'dusuk';
    icerikAdetleri?: string;
    diyetisyenYorumu?: string;
    notlar?: string;
    hata?: string;
}

const SYSTEM_INSTRUCTION = `Sen FitLune fitness uygulamasının uzman kalori analiz asistanısın.

GÖREV:
Kullanıcının gönderdiği yemek fotoğrafını analiz et, yemeği tanı ve besin değerlerini tahmin et.

KURALLAR:
- Her zaman Türkçe yanıt ver
- Sadece geçerli JSON formatında yanıt ver, başka hiçbir şey yazma
- Türk mutfağına özellikle hakim ol: menemen, mercimek çorbası, pilav, börek, köfte, döner, baklava, imam bayıldı, vb.
- Uluslararası yemekleri de tanı: pizza, burger, sushi, pasta vb.
- Garnitür, sos ve yan malzemeleri hesaba kat
- Porsiyon boyutunu dikkatli tahmin et
- Emin olmadığında guven: "dusuk" ver
- Fotoğrafta yemek yoksa veya görüntü çok bulanıksa: { "tanindi": false }
- Öğün türünü yemeğin türüne göre otomatik belirle (kahvaltılık → Kahvaltı vb.)
- Yemeğin içindeki temel malzemeleri ve porsiyon/adet bilgisini "icerikAdetleri" alanına yaz (örn: "2 adet yumurta, 1 ince dilim beyaz peynir, 5 adet zeytin" veya "1 porsiyon pirinç pilavı, 100g tavuk göğsü")
- Bir diyetisyen olarak kullanıcıya kısa, samimi ve motive edici veya uyarıcı 1-2 cümlelik tavsiye ver ve "diyetisyenYorumu" alanına yaz. (örn: "Harika bir protein kaynağı! Yanına biraz da yeşillik eklersen çok daha dengeli ve doyurucu bir öğün olur. 💪")

ONAYLANMİŞ EMOJİLER:
Kahvaltı: 🍳 | Öğle: 🥗 🍲 🌯 | Akşam: 🐟 🍝 🍗 🥘 | Atıştırmalık: 🥜 🍎 🥣 🧁

ÇIKTI ŞEMASI (her zaman bu formatta döndür):
{
  "tanindi": boolean,
  "yemekAdi": "string (yemeğin Türkçe adı)",
  "ogunTuru": "Kahvaltı" | "Öğle Yemeği" | "Akşam Yemeği" | "Atıştırmalık",
  "porsiyon": "string (ör: 1 tabak, 200g, 1 dilim)",
  "kalori": number,
  "protein": number,
  "karbonhidrat": number,
  "yag": number,
  "lif": number,
  "emoji": "string (tek emoji)",
  "guven": "yuksek" | "orta" | "dusuk",
  "icerikAdetleri": "string (malzemeler ve adetler)",
  "diyetisyenYorumu": "string (kısa diyetisyen tavsiyesi)",
  "notlar": "string (varsa ek bilgi)"
}`;

let aiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    if (!aiClient) {
        // vite.config.ts → define: { 'process.env.GEMINI_API_KEY': ... } ile inject edilir
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (globalThis as any).__GEMINI_KEY__ || (globalThis as any).process?.env?.GEMINI_API_KEY;

        if (!apiKey) {
            try {
                // @ts-ignore
                apiKey = process.env.GEMINI_API_KEY;
            } catch (e) {
                // ignore ReferenceError if process is not defined
            }
        }

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY ortam değişkeni bulunamadı. .env dosyasını kontrol edin.');
        }
        aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
}

/** Dosyayı base64 string'e çevirir */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // "data:image/jpeg;base64,XXXX" → sadece "XXXX"
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Ana analiz fonksiyonu */
export async function analyzeFood(
    imageBase64: string,
    mimeType: string = 'image/jpeg'
): Promise<FoodAnalysisResult> {
    const client = getClient();

    const response = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: [
            {
                parts: [
                    {
                        text: 'Bu yemek fotoğrafını analiz et ve besin değerlerini hesapla.',
                    },
                    {
                        inlineData: { mimeType, data: imageBase64 },
                    },
                ],
            },
        ],
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            temperature: 1.0,
        },
    });

    const raw = response.text?.trim() ?? '';
    const data: FoodAnalysisResult = JSON.parse(raw);
    return data;
}

/** Analiz sonucunu Meal tipine dönüştürür */
export function analysisToMeal(result: FoodAnalysisResult, date?: string): Meal {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return {
        id: generateId(),
        name: result.ogunTuru ?? 'Atıştırmalık',
        calories: result.kalori ?? 0,
        protein: result.protein ?? 0,
        carbs: result.karbonhidrat ?? 0,
        fat: result.yag ?? 0,
        items: result.porsiyon ? `${result.yemekAdi} (${result.porsiyon})` : (result.yemekAdi ?? 'Bilinmeyen'),
        time,
        emoji: result.emoji ?? '🍽️',
        date: date ?? getTodayStr(),
        source: 'ai',
    };
}
