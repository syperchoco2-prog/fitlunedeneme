import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Sparkles, CheckCircle, AlertCircle, RotateCcw, Upload, Info, Target, Cpu, Flame } from 'lucide-react';
import { analyzeFood, fileToBase64, analysisToMeal, type FoodAnalysisResult } from '../utils/geminiService';
import { useApp } from '../context/AppContext';
import { getMealsForDate } from '../utils/helpers';

// ─── Yardımcı Bileşenler ───────────────────────────────────────────────────────
function ScannerLine() {
    return (
        <>
            <motion.div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_3px_rgba(255,255,255,0.8)] z-10"
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
                className="absolute left-0 right-0 h-48 bg-gradient-to-b from-transparent to-white/20"
                initial={{ top: '-12rem' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
        </>
    );
}

function CornerDecor({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
    const base = 'absolute w-12 h-12 border-white pointer-events-none z-20';
    const classes: Record<string, string> = {
        tl: 'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-3xl',
        tr: 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-3xl',
        bl: 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-3xl',
        br: 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-3xl',
    };
    return (
        <motion.div
            className={`${base} ${classes[position]}`}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
        />
    );
}

// Güven rozeti
function ConfidenceBadge({ guven }: { guven?: string }) {
    const map = {
        yuksek: { label: 'Yüksek Güven', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        orta: { label: 'Orta Güven', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        dusuk: { label: 'Düşük Güven', color: 'bg-red-100 text-red-600 border-red-200' },
    };
    const cfg = map[guven as keyof typeof map] ?? map.orta;
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

export interface AIScannerModalProps {
    open: boolean;
    onClose: () => void;
}

export default function AIScannerModal({ open, onClose }: AIScannerModalProps) {
    const { state, dispatch, showToast } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Standart Scanner State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [photoConfirmed, setPhotoConfirmed] = useState(false);
    const [result, setResult] = useState<FoodAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Camera Stream States
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Review Edit State
    const [editName, setEditName] = useState('');
    const [editCalories, setEditCalories] = useState<number | ''>('');
    const [editMealType, setEditMealType] = useState('Atıştırmalık');

    // Mantıklı Seçenekleri Belirleme
    const currentHour = new Date().getHours();
    // Sabah < 11 (Kahvaltı, AraÖğün)
    // Öğle 11 - 16 (Öğle Yemeği, Ara Öğün)
    // Akşam 16 - 22 (Akşam Yemeği, Ara Öğün)
    // Gece > 22 (Atıştırmalık)
    const mealOptions = React.useMemo(() => {
        if (currentHour < 11) return ['Kahvaltı', 'Atıştırmalık'];
        if (currentHour < 16) return ['Öğle Yemeği', 'Atıştırmalık'];
        if (currentHour < 22) return ['Akşam Yemeği', 'Atıştırmalık'];
        return ['Atıştırmalık'];
    }, [currentHour]);

    // Modal kapandığında state'i sıfırla
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setPreviewUrl(null);
                setSelectedFile(null);
                setResult(null);
                setError(null);
                setAnalyzing(false);
                setPhotoConfirmed(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }, 300);
        }
    }, [open]);

    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1080 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Kamera hatası:', err);
            setCameraError('Kamera izni verilmedi veya desteklenmiyor. Lütfen fotoğraf yükleyin.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        if (open && !previewUrl && !result) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [open, previewUrl, result]);

    // Fotoğraf Kamerasından Canlı Çekim
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth || 1080;
            canvas.height = video.videoHeight || 1920;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
                        setSelectedFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                        setPhotoConfirmed(false);
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    // Fotoğraf Seçimi (Galeri)
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setResult(null);
        setError(null);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setPhotoConfirmed(false); // require explicit confirm
    }, []);

    const handleRetake = () => {
        setPreviewUrl(null);
        setSelectedFile(null);
        setResult(null);
        setError(null);
        setPhotoConfirmed(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmAndAnalyze = () => {
        setPhotoConfirmed(true);
        handleAnalyze();
    };

    const handleAnalyze = async (fileToAnalyze = selectedFile) => {
        if (!fileToAnalyze) return;
        setAnalyzing(true);
        setError(null);

        try {
            const base64 = await fileToBase64(fileToAnalyze);
            const analysis = await analyzeFood(base64, fileToAnalyze.type || 'image/jpeg');

            if (!analysis.tanindi) {
                setError('Yemek tam olarak tanınamadı. Lütfen daha net bir açıdan fotoğraf çekin.');
                setAnalyzing(false);
                return;
            }

            setResult(analysis);
            setEditName(analysis.yemekAdi || '');
            setEditCalories(analysis.kalori || 0);

            // Default öğün türünü saatin durumuna/yapay zeka kararına göre eşitle
            if (analysis.ogunTuru && mealOptions.includes(analysis.ogunTuru)) {
                setEditMealType(analysis.ogunTuru);
            } else {
                setEditMealType(mealOptions[0]);
            }
        } catch (err) {
            console.error(err);
            setError('AI bağlantısı kurulamadı. Lütfen API anahtarını veya bağlantınızı kontrol edin.');
        } finally {
            setAnalyzing(false);
        }
    };

    // Bağlam Öğün Hatırlatmaları (Reminders)
    const todayMeals = React.useMemo(() => getMealsForDate(state.meals, state.selectedDate), [state.meals, state.selectedDate]);
    const hasBreakfast = todayMeals.some(m => m.name === 'Kahvaltı');
    const hasLunch = todayMeals.some(m => m.name === 'Öğle Yemeği');
    const hasDinner = todayMeals.some(m => m.name === 'Akşam Yemeği');

    let missingMealReminder = null;
    if (result) {
        if (currentHour < 12 && !hasBreakfast) {
            missingMealReminder = "Günaydın! Henüz kahvaltı girmediniz, bu öğün kahvaltınız olabilir mi?";
        } else if (currentHour >= 12 && currentHour < 17 && !hasLunch) {
            missingMealReminder = "Öğle yemeği zamanı! Henüz öğle yemeği kaydetmediniz.";
        } else if (currentHour >= 17 && currentHour < 23 && !hasDinner) {
            missingMealReminder = "İyi akşamlar! Bugünkü akşam yemeğinizi henüz kaydetmediniz.";
        }
    }

    const handleSaveMeal = () => {
        if (!result) return;

        // Yeni Meal objesini oluştur
        const cals = typeof editCalories === 'number' ? editCalories : 0;
        const finalMeal = analysisToMeal({
            ...result,
            yemekAdi: editName,
            kalori: cals,
            ogunTuru: editMealType as any,
        }, state.selectedDate);

        dispatch({ type: 'ADD_MEAL', payload: finalMeal });
        showToast(`${editName} eklendi — ${cals} kcal`, 'success');
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="ai-scanner-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center overflow-y-auto overflow-x-hidden bg-black/90"
                >
                {/* Kapat Butonu (Sürekli Görünecek ve Şeffaf Olacak) */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="absolute top-6 right-6 z-[110] w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-lg"
                >
                    <X size={20} />
                </motion.button>

                {/* Ana Konteyner (Strict bounds) */}
                <div className="w-full sm:max-w-[400px] flex flex-col relative h-full sm:h-[800px] sm:max-h-[90vh] bg-black sm:rounded-[2.5rem] overflow-hidden sm:shadow-2xl">

                    {!result ? (
                        /* KAMERA VE TARAMA MODU (Unified) */
                        <div className="flex-1 w-full flex flex-col relative bg-black overflow-hidden">
                            {/* Arka Plan: Kamera Video VEYA Seçilen Resim */}
                            {!previewUrl && !cameraError ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="absolute inset-0 w-full h-full object-cover z-0"
                                />
                            ) : previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Önizleme"
                                    className="absolute inset-0 w-full h-full object-cover z-0"
                                />
                            ) : null}

                            <canvas ref={canvasRef} className="hidden" />

                            {/* Üst Karartma ve Odak Alanı Overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full flex-1 relative z-10 flex flex-col items-center"
                            >
                                {/* Viewfinder üstten uygun boşlukla yerleşir, ekranın ortasına doğru */}
                                <div className="flex-1 flex items-center justify-center w-full">
                                    {/* Orta Kutu (Viewfinder / Analyzer) */}
                                    <div className="w-72 h-72 relative transition-all duration-500">
                                        {/* Karartma Maskesi */}
                                        <div className="absolute inset-0 rounded-3xl border border-white/40 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-0 pointer-events-none" />

                                        {!photoConfirmed && (
                                            <>
                                                <CornerDecor position="tl" />
                                                <CornerDecor position="tr" />
                                                <CornerDecor position="bl" />
                                                <CornerDecor position="br" />
                                            </>
                                        )}

                                        {/* Analyzing Animasyonu "Kutunun İçi" */}
                                        <AnimatePresence>
                                            {photoConfirmed && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center z-20 overflow-hidden border border-white/10"
                                                >
                                                    <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-80 z-0 pointer-events-none">
                                                        <ScannerLine />
                                                    </div>

                                                    <div className="relative w-24 h-24 flex items-center justify-center z-10 mb-4">
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                                                            className="absolute inset-0 rounded-full border border-white/20 border-t-white"
                                                        />
                                                        <motion.div
                                                            animate={{ rotate: -360 }}
                                                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                                                            className="absolute inset-2 rounded-full border border-white/10 border-b-white/50 border-l-white/50"
                                                        />
                                                        <Cpu size={28} className="text-white drop-shadow-lg relative z-10" />
                                                    </div>

                                                    <motion.h3
                                                        animate={{ opacity: [0.6, 1, 0.6] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className="text-white font-black text-center text-lg tracking-wide drop-shadow-md px-2"
                                                    >
                                                        FitLune AI<br />Analiz Ediyor
                                                    </motion.h3>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Alt Kontroller - mt-auto ile her zaman en alta yapışır */}
                                {!previewUrl ? (
                                    /* Kamera Çekim Kontrolleri */
                                    <div className="w-full shrink-0">
                                        <div className="text-center px-6 mb-6 max-w-[300px] mx-auto">
                                            <p className="text-white font-bold text-lg mb-1 tracking-wide drop-shadow-md">
                                                Öğününüzü Çerçeveleyin
                                            </p>
                                            <p className="text-white/80 text-sm font-medium drop-shadow-md">
                                                {cameraError ? cameraError : "Hedefi tam ortaladığınızdan emin olun"}
                                            </p>
                                        </div>

                                        <div className="w-full px-6 pb-10 pt-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center items-center gap-8">
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center shadow-lg"
                                            >
                                                <Upload size={20} />
                                            </motion.button>

                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={cameraError ? () => fileInputRef.current?.click() : capturePhoto}
                                                className="w-20 h-20 bg-transparent rounded-full flex items-center justify-center border-[4px] border-white shadow-lg"
                                            >
                                                <div className="w-[66px] h-[66px] bg-white rounded-full transition-transform active:scale-95" />
                                            </motion.button>

                                            <div className="w-14 h-14" />
                                        </div>
                                    </div>
                                ) : !photoConfirmed ? (
                                    /* Fotoğraf Onay Kontrolleri */
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full shrink-0 bg-black/70 backdrop-blur-2xl px-6 py-6 pb-10 rounded-t-[2rem] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col items-center"
                                    >
                                        <h3 className="text-white text-xl font-black mb-1 text-center">Resmi Onaylıyor Musunuz?</h3>
                                        <p className="text-zinc-400 text-xs font-medium mb-5 text-center">Görüntü netse analizi başlatabilirsiniz.</p>

                                        <div className="flex flex-col w-full gap-3">
                                            <motion.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleConfirmAndAnalyze}
                                                className="w-full py-4 bg-white text-black font-black text-lg rounded-[1.25rem] shadow-[0_0_20px_rgba(255,255,255,0.3)] flex justify-center items-center gap-2"
                                            >
                                                <Sparkles size={20} className="text-black" /> Analiz Et
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleRetake}
                                                className="w-full py-4 bg-white/10 rounded-[1.25rem] text-white font-semibold text-lg hover:bg-white/20 transition-colors border border-white/10"
                                            >
                                                Yeniden Çek
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ) : null}

                            </motion.div>

                            {/* Hata Durumu Overlay */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute top-20 left-6 right-6 flex items-center justify-center gap-3 bg-red-500/90 backdrop-blur-md border border-red-500/30 rounded-2xl px-4 py-3 shadow-xl z-50 text-white font-medium text-sm text-center"
                                    >
                                        <AlertCircle size={20} className="flex-shrink-0" />
                                        <p>{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        /* ==========================================================
                           İNCELEME (REVIEW) EKRANI - Tam Ekran Sunum
                           ========================================================== */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 w-full flex flex-col bg-zinc-50 dark:bg-zinc-950 relative pb-10 overflow-y-auto transition-colors"
                        >
                            {/* Küçültülmüş resim header - Tam Genişlik Ekran Tepesi */}
                            <div className="relative w-full h-[45vh] max-h-[400px] shrink-0">
                                <img src={previewUrl!} className="w-full h-full object-cover" />
                                {/* Bottom Gradient for blending into the white card */}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-900/30 to-black/50 transition-colors" />

                                <div className="absolute bottom-6 left-5 right-5 flex items-end justify-between z-10">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-5xl drop-shadow-xl">{result.emoji}</span>
                                            <div className="flex flex-col">
                                                <ConfidenceBadge guven={result.guven} />
                                            </div>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleRetake}
                                        className="bg-zinc-900/50 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-lg mb-2"
                                    >
                                        <RotateCcw size={20} className="text-white" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Düzenlenebilir İçerik Kartı - Ekranın alt yarısından başlar */}
                            <div className="px-5 -mt-4 relative z-20 flex flex-col gap-4">
                                {/* İsim ve Kalori Düzenleme */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1 block">Yemek Adı</label>
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 rounded-xl text-zinc-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1 block">Hesaplanan Kalori (kcal)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editCalories}
                                                onChange={(e) => setEditCalories(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 px-4 py-3 rounded-xl text-emerald-800 dark:text-emerald-400 font-black text-xl flex items-center focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                            />
                                            <Flame className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                                        </div>
                                    </div>

                                    {/* Makrolar Gösterimi (Salt Okunur) */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-2 text-center transition-colors">
                                            <p className="text-xs font-black text-blue-500">{result.protein}g</p>
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Protein</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-2 text-center transition-colors">
                                            <p className="text-xs font-black text-orange-500">{result.karbonhidrat}g</p>
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Karb</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-2 text-center transition-colors">
                                            <p className="text-xs font-black text-amber-500">{result.yag}g</p>
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Yağ</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-2 text-center transition-colors">
                                            <p className="text-xs font-black text-purple-500">{result.lif || 0}g</p>
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Lif</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 w-full rounded-full transition-colors" />

                                {/* Diyetisyen Yorumu */}
                                {result.diyetisyenYorumu && (
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 p-5 rounded-2xl relative shadow-sm transition-colors">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                            <Sparkles size={40} className="text-blue-500" />
                                        </div>
                                        <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">👩‍⚕️ Diyetisyen Notu</h3>
                                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 leading-relaxed relative z-10">
                                            "{result.diyetisyenYorumu}"
                                        </p>
                                    </div>
                                )}

                                {/* Öğün Seçimi - Geri Dönüşümlü Mantık */}
                                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Öğün Tipi Seçin</h3>
                                    </div>

                                    {missingMealReminder && (
                                        <div className="flex gap-2 items-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-3 rounded-xl mb-4 transition-colors">
                                            <Info size={16} className="text-amber-500 shrink-0" />
                                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 leading-tight">
                                                {missingMealReminder}
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        {mealOptions.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setEditMealType(opt)}
                                                className={`py-3 px-2 rounded-xl text-sm font-bold transition-all border ${editMealType === opt
                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* İçerik ve Porsiyon (Minik Detay) */}
                                <div className="px-1 text-center mt-2">
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex flex-col items-center gap-1">
                                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Tespit Edilen İçerik</span>
                                        {result.icerikAdetleri || result.porsiyon || "Otomatik Yemek Analizi"}
                                    </p>
                                </div>
                            </div>

                            {/* Aksiyon Butonları (Sabit Alt Bar İzlenimi) */}
                            <div className="px-5 mt-auto pt-6 pb-2">
                                <button
                                    onClick={handleSaveMeal}
                                    className="w-full py-4 bg-zinc-900 dark:bg-white rounded-[1.25rem] text-white dark:text-zinc-900 font-black text-lg shadow-xl shadow-zinc-900/20 dark:shadow-white/10 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                                >
                                    <CheckCircle size={22} /> Öğünü Kaydet
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full mt-3 py-3 text-zinc-500 dark:text-zinc-400 font-bold text-sm tracking-wide bg-transparent rounded-2xl active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                                >
                                    İptal Et
                                </button>
                            </div>

                        </motion.div>
                    )}

                </div>
            </motion.div>
            )}
        </AnimatePresence>
    );
}
