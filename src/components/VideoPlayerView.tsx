import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Film,
  HardDrive,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { getVideoDownloadInfo } from '../lib/api';
import {
  deleteOfflineVideo,
  downloadCompressedVideoForOffline,
  formatMB,
  formatTimeLeft,
  getOfflineVideoRecord,
  type DownloadProgressInfo,
  type OfflineVideoRecord,
} from '../lib/offlineCache';
import type { ChapterItem, VideoPartItem } from '../types';
import { LandscapeCard } from './LandscapeCard';

interface VideoPlayerViewProps {
  gradeTitle: string;
  subjectTitle: string;
  chapter: ChapterItem;
  activePart: VideoPartItem;
  completedPartIds: string[];
  savedOfflineIds: string[];
  isAdmin: boolean;
  onSelectPart: (part: VideoPartItem) => void;
  onToggleComplete: (partId: string) => void;
  onOfflineVideosChanged: () => void;
  onOpenAdminForPart?: () => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  gradeTitle,
  subjectTitle,
  chapter,
  activePart,
  completedPartIds,
  savedOfflineIds,
  isAdmin,
  onSelectPart,
  onToggleComplete,
  onOfflineVideosChanged,
  onOpenAdminForPart,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [offlineRecord, setOfflineRecord] = useState<OfflineVideoRecord | null>(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);

  const [estimatedMB, setEstimatedMB] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressInfo | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const sortedParts = [...chapter.parts].sort((a, b) => a.order - b.order);
  const currentIdx = sortedParts.findIndex((p) => p.id === activePart.id);
  const prevPart = currentIdx > 0 ? sortedParts[currentIdx - 1] : null;
  const nextPart =
    currentIdx >= 0 && currentIdx < sortedParts.length - 1 ? sortedParts[currentIdx + 1] : null;
  const isCompleted = completedPartIds.includes(activePart.id);

  // Load saved offline video Blob from IndexedDB if available
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    setOfflineRecord(null);
    setOfflineBlobUrl(null);
    setDownloadError(null);
    setEstimatedMB(null);

    getOfflineVideoRecord(activePart.id)
      .then((rec) => {
        if (!active) return;
        if (rec && rec.blob) {
          createdUrl = URL.createObjectURL(rec.blob);
          setOfflineRecord(rec);
          setOfflineBlobUrl(createdUrl);
        }
      })
      .catch(() => {});

