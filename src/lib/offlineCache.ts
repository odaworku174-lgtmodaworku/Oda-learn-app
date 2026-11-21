import type { CurriculumData, UserProfile, VideoPartItem } from '../types';

const CURRICULUM_CACHE_KEY = 'oda_learn_curriculum_cache_v1';
const USER_CACHE_KEY = 'oda_learn_user_cache_v1';
const MEDIA_CACHE_NAME = 'oda-learn-media-v1';

const DB_NAME = 'oda_learn_offline_db';
const DB_VERSION = 1;
const VIDEOS_STORE = 'videos';

export interface OfflineVideoRecord {
  partId: string;
  title: string;
  description: string;
  duration: string;
  thumbnailUrl: string;
  gradeTitle: string;
  subjectTitle: string;
  chapterTitle: string;
  sizeBytes: number;
  compressed: boolean;
  savedAt: string;
  blob?: Blob;
}

export interface DownloadProgressInfo {
  phase: 'preparing' | 'downloading';
  receivedBytes: number;
  totalBytes: number | null;
  percent: number | null;
  speedBytesPerSec: number;
  secondsLeft: number | null;
}

export interface PrecacheStats {
  totalImages: number;
  cachedImages: number;
  isSyncing: boolean;
}

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTimeLeft(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return 'Calculating...';
  }
  if (seconds < 1) return 'Almost done';
  const rounded = Math.ceil(seconds);
  if (rounded < 60) return `${rounded}s left`;
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}m ${secs}s left`;
}

export function saveCurriculumCache(data: CurriculumData): void {
  try {
    localStorage.setItem(CURRICULUM_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
}

export function loadCurriculumCache(): CurriculumData | null {
  try {
    const raw = localStorage.getItem(CURRICULUM_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CurriculumData) : null;
  } catch {
    return null;
  }
}

export function saveUserCache(user: UserProfile | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadUserCache(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function collectCurriculumImageUrls(data: CurriculumData): string[] {
  const urls = new Set<string>();
  urls.add('/pwa-192x192.png');

  if (data.settings.heroMediaType === 'image' && data.settings.heroMediaUrl) {
    urls.add(data.settings.heroMediaUrl);
  }
  for (const grade of data.grades) {
    if (grade.imageUrl) urls.add(grade.imageUrl);
    for (const subject of grade.subjects) {
      if (subject.imageUrl) urls.add(subject.imageUrl);
      for (const chapter of subject.chapters) {
        if (chapter.imageUrl) urls.add(chapter.imageUrl);
        for (const part of chapter.parts) {
          if (part.thumbnailUrl) urls.add(part.thumbnailUrl);
        }
      }
    }
  }
  return Array.from(urls).filter((u) => Boolean(u && !u.startsWith('data:')));
}

export async function getImagePrecacheStats(data: CurriculumData): Promise<PrecacheStats> {
  const urls = collectCurriculumImageUrls(data);
  if (typeof caches === 'undefined') {
    return { totalImages: urls.length, cachedImages: 0, isSyncing: false };
  }
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    let cachedCount = 0;
    for (const url of urls) {
      const match = await cache.match(url);
      if (match) cachedCount += 1;
    }
    return { totalImages: urls.length, cachedImages: cachedCount, isSyncing: false };
  } catch {
    return { totalImages: urls.length, cachedImages: 0, isSyncing: false };
  }
}

export async function precacheCurriculumImages(
  data: CurriculumData,
  onProgress?: (stats: PrecacheStats) => void
): Promise<PrecacheStats> {
  const urls = collectCurriculumImageUrls(data);
  if (typeof caches === 'undefined' || !navigator.onLine) {
    return getImagePrecacheStats(data);
  }

  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    let cachedCount = 0;
    const toFetch: string[] = [];

    for (const url of urls) {
      const existing = await cache.match(url);
      if (existing) {
        cachedCount += 1;
      } else {
        toFetch.push(url);
      }
    }

    onProgress?.({ totalImages: urls.length, cachedImages: cachedCount, isSyncing: toFetch.length > 0 });

    const CONCURRENCY = 4;
    let index = 0;

    const worker = async () => {
      while (index < toFetch.length) {
        const currentIdx = index++;
        const url = toFetch[currentIdx];
        try {
          const res = await fetch(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' });
          if (res.ok) {
            await cache.put(url, res.clone());
            cachedCount += 1;
            onProgress?.({
              totalImages: urls.length,
              cachedImages: cachedCount,
              isSyncing: cachedCount < urls.length,
            });
          }
        } catch {
          // Skip failed image without aborting batch
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toFetch.length) }, () => worker()));
    const finalStats = { totalImages: urls.length, cachedImages: cachedCount, isSyncing: false };
    onProgress?.(finalStats);
    return finalStats;
  } catch {
    return { totalImages: urls.length, cachedImages: 0, isSyncing: false };
  }
}

/* --- IndexedDB Offline Video Storage --- */

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VIDEOS_STORE)) {
        db.createObjectStore(VIDEOS_STORE, { keyPath: 'partId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open offline storage.'));
  });
}

export async function listOfflineVideos(): Promise<Omit<OfflineVideoRecord, 'blob'>[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEOS_STORE, 'readonly');
    const store = tx.objectStore(VIDEOS_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const records = (req.result as OfflineVideoRecord[]).map(({ blob: _blob, ...meta }) => meta);
      records.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineVideoRecord(partId: string): Promise<OfflineVideoRecord | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEOS_STORE, 'readonly');
    const store = tx.objectStore(VIDEOS_STORE);
    const req = store.get(partId);
    req.onsuccess = () => resolve((req.result as OfflineVideoRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineVideo(partId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEOS_STORE, 'readwrite');
    const store = tx.objectStore(VIDEOS_STORE);
    const req = store.delete(partId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineVideoRecord(record: OfflineVideoRecord): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEOS_STORE, 'readwrite');
    const store = tx.objectStore(VIDEOS_STORE);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function downloadCompressedVideoForOffline(params: {
  part: VideoPartItem;
  gradeTitle: string;
  subjectTitle: string;
  chapterTitle: string;
  onProgress: (info: DownloadProgressInfo) => void;
  signal?: AbortSignal;
}): Promise<OfflineVideoRecord> {
  const { part, gradeTitle, subjectTitle, chapterTitle, onProgress, signal } = params;
  if (!part.videoUrl) {
    throw new Error('No video file available for this lesson yet.');
  }

  onProgress({
    phase: 'preparing',
    receivedBytes: 0,
    totalBytes: null,
    percent: null,
    speedBytesPerSec: 0,
    secondsLeft: null,
  });

  const downloadEndpoint = `/api/videos/download?src=${encodeURIComponent(part.videoUrl)}`;
  const response = await fetch(downloadEndpoint, { signal });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Download failed (${response.status})`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : null;
  const isCompressed = response.headers.get('x-compressed') === 'true';

  if (!response.body) {
    const blob = await response.blob();
    const record: OfflineVideoRecord = {
      partId: part.id,
      title: part.title,
      description: part.description,
      duration: part.duration,
      thumbnailUrl: part.thumbnailUrl,
      gradeTitle,
      subjectTitle,
      chapterTitle,
      sizeBytes: blob.size,
      compressed: isCompressed,
      savedAt: new Date().toISOString(),
      blob,
    };
    await saveOfflineVideoRecord(record);
    return record;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  const startTime = performance.now();
  let lastEmit = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      receivedBytes += value.length;

      const now = performance.now();
      if (now - lastEmit >= 120 || (totalBytes && receivedBytes >= totalBytes)) {
        lastEmit = now;
        const elapsedSec = Math.max(0.1, (now - startTime) / 1000);
        const speedBytesPerSec = receivedBytes / elapsedSec;
        const remainingBytes = totalBytes ? Math.max(0, totalBytes - receivedBytes) : null;
        const secondsLeft =
          remainingBytes !== null && speedBytesPerSec > 0
            ? remainingBytes / speedBytesPerSec
            : null;
        const percent =
          totalBytes && totalBytes > 0
            ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
            : null;

        onProgress({
          phase: 'downloading',
          receivedBytes,
          totalBytes,
          percent,
          speedBytesPerSec,
          secondsLeft,
        });
      }
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
  const record: OfflineVideoRecord = {
    partId: part.id,
    title: part.title,
    description: part.description,
    duration: part.duration,
    thumbnailUrl: part.thumbnailUrl,
    gradeTitle,
    subjectTitle,
    chapterTitle,
    sizeBytes: blob.size,
    compressed: isCompressed,
    savedAt: new Date().toISOString(),
    blob,
  };

  await saveOfflineVideoRecord(record);

  // Also ensure thumbnail is cached for offline library cards
  if (part.thumbnailUrl && typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const cached = await cache.match(part.thumbnailUrl);
      if (!cached) {
        const thumbRes = await fetch(part.thumbnailUrl);
        if (thumbRes.ok) await cache.put(part.thumbnailUrl, thumbRes);
      }
    } catch {
      // Non-fatal
    }
  }

  onProgress({
    phase: 'downloading',
    receivedBytes: blob.size,
    totalBytes: blob.size,
    percent: 100,
    speedBytesPerSec: 0,
    secondsLeft: 0,
  });

  return record;
}
