import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Download,
  HardDriveDownload,
  Home,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AdminStudio } from './components/AdminStudio';
import { AuthModal } from './components/AuthModal';
import { LandscapeCard } from './components/LandscapeCard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OfflineLibraryView } from './components/OfflineLibraryView';
import { PWAInstallModal } from './components/PWAInstallModal';
import { VideoPlayerView } from './components/VideoPlayerView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  fetchCurriculum,
  getCurrentUser,
  logoutUser,
  syncOfflineProgress,
  togglePartProgress,
} from './lib/api';
import {
  getImagePrecacheStats,
  listOfflineVideos,
  loadCurriculumCache,
  loadUserCache,
  precacheCurriculumImages,
  saveCurriculumCache,
  saveUserCache,
  type OfflineVideoRecord,
  type PrecacheStats,
} from './lib/offlineCache';
import { DEFAULT_CURRICULUM } from './lib/defaultCurriculum';
import type { GradeItem, SiteSettings, UserProfile } from './types';

type ActiveRoute =
  | { view: 'home' }
  | { view: 'grade'; gradeId: string }
  | { view: 'subject'; gradeId: string; subjectId: string }
  | { view: 'chapter'; gradeId: string; subjectId: string; chapterId: string }
  | { view: 'part'; gradeId: string; subjectId: string; chapterId: string; partId: string }
  | { view: 'offline' }
  | {
      view: 'admin';
      focus?: {
        tab?: 'appearance' | 'curriculum' | 'media';
        gradeId?: string;
        subjectId?: string;
        chapterId?: string;
      };
    };

const LOCAL_PROGRESS_KEY = 'oda_learn_local_progress';

