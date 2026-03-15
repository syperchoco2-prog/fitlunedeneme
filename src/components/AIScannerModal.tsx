import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Sparkles, CheckCircle, AlertCircle, RotateCcw, Upload, Info, Flame, Dumbbell, Droplet, Leaf, Wheat } from 'lucide-react';
import { analyzeFood, fileToBase64, analysisToMeal, type FoodAnalysisResult } from '../utils/geminiService';
import { useApp } from '../context/AppContext';
import { getMealsForDate } from '../utils/helpers';

// ─── Yardımcı Bileşenler ───────────────────────────────────────────────────────

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

// Floating AI detection pill
function DetectionLabel({ label, x, y, delay }: { label: string; x: string; y: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 0.8] }}
            transition={{ duration: 2.8, delay, times: [0, 0.15, 0.75, 1], repeat: Infinity, repeatDelay: 1.2 }}
            className="absolute bg-black/70 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-1 text-white text-[10px] font-bold whitespace-nowrap shadow-lg z-30"
            style={{ left: x, top: y }}
        >
            {label}
        </motion.div>
    );
}

// Simulated object detection rectangle
function BoundingBox({ x, y, w, h, delay }: { x: string; y: string; w: string; h: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0.7, 0] }}
            transition={{ duration: 2.4, delay, times: [0, 0.2, 0.8, 1], repeat: Infinity, repeatDelay: 1.6 }}
            className="absolute border border-white/50 rounded-md pointer-events-none z-20"
            style={{ left: x, top: y, width: w, height: h }}
        />
    );
}

// Animated typing dots
function AnimatedDots() {
    return (
        <span className="inline-flex gap-[3px] ml-0.5 mb-0.5">
            {[0, 1, 2].map(i => (
                <motion.span
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.2, delay: i * 0.3, repeat: Infinity }}
                    className="inline-block w-1 h-1 rounded-full bg-white align-middle"
                />
            ))}
        </span>
    );
}

