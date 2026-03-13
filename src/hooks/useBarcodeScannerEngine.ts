import { useEffect, useRef, useState, type MutableRefObject } from 'react';

import { isValidBarcode, sanitizeBarcode } from '../utils/barcodeShared';

const HOLD_MS = 900;
const SCAN_INTERVAL_MS = 60;
const HOLD_FAST_MS = 35;

type ToastType = 'success' | 'error' | 'info';
type DetectorResult = { rawValue?: string };
type NativeBarcodeDetector = {
  detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<DetectorResult[]>;
};
type NativeBarcodeDetectorCtor = new (options?: { formats?: string[] }) => NativeBarcodeDetector;
type ScannerControls = {
  stop: () => void;
  switchTorch?: (enabled: boolean) => Promise<void>;
};

interface UseBarcodeScannerEngineOptions {
  scanEnabledRef: MutableRefObject<boolean>;
  onBarcodeConfirmed: (barcode: string) => void;
  showToast: (message: string, type?: ToastType) => void;
}

export function useBarcodeScannerEngine({
  scanEnabledRef,
  onBarcodeConfirmed,
  showToast,
}: UseBarcodeScannerEngineOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeAnimationRef = useRef<number | null>(null);
  const nativeDetectingRef = useRef(false);
  const scannerControlsRef = useRef<ScannerControls | null>(null);
  const scanActiveRef = useRef(false);
  const cameraSessionRef = useRef(0);
  const activeBarcodeCodeRef = useRef<string | null>(null);
  const activeBarcodeStartRef = useRef<number | null>(null);
  const activeBarcodeLastSeenRef = useRef(0);
  const onBarcodeConfirmedRef = useRef(onBarcodeConfirmed);
  const showToastRef = useRef(showToast);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const [detectedBarcodeDraft, setDetectedBarcodeDraft] = useState('');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomAvailable, setZoomAvailable] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(3);

  useEffect(() => {
    onBarcodeConfirmedRef.current = onBarcodeConfirmed;
  }, [onBarcodeConfirmed]);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const resetTracking = () => {
    setActiveBarcode(null);
    activeBarcodeCodeRef.current = null;
    activeBarcodeStartRef.current = null;
    activeBarcodeLastSeenRef.current = 0;
  };

  const clearDetectedBarcodeDraft = () => {
    setDetectedBarcodeDraft('');
  };

  const captureROI = (wide = false): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const widthRatio = wide ? 0.88 : 0.68;
    const heightRatio = wide ? 0.42 : 0.28;
    const roiWidth = Math.floor(vw * widthRatio);
    const roiHeight = Math.floor(vh * heightRatio);
    const roiX = Math.floor((vw - roiWidth) / 2);
    const roiY = Math.floor((vh - roiHeight) / 2);

    if (!roiCanvasRef.current) {
      roiCanvasRef.current = document.createElement('canvas');
    }

    const canvas = roiCanvasRef.current;
    canvas.width = roiWidth;
    canvas.height = roiHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.filter = 'contrast(2.0) brightness(1.05) saturate(0)';
    context.drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
    context.filter = 'none';
    return canvas;
  };

  const captureFullFrame = (): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!fullCanvasRef.current) {
      fullCanvasRef.current = document.createElement('canvas');
    }

    const canvas = fullCanvasRef.current;
    canvas.width = vw;
    canvas.height = vh;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.filter = 'contrast(1.6) saturate(0)';
    context.drawImage(video, 0, 0, vw, vh, 0, 0, vw, vh);
    context.filter = 'none';
    return canvas;
  };

  const handleDetectedBarcode = (rawValue?: string) => {
    const now = Date.now();

    if (!rawValue || !scanEnabledRef.current) {
      if (activeBarcodeCodeRef.current !== null) {
        const elapsed = now - (activeBarcodeStartRef.current ?? now);
        if (elapsed >= HOLD_MS && scanEnabledRef.current) {
          const code = activeBarcodeCodeRef.current;
          resetTracking();
          onBarcodeConfirmedRef.current(code);
          return;
        }

        if (now - activeBarcodeLastSeenRef.current > 4000) {
          resetTracking();
        }
      }
      return;
    }

    const barcode = sanitizeBarcode(rawValue);
    if (barcode) {
      setDetectedBarcodeDraft((current) => (current === barcode ? current : barcode));
    }

    if (!isValidBarcode(barcode)) {
      if (activeBarcodeCodeRef.current !== null && now - activeBarcodeLastSeenRef.current > 4000) {
        resetTracking();
      }
      return;
    }

    activeBarcodeLastSeenRef.current = now;
    if (activeBarcodeCodeRef.current !== barcode) {
      activeBarcodeCodeRef.current = barcode;
      activeBarcodeStartRef.current = now;
      setActiveBarcode(barcode);
      return;
    }

    if (activeBarcodeStartRef.current && now - activeBarcodeStartRef.current >= HOLD_MS) {
      clearDetectedBarcodeDraft();
      resetTracking();
      onBarcodeConfirmedRef.current(barcode);
    }
  };

  const stopNativeLoop = () => {
    scanActiveRef.current = false;
    nativeDetectingRef.current = false;
    if (nativeAnimationRef.current !== null) {
      cancelAnimationFrame(nativeAnimationRef.current);
      nativeAnimationRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopScanner = () => {
    cameraSessionRef.current += 1;
    stopNativeLoop();
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setTorchOn(false);
    setTorchAvailable(false);
    setZoomAvailable(false);
    setZoomLevel(1);
    stopStream();
  };

  const startDetectionLoop = (
    detector: NativeBarcodeDetector,
    options: { allowVideoSource: boolean },
  ) => {
    scanActiveRef.current = true;
    let lastScanAt = 0;
    let frameCount = 0;

    const tick = async () => {
      if (!scanActiveRef.current || !videoRef.current) return;

      const now = performance.now();
      const interval = activeBarcodeCodeRef.current ? HOLD_FAST_MS : SCAN_INTERVAL_MS;
      if (now - lastScanAt >= interval && scanEnabledRef.current && !nativeDetectingRef.current) {
        const totalSteps = options.allowVideoSource ? 4 : 3;
        const step = frameCount % totalSteps;
        let source: HTMLCanvasElement | HTMLVideoElement | null;
        if (options.allowVideoSource && step === 2) {
          source = videoRef.current;
        } else if (step === totalSteps - 1) {
          source = captureFullFrame();
        } else {
          source = captureROI(step === 1);
        }

        frameCount += 1;

        if (source) {
          try {
            nativeDetectingRef.current = true;
            lastScanAt = now;

            const results = await detector.detect(source);
            const hit = results.find((result) => result.rawValue)?.rawValue;
            if (hit) {
              handleDetectedBarcode(hit);
            } else {
              const fullFrame = step !== totalSteps - 1 ? captureFullFrame() : null;
              if (fullFrame) {
                const fallbackResults = await detector.detect(fullFrame);
                handleDetectedBarcode(fallbackResults.find((result) => result.rawValue)?.rawValue);
              } else {
                handleDetectedBarcode(undefined);
              }
            }
          } catch {
            // Sessiz geç
          } finally {
            nativeDetectingRef.current = false;
          }
        }
      }

      nativeAnimationRef.current = requestAnimationFrame(tick);
    };

    nativeAnimationRef.current = requestAnimationFrame(tick);
  };

  const startScannerWithFallback = async (stream: MediaStream, session: number) => {
    const isStale = () => session !== cameraSessionRef.current;

    const detectorCtor = (window as Window & { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector;
    if (detectorCtor) {
      try {
        startDetectionLoop(
          new detectorCtor({
            formats: [
              'ean_13',
              'ean_8',
              'upc_a',
              'upc_e',
              'qr_code',
              'data_matrix',
              'code_128',
              'code_39',
              'itf',
              'codabar',
              'aztec',
              'pdf417',
            ],
          }),
          { allowVideoSource: true },
        );
        return;
      } catch {
        // Sessiz geç
      }
    }

    if (isStale()) return;

    try {
      const { BarcodeDetectorPolyfill } = await import('@undecaf/barcode-detector-polyfill');
      if (isStale()) return;

      startDetectionLoop(
        new BarcodeDetectorPolyfill({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        }) as unknown as NativeBarcodeDetector,
        { allowVideoSource: false },
      );
      return;
    } catch {
      // Sessiz geç
    }

    if (isStale()) return;

    const video = videoRef.current;
    if (!video) return;

    try {
      const zxing = await import('@zxing/browser');
      if (isStale()) return;

      const reader = new zxing.BrowserMultiFormatReader();
      if (isStale()) return;

      scannerControlsRef.current = await reader.decodeFromStream(stream, video, (result, _error, controls) => {
        scannerControlsRef.current = controls;
        handleDetectedBarcode(result?.getText());
      });
    } catch {
      if (!isStale()) {
        showToastRef.current('Barkod okuyucu başlatılamadı', 'error');
      }
    }
  };

  const startCamera = async () => {
    stopScanner();
    const currentSession = cameraSessionRef.current;
    const isStale = () => currentSession !== cameraSessionRef.current;

    setCameraError(null);
    setManualEntryOpen(false);
    clearDetectedBarcodeDraft();
    resetTracking();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (isStale()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      type ExtendedCapabilities = MediaTrackCapabilities & {
        torch?: boolean;
        zoom?: { min: number; max: number; step: number };
      };

      const capabilities = track.getCapabilities?.() as ExtendedCapabilities | undefined;
      setTorchAvailable(Boolean(capabilities?.torch));

      if (capabilities?.zoom) {
        setZoomAvailable(true);
        setZoomMin(capabilities.zoom.min);
        setZoomMax(capabilities.zoom.max);
        setZoomLevel(capabilities.zoom.min);
      } else {
        setZoomAvailable(false);
        setZoomMin(1);
        setZoomMax(3);
        setZoomLevel(1);
      }

      try {
        await track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
        });
      } catch {
        // Sessiz geç
      }

      if (isStale()) return;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      if (isStale()) return;

      await startScannerWithFallback(stream, currentSession);
    } catch {
      if (isStale()) return;
      setCameraError('Kamera açılamadı. Barkodu elle girerek devam edebilirsin.');
      setManualEntryOpen(true);
    }
  };

  const applyTorch = async () => {
    const next = !torchOn;
    const track = streamRef.current?.getVideoTracks()[0];

    try {
      if (scannerControlsRef.current?.switchTorch) {
        await scannerControlsRef.current.switchTorch(next);
      } else if (track) {
        await track.applyConstraints({
          advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
        });
      }

      setTorchOn(next);
    } catch {
      showToastRef.current('Flaş bu cihazda desteklenmiyor', 'info');
      setTorchAvailable(false);
    }
  };

  const applyZoom = async (nextLevel: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !zoomAvailable) return;

    const clamped = Math.max(zoomMin, Math.min(zoomMax, nextLevel));
    try {
      await track.applyConstraints({
        advanced: [{ zoom: clamped } as unknown as MediaTrackConstraintSet],
      });
      setZoomLevel(clamped);
    } catch {
      // Sessiz geç
    }
  };

  return {
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
  };
}