export default function App() {
  const cachedCurriculum = loadCurriculumCache();
  const cachedUser = loadUserCache();

  const initialCurriculum =
    cachedCurriculum?.settings?.heroTitle && Array.isArray(cachedCurriculum?.grades)
      ? cachedCurriculum
      : DEFAULT_CURRICULUM;

  const [settings, setSettings] = useState<SiteSettings | null>(initialCurriculum.settings);
  const [grades, setGrades] = useState<GradeItem[]>(initialCurriculum.grades);
  const [user, setUser] = useState<UserProfile | null>(cachedUser);
  const [localProgress, setLocalProgress] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [loadError] = useState<string | null>(null);

  const [route, setRoute] = useState<ActiveRoute>({ view: 'home' });
  const [showSplash, setShowSplash] = useState(
    Boolean(cachedCurriculum?.settings?.showOpeningSplash)
  );

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const [offlineVideos, setOfflineVideos] = useState<Omit<OfflineVideoRecord, 'blob'>[]>([]);
  const [precacheStats, setPrecacheStats] = useState<PrecacheStats>({
    totalImages: 0,
    cachedImages: 0,
    isSyncing: false,
  });

  const isOnline = useOnlineStatus();
  const { canPromptNative, isInstalled, platform, triggerNativeInstall } = usePWAInstall();

  const refreshOfflineList = useCallback(async () => {
    try {
      const vids = await listOfflineVideos();
      setOfflineVideos(vids);
    } catch {
      // Ignore IDB errors
    }
  }, []);

  const syncAllImages = useCallback(
    async (targetSettings?: SiteSettings, targetGrades?: GradeItem[]) => {
      const s = targetSettings || settings;
      const g = targetGrades || grades;
      if (!s) return;
      const stats = await precacheCurriculumImages({ settings: s, grades: g }, setPrecacheStats);
      setPrecacheStats(stats);
    },
    [settings, grades]
  );

  // Initial load: immediate from cache, background refresh when online
  useEffect(() => {
    let active = true;
    refreshOfflineList();

    getImagePrecacheStats(initialCurriculum).then((stats) => {
      if (active) setPrecacheStats(stats);
    });

    if (navigator.onLine) {
      Promise.all([
        fetchCurriculum().catch(() => null),
        getCurrentUser().catch(() => null),
      ])
        .then(async ([curriculum, currentUser]) => {
          if (!active) return;
          if (curriculum) {
            setSettings(curriculum.settings);
            setGrades(curriculum.grades);
            saveCurriculumCache(curriculum);

            if (!cachedCurriculum && curriculum.settings.showOpeningSplash) {
              setShowSplash(true);
            }

            precacheCurriculumImages(curriculum, (stats) => {
              if (active) setPrecacheStats(stats);
            });
          } else {
            precacheCurriculumImages(initialCurriculum, (stats) => {
              if (active) setPrecacheStats(stats);
            });
          }

          if (currentUser) {
            setUser(currentUser);
            saveUserCache(currentUser);
            if (localProgress.length > 0) {
              try {
                const synced = await syncOfflineProgress(localProgress);
                if (active) {
                  const updatedUser = { ...currentUser, completedPartIds: synced };
                  setUser(updatedUser);
                  saveUserCache(updatedUser);
                }
              } catch {
                // Keep local progress
              }
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, []);

  // Auto-sync when connectivity returns
  useEffect(() => {
    if (!isOnline) return;
    fetchCurriculum()
      .then((curriculum) => {
        setSettings(curriculum.settings);
        setGrades(curriculum.grades);
        saveCurriculumCache(curriculum);
        precacheCurriculumImages(curriculum, setPrecacheStats);
      })
      .catch(() => {});

    if (user && localProgress.length > 0) {
      syncOfflineProgress(localProgress)
        .then((synced) => {
          const updated = { ...user, completedPartIds: synced };
          setUser(updated);
          saveUserCache(updated);
        })
        .catch(() => {});
    }
  }, [isOnline]);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 2400);
    return () => clearTimeout(timer);
  }, [showSplash]);

  const completedPartIds = Array.from(
    new Set([...(user ? user.completedPartIds : []), ...localProgress])
  );
  const savedOfflineIds = offlineVideos.map((v) => v.partId);
  const isAdmin = user?.role === 'admin';

  const handleToggleComplete = async (partId: string) => {
    const nextLocal = localProgress.includes(partId)
      ? localProgress.filter((id) => id !== partId)
      : [...localProgress, partId];
    setLocalProgress(nextLocal);
    try {
      localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(nextLocal));
    } catch {
      // Ignore storage error
    }

    if (user && navigator.onLine) {
      try {
        const updated = await togglePartProgress(partId);
        const nextUser = { ...user, completedPartIds: updated };
        setUser(nextUser);
        saveUserCache(nextUser);
      } catch {
        // Offline fallback retained in localProgress
      }
    }
  };

  const handleInstallClick = async () => {
    if (canPromptNative) {
      const accepted = await triggerNativeInstall();
      if (!accepted) {
        setInstallModalOpen(true);
      }
    } else {
      setInstallModalOpen(true);
    }
  };

  const navigate = (next: ActiveRoute) => {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayOfflinePart = (partId: string) => {
    for (const grade of grades) {
      for (const subject of grade.subjects) {
        for (const chapter of subject.chapters) {
          const found = chapter.parts.find((p) => p.id === partId);
          if (found) {
            navigate({
              view: 'part',
              gradeId: grade.id,
              subjectId: subject.id,
              chapterId: chapter.id,
              partId: found.id,
            });
            return;
          }
        }
      }
    }
  };

  const sortedGrades = [...grades].sort((a, b) => a.order - b.order);

  const currentGrade =
    route.view !== 'home' && route.view !== 'admin' && route.view !== 'offline'
      ? sortedGrades.find((g) => g.id === route.gradeId) || null
      : null;

  const currentSubject =
    currentGrade && (route.view === 'subject' || route.view === 'chapter' || route.view === 'part')
      ? [...currentGrade.subjects]
          .sort((a, b) => a.order - b.order)
          .find((s) => s.id === route.subjectId) || null
      : null;

  const currentChapter =
    currentSubject && (route.view === 'chapter' || route.view === 'part')
      ? [...currentSubject.chapters]
          .sort((a, b) => a.order - b.order)
          .find((c) => c.id === route.chapterId) || null
      : null;

  const currentPart =
    currentChapter && route.view === 'part'
      ? [...currentChapter.parts]
          .sort((a, b) => a.order - b.order)
          .find((p) => p.id === route.partId) || null
      : null;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <img
          src="/pwa-192x192.png"
          alt="Oda Learn"
          referrerPolicy="no-referrer"
          className="h-16 w-16 rounded-2xl border border-slate-200 shadow-sm mb-4"
        />
        <p className="font-display text-base font-semibold text-slate-800">
          Loading Oda Learn...
        </p>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <h1 className="font-display text-xl font-bold text-slate-900">
          Unable to Open Curriculum
        </h1>
        <p className="mt-2 text-sm text-slate-600">{loadError || 'Configuration missing.'}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 active:scale-95 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-12">
      {/* Optional Full-Screen Opening Appearance Splash */}
      {showSplash && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white">
          <div className="absolute inset-0">
            {settings.heroMediaType === 'video' && settings.heroMediaUrl ? (
              <video
                src={settings.heroMediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover opacity-55"
              />
            ) : (
              <img
                src={settings.heroMediaUrl || '/images/hero-oda-learn.jpg'}
                alt={settings.appName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover opacity-55"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/30" />
          </div>
          <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-xl">
            <img
              src="/pwa-192x192.png"
              alt="Oda Learn icon"
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-2xl border border-white/25 shadow-2xl mb-5"
            />
            <span className="text-xs font-semibold text-amber-300 tracking-wide">
              {settings.heroKicker}
            </span>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl text-balance">
              {settings.appName}
            </h1>
            <p className="mt-2 text-sm text-slate-200">{settings.heroTitle}</p>
            <button
              type="button"
              onClick={() => setShowSplash(false)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-600 active:scale-95 transition-all min-h-[44px]"
            >
              Enter Classroom
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Clean 3-Zone Top Navigation Bar (Admin strictly hidden unless signed in as Admin) */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-8 px-4 sm:h-16 sm:px-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigate({ view: 'home' })}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-lg"
          >
            <img
              src="/pwa-192x192.png"
              alt="Oda Learn"
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-lg border border-slate-200 object-cover shrink-0"
            />
            <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
              {settings.appName}
            </span>
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => navigate({ view: 'home' })}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'home' ? 'text-teal-800 font-semibold' : ''
              }`}
            >
              Programs
            </button>
            <button
              type="button"
              onClick={() => navigate({ view: 'offline' })}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'offline' ? 'text-teal-800 font-semibold' : ''
              }`}
            >
              Offline Library{offlineVideos.length > 0 ? ` (${offlineVideos.length})` : ''}
            </button>
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Install App
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate({ view: 'admin' })}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                  route.view === 'admin' ? 'text-teal-800 font-semibold' : ''
                }`}
              >
                Admin Studio
              </button>
            )}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-medium text-slate-600 truncate max-w-[140px]">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await logoutUser();
                    } catch {
                      // Allow offline sign-out
                    }
                    setUser(null);
                    saveUserCache(null);
                    if (route.view === 'admin') {
                      setRoute({ view: 'home' });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthInitialMode('login');
                  setAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 active:scale-95 transition-all whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <User className="h-3.5 w-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        {/* ADMIN STUDIO VIEW (Only rendered when signed in as Admin) */}
        {route.view === 'admin' && isAdmin && (
          <AdminStudio
            settings={settings}
            grades={grades}
            onSettingsUpdated={(nextSettings) => {
              setSettings(nextSettings);
              saveCurriculumCache({ settings: nextSettings, grades });
            }}
            onGradesUpdated={(nextGrades) => {
              setGrades(nextGrades);
              saveCurriculumCache({ settings, grades: nextGrades });
            }}
            initialFocus={route.focus}
          />
        )}

        {/* OFFLINE LIBRARY VIEW */}
        {route.view === 'offline' && (
          <OfflineLibraryView
            offlineVideos={offlineVideos}
            precacheStats={precacheStats}
            isOnline={isOnline}
            onSyncAllImages={() => syncAllImages()}
            onPlayOfflinePart={handlePlayOfflinePart}
            onRefreshOfflineList={refreshOfflineList}
          />
        )}

        {/* LEVEL 0: HOME (16:9 Opening Hero + Top-to-Bottom 16:9 Grade Landscapes) */}
        {route.view === 'home' && (
          <div className="space-y-10">
            {/* 16:9 Editable Hero Space */}
            <section aria-label="Featured Introduction">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-md">
                {settings.heroMediaType === 'video' && settings.heroMediaUrl ? (
                  <video
                    src={settings.heroMediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={settings.heroMediaUrl || '/images/hero-oda-learn.jpg'}
                    alt={settings.heroTitle}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/20" />

                <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10">
                  <span className="text-xs font-semibold text-amber-300 tracking-wide sm:text-sm">
                    {settings.heroKicker}
                  </span>
                  <h1 className="mt-1.5 max-w-3xl font-display text-2xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl text-balance">
                    {settings.heroTitle}
                  </h1>
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-200 sm:text-base line-clamp-2 sm:line-clamp-3">
                    {settings.heroSubtitle}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href="#programs-list"
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-600 active:scale-95 transition-all sm:text-sm min-h-[44px]"
                    >
                      {settings.heroCtaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    {!isInstalled && (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all sm:text-sm min-h-[44px]"
                      >
                        <Download className="h-4 w-4" />
                        Add to Home Screen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Offline Readiness & Home-Screen App Setup Strip */}
            <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3.5">
                <img
                  src="/pwa-192x192.png"
                  alt="Oda Learn app icon"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-xl border border-slate-200 object-cover shrink-0"
                />
                <div>
                  <h2 className="font-display text-sm font-bold text-slate-900 sm:text-base">
                    Study Anywhere — Online or Offline
                  </h2>
                  <p className="text-xs text-slate-600 tabular-nums">
                    {precacheStats.cachedImages} of {precacheStats.totalImages} landscape images cached ·{' '}
                    {offlineVideos.length} compressed videos saved
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate({ view: 'offline' })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:scale-95 transition-all min-h-[44px]"
                >
                  <HardDriveDownload className="h-4 w-4 text-teal-700" />
                  Offline Library
                </button>
                {!isInstalled && (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all min-h-[44px]"
                  >
                    <Download className="h-4 w-4" />
                    Install App
                  </button>
                )}
              </div>
            </section>

            {/* Top-to-Bottom Grade & Freshman Landscapes */}
            <section id="programs-list" className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                    Select Your Grade or Program
                  </h2>
                  <p className="text-xs text-slate-600 sm:text-sm">
                    Scroll top-to-bottom and tap any landscape card to browse subjects.
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {sortedGrades.length} Programs
                </span>
              </div>

              <div className="space-y-6">
                {sortedGrades.map((grade, idx) => {
                  const totalChapters = grade.subjects.reduce(
                    (acc, s) => acc + s.chapters.length,
                    0
                  );
                  return (
                    <LandscapeCard
                      key={grade.id}
                      index={idx}
                      kicker="Academic Program"
                      title={grade.title}
                      subtitle={grade.subtitle}
                      metaText={`${grade.subjects.length} Subjects · ${totalChapters} Chapters`}
                      imageUrl={grade.imageUrl}
                      actionLabel="Explore Subjects"
                      onClick={() => navigate({ view: 'grade', gradeId: grade.id })}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* LEVEL 1: SUBJECTS INSIDE SELECTED GRADE */}
        {route.view === 'grade' && currentGrade && (
          <div className="space-y-6">
            <BreadcrumbBar
              items={[
                { label: 'All Programs', onClick: () => navigate({ view: 'home' }) },
                { label: currentGrade.title },
              ]}
              onBack={() => navigate({ view: 'home' })}
            />

            <div className="border-b border-slate-200 pb-4">
              <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                {currentGrade.title} Subjects
              </h1>
              {currentGrade.subtitle && (
                <p className="mt-1 text-sm text-slate-600">{currentGrade.subtitle}</p>
              )}
            </div>

            {currentGrade.subjects.length === 0 ? (
              <EmptyStateBox
                title="No subjects added yet"
                description="Subjects for this grade will appear here as 16:9 landscapes."
                isAdmin={isAdmin}
                onAdminAction={() =>
                  navigate({
                    view: 'admin',
                    focus: { tab: 'curriculum', gradeId: currentGrade.id, subjectId: '__manage__' },
                  })
                }
              />
            ) : (
              <div className="space-y-6">
                {[...currentGrade.subjects]
                  .sort((a, b) => a.order - b.order)
                  .map((subject, idx) => {
                    const totalParts = subject.chapters.reduce(
                      (acc, c) => acc + c.parts.length,
                      0
                    );
                    return (
                      <LandscapeCard
                        key={subject.id}
                        index={idx}
                        kicker={currentGrade.title}
                        title={subject.title}
                        subtitle={subject.subtitle}
                        metaText={`${subject.chapters.length} Chapters · ${totalParts} Video Parts`}
                        imageUrl={subject.imageUrl}
                        actionLabel="Open Chapters"
                        onClick={() =>
                          navigate({
                            view: 'subject',
                            gradeId: currentGrade.id,
                            subjectId: subject.id,
                          })
                        }
                      />
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 2: CHAPTERS INSIDE SELECTED SUBJECT */}
        {route.view === 'subject' && currentGrade && currentSubject && (
          <div className="space-y-6">
            <BreadcrumbBar
              items={[
                { label: 'All Programs', onClick: () => navigate({ view: 'home' }) },
                {
                  label: currentGrade.title,
                  onClick: () => navigate({ view: 'grade', gradeId: currentGrade.id }),
                },
                { label: currentSubject.title },
              ]}
              onBack={() => navigate({ view: 'grade', gradeId: currentGrade.id })}
            />

            <div className="border-b border-slate-200 pb-4">
              <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                {currentSubject.title} Chapters
              </h1>
              {currentSubject.subtitle && (
                <p className="mt-1 text-sm text-slate-600">{currentSubject.subtitle}</p>
              )}
            </div>

            {currentSubject.chapters.length === 0 ? (
              <EmptyStateBox
                title="No chapters published yet"
                description="Chapters for this subject will appear here as 16:9 landscapes."
                isAdmin={isAdmin}
                onAdminAction={() =>
                  navigate({
                    view: 'admin',
                    focus: {
                      tab: 'curriculum',
                      gradeId: currentGrade.id,
                      subjectId: currentSubject.id,
                      chapterId: '__manage__',
                    },
                  })
                }
              />
            ) : (
              <div className="space-y-6">
                {[...currentSubject.chapters]
                  .sort((a, b) => a.order - b.order)
                  .map((chapter, idx) => (
                    <LandscapeCard
                      key={chapter.id}
                      index={idx}
                      kicker={`${currentGrade.title} · ${currentSubject.title}`}
                      title={chapter.title}
                      subtitle={chapter.subtitle}
                      metaText={`${chapter.parts.length} Video Parts`}
                      imageUrl={chapter.imageUrl}
                      actionLabel="Watch Video Parts"
                      onClick={() =>
                        navigate({
                          view: 'chapter',
                          gradeId: currentGrade.id,
                          subjectId: currentSubject.id,
                          chapterId: chapter.id,
                        })
                      }
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 3: VIDEO PARTS INSIDE SELECTED CHAPTER */}
        {route.view === 'chapter' && currentGrade && currentSubject && currentChapter && (
          <div className="space-y-6">
            <BreadcrumbBar
              items={[
                { label: 'All Programs', onClick: () => navigate({ view: 'home' }) },
                {
                  label: currentGrade.title,
                  onClick: () => navigate({ view: 'grade', gradeId: currentGrade.id }),
                },
                {
                  label: currentSubject.title,
                  onClick: () =>
                    navigate({
                      view: 'subject',
                      gradeId: currentGrade.id,
                      subjectId: currentSubject.id,
                    }),
                },
                { label: currentChapter.title },
              ]}
              onBack={() =>
                navigate({
                  view: 'subject',
                  gradeId: currentGrade.id,
                  subjectId: currentSubject.id,
                })
              }
            />

            <div className="border-b border-slate-200 pb-4">
              <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                {currentChapter.title}
              </h1>
              {currentChapter.subtitle && (
                <p className="mt-1 text-sm text-slate-600">{currentChapter.subtitle}</p>
              )}
            </div>

            {currentChapter.parts.length === 0 ? (
              <EmptyStateBox
                title="No video parts uploaded yet"
                description="Video lessons for this chapter will appear here once published."
                isAdmin={isAdmin}
                onAdminAction={() =>
                  navigate({
                    view: 'admin',
                    focus: {
                      tab: 'curriculum',
                      gradeId: currentGrade.id,
                      subjectId: currentSubject.id,
                      chapterId: currentChapter.id,
                    },
                  })
                }
              />
            ) : (
              <div className="space-y-6">
                {[...currentChapter.parts]
                  .sort((a, b) => a.order - b.order)
                  .map((part, idx) => (
                    <LandscapeCard
                      key={part.id}
                      index={idx}
                      kicker={currentChapter.title}
                      title={part.title}
                      subtitle={part.description}
                      metaText={
                        savedOfflineIds.includes(part.id)
                          ? 'Saved Offline · Watch Without Internet'
                          : part.videoUrl
                            ? 'Video Ready · Compressed Download Available'
                            : 'Preview Thumbnail · Video Pending'
                      }
                      imageUrl={part.thumbnailUrl || currentChapter.imageUrl}
                      actionLabel="Play Video Lesson"
                      isVideoPart
                      hasUploadedVideo={Boolean(part.videoUrl)}
                      isCompleted={completedPartIds.includes(part.id)}
                      isSavedOffline={savedOfflineIds.includes(part.id)}
                      duration={part.duration}
                      onClick={() =>
                        navigate({
                          view: 'part',
                          gradeId: currentGrade.id,
                          subjectId: currentSubject.id,
                          chapterId: currentChapter.id,
                          partId: part.id,
                        })
                      }
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 4: ACTIVE VIDEO PART PLAYER */}
        {route.view === 'part' &&
          currentGrade &&
          currentSubject &&
          currentChapter &&
          currentPart && (
            <div className="space-y-6">
              <BreadcrumbBar
                items={[
                  { label: 'All Programs', onClick: () => navigate({ view: 'home' }) },
                  {
                    label: currentGrade.title,
                    onClick: () => navigate({ view: 'grade', gradeId: currentGrade.id }),
                  },
                  {
                    label: currentSubject.title,
                    onClick: () =>
                      navigate({
                        view: 'subject',
                        gradeId: currentGrade.id,
                        subjectId: currentSubject.id,
                      }),
                  },
                  {
                    label: currentChapter.title,
                    onClick: () =>
                      navigate({
                        view: 'chapter',
                        gradeId: currentGrade.id,
                        subjectId: currentSubject.id,
                        chapterId: currentChapter.id,
                      }),
                  },
                  { label: currentPart.title },
                ]}
                onBack={() =>
                  navigate({
                    view: 'chapter',
                    gradeId: currentGrade.id,
                    subjectId: currentSubject.id,
                    chapterId: currentChapter.id,
                  })
                }
              />

              <VideoPlayerView
                gradeTitle={currentGrade.title}
                subjectTitle={currentSubject.title}
                chapter={currentChapter}
                activePart={currentPart}
                completedPartIds={completedPartIds}
                savedOfflineIds={savedOfflineIds}
                isAdmin={isAdmin}
                onSelectPart={(part) =>
                  navigate({
                    view: 'part',
                    gradeId: currentGrade.id,
                    subjectId: currentSubject.id,
                    chapterId: currentChapter.id,
                    partId: part.id,
                  })
                }
                onToggleComplete={handleToggleComplete}
                onOfflineVideosChanged={refreshOfflineList}
                onOpenAdminForPart={() =>
                  navigate({
                    view: 'admin',
                    focus: {
                      tab: 'curriculum',
                      gradeId: currentGrade.id,
                      subjectId: currentSubject.id,
                      chapterId: currentChapter.id,
                    },
                  })
                }
              />
            </div>
          )}
      </main>

      {/* Quiet Editorial Footer (Zero Admin Exposure to Students) */}
      <footer className="mx-auto mt-16 max-w-5xl border-t border-slate-200 px-4 py-6 text-xs text-slate-500 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Oda Learn · Grade 9–12 &amp; Freshman Visual Tutorial Class</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ view: 'offline' })}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Offline Library
            </button>
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="font-medium text-teal-700 hover:text-teal-800"
              >
                Install App
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate({ view: 'admin' })}
                className="font-medium text-teal-700 hover:text-teal-800"
              >
                Admin Studio
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Navigation (Zero Admin Exposure to Students) */}
      <nav
        aria-label="Mobile Navigation"
        className={`fixed bottom-0 left-0 right-0 z-30 grid h-14 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden ${
          isAdmin ? 'grid-cols-4' : 'grid-cols-3'
        }`}
      >
        <button
          type="button"
          onClick={() => navigate({ view: 'home' })}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:scale-95 transition-transform ${
            route.view !== 'admin' && route.view !== 'offline' ? 'text-teal-700' : 'text-slate-600'
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Programs</span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ view: 'offline' })}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:scale-95 transition-transform ${
            route.view === 'offline' ? 'text-teal-700' : 'text-slate-600'
          }`}
        >
          <HardDriveDownload className="h-4 w-4" />
          <span>Offline</span>
        </button>

        <button
          type="button"
          onClick={handleInstallClick}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600 active:scale-95 transition-transform"
        >
          <Download className="h-4 w-4" />
          <span>{isInstalled ? 'Installed' : 'Install'}</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate({ view: 'admin' })}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:scale-95 transition-transform ${
              route.view === 'admin' ? 'text-teal-700' : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Admin</span>
          </button>
        )}
      </nav>

      {/* Modals & Offline Banner */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(loggedUser) => {
          setUser(loggedUser);
          saveUserCache(loggedUser);
          if (loggedUser.role === 'admin') {
            setRoute({ view: 'admin' });
          }
        }}
      />

      <PWAInstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        platform={platform}
        canPromptNative={canPromptNative}
        onTriggerNative={triggerNativeInstall}
      />

      <OfflineIndicator />
    </div>
  );
}

const BreadcrumbBar: React.FC<{
  items: { label: string; onClick?: () => void }[];
  onBack: () => void;
}> = ({ items, onBack }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all min-h-[40px]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>

    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      {items.map((item, idx) => (
        <React.Fragment key={item.label + idx}>
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="font-medium text-slate-600 hover:text-teal-700 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-semibold text-slate-900">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const EmptyStateBox: React.FC<{
  title: string;
  description: string;
  isAdmin: boolean;
  onAdminAction: () => void;
}> = ({ title, description, isAdmin, onAdminAction }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
    <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
    <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
    <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
    {isAdmin && (
      <button
        type="button"
        onClick={onAdminAction}
        className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 active:scale-95 transition-all min-h-[44px]"
      >
        Add in Admin Studio
      </button>
    )}
  </div>
);