// Full-screen modern scanner overlay
function FullScreenScanOverlay() {

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Subtle dark tint */}
            <div className="absolute inset-0 bg-black/25 z-10" />

            {/* Scanning line */}
            <motion.div
                className="absolute left-0 right-0 h-[2px] z-20"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 30%, white 50%, rgba(255,255,255,0.9) 70%, transparent 100%)',
                    boxShadow: '0 0 12px 4px rgba(255,255,255,0.6), 0 0 30px 10px rgba(180,220,255,0.3)',
                }}
                initial={{ top: '2%' }}
                animate={{ top: ['2%', '96%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.3 }}
            />

            {/* Glow trail below scanning line */}
            <motion.div
                className="absolute left-0 right-0 h-20 z-[19] pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, rgba(200,230,255,0.15) 0%, transparent 100%)' }}
                initial={{ top: '2%' }}
                animate={{ top: ['2%', '96%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.3 }}
            />

            {/* Bounding boxes */}
            <BoundingBox x="12%" y="20%" w="38%" h="28%" delay={0.6} />
            <BoundingBox x="48%" y="44%" w="34%" h="24%" delay={1.4} />

            {/* Detection labels */}
            <DetectionLabel label="🌾 Karbonhidrat" x="8%"  y="18%" delay={0.4} />
            <DetectionLabel label="🥩 Protein"      x="52%" y="30%" delay={1.1} />
            <DetectionLabel label="🫒 Yağ"          x="10%" y="62%" delay={1.8} />
            <DetectionLabel label="🔥 Kalori"       x="50%" y="70%" delay={2.5} />
        </div>
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

    // State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [photoConfirmed, setPhotoConfirmed] = useState(false);
    const [result, setResult] = useState<FoodAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Review edit state
    const [editName, setEditName] = useState('');
    const [editCalories, setEditCalories] = useState<number | ''>('');
    const [editMealType, setEditMealType] = useState('Atıştırmalık');
    const [showMealTypeSheet, setShowMealTypeSheet] = useState(false);

    // Time-based meal options
    const currentHour = new Date().getHours();
    const mealOptions = React.useMemo(() => {
        if (currentHour < 11) return ['Kahvaltı', 'Atıştırmalık'];
        if (currentHour < 16) return ['Öğle Yemeği', 'Atıştırmalık'];
        if (currentHour < 22) return ['Akşam Yemeği', 'Atıştırmalık'];
        return ['Atıştırmalık'];
    }, [currentHour]);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setPreviewUrl(null);
                setSelectedFile(null);
                setResult(null);
                setError(null);
                setAnalyzing(false);
                setPhotoConfirmed(false);
                setShowMealTypeSheet(false);
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

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setResult(null);
        setError(null);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setPhotoConfirmed(false);
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
                setPhotoConfirmed(false);
                return;
            }

            setResult(analysis);
            setEditName(analysis.yemekAdi || '');
            setEditCalories(analysis.kalori || 0);

            if (analysis.ogunTuru && mealOptions.includes(analysis.ogunTuru)) {
                setEditMealType(analysis.ogunTuru);
            } else {
                setEditMealType(mealOptions[0]);
            }
        } catch (err) {
            console.error(err);
            setError('AI bağlantısı kurulamadı. Lütfen API anahtarını veya bağlantınızı kontrol edin.');
            setPhotoConfirmed(false);
        } finally {
            setAnalyzing(false);
        }
    };

    // Missing meal reminders
    const todayMeals = React.useMemo(() => getMealsForDate(state.meals, state.selectedDate), [state.meals, state.selectedDate]);
    const hasBreakfast = todayMeals.some(m => m.name === 'Kahvaltı');
    const hasLunch = todayMeals.some(m => m.name === 'Öğle Yemeği');
    const hasDinner = todayMeals.some(m => m.name === 'Akşam Yemeği');

    let missingMealReminder: string | null = null;
    if (result) {
        if (currentHour < 12 && !hasBreakfast) {
            missingMealReminder = "Günaydın! Henüz kahvaltı girmediniz, bu öğün kahvaltınız olabilir mi?";
        } else if (currentHour >= 12 && currentHour < 17 && !hasLunch) {
            missingMealReminder = "Öğle yemeği zamanı! Henüz öğle yemeği kaydetmediniz.";
        } else if (currentHour >= 17 && currentHour < 23 && !hasDinner) {
            missingMealReminder = "İyi akşamlar! Bugünkü akşam yemeğinizi henüz kaydetmediniz.";
        }
    }

    const handleSaveWithMealType = (mealType: string) => {
        if (!result) return;
        const cals = typeof editCalories === 'number' ? editCalories : 0;
        const finalMeal = analysisToMeal({
            ...result,
            yemekAdi: editName,
            kalori: cals,
            ogunTuru: mealType as 'Kahvaltı' | 'Öğle Yemeği' | 'Akşam Yemeği' | 'Atıştırmalık',
        }, state.selectedDate);

        dispatch({ type: 'ADD_MEAL', payload: finalMeal });
        showToast(`${editName} eklendi — ${cals} kcal`, 'success');
        onClose();
    };

    // Macro ratio bar helper
    const macroRatioBar = () => {
        if (!result) return null;
        const p = result.protein ?? 0;
        const c = result.karbonhidrat ?? 0;
        const f = result.yag ?? 0;
        const lif = result.lif ?? 0;
        const total = p + c + f + lif || 1;
        return (
            <div className="w-full h-1.5 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-400 transition-all"   style={{ width: `${(p / total) * 100}%` }} />
                <div className="h-full bg-orange-400 transition-all" style={{ width: `${(c / total) * 100}%` }} />
                <div className="h-full bg-amber-400 transition-all"  style={{ width: `${(f / total) * 100}%` }} />
                <div className="h-full bg-purple-400 transition-all" style={{ width: `${(lif / total) * 100}%` }} />
            </div>
        );
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
                    {/* Kapat Butonu */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-6 right-6 z-[110] w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-lg"
                    >
                        <X size={20} />
                    </motion.button>

                    {/* Ana Konteyner */}
                    <div className="w-full sm:max-w-[400px] flex flex-col relative h-full sm:h-[800px] sm:max-h-[90vh] bg-black sm:rounded-[2.5rem] overflow-hidden sm:shadow-2xl">

                        {!result ? (
                            /* KAMERA VE TARAMA MODU */
                            <div className="flex-1 w-full flex flex-col relative bg-black overflow-hidden">
                                {/* Arka Plan: Kamera veya Seçilen Resim */}
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

                                {/* Full-screen analiz animasyonu (fotoğraf üstünde) */}
                                <AnimatePresence>
                                    {photoConfirmed && analyzing && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="absolute inset-0 z-30"
                                        >
                                            <FullScreenScanOverlay />

                                            {/* Alt status pill */}
                                            <div className="absolute bottom-0 left-0 right-0 pb-14 px-6 flex flex-col items-center gap-2 z-40">
                                                <div className="bg-black/60 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-2 border border-white/10">
                                                    <motion.div
                                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                        className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                                                    />
                                                    <span className="text-white font-bold text-sm tracking-wide">
                                                        AI Analiz Ediyor
                                                    </span>
                                                    <AnimatedDots />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Viewfinder Overlay (sadece analiz etmiyorken) */}
                                <AnimatePresence>
                                    {!photoConfirmed && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="w-full flex-1 relative z-10 flex flex-col items-center"
                                        >
                                            {/* Viewfinder */}
                                            <div className="flex-1 flex items-center justify-center w-full">
                                                <div className="w-[85vw] h-[85vw] max-w-[340px] max-h-[340px] relative transition-all duration-500">
                                                    {/* Karartma maskesi */}
                                                    <div className="absolute inset-0 rounded-3xl border border-white/40 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-0 pointer-events-none" />
                                                    <CornerDecor position="tl" />
                                                    <CornerDecor position="tr" />
                                                    <CornerDecor position="bl" />
                                                    <CornerDecor position="br" />
                                                </div>
                                            </div>

                                            {/* Alt Kontroller */}
                                            {!previewUrl ? (
                                                /* Kamera çekim kontrolleri */
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
                                            ) : (
                                                /* Slim floating action bar (fotoğraf onay) */
                                                <motion.div
                                                    initial={{ opacity: 0, y: 24 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                                                    className="w-full shrink-0 px-5 pb-10 pt-4"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <motion.button
                                                            whileTap={{ scale: 0.88 }}
                                                            onClick={handleRetake}
                                                            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg shrink-0"
                                                        >
                                                            <RotateCcw size={18} />
                                                        </motion.button>
                                                        <motion.button
                                                            whileTap={{ scale: 0.97 }}
                                                            onClick={handleConfirmAndAnalyze}
                                                            className="flex-1 h-12 bg-white rounded-full flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,255,255,0.25)] font-black text-base text-black"
                                                        >
                                                            <Sparkles size={17} className="text-black" />
                                                            Analiz Et
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Hata Durumu */}
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

                                {/* Hidden input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                        ) : (
                            /* ==========================================================
                               SONUÇ (REVIEW) EKRANI
                               ========================================================== */
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 w-full flex flex-col relative pb-10 overflow-y-auto"
                                style={{ background: 'linear-gradient(160deg, #e8eaf8 0%, #dce5f5 40%, #e0e8f8 70%, #d8e2f8 100%)' }}
                            >
                                {/* Fotoğraf header — yemek adı overlay */}
                                <div className="relative w-full h-[42vh] max-h-[360px] shrink-0">
                                    <img src={previewUrl!} className="w-full h-full object-cover" />
                                    <div
                                        className="absolute inset-0"
                                        style={{ background: 'linear-gradient(to top, #dce5f5 0%, rgba(220,229,245,0.55) 30%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.15) 100%)' }}
                                    />
                                    <div className="absolute bottom-4 left-5 right-5 z-10 flex items-end justify-between">
                                        <div className="flex-1 mr-3">
                                            <h1 className="text-white font-black text-2xl leading-tight drop-shadow-lg line-clamp-2">
                                                {editName || result.yemekAdi}
                                            </h1>
                                            <div className="mt-1.5">
                                                <ConfidenceBadge guven={result.guven} />
                                            </div>
                                        </div>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleRetake}
                                            className="bg-black/40 backdrop-blur-md p-2.5 rounded-full border border-white/20 shadow-lg shrink-0"
                                        >
                                            <RotateCcw size={18} className="text-white" />
                                        </motion.button>
                                    </div>
                                </div>

                                {/* İçerik kartları */}
                                <div className="px-5 -mt-4 relative z-20 flex flex-col gap-4">

                                    {/* Yemek adı düzenleme */}
                                    <div>
                                        <label className="text-[10px] font-bold text-[#15224a]/50 uppercase tracking-widest pl-1 mb-1 block">Yemek Adı</label>
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-white/70 border border-white/60 backdrop-blur-sm px-4 py-3 rounded-2xl text-[#15224a] font-bold text-base focus:ring-2 focus:ring-[#15224a]/20 focus:outline-none shadow-sm"
                                        />
                                    </div>

                                    {/* Kalori hero kartı */}
                                    <div>
                                        <label className="text-[10px] font-bold text-[#15224a]/50 uppercase tracking-widest pl-1 mb-1.5 block">Kalori</label>
                                        <div
                                            className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-3xl px-5 py-4 shadow-sm"
                                            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(232,234,248,0.8) 100%)' }}
                                        >
                                            <div className="flex items-end gap-2">
                                                <input
                                                    type="number"
                                                    value={editCalories}
                                                    onChange={(e) => setEditCalories(e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="bg-transparent text-[#15224a] font-black leading-none focus:outline-none w-full"
                                                    style={{ fontSize: '48px', letterSpacing: '-2px' }}
                                                />
                                                <div className="flex flex-col items-end pb-1.5 shrink-0">
                                                    <span className="text-sm font-bold text-[#15224a]/50 leading-none">kcal</span>
                                                    <Flame size={16} className="text-orange-400 mt-1" />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-[#15224a]/40 font-medium mt-1">Dokunarak düzenleyebilirsiniz</p>
                                        </div>
                                    </div>

                                    {/* Makro oranı çubuğu + kartlar */}
                                    <div className="flex flex-col gap-2.5">
                                        {macroRatioBar()}
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { icon: Dumbbell, value: result.protein ?? 0,       label: 'Protein', color: 'text-blue-500',   bg: 'bg-blue-50/80',   border: 'border-blue-100/60' },
                                                { icon: Wheat,    value: result.karbonhidrat ?? 0,   label: 'Karb',    color: 'text-orange-500', bg: 'bg-orange-50/80', border: 'border-orange-100/60' },
                                                { icon: Droplet,  value: result.yag ?? 0,            label: 'Yağ',     color: 'text-amber-500',  bg: 'bg-amber-50/80',  border: 'border-amber-100/60' },
                                                { icon: Leaf,     value: result.lif ?? 0,            label: 'Lif',     color: 'text-purple-500', bg: 'bg-purple-50/80', border: 'border-purple-100/60' },
                                            ].map(({ icon: Icon, value, label, color, bg, border }) => (
                                                <div
                                                    key={label}
                                                    className={`${bg} border ${border} backdrop-blur-sm rounded-2xl p-2.5 flex flex-col items-center gap-1.5`}
                                                >
                                                    <Icon size={14} className={color} />
                                                    <p className={`text-sm font-black ${color}`}>{value}g</p>
                                                    <p className="text-[9px] text-[#15224a]/50 font-bold uppercase tracking-wide">{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-[#15224a]/10 w-full rounded-full" />

                                    {/* Beslenme Önerisi (Diyetisyen Notu) */}
                                    {result.diyetisyenYorumu && (
                                        <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-4 shadow-sm flex gap-3">
                                            <div className="w-0.5 shrink-0 rounded-full self-stretch" style={{ background: 'linear-gradient(to bottom, #34d399, #6366f1)' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Sparkles size={13} className="text-indigo-500 shrink-0" />
                                                    <h3 className="text-[10px] font-bold text-[#15224a]/60 uppercase tracking-widest">
                                                        Beslenme Önerisi
                                                    </h3>
                                                </div>
                                                <p className="text-sm font-medium text-[#15224a]/80 leading-relaxed">
                                                    {result.diyetisyenYorumu}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tespit Edilen İçerik */}
                                    {(result.icerikAdetleri || result.porsiyon) && (
                                        <div className="px-1 text-center">
                                            <p className="text-[10px] font-bold text-[#15224a]/40 uppercase tracking-wider mb-1">Tespit Edilen İçerik</p>
                                            <p className="text-xs font-medium text-[#15224a]/50">
                                                {result.icerikAdetleri || result.porsiyon}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Aksiyon Butonları */}
                                <div className="px-5 mt-auto pt-6 pb-2">
                                    <button
                                        onClick={() => setShowMealTypeSheet(true)}
                                        className="w-full py-4 bg-[#15224a] rounded-[1.25rem] text-white font-black text-lg shadow-xl shadow-[#15224a]/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                                    >
                                        <CheckCircle size={22} /> Öğünü Kaydet
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full mt-3 py-3 text-[#15224a]/50 font-bold text-sm tracking-wide bg-transparent rounded-2xl active:bg-[#15224a]/5 transition-colors"
                                    >
                                        İptal Et
                                    </button>
                                </div>

                                {/* Öğün Tipi Bottom Sheet */}
                                <AnimatePresence>
                                    {showMealTypeSheet && (
                                        <>
                                            {/* Backdrop */}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 z-[120] bg-black/40 backdrop-blur-sm"
                                                onClick={() => setShowMealTypeSheet(false)}
                                            />

                                            {/* Sheet panel */}
                                            <motion.div
                                                initial={{ y: '100%' }}
                                                animate={{ y: 0 }}
                                                exit={{ y: '100%' }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                                                className="absolute bottom-0 left-0 right-0 z-[130] rounded-t-[2rem] bg-white px-5 pb-10 pt-5 shadow-2xl"
                                            >
                                                {/* Pull handle */}
                                                <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-200" />

                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-lg font-black text-[#15224a]">Öğün Tipi</h2>
                                                    <button
                                                        onClick={() => setShowMealTypeSheet(false)}
                                                        className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {missingMealReminder && (
                                                    <div className="flex gap-2 items-center bg-amber-50 border border-amber-100 p-3 rounded-2xl mb-4">
                                                        <Info size={15} className="text-amber-500 shrink-0" />
                                                        <p className="text-xs font-semibold text-amber-800 leading-tight">
                                                            {missingMealReminder}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex flex-col gap-2.5">
                                                    {mealOptions.map(opt => (
                                                        <motion.button
                                                            key={opt}
                                                            whileTap={{ scale: 0.97 }}
                                                            onClick={() => {
                                                                setEditMealType(opt);
                                                                handleSaveWithMealType(opt);
                                                            }}
                                                            className="w-full py-4 px-5 rounded-2xl bg-[#15224a]/5 border border-[#15224a]/10 text-[#15224a] font-bold text-base text-left hover:bg-[#15224a]/10 transition-colors flex items-center justify-between"
                                                        >
                                                            <span>{opt}</span>
                                                            {result?.ogunTuru === opt && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">
                                                                    AI Önerisi
                                                                </span>
                                                            )}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>

                            </motion.div>
                        )}

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
