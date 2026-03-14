import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle, AlertTriangle, Barcode, CheckCircle, ChevronDown,
  Keyboard, LoaderCircle, Package, Plus, PlusCircle,
  RotateCcw, ScanLine, ScrollText, X, Zap,
} from 'lucide-react';

import type { BarcodeProduct } from '../types';
import { useApp } from '../context/AppContext';
import { useBarcodeScannerEngine } from '../hooks/useBarcodeScannerEngine';
import { barcodeProductToMeal, fetchBarcodeProduct, isValidBarcode } from '../utils/barcodeService';
import { sanitizeBarcode } from '../utils/barcodeShared';
import {
  ALLERGEN_CHIP_STYLE,
  calculateFitluneScore,
  DEFAULT_ALLERGEN_CHIP,
  type FitluneScore as FitluneScoreResult,
} from '../utils/nutritionScoring';
import DeveloperBarcodeScannerModal from './DeveloperBarcodeScannerModal';
import ProductSuggestionSheet from './ProductSuggestionSheet';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  mode?: 'lookup' | 'developer';
}

type ScanPhase = 'scan' | 'loading' | 'review';

const MEAL_OPTIONS = ['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Atıştırmalık'] as const;
const HOLD_MS = 900;
const ACI_BAKLA_LABEL = 'Acı bakla';

const CARD_META = [
  { key: 'energyKcal',   label: 'Enerji',       unit: 'kcal', style: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  { key: 'protein',      label: 'Protein',       unit: 'g',    style: 'border-blue-100 bg-blue-50 text-blue-700' },
  { key: 'carbs',        label: 'Karbonhidrat',  unit: 'g',    style: 'border-orange-100 bg-orange-50 text-orange-700' },
  { key: 'fat',          label: 'Yağ',           unit: 'g',    style: 'border-amber-100 bg-amber-50 text-amber-700' },
  { key: 'saturatedFat', label: 'Doymuş yağ',    unit: 'g',    style: 'border-rose-100 bg-rose-50 text-rose-700' },
  { key: 'sugar',        label: 'Şeker',          unit: 'g',    style: 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700' },
  { key: 'fiber',        label: 'Lif',            unit: 'g',    style: 'border-lime-100 bg-lime-50 text-lime-700' },
  { key: 'salt',         label: 'Tuz',            unit: 'g',    style: 'border-cyan-100 bg-cyan-50 text-cyan-700' },
] as const;

function normalizeAllergenLabel(allergen: string): string {
  if (allergen === 'Lupine' || allergen === 'Lupin') {
    return ACI_BAKLA_LABEL;
  }

  return allergen;
}

function resolveAllergenStyleKey(allergen: string): string {
  const normalized = normalizeAllergenLabel(allergen);
  return normalized === ACI_BAKLA_LABEL ? 'Lupine' : normalized;
}

// Alt bileşenler

function ScannerProgress() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm"
    >
      <div className="rounded-full bg-white/20 px-4 py-1.5 text-[11px] font-black tracking-widest text-white">OKUNUYOR...</div>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/20">
        <motion.div className="h-full bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: HOLD_MS / 1000, ease: 'linear' }} />
      </div>
    </motion.div>
  );
}

function CornerDecor({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const classes = {
    tl: 'left-0 top-0 rounded-tl-3xl border-l-[3px] border-t-[3px]',
    tr: 'right-0 top-0 rounded-tr-3xl border-r-[3px] border-t-[3px]',
    bl: 'bottom-0 left-0 rounded-bl-3xl border-b-[3px] border-l-[3px]',
    br: 'bottom-0 right-0 rounded-br-3xl border-b-[3px] border-r-[3px]',
  };
  return <motion.div className={`absolute h-12 w-12 border-white/90 ${classes[position]}`} animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 1.8, repeat: Infinity }} />;
}

function ProductNotFoundCard({ barcode, onSuggest, onDismiss }: { barcode: string; onSuggest: () => void; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-white/15 bg-black/50 backdrop-blur-2xl"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <Package size={17} className="text-white/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black text-white">Ürün bulunamadı</p>
          <p className="truncate text-[11px] text-white/55">{barcode}</p>
        </div>
        <button onClick={onDismiss} className="shrink-0 rounded-full p-1 text-white/40 hover:text-white/70">
          <X size={14} />
        </button>
      </div>
      <button
        onClick={onSuggest}
        className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-emerald-500/20 py-3 text-[13px] font-black text-emerald-300 transition-colors active:bg-emerald-500/30"
      >
        <PlusCircle size={15} />
        Siz Ekleyin
      </button>
    </motion.div>
  );
}