    if (activePart.videoUrl && navigator.onLine) {
      getVideoDownloadInfo(activePart.videoUrl)
        .then((info) => {
          if (!active) return;
          const bytes = info.compressedSize || info.originalSize;
          if (bytes) {
            setEstimatedMB(formatMB(bytes));
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [activePart.id, activePart.videoUrl]);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDownloadCompressed = async () => {
    if (!activePart.videoUrl || downloading) return;
    setDownloadError(null);
    setDownloading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const saved = await downloadCompressedVideoForOffline({
        part: activePart,
        gradeTitle,
        subjectTitle,
        chapterTitle: chapter.title,
        onProgress: setDownloadProgress,
        signal: controller.signal,
      });

      if (saved.blob) {
        const nextUrl = URL.createObjectURL(saved.blob);
        setOfflineRecord(saved);
        setOfflineBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
      }
      onOfflineVideosChanged();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setDownloadError(err instanceof Error ? err.message : 'Download failed.');
      }
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelDownload = () => {
    abortControllerRef.current?.abort();
  };

  const handleRemoveOffline = async () => {
    await deleteOfflineVideo(activePart.id);
    if (offlineBlobUrl) URL.revokeObjectURL(offlineBlobUrl);
    setOfflineRecord(null);
    setOfflineBlobUrl(null);
    onOfflineVideosChanged();
  };

  const activePlaybackSrc = offlineBlobUrl || activePart.videoUrl;

  return (
    <div className="space-y-8">
      {/* 16:9 Video Cinema Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-md">
        <div className="relative aspect-video w-full bg-slate-950">
          {activePlaybackSrc ? (
            <video
              ref={videoRef}
              key={activePart.id + activePlaybackSrc}
              src={activePlaybackSrc}
              poster={activePart.thumbnailUrl || chapter.imageUrl}
              controls
              playsInline
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.playbackRate = playbackRate;
                }
              }}
              className="h-full w-full object-contain bg-black"
            />
          ) : (
            <div className="relative h-full w-full">
              {(activePart.thumbnailUrl || chapter.imageUrl) && (
                <img
                  src={activePart.thumbnailUrl || chapter.imageUrl}
                  alt={activePart.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-40"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/65 p-6 text-center">
                <Film className="h-12 w-12 text-amber-300 mb-3" />
                <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                  Video Lesson Pending Upload
                </h3>
                <p className="mt-1.5 max-w-md text-xs text-slate-300 sm:text-sm">
                  This lesson video has not been uploaded yet.
                </p>
                {isAdmin && onOpenAdminForPart && (
                  <button
                    type="button"
                    onClick={onOpenAdminForPart}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-600 transition-colors min-h-[44px]"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Video from Gallery
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Lesson Metadata, Compressed Offline Download & Controls */}
        <div className="bg-white p-5 sm:p-6 space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono tabular-nums">
                  Part {String(currentIdx + 1).padStart(2, '0')} of{' '}
                  {String(sortedParts.length).padStart(2, '0')}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{activePart.duration}</span>
                {offlineRecord && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-teal-700">
                      Playing Offline Copy ({formatMB(offlineRecord.sizeBytes)})
                    </span>
                  </>
                )}
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                {activePart.title}
              </h2>
              {activePart.description && (
                <p className="text-sm leading-relaxed text-slate-600 max-w-3xl">
                  {activePart.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {activePlaybackSrc && (
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleSpeedChange(rate)}
                      className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-medium transition-colors ${
                        playbackRate === rate
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => onToggleComplete(activePart.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all min-h-[44px] ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Lesson Completed
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4 text-slate-400" />
                    Mark Complete
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Compressed Offline Download Bar (MB + Time Left) */}
          {activePart.videoUrl && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {offlineRecord ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shrink-0">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 sm:text-sm">
                        Saved for Offline Playback
                      </p>
                      <p className="font-mono text-xs text-slate-600 tabular-nums">
                        {formatMB(offlineRecord.sizeBytes)}
                        {offlineRecord.compressed ? ' · Compressed MP4' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveOffline}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 active:scale-95 transition-all min-h-[40px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Download
                  </button>
                </div>
              ) : downloading && downloadProgress ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                      <span>
                        {downloadProgress.phase === 'preparing'
                          ? 'Compressing video for fast mobile download...'
                          : 'Downloading Compressed Video'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelDownload}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full transition-all duration-150 ${
                        downloadProgress.percent === null
                          ? 'w-1/3 animate-pulse bg-teal-600'
                          : 'bg-teal-700'
                      }`}
                      style={
                        downloadProgress.percent !== null
                          ? { width: `${downloadProgress.percent}%` }
                          : undefined
                      }
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-700 tabular-nums">
                    <span>
                      {formatMB(downloadProgress.receivedBytes)}
                      {downloadProgress.totalBytes
                        ? ` / ${formatMB(downloadProgress.totalBytes)}`
                        : ''}
                      {downloadProgress.percent !== null
                        ? ` (${downloadProgress.percent}%)`
                        : ''}
                    </span>
                    <span>
                      {downloadProgress.phase === 'preparing'
                        ? 'Preparing smaller file...'
                        : `${formatTimeLeft(downloadProgress.secondsLeft)}${
                            downloadProgress.speedBytesPerSec > 0
                              ? ` · ${(downloadProgress.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                              : ''
                          }`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900 sm:text-sm">
                      Download Compressed Video for Offline Study
                    </p>
                    <p className="text-xs text-slate-600">
                      Automatically compressed to save data &amp; storage
                      {estimatedMB ? ` · ~${estimatedMB}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCompressed}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all min-h-[44px]"
                  >
                    <Download className="h-4 w-4" />
                    Download{estimatedMB ? ` (${estimatedMB})` : ''}
                  </button>
                </div>
              )}

              {downloadError && (
                <p className="mt-2 text-xs font-medium text-red-600">{downloadError}</p>
              )}
            </div>
          )}

          {/* Prev / Next Navigation */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={!prevPart}
              onClick={() => prevPart && onSelectPart(prevPart)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Part
            </button>

            <button
              type="button"
              disabled={!nextPart}
              onClick={() => nextPart && onSelectPart(nextPart)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all min-h-[44px]"
            >
              Next Part
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Remaining parts in this chapter as 16:9 top-to-bottom landscapes */}
      {sortedParts.length > 1 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900">
            All Video Parts in {chapter.title}
          </h3>
          <div className="space-y-5">
            {sortedParts.map((part, idx) => (
              <LandscapeCard
                key={part.id}
                index={idx}
                kicker={part.id === activePart.id ? 'Now Watching' : 'Video Lesson'}
                title={part.title}
                subtitle={part.description}
                metaText={
                  savedOfflineIds.includes(part.id)
                    ? 'Saved Offline · Ready Without Internet'
                    : part.videoUrl
                      ? 'Video Ready · Compressed Download Available'
                      : 'Thumbnail Preview · Video Pending'
                }
                imageUrl={part.thumbnailUrl || chapter.imageUrl}
                actionLabel={part.id === activePart.id ? 'Playing Above' : 'Watch Part'}
                isVideoPart
                hasUploadedVideo={Boolean(part.videoUrl)}
                isCompleted={completedPartIds.includes(part.id)}
                isSavedOffline={savedOfflineIds.includes(part.id)}
                duration={part.duration}
                onClick={() => {
                  onSelectPart(part);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
