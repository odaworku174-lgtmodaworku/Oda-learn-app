import React, { useState } from 'react';
import {
  CheckCircle2,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  deleteOfflineVideo,
  formatMB,
  type OfflineVideoRecord,
  type PrecacheStats,
} from '../lib/offlineCache';

interface OfflineLibraryViewProps {
  offlineVideos: Omit<OfflineVideoRecord, 'blob'>[];
  precacheStats: PrecacheStats;
  isOnline: boolean;
  onSyncAllImages: () => Promise<void>;
  onPlayOfflinePart: (partId: string) => void;
  onRefreshOfflineList: () => Promise<void>;
}

export const OfflineLibraryView: React.FC<OfflineLibraryViewProps> = ({
  offlineVideos,
  precacheStats,
  isOnline,
  onSyncAllImages,
  onPlayOfflinePart,
  onRefreshOfflineList,
}) => {
  const [syncingImages, setSyncingImages] = useState(false);

  const totalVideoBytes = offlineVideos.reduce((acc, item) => acc + (item.sizeBytes || 0), 0);
  const allImagesCached =
    precacheStats.totalImages > 0 && precacheStats.cachedImages >= precacheStats.totalImages;

  const handlePrepareOffline = async () => {
    setSyncingImages(true);
    try {
      await onSyncAllImages();
    } finally {
      setSyncingImages(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold text-teal-700">Offline Study Library</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Saved Videos &amp; Offline Pages
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Browse grades, subjects, chapters, and play downloaded compressed videos without using mobile data.
        </p>
      </div>

      {/* Landscape Images & Curriculum Offline Readiness Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shrink-0">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Curriculum &amp; 16:9 Landscape Images Cache
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                {precacheStats.cachedImages} of {precacheStats.totalImages} landscape images saved on this device
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!isOnline || syncingImages || precacheStats.isSyncing}
            onClick={handlePrepareOffline}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
          >
            {syncingImages || precacheStats.isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Images...
              </>
            ) : allImagesCached ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                All Pages Ready Offline
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Prepare All Pages for Offline
              </>
            )}
          </button>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-teal-700 transition-all duration-300"
            style={{
              width:
                precacheStats.totalImages > 0
                  ? `${Math.min(100, Math.round((precacheStats.cachedImages / precacheStats.totalImages) * 100))}%`
                  : '0%',
            }}
          />
        </div>
      </div>

      {/* Downloaded Compressed Videos List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Downloaded Videos ({offlineVideos.length})
          </h2>
          <span className="font-mono text-xs text-slate-600 tabular-nums">
            Total: {formatMB(totalVideoBytes)}
          </span>
        </div>

        {offlineVideos.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <HardDrive className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <h3 className="font-display text-base font-bold text-slate-900">
              No Offline Videos Yet
            </h3>
            <p className="mt-1 max-w-md mx-auto text-sm text-slate-600">
              Open any chapter lesson and tap Download to save a compressed copy for offline study.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {offlineVideos.map((item) => (
              <div
                key={item.partId}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 truncate">
                      {item.gradeTitle} · {item.subjectTitle} · {item.chapterTitle}
                    </p>
                    <h3 className="font-display text-sm font-bold text-slate-900 sm:text-base truncate">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-teal-700 tabular-nums">
                      {formatMB(item.sizeBytes)} · {item.duration}
                      {item.compressed ? ' · Compressed' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPlayOfflinePart(item.partId)}
                    className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 active:scale-95 transition-all min-h-[42px]"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Watch Offline
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteOfflineVideo(item.partId);
                      await onRefreshOfflineList();
                    }}
                    aria-label={`Delete offline video ${item.title}`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
