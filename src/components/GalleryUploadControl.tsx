import React, { useRef, useState } from 'react';
import { FolderOpen, Image as ImageIcon, Loader2, Upload, Video } from 'lucide-react';
import { listMediaLibrary, uploadMediaWithProgress } from '../lib/api';
import type { UploadedMediaItem } from '../types';

interface GalleryUploadControlProps {
  label: string;
  accept: 'image' | 'video' | 'both';
  value: string;
  onChange: (url: string, detectedKind?: 'image' | 'video') => void;
  previewKind?: 'image' | 'video';
}

export const GalleryUploadControl: React.FC<GalleryUploadControlProps> = ({
  label,
  accept,
  value,
  onChange,
  previewKind = 'image',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<UploadedMediaItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const acceptAttr =
    accept === 'image'
      ? 'image/*'
      : accept === 'video'
        ? 'video/*'
        : 'image/*,video/*';

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadMediaWithProgress(file, setProgress);
      onChange(uploaded.url, uploaded.kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openLibrary = async () => {
    setShowLibrary((prev) => !prev);
    if (!showLibrary) {
      setLoadingLibrary(true);
      try {
        const items = await listMediaLibrary();
        const filtered =
          accept === 'both' ? items : items.filter((item) => item.kind === accept);
        setLibraryItems(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load gallery library.');
      } finally {
        setLoadingLibrary(false);
      }
    }
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800">{label}</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttr}
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[38px]"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading
              ? `Uploading ${progress}%`
              : accept === 'video'
                ? 'Upload Video from Gallery'
                : accept === 'image'
                  ? 'Upload Image from Gallery'
                  : 'Upload from Gallery'}
          </button>

          <button
            type="button"
            onClick={openLibrary}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors min-h-[38px]"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Uploaded Media
          </button>
        </div>
      </div>

      {uploading && (
        <div className="w-full overflow-hidden rounded-full bg-slate-200 h-2">
          <div
            className="h-full bg-teal-700 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-600">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-[160px_1fr] items-center">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
          {value ? (
            previewKind === 'video' || /\.(mp4|webm|mov|m4v|ogg)$/i.test(value) ? (
              <video
                src={value}
                controls
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={value}
                alt={label}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
              {accept === 'video' ? (
                <Video className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            accept === 'video'
              ? 'Uploaded video URL (/uploads/...) or paste video URL'
              : 'Uploaded 16:9 landscape URL (/uploads/... or /images/...)'
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:border-teal-700 focus:outline-none"
        />
      </div>

      {showLibrary && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Previously Uploaded Gallery Files
            </span>
            <button
              type="button"
              onClick={() => setShowLibrary(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          {loadingLibrary ? (
            <p className="text-xs text-slate-500 py-2">Loading uploaded files...</p>
          ) : libraryItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              No uploaded files in this category yet. Tap &ldquo;Upload from Gallery&rdquo; above.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-48 overflow-y-auto">
              {libraryItems.map((item) => (
                <button
                  key={item.filename}
                  type="button"
                  onClick={() => {
                    onChange(item.url, item.kind);
                    setShowLibrary(false);
                  }}
                  className="group overflow-hidden rounded-lg border border-slate-200 text-left hover:border-teal-700 transition-colors"
                >
                  <div className="aspect-video bg-slate-900 overflow-hidden">
                    {item.kind === 'video' ? (
                      <video src={item.url} className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.filename}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="truncate px-2 py-1 text-[11px] font-mono text-slate-600">
                    {item.filename}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
