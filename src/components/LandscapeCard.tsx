import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, HardDriveDownload, Play } from 'lucide-react';

interface LandscapeCardProps {
  index: number;
  kicker: string;
  title: string;
  subtitle?: string;
  metaText: string;
  imageUrl?: string;
  actionLabel: string;
  isVideoPart?: boolean;
  hasUploadedVideo?: boolean;
  isCompleted?: boolean;
  isSavedOffline?: boolean;
  duration?: string;
  onClick: () => void;
}

export const LandscapeCard: React.FC<LandscapeCardProps> = ({
  index,
  kicker,
  title,
  subtitle,
  metaText,
  imageUrl,
  actionLabel,
  isVideoPart = false,
  hasUploadedVideo = false,
  isCompleted = false,
  isSavedOffline = false,
  duration,
  onClick,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(imageUrl);

  useEffect(() => {
    setImgFailed(false);
    setResolvedSrc(imageUrl);

    if (!imageUrl || typeof caches === 'undefined') return;
    let revokedUrl: string | null = null;
    let active = true;

    // If offline or browser needs cache fallback, resolve directly from Cache API
    if (!navigator.onLine) {
      caches
        .open('oda-learn-media-v1')
        .then((cache) => cache.match(imageUrl))
        .then((match) => (match ? match.blob() : null))
        .then((blob) => {
          if (!active || !blob) return;
          revokedUrl = URL.createObjectURL(blob);
          setResolvedSrc(revokedUrl);
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [imageUrl]);

  const handleImageError = async () => {
    if (imageUrl && typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('oda-learn-media-v1');
        const match = await cache.match(imageUrl);
        if (match) {
          const blob = await match.blob();
          const objUrl = URL.createObjectURL(blob);
          setResolvedSrc(objUrl);
          return;
        }
      } catch {
        // Fall through to styled fallback
      }
    }
    setImgFailed(true);
  };

  const formattedIndex = String(index + 1).padStart(2, '0');

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-left shadow-sm transition-all duration-100 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        {resolvedSrc && !imgFailed ? (
          <img
            src={resolvedSrc}
            alt={title}
            loading="eager"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 p-6 text-slate-300">
            <BookOpen className="h-10 w-10 text-teal-400/70 mb-2" />
            <span className="font-display text-sm font-semibold text-slate-200">{title}</span>
          </div>
        )}

        {/* Measured contrast scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/15" />

        {/* Top row inside 16:9 frame */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <span className="font-mono tabular-nums text-amber-300">{formattedIndex}</span>
            <span aria-hidden="true">·</span>
            <span>{kicker}</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-slate-100">
            {isVideoPart && isSavedOffline && (
              <span className="inline-flex items-center gap-1 text-sky-300 font-semibold">
                <HardDriveDownload className="h-3.5 w-3.5" />
                Saved Offline
              </span>
            )}
            {isVideoPart && duration && (
              <span className="font-mono tabular-nums text-slate-100">{duration}</span>
            )}
            {isVideoPart && isCompleted && (
              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Center play button affordance for video parts */}
        {isVideoPart && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/30 backdrop-blur-md transition-transform duration-150 group-hover:scale-110 group-active:scale-95 sm:h-16 sm:w-16 ${
                hasUploadedVideo || isSavedOffline
                  ? 'bg-teal-700/90 text-white'
                  : 'bg-slate-900/70 text-slate-200'
              }`}
            >
              <Play className="h-6 w-6 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Bottom editorial text overlay inside 16:9 landscape */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 sm:p-7">
          <h3 className="font-display text-xl font-bold tracking-tight text-white sm:text-3xl text-balance">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-200 line-clamp-2 sm:text-sm">
              {subtitle}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/15">
            <span className="text-xs font-medium text-slate-200 tabular-nums">
              {metaText}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 group-hover:text-amber-200 sm:text-sm">
              {actionLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
