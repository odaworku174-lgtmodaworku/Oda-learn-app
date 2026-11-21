import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  createChapter,
  createGrade,
  createPart,
  createSubject,
  deleteChapter,
  deleteGrade,
  deleteMediaItem,
  deletePart,
  deleteSubject,
  listMediaLibrary,
  updateChapter,
  updateGrade,
  updatePart,
  updateSiteSettings,
  updateSubject,
} from '../lib/api';
import type {
  GradeItem,
  SiteSettings,
  UploadedMediaItem,
} from '../types';
import { GalleryUploadControl } from './GalleryUploadControl';

interface AdminStudioProps {
  settings: SiteSettings;
  grades: GradeItem[];
  onSettingsUpdated: (settings: SiteSettings) => void;
  onGradesUpdated: (grades: GradeItem[]) => void;
  initialFocus?: {
    tab?: 'appearance' | 'curriculum' | 'media';
    gradeId?: string;
    subjectId?: string;
    chapterId?: string;
  };
}

export const AdminStudio: React.FC<AdminStudioProps> = ({
  settings,
  grades,
  onSettingsUpdated,
  onGradesUpdated,
  initialFocus,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'curriculum' | 'media'>(
    initialFocus?.tab || 'appearance'
  );

  // Appearance & Hero state
  const [heroForm, setHeroForm] = useState<SiteSettings>(settings);
  const [savingHero, setSavingHero] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);

  // Hierarchy selection inside Curriculum Manager
  const [selectedGradeId, setSelectedGradeId] = useState<string>(
    initialFocus?.gradeId || grades[0]?.id || ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialFocus?.subjectId || ''
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialFocus?.chapterId || ''
  );

  const [newGradeTitle, setNewGradeTitle] = useState('');
  const [newGradeSubtitle, setNewGradeSubtitle] = useState('');
  const [newGradeImage, setNewGradeImage] = useState('/images/hero-oda-learn.jpg');

  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectSubtitle, setNewSubjectSubtitle] = useState('');
  const [newSubjectImage, setNewSubjectImage] = useState('/images/landscape-sciences.jpg');

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterSubtitle, setNewChapterSubtitle] = useState('');
  const [newChapterImage, setNewChapterImage] = useState('/images/landscape-mathematics.jpg');

  const [newPartTitle, setNewPartTitle] = useState('');
  const [newPartDesc, setNewPartDesc] = useState('');
  const [newPartDuration, setNewPartDuration] = useState('12:00');
  const [newPartThumb, setNewPartThumb] = useState('/images/hero-oda-learn.jpg');
  const [newPartVideo, setNewPartVideo] = useState('');

  const [curriculumStatus, setCurriculumStatus] = useState<string | null>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);

  // Media library state
  const [mediaItems, setMediaItems] = useState<UploadedMediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  useEffect(() => {
    setHeroForm(settings);
  }, [settings]);

  useEffect(() => {
    if (initialFocus?.tab) setActiveTab(initialFocus.tab);
    if (initialFocus?.gradeId) setSelectedGradeId(initialFocus.gradeId);
    if (initialFocus?.subjectId) setSelectedSubjectId(initialFocus.subjectId);
    if (initialFocus?.chapterId) setSelectedChapterId(initialFocus.chapterId);
  }, [initialFocus]);

  const sortedGrades = [...grades].sort((a, b) => a.order - b.order);
  const selectedGrade = sortedGrades.find((g) => g.id === selectedGradeId) || null;
  const sortedSubjects = selectedGrade
    ? [...selectedGrade.subjects].sort((a, b) => a.order - b.order)
    : [];
  const selectedSubject = sortedSubjects.find((s) => s.id === selectedSubjectId) || null;
  const sortedChapters = selectedSubject
    ? [...selectedSubject.chapters].sort((a, b) => a.order - b.order)
    : [];
  const selectedChapter = sortedChapters.find((c) => c.id === selectedChapterId) || null;
  const sortedParts = selectedChapter
    ? [...selectedChapter.parts].sort((a, b) => a.order - b.order)
    : [];

  const notifyStatus = (msg: string) => {
    setCurriculumError(null);
    setCurriculumStatus(msg);
    setTimeout(() => setCurriculumStatus(null), 2600);
  };

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHero(true);
    setHeroError(null);
    setHeroSaved(false);
    try {
      const updated = await updateSiteSettings(heroForm);
      onSettingsUpdated(updated);
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 2600);
    } catch (err) {
      setHeroError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingHero(false);
    }
  };

  const loadMedia = async () => {
    setLoadingMedia(true);
    try {
      const items = await listMediaLibrary();
      setMediaItems(items);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'media') {
      loadMedia();
    }
  }, [activeTab]);

  return (
    <div className="space-y-8">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-700">Admin Studio</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Appearance, Head &amp; All 16:9 Landscapes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Customize the opening image/video, edit the modern 16:9 hero headline, and upload gallery images or videos to every grade, subject, chapter, and video part.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Opening &amp; Hero
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'curriculum'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            All Landscapes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'media'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Media Library
          </button>
        </div>
      </div>

      {/* TAB 1: OPENING APPEARANCE & HERO HEAD */}
      {activeTab === 'appearance' && (
        <form onSubmit={handleSaveHero} className="space-y-8">
          {/* Live 16:9 Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Live 16:9 Opening Hero Preview
              </span>
              <span className="font-mono text-xs text-slate-500">16:9 Aspect Frame</span>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
              {heroForm.heroMediaType === 'video' && heroForm.heroMediaUrl ? (
                <video
                  src={heroForm.heroMediaUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={heroForm.heroMediaUrl || '/images/hero-oda-learn.jpg'}
                  alt={heroForm.heroTitle}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/20" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10">
                <span className="text-xs font-semibold text-amber-300 tracking-wide">
                  {heroForm.heroKicker}
                </span>
                <h2 className="mt-1.5 max-w-3xl font-display text-xl font-extrabold tracking-tight text-white sm:text-4xl text-balance">
                  {heroForm.heroTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-xs text-slate-200 sm:text-sm line-clamp-2">
                  {heroForm.heroSubtitle}
                </p>
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white">
                    {heroForm.heroCtaLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Appearance Media Selection */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  1. Opening Appearance (Image or Video)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Choose whether the app opens with a 16:9 landscape image or video uploaded from your gallery.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setHeroForm({ ...heroForm, heroMediaType: 'image' })}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                    heroForm.heroMediaType === 'image'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  Use Landscape Image
                </button>
                <button
                  type="button"
                  onClick={() => setHeroForm({ ...heroForm, heroMediaType: 'video' })}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                    heroForm.heroMediaType === 'video'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Film className="h-4 w-4" />
                  Use Opening Video
                </button>
              </div>

              <GalleryUploadControl
                label={
                  heroForm.heroMediaType === 'video'
                    ? 'Hero & Opening Video (from Gallery)'
                    : 'Hero & Opening 16:9 Landscape Image (from Gallery)'
                }
                accept="both"
                previewKind={heroForm.heroMediaType}
                value={heroForm.heroMediaUrl}
                onChange={(url, detectedKind) =>
                  setHeroForm({
                    ...heroForm,
                    heroMediaUrl: url,
                    heroMediaType: detectedKind || heroForm.heroMediaType,
                  })
                }
              />

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroForm.showOpeningSplash}
                  onChange={(e) =>
                    setHeroForm({ ...heroForm, showOpeningSplash: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  <strong className="block text-slate-900">
                    Show Full-Screen Opening Appearance on Launch
                  </strong>
                  Displays your chosen image or video briefly when Oda Learn opens before showing the programs feed.
                </span>
              </label>
            </div>

            {/* Modern Editable Headline & Copy */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  2. Editable Modern Head Text (16:9 Space)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Edit the headline and subtitle displayed inside the opening 16:9 landscape frame.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Top Kicker Label
                </label>
                <input
                  type="text"
                  value={heroForm.heroKicker}
                  onChange={(e) => setHeroForm({ ...heroForm, heroKicker: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Modern Hero Headline
                </label>
                <input
                  type="text"
                  required
                  value={heroForm.heroTitle}
                  onChange={(e) => setHeroForm({ ...heroForm, heroTitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hero Subtitle
                </label>
                <textarea
                  rows={3}
                  value={heroForm.heroSubtitle}
                  onChange={(e) => setHeroForm({ ...heroForm, heroSubtitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Button Label
                </label>
                <input
                  type="text"
                  value={heroForm.heroCtaLabel}
                  onChange={(e) => setHeroForm({ ...heroForm, heroCtaLabel: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {heroError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
              {heroError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {heroSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Check className="h-4 w-4" />
                Opening appearance &amp; hero saved
              </span>
            )}
            <button
              type="submit"
              disabled={savingHero}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[44px]"
            >
              <Save className="h-4 w-4" />
              {savingHero ? 'Saving...' : 'Save Appearance & Hero'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ALL 16:9 LANDSCAPES HIERARCHY */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Drill-down Breadcrumb inside Admin */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId('');
                setSelectedChapterId('');
              }}
              className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                !selectedGradeId || (!selectedSubjectId && !selectedChapterId)
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Grades ({sortedGrades.length})
            </button>

            {selectedGrade && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setSelectedChapterId('')}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                    selectedGrade && !selectedSubjectId
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {selectedGrade.title} · Subjects ({sortedSubjects.length})
                </button>
              </>
            )}

            {selectedSubject && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setSelectedChapterId('')}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                    selectedSubject && !selectedChapterId
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {selectedSubject.title} · Chapters ({sortedChapters.length})
                </button>
              </>
            )}

            {selectedChapter && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <span className="rounded-lg bg-teal-50 px-2.5 py-1.5 font-semibold text-teal-800">
                  {selectedChapter.title} · Video Parts ({sortedParts.length})
                </span>
              </>
            )}
          </div>

          {curriculumStatus && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
              {curriculumStatus}
            </div>
          )}
          {curriculumError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
              {curriculumError}
            </div>
          )}

          {/* LEVEL 1: GRADES & PROGRAMS */}
          {!selectedSubjectId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Grades &amp; Freshman Program Landscapes
                </h2>
              </div>

              <div className="space-y-4">
                {sortedGrades.map((grade) => (
                  <GradeEditorCard
                    key={grade.id}
                    grade={grade}
                    isSelected={grade.id === selectedGradeId}
                    onSelectForSubjects={() => {
                      setSelectedGradeId(grade.id);
                      if (grade.subjects[0]) {
                        setSelectedSubjectId(grade.subjects[0].id);
                      } else {
                        setSelectedSubjectId('__manage__');
                      }
                    }}
                    onSave={async (patch) => {
                      try {
                        const updated = await updateGrade(grade.id, patch);
                        onGradesUpdated(updated);
                        notifyStatus(`Updated ${patch.title || grade.title}`);
                      } catch (err) {
                        setCurriculumError(err instanceof Error ? err.message : 'Save failed.');
                      }
                    }}
                    onDelete={async () => {
                      try {
                        const updated = await deleteGrade(grade.id);
                        onGradesUpdated(updated);
                        if (selectedGradeId === grade.id) {
                          setSelectedGradeId(updated[0]?.id || '');
                        }
                        notifyStatus(`Removed ${grade.title}`);
                      } catch (err) {
                        setCurriculumError(err instanceof Error ? err.message : 'Delete failed.');
                      }
                    }}
                  />
                ))}
              </div>

              {/* Add Grade */}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 space-y-4">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Add New Grade or Program Landscape
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Title (e.g. Grade 12 Entrance Prep)"
                    value={newGradeTitle}
                    onChange={(e) => setNewGradeTitle(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Short subtitle"
                    value={newGradeSubtitle}
                    onChange={(e) => setNewGradeSubtitle(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <GalleryUploadControl
                  label="16:9 Grade Landscape Image"
                  accept="image"
                  value={newGradeImage}
                  onChange={(url) => setNewGradeImage(url)}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newGradeTitle.trim()) return;
                    try {
                      const updated = await createGrade({
                        title: newGradeTitle,
                        subtitle: newGradeSubtitle,
                        imageUrl: newGradeImage,
                      });
                      onGradesUpdated(updated);
                      setNewGradeTitle('');
                      setNewGradeSubtitle('');
                      notifyStatus('Added new grade landscape');
                    } catch (err) {
                      setCurriculumError(err instanceof Error ? err.message : 'Failed to create grade.');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors min-h-[42px]"
                >
                  <Plus className="h-4 w-4" />
                  Add Grade Landscape
                </button>
              </div>
            </div>
          )}

          {/* LEVEL 2: SUBJECTS FOR SELECTED GRADE */}
          {selectedGrade && selectedSubjectId && !selectedChapterId && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Subjects in {selectedGrade.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Upload a 16:9 landscape image for each subject, then open its chapters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId('')}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back to All Grades
                </button>
              </div>

              <div className="space-y-4">
                {sortedSubjects.map((subject) => (
                  <SubjectEditorCard
                    key={subject.id}
                    subject={subject}
                    onOpenChapters={() => {
                      setSelectedSubjectId(subject.id);
                      if (subject.chapters[0]) {
                        setSelectedChapterId(subject.chapters[0].id);
                      } else {
                        setSelectedChapterId('__manage__');
                      }
                    }}
                    onSave={async (patch) => {
                      try {
                        const updated = await updateSubject(selectedGrade.id, subject.id, patch);
                        onGradesUpdated(updated);
                        notifyStatus(`Saved subject ${patch.title || subject.title}`);
                      } catch (err) {
                        setCurriculumError(err instanceof Error ? err.message : 'Save failed.');
                      }
                    }}
                    onDelete={async () => {
                      try {
                        const updated = await deleteSubject(selectedGrade.id, subject.id);
                        onGradesUpdated(updated);
                        notifyStatus(`Deleted ${subject.title}`);
                      } catch (err) {
                        setCurriculumError(err instanceof Error ? err.message : 'Delete failed.');
                      }
                    }}
                  />
                ))}
              </div>

              {/* Add Subject */}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 space-y-4">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Add Subject Landscape to {selectedGrade.title}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Subject title (e.g. Biology)"
                    value={newSubjectTitle}
                    onChange={(e) => setNewSubjectTitle(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Short subtitle"
                    value={newSubjectSubtitle}
                    onChange={(e) => setNewSubjectSubtitle(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <GalleryUploadControl
                  label="16:9 Subject Landscape Image"
                  accept="image"
                  value={newSubjectImage}
                  onChange={(url) => setNewSubjectImage(url)}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newSubjectTitle.trim()) return;
                    try {
                      const updated = await createSubject(selectedGrade.id, {
                        title: newSubjectTitle,
                        subtitle: newSubjectSubtitle,
                        imageUrl: newSubjectImage,
                      });
                      onGradesUpdated(updated);
                      setNewSubjectTitle('');
                      setNewSubjectSubtitle('');
                      notifyStatus('Added new subject landscape');
                    } catch (err) {
                      setCurriculumError(err instanceof Error ? err.message : 'Create failed.');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors min-h-[42px]"
                >
                  <Plus className="h-4 w-4" />
                  Add Subject Landscape
                </button>
              </div>
            </div>
          )}

          {/* LEVEL 3: CHAPTERS & VIDEO PARTS */}
          {selectedGrade && selectedSubject && selectedChapterId && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Chapters in {selectedGrade.title} · {selectedSubject.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Upload 16:9 landscape images for every chapter and upload gallery videos + thumbnails for every part.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedChapterId('')}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back to Subjects
                </button>
              </div>

              {/* Chapters List */}
              <div className="space-y-4">
                {sortedChapters.map((chapter) => (
                  <ChapterEditorCard
                    key={chapter.id}
                    chapter={chapter}
                    isActive={chapter.id === selectedChapter?.id}
                    onSelect={() => setSelectedChapterId(chapter.id)}
                    onSave={async (patch) => {
                      try {
                        const updated = await updateChapter(
                          selectedGrade.id,
                          selectedSubject.id,
                          chapter.id,
                          patch
                        );
                        onGradesUpdated(updated);
                        notifyStatus(`Saved ${patch.title || chapter.title}`);
                      } catch (err) {
                        setCurriculumError(err instanceof Error ? err.message : 'Save failed.');
                      }
                    }}
                    onDelete={async () => {
                      try {
                        const updated = await deleteChapter(
                          selectedGrade.id,
                          selectedSubject.id,
                          chapter.id
                        );
                        onGradesUpdated(updated);
                        notifyStatus(`Deleted ${chapter.title}`);
                      } catch (err) {
                        setCurriculumError(err instanceof Error ? err.message : 'Delete failed.');
                      }
                    }}
                  />
                ))}
              </div>

              {/* Add Chapter */}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 space-y-4">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Add Chapter Landscape to {selectedSubject.title}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Chapter title (e.g. Chapter 2: Kinematics)"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Short subtitle"
                    value={newChapterSubtitle}
                    onChange={(e) => setNewChapterSubtitle(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <GalleryUploadControl
                  label="16:9 Chapter Landscape Image"
                  accept="image"
                  value={newChapterImage}
                  onChange={(url) => setNewChapterImage(url)}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newChapterTitle.trim()) return;
                    try {
                      const updated = await createChapter(
                        selectedGrade.id,
                        selectedSubject.id,
                        {
                          title: newChapterTitle,
                          subtitle: newChapterSubtitle,
                          imageUrl: newChapterImage,
                        }
                      );
                      onGradesUpdated(updated);
                      setNewChapterTitle('');
                      setNewChapterSubtitle('');
                      notifyStatus('Added chapter landscape');
                    } catch (err) {
                      setCurriculumError(err instanceof Error ? err.message : 'Create failed.');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors min-h-[42px]"
                >
                  <Plus className="h-4 w-4" />
                  Add Chapter Landscape
                </button>
              </div>

              {/* VIDEO PARTS FOR SELECTED CHAPTER */}
              {selectedChapter && (
                <div className="space-y-5 border-t border-slate-200 pt-8">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">Video Parts Manager</p>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Video Parts in {selectedChapter.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Upload a 16:9 thumbnail image and upload the tutorial video file directly from your device gallery for every part.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {sortedParts.map((part) => (
                      <PartEditorCard
                        key={part.id}
                        part={part}
                        onSave={async (patch) => {
                          try {
                            const updated = await updatePart(
                              selectedGrade.id,
                              selectedSubject.id,
                              selectedChapter.id,
                              part.id,
                              patch
                            );
                            onGradesUpdated(updated);
                            notifyStatus(`Saved ${patch.title || part.title}`);
                          } catch (err) {
                            setCurriculumError(err instanceof Error ? err.message : 'Save failed.');
                          }
                        }}
                        onDelete={async () => {
                          try {
                            const updated = await deletePart(
                              selectedGrade.id,
                              selectedSubject.id,
                              selectedChapter.id,
                              part.id
                            );
                            onGradesUpdated(updated);
                            notifyStatus(`Deleted ${part.title}`);
                          } catch (err) {
                            setCurriculumError(err instanceof Error ? err.message : 'Delete failed.');
                          }
                        }}
                      />
                    ))}
                  </div>

                  {/* Add New Video Part */}
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 space-y-4">
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      Add New Video Part to {selectedChapter.title}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        placeholder="Part title (e.g. Part 1: Intro)"
                        value={newPartTitle}
                        onChange={(e) => setNewPartTitle(e.target.value)}
                        className="sm:col-span-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g. 14:20)"
                        value={newPartDuration}
                        onChange={(e) => setNewPartDuration(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Short lesson description"
                      value={newPartDesc}
                      onChange={(e) => setNewPartDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-700 focus:outline-none"
                    />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <GalleryUploadControl
                        label="16:9 Landscape Thumbnail Image"
                        accept="image"
                        value={newPartThumb}
                        onChange={(url) => setNewPartThumb(url)}
                      />
                      <GalleryUploadControl
                        label="Tutorial Video File (Upload from Gallery)"
                        accept="video"
                        previewKind="video"
                        value={newPartVideo}
                        onChange={(url) => setNewPartVideo(url)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newPartTitle.trim()) return;
                        try {
                          const updated = await createPart(
                            selectedGrade.id,
                            selectedSubject.id,
                            selectedChapter.id,
                            {
                              title: newPartTitle,
                              description: newPartDesc,
                              duration: newPartDuration,
                              thumbnailUrl: newPartThumb,
                              videoUrl: newPartVideo,
                            }
                          );
                          onGradesUpdated(updated);
                          setNewPartTitle('');
                          setNewPartDesc('');
                          setNewPartVideo('');
                          notifyStatus('Added new video part');
                        } catch (err) {
                          setCurriculumError(err instanceof Error ? err.message : 'Create failed.');
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors min-h-[42px]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Video Part
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UPLOADED MEDIA LIBRARY */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Gallery Uploads ({mediaItems.length})
            </h2>
            <button
              type="button"
              onClick={loadMedia}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loadingMedia ? (
            <p className="text-sm text-slate-500">Loading uploaded files...</p>
          ) : mediaItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-600">
                No files uploaded from gallery yet. Use any &ldquo;Upload from Gallery&rdquo; button in Opening &amp; Hero or All Landscapes.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediaItems.map((item) => (
                <div
                  key={item.filename}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="aspect-video bg-slate-950">
                    {item.kind === 'video' ? (
                      <video src={item.url} controls className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.filename}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium text-slate-800">
                        {item.filename}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {item.kind.toUpperCase()} · {(item.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteMediaItem(item.filename);
                        setMediaItems((prev) => prev.filter((m) => m.filename !== item.filename));
                      }}
                      aria-label={`Delete ${item.filename}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* --- Sub-editors --- */

const GradeEditorCard: React.FC<{
  grade: GradeItem;
  isSelected: boolean;
  onSelectForSubjects: () => void;
  onSave: (patch: Partial<GradeItem>) => Promise<void>;
  onDelete: () => Promise<void>;
}> = ({ grade, onSelectForSubjects, onSave, onDelete }) => {
  const [title, setTitle] = useState(grade.title);
  const [subtitle, setSubtitle] = useState(grade.subtitle);
  const [imageUrl, setImageUrl] = useState(grade.imageUrl);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-slate-500">
            {grade.subjects.length} Subjects
          </span>
          <h3 className="font-display text-base font-bold text-slate-900">{grade.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectForSubjects}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Manage Subjects &amp; Chapters
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${grade.title}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Grade Title"
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
        />
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Grade Subtitle"
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
        />
      </div>

      <GalleryUploadControl
        label={`16:9 Landscape Image for ${title || grade.title}`}
        accept="image"
        value={imageUrl}
        onChange={(url) => setImageUrl(url)}
      />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ title, subtitle, imageUrl });
            setSaving(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Grade'}
        </button>
      </div>
    </div>
  );
};

const SubjectEditorCard: React.FC<{
  subject: GradeItem['subjects'][number];
  onOpenChapters: () => void;
  onSave: (patch: Partial<GradeItem['subjects'][number]>) => Promise<void>;
  onDelete: () => Promise<void>;
}> = ({ subject, onOpenChapters, onSave, onDelete }) => {
  const [title, setTitle] = useState(subject.title);
  const [subtitle, setSubtitle] = useState(subject.subtitle);
  const [imageUrl, setImageUrl] = useState(subject.imageUrl);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-slate-500">
            {subject.chapters.length} Chapters
          </span>
          <h3 className="font-display text-base font-bold text-slate-900">{subject.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenChapters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Manage Chapters &amp; Videos
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${subject.title}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Subject Title"
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
        />
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subject Subtitle"
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
        />
      </div>

      <GalleryUploadControl
        label={`16:9 Landscape Image for ${title || subject.title}`}
        accept="image"
        value={imageUrl}
        onChange={(url) => setImageUrl(url)}
      />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ title, subtitle, imageUrl });
            setSaving(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Subject'}
        </button>
      </div>
    </div>
  );
};

const ChapterEditorCard: React.FC<{
  chapter: GradeItem['subjects'][number]['chapters'][number];
  isActive: boolean;
  onSelect: () => void;
  onSave: (patch: Partial<GradeItem['subjects'][number]['chapters'][number]>) => Promise<void>;
  onDelete: () => Promise<void>;
}> = ({ chapter, isActive, onSelect, onSave, onDelete }) => {
  const [title, setTitle] = useState(chapter.title);
  const [subtitle, setSubtitle] = useState(chapter.subtitle);
  const [imageUrl, setImageUrl] = useState(chapter.imageUrl);
  const [saving, setSaving] = useState(false);

  return (
    <div
      className={`rounded-2xl border bg-white p-5 space-y-4 ${
        isActive ? 'border-teal-700 ring-2 ring-teal-700/10' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-slate-500">
            {chapter.parts.length} Video Parts
          </span>
          <h4 className="font-display text-base font-bold text-slate-900">{chapter.title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-teal-700 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isActive ? 'Editing Parts Below' : 'Edit Video Parts'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${chapter.title}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chapter Title"
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
        />
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Chapter Subtitle"
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
        />
      </div>

      <GalleryUploadControl
        label={`16:9 Landscape Image for ${title || chapter.title}`}
        accept="image"
        value={imageUrl}
        onChange={(url) => setImageUrl(url)}
      />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ title, subtitle, imageUrl });
            setSaving(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Chapter'}
        </button>
      </div>
    </div>
  );
};

const PartEditorCard: React.FC<{
  part: GradeItem['subjects'][number]['chapters'][number]['parts'][number];
  onSave: (patch: Partial<GradeItem['subjects'][number]['chapters'][number]['parts'][number]>) => Promise<void>;
  onDelete: () => Promise<void>;
}> = ({ part, onSave, onDelete }) => {
  const [title, setTitle] = useState(part.title);
  const [description, setDescription] = useState(part.description);
  const [duration, setDuration] = useState(part.duration);
  const [thumbnailUrl, setThumbnailUrl] = useState(part.thumbnailUrl);
  const [videoUrl, setVideoUrl] = useState(part.videoUrl);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-display text-sm font-bold text-slate-900">{part.title}</h4>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${part.title}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Part Title"
          className="sm:col-span-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
        />
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Duration"
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono focus:border-teal-700 focus:outline-none"
        />
      </div>

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Part description"
        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-700 focus:outline-none"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GalleryUploadControl
          label="16:9 Part Landscape Thumbnail"
          accept="image"
          value={thumbnailUrl}
          onChange={(url) => setThumbnailUrl(url)}
        />
        <GalleryUploadControl
          label="Tutorial Video (Upload from Gallery)"
          accept="video"
          previewKind="video"
          value={videoUrl}
          onChange={(url) => setVideoUrl(url)}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ title, description, duration, thumbnailUrl, videoUrl });
            setSaving(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Video Part'}
        </button>
      </div>
    </div>
  );
};