// Gerçek Nutri-Score etiketi: 5 renkli segment, aktif harf büyük + beyaz halo
function NutriscoreBadge({ score }: { score: 'A' | 'B' | 'C' | 'D' | 'E' }) {
  const GRADES = ['A', 'B', 'C', 'D', 'E'] as const;
  const BG: Record<string, string> = { A: '#1E8F4E', B: '#7AC142', C: '#F5C400', D: '#EF7D00', E: '#E63312' };
  const FG: Record<string, string> = { A: '#fff', B: '#fff', C: '#1a1a1a', D: '#fff', E: '#fff' };
  return (
    <div className="inline-flex shrink-0 flex-col items-start gap-[3px]">
      <span className="pl-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-400 leading-none">NUTRI-SCORE</span>
      <div className="flex items-end" style={{ gap: 2 }}>
        {GRADES.map((g, i) => {
          const active = g === score;
          return (
            <div
              key={g}
              className="flex items-center justify-center font-black leading-none select-none"
              style={{
                backgroundColor: BG[g],
                color: FG[g],
                height: active ? 38 : 26,
                width: active ? 36 : 24,
                fontSize: active ? 18 : 11,
                borderRadius: active
                  ? 99
                  : i === 0
                  ? '6px 2px 2px 6px'
                  : i === 4
                  ? '2px 6px 6px 2px'
                  : 2,
                boxShadow: active ? `0 0 0 2.5px white, 0 2px 10px ${BG[g]}70` : undefined,
                position: 'relative',
                zIndex: active ? 1 : 0,
                opacity: active ? 1 : 0.5,
              }}
            >
              {g}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FitluneScoreCard({
  analysis,
}: {
  analysis: FitluneScoreResult;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails =
    analysis.positives.length > 0 ||
    analysis.negatives.length > 0 ||
    analysis.missingFields.length > 0 ||
    analysis.warnings.length > 0;

  const confidenceMeta =
    analysis.confidence === 'high'
      ? { label: 'Yüksek güven', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
      : analysis.confidence === 'medium'
        ? { label: 'Orta güven', style: 'border-amber-200 bg-amber-50 text-amber-700' }
        : { label: 'Düşük güven', style: 'border-rose-200 bg-rose-50 text-rose-700' };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left"
      >
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">FitLune Sağlık Puanı</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${confidenceMeta.style}`}>
                  {confidenceMeta.label}
                </span>
              </div>
            </div>
            {hasDetails && (
              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-zinc-400">
                Neden bu puan?
                <ChevronDown size={15} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </span>
            )}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${analysis.gradient}`}
              initial={{ width: '0%' }}
              animate={{ width: `${analysis.score}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black leading-none ${analysis.color}`}>{analysis.score}</p>
          <p className={`mt-0.5 text-[11px] font-black ${analysis.color}`}>{analysis.label}</p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-zinc-100"
          >
            <div className="space-y-4 px-4 pb-4 pt-3">
              <p className="text-xs leading-6 text-zinc-500">{analysis.summary}</p>

              {analysis.metricsUsed.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Kullanılan Veriler</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.metricsUsed.map((item) => (
                      <span key={item} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.missingFields.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">Eksik Bilgiler</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.missingFields.map((item) => (
                      <span key={item} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  {analysis.warnings.map((item) => (
                    <p key={item} className="leading-6">
                      {item}
                    </p>
                  ))}
                </div>
              )}

              {analysis.positives.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Artılar</p>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.positives.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-sm text-zinc-600">
                        <span className="mt-[3px] text-emerald-500">+</span>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.negatives.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Eksiler</p>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.negatives.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-sm text-zinc-600">
                        <span className="mt-[3px] text-rose-500">-</span>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Accordion({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-zinc-400">{icon}</span>}
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">{title}</p>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Ana bileşen

function LookupBarcodeScannerModal({ open, onClose }: BarcodeScannerModalProps) {
  const { state, dispatch, showToast } = useApp();
  const lookupRequestRef = useRef(0);
  const scanEnabledRef = useRef(true);

  const [phase, setPhase] = useState<ScanPhase>('scan');
  const [manualBarcode, setManualBarcode] = useState('');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<(typeof MEAL_OPTIONS)[number]>('Atıştırmalık');
  const [selectedGrams, setSelectedGrams] = useState(100);
  const [editEnergy, setEditEnergy] = useState<number | ''>('');
  const [loadingLabel, setLoadingLabel] = useState('Barkod okunuyor');
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [suggestionSheetOpen, setSuggestionSheetOpen] = useState(false);

  const {
    activeBarcode,
    applyTorch,
    applyZoom,
    cameraError,
    clearDetectedBarcodeDraft,
    detectedBarcodeDraft,
    manualEntryOpen,
    resetTracking,
    setManualEntryOpen,
    startCamera,
    stopScanner,
    torchAvailable,
    torchOn,
    videoRef,
    zoomAvailable,
    zoomLevel,
    zoomMax,
    zoomMin,
  } = useBarcodeScannerEngine({
    scanEnabledRef,
    onBarcodeConfirmed: (barcode) => {
      void handleLookup(barcode);
    },
    showToast,
  });

  // Porsiyon state
  const [portionMode, setPortionMode] = useState<'portion' | '100g'>('portion');
  const [customPortionOpen, setCustomPortionOpen] = useState(false);

  // Öğün tipi: "Öğünüme Ekle" ile açılır
  const [mealPickerOpen, setMealPickerOpen] = useState(false);

  const multiplier = selectedGrams / 100;

  const scaledNutrition = useMemo(() => {
    if (!product) {
      return {
        energyKcal: null as number | null,
        protein: null as number | null,
        carbs: null as number | null,
        fat: null as number | null,
        saturatedFat: null as number | null,
        sugar: null as number | null,
        fiber: null as number | null,
        salt: null as number | null,
      };
    }

    const scale = (value: number | null) =>
      value != null ? Number((value * multiplier).toFixed(value < 10 ? 1 : 0)) : null;

    return {
      energyKcal: product.energyKcal != null ? Math.round(product.energyKcal * multiplier) : null,
      protein: scale(product.protein),
      carbs: scale(product.carbs),
      fat: scale(product.fat),
      saturatedFat: scale(product.saturatedFat),
      sugar: scale(product.sugar),
      fiber: scale(product.fiber),
      salt: scale(product.salt),
    };
  }, [product, multiplier]);

  const nutrientCards = CARD_META.map((item) => {
    let value: number | string;
    if (item.key === 'energyKcal') {
      value = editEnergy === '' ? 'Bilinmiyor' : editEnergy;
    } else {
      const numericValue = scaledNutrition[item.key as keyof typeof scaledNutrition] as number | null;
      value = numericValue == null ? 'Bilinmiyor' : numericValue;
    }
    return { ...item, value };
  });

  const nutritionAnalysis = useMemo(() => {
    if (!product) {
      return null;
    }

    return calculateFitluneScore(product);
  }, [product]);

  // Porsiyon tab değiştirince gram güncelle
  const handlePortionMode = (mode: 'portion' | '100g') => {
    setPortionMode(mode);
    setCustomPortionOpen(false);
    setSelectedGrams(mode === 'portion' ? (product?.servingSizeG ?? 100) : 100);
  };

  // Porsiyon tab etiketleri
  const portionTabLabel = product?.servingSizeG
    ? `1 Porsiyon (${product.servingSizeG}g)`
    : '1 Porsiyon';
  const show100gTab = true; // her zaman göster

  useEffect(() => {
    scanEnabledRef.current = phase === 'scan';
  }, [phase]);

  useEffect(() => {
    if (product) {
      setEditEnergy(scaledNutrition.energyKcal ?? '');
    }
  }, [product, scaledNutrition.energyKcal]);


  const resetState = () => {
    setPhase('scan');
    setManualBarcode('');
    setProduct(null);
    setSelectedMealType('Atıştırmalık');
    setSelectedGrams(100);
    setEditEnergy('');
    setManualEntryOpen(false);
    setLoadingLabel('Barkod okunuyor');
    setNotFoundBarcode(null);
    setSuggestionSheetOpen(false);
    setPortionMode('portion');
    setCustomPortionOpen(false);
    setMealPickerOpen(false);
    clearDetectedBarcodeDraft();
    resetTracking();
  };

  const closeModal = () => {
    stopScanner();
    resetState();
    onClose();
  };

  const restartScannerFlow = () => {
    setSuggestionSheetOpen(false);
    setNotFoundBarcode(null);
    setLoadingLabel('Barkod okunuyor');
    setPhase('scan');
    resetTracking();
    void startCamera();
  };

  const openSuggestionFlow = (barcode: string) => {
    stopScanner();
    setManualEntryOpen(false);
    setNotFoundBarcode(barcode);
    setSuggestionSheetOpen(true);
    setPhase('scan');
    clearDetectedBarcodeDraft();
    resetTracking();
  };

  const openManualEditor = (seed?: string) => {
    const nextBarcode = sanitizeBarcode(seed ?? detectedBarcodeDraft ?? manualBarcode);
    if (nextBarcode) {
      setManualBarcode(nextBarcode);
    }

    clearDetectedBarcodeDraft();
    setManualEntryOpen(true);
  };




  const handleLookup = async (input: string) => {
    const barcode = sanitizeBarcode(input);
    if (!isValidBarcode(barcode)) {
      showToast('Geçerli bir barkod numarası girin.', 'error');
      return;
    }

    const requestId = Date.now();
    lookupRequestRef.current = requestId;
    setLoadingLabel(`Aranıyor: ${barcode}`);
    setNotFoundBarcode(null);
    clearDetectedBarcodeDraft();
    setPhase('loading');

    try {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000));
      const nextProduct = await Promise.race([fetchBarcodeProduct(barcode), timeoutPromise]);
      if (lookupRequestRef.current !== requestId) return;
      navigator.vibrate?.(35);
      const defaultGrams = nextProduct.servingSizeG ?? 100;
      setProduct(nextProduct);
      setSelectedMealType('Atıştırmalık');
      setSelectedGrams(defaultGrams);
      setPortionMode('portion');
      setCustomPortionOpen(false);
      setMealPickerOpen(false);
      setEditEnergy(nextProduct.energyKcal != null ? Math.round(nextProduct.energyKcal * defaultGrams / 100) : '');
      setPhase('review');
      stopScanner();
    } catch (err) {
      if (lookupRequestRef.current !== requestId) return;
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'timeout') {
        showToast('Sunucuya bağlanılamadı, tekrar dene', 'error');
        setPhase('scan');
      } else if (msg === 'not_found') {
        openSuggestionFlow(barcode);
        showToast('Ürün bulunamadı. Ürün öner formu açıldı.', 'info');
      } else {
        showToast(msg || 'Bağlantı hatası, tekrar dene', 'error');
        setPhase('scan');
      }
      resetTracking();
    }
  };


  useEffect(() => {
    if (!open) {
      stopScanner();
      resetState();
      return;
    }
    resetState();
    void startCamera();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    if (!product) return;
    const finalEnergy = typeof editEnergy === 'number' ? editEnergy : (scaledNutrition.energyKcal ?? 0);
    const meal = barcodeProductToMeal(product, {
      date: state.selectedDate,
      mealType: selectedMealType,
      grams: selectedGrams,
      energyKcal: finalEnergy,
    });
    dispatch({ type: 'ADD_MEAL', payload: meal });
    showToast(`${product.productName} kaydedildi`, 'success');
    closeModal();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
        <motion.div key="barcode-scanner-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90">
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-black sm:h-[88vh] sm:max-w-[400px] sm:rounded-[2.5rem] sm:shadow-2xl">

            {/* Header */}
            <div className="pointer-events-none absolute left-0 right-0 top-6 z-[130] flex items-center justify-between px-6">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-white/95 backdrop-blur-lg">
                <Barcode size={16} />
                <span className="text-[11px] font-bold tracking-widest uppercase">Fitlune Barkod</span>
              </div>
              <div className="pointer-events-auto flex items-center gap-2">
                {zoomAvailable && phase !== 'review' && (
                  <div className="flex items-center gap-1 rounded-full bg-black/30 px-1 backdrop-blur-lg">
                    <button
                      onClick={() => void applyZoom(Number((zoomLevel - 0.5).toFixed(1)))}
                      disabled={zoomLevel <= zoomMin}
                      className="flex h-8 w-8 items-center justify-center text-xl font-bold text-white disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="min-w-[28px] text-center text-[11px] font-black text-white">{zoomLevel.toFixed(1)}×</span>
                    <button
                      onClick={() => void applyZoom(Number((zoomLevel + 0.5).toFixed(1)))}
                      disabled={zoomLevel >= zoomMax}
                      className="flex h-8 w-8 items-center justify-center text-xl font-bold text-white disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                )}
                {torchAvailable && phase !== 'review' && (
                  <button onClick={() => void applyTorch()} className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-lg ${torchOn ? 'bg-amber-300 text-amber-900' : 'bg-black/30 text-white'}`}>
                    <Zap size={18} />
                  </button>
                )}
                <button onClick={closeModal} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tarama Fazı */}
            {phase !== 'review' && (
              <div className="relative flex flex-1 flex-col overflow-hidden">
                {!cameraError && <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-20 sm:px-6">
                  <div className="flex flex-1 flex-col items-center justify-center gap-4">

                    <AnimatePresence>
                      {cameraError && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-[320px] rounded-2xl border border-amber-300/25 bg-amber-300/14 px-4 py-3 text-white backdrop-blur-2xl">
                          <div className="flex items-start gap-3">
                            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-200" />
                            <div>
                              <p className="text-sm font-bold">Kamera açılamadı</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-white/80">{cameraError}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative w-full max-w-[320px]">
                      <div className={`relative h-[160px] w-full overflow-hidden rounded-[1.75rem] border ${activeBarcode ? 'scale-[1.02] border-white/90' : 'border-white/40'} transition-all`}>
                        <CornerDecor position="tl" />
                        <CornerDecor position="tr" />
                        <CornerDecor position="bl" />
                        <CornerDecor position="br" />
                        {activeBarcode && <ScannerProgress />}
                      </div>
                      {zoomAvailable && (
                        <p className="mt-2 text-center text-[11px] text-white/50">
                          Zoom: {zoomLevel.toFixed(1)}× - ürün küçükse + ile yaklaştır
                        </p>
                      )}
                    </div>

                    <AnimatePresence>
                      {notFoundBarcode && (
                        <ProductNotFoundCard
                          barcode={notFoundBarcode}
                          onSuggest={() => openSuggestionFlow(notFoundBarcode)}
                          onDismiss={restartScannerFlow}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {detectedBarcodeDraft && !isValidBarcode(detectedBarcodeDraft) && (
                    <button
                      onClick={() => openManualEditor(detectedBarcodeDraft)}
                      className="mx-auto mb-3 w-full max-w-[320px] rounded-2xl border border-amber-300/25 bg-amber-300/12 px-4 py-3 text-left text-white backdrop-blur-2xl"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
                        Eksik okuma algılandı
                      </p>
                      <p className="mt-1 font-mono text-sm text-white">{detectedBarcodeDraft}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/70">
                        Dokunup barkodu elle tamamlayabilirsiniz.
                      </p>
                    </button>
                  )}

                  <div className="mx-auto w-full max-w-[320px]">
                    <AnimatePresence mode="wait">
                      {!manualEntryOpen ? (
                        <motion.button
                          key="manual-btn"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => openManualEditor()}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-sm font-bold text-white backdrop-blur-xl"
                        >
                          <Keyboard size={18} />
                          Barkodu elle gir
                        </motion.button>
                      ) : (
                        <motion.div
                          key="manual-panel"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 16 }}
                          className="rounded-2xl border border-white/15 bg-black/50 p-4 backdrop-blur-2xl"
                        >
                          <div className="mb-3 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                              <Keyboard size={15} />
                              <p className="text-sm font-bold">Barkodu elle gir</p>
                            </div>
                            <button onClick={() => setManualEntryOpen(false)} className="rounded-full bg-white/10 p-1.5 text-white/60">
                              <X size={13} />
                            </button>
                          </div>
                          <p className="mb-3 text-xs leading-relaxed text-white/65">
                            Eksik veya yanlış okunan barkodu buradan düzeltebilirsiniz.
                          </p>
                          <div className="flex gap-2">
                            <input
                              value={manualBarcode}
                              onChange={(e) => setManualBarcode(e.target.value.replace(/[^\d]/g, ''))}
                              inputMode="numeric"
                              placeholder="8690504001234"
                              autoFocus
                              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <button
                              onClick={() => void handleLookup(manualBarcode)}
                              className="shrink-0 rounded-xl bg-white px-4 text-sm font-black text-zinc-900"
                            >
                              Ara
                            </button>
                          </div>
                          {manualBarcode.length >= 8 && (
                            <button
                              onClick={() => openSuggestionFlow(sanitizeBarcode(manualBarcode))}
                              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400"
                            >
                              <PlusCircle size={13} />
                              Ürün öner
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {phase === 'loading' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
                        <div className="relative flex h-20 w-20 items-center justify-center">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border border-white/15 border-t-white" />
                          <LoaderCircle size={26} className="animate-spin text-white" />
                        </div>
                        <p className="mt-4 text-lg font-black text-white">{loadingLabel}</p>
                        <p className="mt-1 text-sm font-medium text-white/70">Fitlune veritabanında aranıyor</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Review Fazı */}
            {phase === 'review' && product && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col overflow-y-auto bg-zinc-50 dark:bg-zinc-950 transition-colors">

                {/* Hero - ürün görseli (boyut resim durumuna göre) */}
                <div className={`relative shrink-0 overflow-hidden bg-zinc-900 ${product.imageUrl ? 'h-[28vh] min-h-[160px] max-h-[240px]' : 'h-[18vh] min-h-[120px]'}`}>
                  {product.imageUrl ? (
                    <>
                      <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl saturate-150" />
                      <div className="absolute inset-0 flex items-center justify-center p-6 pb-10">
                        <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-contain drop-shadow-2xl" />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 text-white">
                        <Package size={34} />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-950/20 to-black/10 transition-colors" />
                  <button
                    onClick={() => { resetState(); void startCamera(); }}
                    className="absolute right-5 top-[72px] flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                {/* İçerik */}
                <div className="relative -mt-5 flex flex-1 flex-col gap-4 rounded-t-[2rem] bg-zinc-50 dark:bg-zinc-950 px-5 pb-8 pt-5 transition-colors">

                  {/* Ürün adı + Nutriscore */}
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Onaylı ürün</span>
                      <h2 className="mt-2 text-xl font-black leading-snug text-zinc-900 dark:text-white">{product.productName}</h2>
                      <p className="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">{product.barcode}</p>
                    </div>
                    {nutritionAnalysis?.nutriScore.grade ? (
                      <NutriscoreBadge score={nutritionAnalysis.nutriScore.grade} />
                    ) : (
                      <div className="inline-flex shrink-0 flex-col items-start gap-[3px]">
                        <span className="pl-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-400 leading-none">NUTRI-SCORE</span>
                        <div className="flex h-[26px] items-center rounded-lg bg-zinc-200 px-3">
                          <span className="text-xs font-black text-zinc-400">Bilinmiyor</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FitLune Sağlık Puanı */}
                  {nutritionAnalysis && <FitluneScoreCard analysis={nutritionAnalysis} />}

                  {/* Porsiyon seçici - 2 tab + özel açılır */}
                  <div className="rounded-[1.75rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-colors">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Porsiyon</p>
                    <div className="flex items-center gap-2">
                      {/* Tab butonları */}
                      <div className="flex flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-1 transition-colors">
                        <button
                          onClick={() => handlePortionMode('portion')}
                          className={`flex-1 rounded-xl px-3 py-2 text-xs font-black leading-tight transition-all ${portionMode === 'portion' && !customPortionOpen ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                        >
                          {portionTabLabel}
                        </button>
                        {show100gTab && (
                          <button
                            onClick={() => handlePortionMode('100g')}
                            className={`flex-1 rounded-xl px-3 py-2 text-xs font-black leading-tight transition-all ${portionMode === '100g' && !customPortionOpen ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                          >
                            100 Gram
                          </button>
                        )}
                      </div>
                      {/* Özel porsiyon aç/kapat */}
                      <button
                        onClick={() => setCustomPortionOpen(!customPortionOpen)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all ${customPortionOpen ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                      >
                        <Plus size={16} className={`transition-transform ${customPortionOpen ? 'rotate-45' : ''}`} />
                      </button>
                    </div>

                    {/* Özel porsiyon input (açılır) */}
                    <AnimatePresence>
                      {customPortionOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 transition-colors">
                              <input
                                type="number"
                                value={selectedGrams}
                                min={1}
                                max={9999}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  if (v > 0) setSelectedGrams(v);
                                }}
                                className="w-16 bg-transparent text-sm font-black text-zinc-800 dark:text-white focus:outline-none"
                              />
                              <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500">g / ml</span>
                            </div>
                            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 transition-colors">
                              <input
                                type="number"
                                value={editEnergy}
                                onChange={(e) => setEditEnergy(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-14 bg-transparent text-right text-lg font-black text-emerald-800 dark:text-emerald-400 focus:outline-none"
                              />
                              <span className="ml-1 text-xs font-bold text-emerald-600 dark:text-emerald-500">kcal</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Besin değerleri */}
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">{selectedGrams} g / ml başına besin değerleri</p>
                    <div className="grid grid-cols-2 gap-2">
                      {nutrientCards.map((item) => (
                        <div key={item.key} className={`rounded-2xl border p-3 text-center ${item.style} dark:bg-opacity-10 dark:border-opacity-20`}>
                          {item.value === 'Bilinmiyor' ? (
                            <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500">Bilinmiyor</p>
                          ) : (
                            <p className="text-base font-black dark:text-white">{item.value}{item.unit}</p>
                          )}
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* İçerik accordion */}
                  {product.ingredients && (
                    <Accordion icon={<ScrollText size={14} />} title="İçindekiler">
                      <p className="text-sm leading-7 text-zinc-500 dark:text-zinc-400">{product.ingredients}</p>
                    </Accordion>
                  )}

                  {/* Allerjenler accordion */}
                  {product.allergens && product.allergens.length > 0 && (
                    <Accordion icon={<AlertTriangle size={14} className="text-amber-500" />} title="Alerjenler">
                      <div className="flex flex-wrap gap-2">
                        {product.allergens.map((allergen) => {
                          const normalizedAllergen = normalizeAllergenLabel(allergen);
                          const styleKey = resolveAllergenStyleKey(allergen);

                          return (
                            <span
                              key={`${allergen}-${styleKey}`}
                              className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-bold ${ALLERGEN_CHIP_STYLE[styleKey] ?? DEFAULT_ALLERGEN_CHIP}`}
                            >
                              {normalizedAllergen}
                            </span>
                          );
                        })}
                      </div>
                    </Accordion>
                  )}

                  {/* Öğünüme Ekle + Öğün Tipi */}
                  <div className="mt-auto space-y-3 pb-1">
                    <AnimatePresence>
                      {mealPickerOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 16 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                          className="overflow-hidden rounded-[1.75rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors"
                        >
                          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Öğün Tipi</p>
                          <div className="grid grid-cols-2 gap-2">
                            {MEAL_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setSelectedMealType(opt)}
                                className={`rounded-2xl px-3 py-3 text-sm font-black transition-all ${selectedMealType === opt ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={handleSave}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-zinc-900 dark:bg-white px-5 py-4 text-base font-black text-white dark:text-zinc-900 shadow-xl shadow-zinc-900/20 dark:shadow-white/10 transition-colors"
                          >
                            <CheckCircle size={19} />
                            {selectedMealType} olarak kaydet
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!mealPickerOpen && (
                      <button
                        onClick={() => setMealPickerOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-zinc-900 dark:bg-white px-5 py-4 text-lg font-black text-white dark:text-zinc-900 shadow-xl shadow-zinc-900/20 dark:shadow-white/10 transition-colors"
                      >
                        <CheckCircle size={20} />
                        Öğünüme Ekle
                      </button>
                    )}

                    <button
                      onClick={() => { resetState(); void startCamera(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      <ScanLine size={16} />
                      Tekrar Tara
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      <ProductSuggestionSheet
        open={suggestionSheetOpen}
        barcode={notFoundBarcode ?? ''}
        onClose={restartScannerFlow}
        onSuccess={() => {
          restartScannerFlow();
          showToast('Bildirim alındı, 48 saat içinde ekleneceğiz', 'success');
        }}
      />
    </>
  );
}

export default function BarcodeScannerModal({
  open,
  onClose,
  mode = 'lookup',
}: BarcodeScannerModalProps) {
  if (mode === 'developer') {
    return <DeveloperBarcodeScannerModal open={open} onClose={onClose} />;
  }

  return <LookupBarcodeScannerModal open={open} onClose={onClose} />;
}



