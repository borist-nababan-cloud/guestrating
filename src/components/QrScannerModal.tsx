import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';
import type QrScannerType from 'qr-scanner';
import { TEXTS } from '../lib/i18n';
import { extractRatingCode } from '../lib/validation';
import type { Language } from '../types/rating';

interface QrScannerModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  lang,
  onClose,
  onScanSuccess,
}) => {
  const t = TEXTS[lang];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const camerasRef = useRef<QrScannerType.Camera[]>([]);
  const activeCamIdxRef = useRef<number>(0);

  const [scannerError, setScannerError] = useState<string | null>(null);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const destroyScanner = () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    if (instance) {
      try {
        instance.stop();
      } catch {
        // Ignore stop errors if stream already ended
      }
      try {
        instance.destroy();
      } catch {
        // Ignore destroy errors
      }
    }
    camerasRef.current = [];
    activeCamIdxRef.current = 0;
  };

  useEffect(() => {
    if (!isOpen) {
      destroyScanner();
      setScannerError(null);
      setCanSwitchCamera(false);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setScannerError(null);
      setIsInitializing(true);

      const isSecureOrigin =
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isSecureOrigin) {
        setScannerError(t.scannerNeedHttps);
        setIsInitializing(false);
        return;
      }

      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled) return;

        const hasCamera = await QrScanner.hasCamera();
        if (cancelled) return;
        if (!hasCamera) {
          setScannerError(t.scannerNoCamera);
          setIsInitializing(false);
          return;
        }

        const videoEl = videoRef.current;
        if (!videoEl) {
          setIsInitializing(false);
          return;
        }

        const instance = new QrScanner(
          videoEl,
          (result) => {
            if (cancelled) return;
            const extracted = extractRatingCode(result.data);
            if (!extracted) {
              setScannerError(t.invalidManualCode);
              return;
            }
            cancelled = true;
            destroyScanner();
            onScanSuccess(extracted);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
            maxScansPerSecond: 5,
            returnDetailedScanResult: true,
          }
        );

        scannerRef.current = instance;

        try {
          await instance.start();
        } catch {
          await instance.setCamera('user');
          await instance.start();
        }

        if (cancelled) {
          destroyScanner();
          return;
        }

        try {
          const cams = await QrScanner.listCameras(true);
          if (!cancelled) {
            camerasRef.current = cams;
            const envIdx = cams.findIndex((c) =>
              /back|rear|environment/i.test(c.label)
            );
            activeCamIdxRef.current = envIdx >= 0 ? envIdx : 0;
            setCanSwitchCamera(cams.length > 1);
          }
        } catch {
          // Camera switching remains disabled if enumeration fails
        }
      } catch (err) {
        if (cancelled) return;
        destroyScanner();
        const msg = err instanceof Error ? err.message : '';
        if (/NotAllowed|Permission/i.test(msg)) {
          setScannerError(t.scannerPermissionDenied);
        } else if (/NotFound/i.test(msg)) {
          setScannerError(t.scannerNoCamera);
        } else {
          setScannerError(t.scannerGenericErr);
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        cancelled = true;
        destroyScanner();
        onClose();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    void start();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      destroyScanner();
    };
  }, [
    isOpen,
    onClose,
    onScanSuccess,
    t.invalidManualCode,
    t.scannerGenericErr,
    t.scannerNeedHttps,
    t.scannerNoCamera,
    t.scannerPermissionDenied,
  ]);

  const handleSwitchCamera = async () => {
    const instance = scannerRef.current;
    const cams = camerasRef.current;
    if (!instance || cams.length <= 1) return;

    const nextIdx = (activeCamIdxRef.current + 1) % cams.length;
    const nextCamera = cams[nextIdx];
    if (!nextCamera) return;

    try {
      await instance.setCamera(nextCamera.id);
      activeCamIdxRef.current = nextIdx;
      setScannerError(null);
    } catch {
      setScannerError(t.scannerGenericErr);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.scannerTitle}
    >
      <div className="bg-white rounded-3xl border border-zen-border shadow-2xl max-w-md w-full p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-zen-charcoal">{t.scannerTitle}</h3>
          <button
            type="button"
            onClick={() => {
              destroyScanner();
              onClose();
            }}
            aria-label={t.scannerCancel}
            className="p-1.5 rounded-full text-zen-muted hover:text-zen-charcoal hover:bg-zen-linen transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            playsInline
            muted
          />
          {isInitializing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-2">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <Camera className="w-4 h-4 opacity-80" />
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-zen-muted text-center">{t.scannerHint}</p>

        {scannerError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
            {scannerError}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-3">
          {canSwitchCamera && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-zen-linen border border-zen-border text-zen-charcoal text-xs font-semibold hover:bg-zen-cream transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.scannerSwitch}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              destroyScanner();
              onClose();
            }}
            className="px-5 py-2.5 rounded-full bg-zen-charcoal text-white text-xs font-semibold hover:opacity-90 transition"
          >
            {t.scannerCancel}
          </button>
        </div>
      </div>
    </div>
  );
};
