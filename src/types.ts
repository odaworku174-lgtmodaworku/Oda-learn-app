export type HeroMediaType = 'image' | 'video';

export interface SiteSettings {
  appName: string;
  heroMediaType: HeroMediaType;
  heroMediaUrl: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  showOpeningSplash: boolean;
}

export interface VideoPartItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl: string;
  order: number;
}

export interface ChapterItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  order: number;
  parts: VideoPartItem[];
}

export interface SubjectItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  order: number;
  chapters: ChapterItem[];
}

export interface GradeItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  order: number;
  subjects: SubjectItem[];
}

export interface CurriculumData {
  settings: SiteSettings;
  grades: GradeItem[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  gradePreference?: string;
  completedPartIds: string[];
}

export interface UploadedMediaItem {
  filename: string;
  url: string;
  kind: 'image' | 'video';
  size: number;
  createdAt: string;
}
