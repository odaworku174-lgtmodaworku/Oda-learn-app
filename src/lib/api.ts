import type {
  ChapterItem,
  CurriculumData,
  GradeItem,
  SiteSettings,
  SubjectItem,
  UploadedMediaItem,
  UserProfile,
  VideoPartItem,
} from '../types';

const TOKEN_STORAGE_KEY = 'oda_learn_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchCurriculum(): Promise<CurriculumData> {
  return apiRequest<CurriculumData>('/api/curriculum', { cache: 'no-store' });
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const res = await apiRequest<{ user: UserProfile | null }>('/api/auth/me');
  return res.user;
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredToken(res.token);
  return res.user;
}

export async function registerStudent(payload: {
  name: string;
  email: string;
  password: string;
  gradePreference?: string;
}): Promise<UserProfile> {
  const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(res.token);
  return res.user;
}

export async function logoutUser(): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  setStoredToken(null);
}

export async function togglePartProgress(partId: string): Promise<string[]> {
  const res = await apiRequest<{ completedPartIds: string[] }>('/api/progress/toggle', {
    method: 'POST',
    body: JSON.stringify({ partId }),
  });
  return res.completedPartIds;
}

export async function syncOfflineProgress(completedPartIds: string[]): Promise<string[]> {
  const res = await apiRequest<{ completedPartIds: string[] }>('/api/progress/sync', {
    method: 'POST',
    body: JSON.stringify({ completedPartIds }),
  });
  return res.completedPartIds;
}

export async function getVideoDownloadInfo(src: string): Promise<{
  originalSize: number | null;
  compressedSize: number | null;
  compressedReady: boolean;
  downloadUrl: string;
}> {
  return apiRequest(`/api/videos/info?src=${encodeURIComponent(src)}`);
}

export function uploadMediaWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadedMediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.withCredentials = true;

    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(parsed as UploadedMediaItem);
        } else {
          reject(new Error(parsed.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Upload failed while reading server response.'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload.'));
    xhr.send(file);
  });
}

export async function listMediaLibrary(): Promise<UploadedMediaItem[]> {
  const res = await apiRequest<{ items: UploadedMediaItem[] }>('/api/admin/media');
  return res.items;
}

export async function deleteMediaItem(filename: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/api/admin/media/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const res = await apiRequest<{ settings: SiteSettings }>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return res.settings;
}

export async function exportCurriculumBackup(): Promise<CurriculumData & { exportedAt: string }> {
  return apiRequest<CurriculumData & { exportedAt: string }>('/api/admin/export', {
    cache: 'no-store',
  });
}

export async function importCurriculumBackup(payload: CurriculumData): Promise<CurriculumData> {
  return apiRequest<CurriculumData>('/api/admin/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createGrade(payload: Partial<GradeItem>): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>('/api/admin/grades', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.grades;
}

export async function updateGrade(gradeId: string, payload: Partial<GradeItem>): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(`/api/admin/grades/${encodeURIComponent(gradeId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.grades;
}

export async function deleteGrade(gradeId: string): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(`/api/admin/grades/${encodeURIComponent(gradeId)}`, {
    method: 'DELETE',
  });
  return res.grades;
}

export async function createSubject(gradeId: string, payload: Partial<SubjectItem>): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return res.grades;
}

export async function updateSubject(
  gradeId: string,
  subjectId: string,
  payload: Partial<SubjectItem>
): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return res.grades;
}

export async function deleteSubject(gradeId: string, subjectId: string): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}`,
    {
      method: 'DELETE',
    }
  );
  return res.grades;
}

export async function createChapter(
  gradeId: string,
  subjectId: string,
  payload: Partial<ChapterItem>
): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}/chapters`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return res.grades;
}

export async function updateChapter(
  gradeId: string,
  subjectId: string,
  chapterId: string,
  payload: Partial<ChapterItem>
): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}/chapters/${encodeURIComponent(chapterId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return res.grades;
}

export async function deleteChapter(
  gradeId: string,
  subjectId: string,
  chapterId: string
): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}/chapters/${encodeURIComponent(chapterId)}`,
    {
      method: 'DELETE',
    }
  );
  return res.grades;
}

export async function createPart(
  gradeId: string,
  subjectId: string,
  chapterId: string,
  payload: Partial<VideoPartItem>
): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}/chapters/${encodeURIComponent(chapterId)}/parts`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return res.grades;
}

export async function updatePart(
  gradeId: string,
  subjectId: string,
  chapterId: string,
  partId: string,
  payload: Partial<VideoPartItem>
): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}/chapters/${encodeURIComponent(chapterId)}/parts/${encodeURIComponent(partId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return res.grades;
}

export async function deletePart(
  gradeId: string,
  subjectId: string,
  chapterId: string,
  partId: string
): Promise<GradeItem[]> {
  const res = await apiRequest<{ grades: GradeItem[] }>(
    `/api/admin/grades/${encodeURIComponent(gradeId)}/subjects/${encodeURIComponent(subjectId)}/chapters/${encodeURIComponent(chapterId)}/parts/${encodeURIComponent(partId)}`,
    {
      method: 'DELETE',
    }
  );
  return res.grades;
}
