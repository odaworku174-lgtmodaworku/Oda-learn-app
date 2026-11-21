import { execFile } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import type {
  ChapterItem,
  CurriculumData,
  GradeItem,
  SiteSettings,
  SubjectItem,
  UploadedMediaItem,
  UserProfile,
  VideoPartItem,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'oda-learn.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AUTH_SECRET = process.env.SESSION_SECRET || 'oda-learn-local-session-secret-2026';
const DEFAULT_ADMIN_EMAIL = 'odaworku174@gmail.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'oda-admin-2026';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'student';
  gradePreference?: string;
  completedPartIds: string[];
  createdAt: string;
}

interface DatabaseSchema {
  settings: SiteSettings;
  grades: GradeItem[];
  users: StoredUser[];
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

function signToken(payload: { userId: string; role: 'admin' | 'student'; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { userId: string; role: 'admin' | 'student'; exp: number } | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function makeInitialSeed(): DatabaseSchema {
  const adminCreds = hashPassword(DEFAULT_ADMIN_PASSWORD);

  return {
    settings: {
      appName: 'Oda Learn',
      heroMediaType: 'image',
      heroMediaUrl: '/images/hero-oda-learn.jpg',
      heroKicker: 'Oda Tutorial Class',
      heroTitle: 'Structured Video Tutorials from Grade 9 to Freshman Year',
      heroSubtitle:
        'Explore chapter-by-chapter visual lessons across Mathematics, Physics, Chemistry, and Biology—designed for clear understanding and offline-ready mobile study.',
      heroCtaLabel: 'Start Learning',
      showOpeningSplash: false,
    },
    grades: [
      {
        id: 'grade-9',
        title: 'Grade 9',
        subtitle: 'Foundational algebra, mechanics, matter, and cellular biology',
        imageUrl: '/images/landscape-mathematics.jpg',
        order: 1,
        subjects: [
          {
            id: 'g9-math',
            title: 'Mathematics',
            subtitle: 'Number systems, linear equations, geometry, and trigonometry basics',
            imageUrl: '/images/landscape-mathematics.jpg',
            order: 1,
            chapters: [
              {
                id: 'g9-math-ch1',
                title: 'Chapter 1: Real Numbers & Exponents',
                subtitle: 'Rational numbers, radicals, and laws of indices',
                imageUrl: '/images/landscape-mathematics.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g9-math-ch1-p1',
                    title: 'Part 1: Properties of Real Numbers',
                    description: 'Classifying rational and irrational numbers on the number line.',
                    duration: '12:40',
                    thumbnailUrl: '/images/landscape-mathematics.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                  {
                    id: 'g9-math-ch1-p2',
                    title: 'Part 2: Simplifying Radicals & Surds',
                    description: 'Step-by-step radical operations and rationalizing denominators.',
                    duration: '15:15',
                    thumbnailUrl: '/images/hero-oda-learn.jpg',
                    videoUrl: '',
                    order: 2,
                  },
                ],
              },
              {
                id: 'g9-math-ch2',
                title: 'Chapter 2: Linear Equations & Graphs',
                subtitle: 'Slope-intercept form, systems of equations, and word problems',
                imageUrl: '/images/hero-oda-learn.jpg',
                order: 2,
                parts: [
                  {
                    id: 'g9-math-ch2-p1',
                    title: 'Part 1: Graphing Linear Functions',
                    description: 'Understanding slope, intercepts, and coordinate geometry.',
                    duration: '14:05',
                    thumbnailUrl: '/images/landscape-mathematics.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
          {
            id: 'g9-physics',
            title: 'Physics',
            subtitle: 'Measurement, vectors, motion in one dimension, and forces',
            imageUrl: '/images/landscape-sciences.jpg',
            order: 2,
            chapters: [
              {
                id: 'g9-phys-ch1',
                title: 'Chapter 1: Vectors & Physical Quantities',
                subtitle: 'Scalars, vectors, and graphical vector resolution',
                imageUrl: '/images/landscape-sciences.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g9-phys-ch1-p1',
                    title: 'Part 1: Scalar vs Vector Quantities',
                    description: 'Distinguishing magnitude and direction with everyday motion examples.',
                    duration: '11:30',
                    thumbnailUrl: '/images/landscape-sciences.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                  {
                    id: 'g9-phys-ch1-p2',
                    title: 'Part 2: Resultant Vectors & Components',
                    description: 'Adding perpendicular and angled vectors using trigonometry.',
                    duration: '16:20',
                    thumbnailUrl: '/images/landscape-mathematics.jpg',
                    videoUrl: '',
                    order: 2,
                  },
                ],
              },
            ],
          },
          {
            id: 'g9-chemistry',
            title: 'Chemistry',
            subtitle: 'Atomic structure, periodic trends, and chemical bonding',
            imageUrl: '/images/landscape-sciences.jpg',
            order: 3,
            chapters: [
              {
                id: 'g9-chem-ch1',
                title: 'Chapter 1: Structure of the Atom',
                subtitle: 'Protons, neutrons, electrons, and energy shells',
                imageUrl: '/images/landscape-sciences.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g9-chem-ch1-p1',
                    title: 'Part 1: Subatomic Particles & Isotopes',
                    description: 'Atomic number, mass number, and calculating average atomic mass.',
                    duration: '13:10',
                    thumbnailUrl: '/images/landscape-sciences.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'grade-10',
        title: 'Grade 10',
        subtitle: 'Quadratics, optics, chemical reactions, and genetics',
        imageUrl: '/images/landscape-sciences.jpg',
        order: 2,
        subjects: [
          {
            id: 'g10-math',
            title: 'Mathematics',
            subtitle: 'Quadratic functions, polynomials, circles, and trigonometry',
            imageUrl: '/images/landscape-mathematics.jpg',
            order: 1,
            chapters: [
              {
                id: 'g10-math-ch1',
                title: 'Chapter 1: Polynomial & Quadratic Functions',
                subtitle: 'Factoring, completing the square, and parabolic graphs',
                imageUrl: '/images/landscape-mathematics.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g10-math-ch1-p1',
                    title: 'Part 1: Solving Quadratics by Completing the Square',
                    description: 'Deriving the quadratic formula from vertex transformations.',
                    duration: '17:45',
                    thumbnailUrl: '/images/landscape-mathematics.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
          {
            id: 'g10-physics',
            title: 'Physics',
            subtitle: 'Projectile motion, electrostatics, circuits, and wave optics',
            imageUrl: '/images/landscape-sciences.jpg',
            order: 2,
            chapters: [
              {
                id: 'g10-phys-ch1',
                title: 'Chapter 1: Light, Reflection & Refraction',
                subtitle: "Snell's Law, prisms, and thin lens ray diagrams",
                imageUrl: '/images/landscape-sciences.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g10-phys-ch1-p1',
                    title: 'Part 1: Dispersion Through Glass Prisms',
                    description: 'How wavelength determines refractive index and spectral separation.',
                    duration: '13:50',
                    thumbnailUrl: '/images/landscape-sciences.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'grade-11',
        title: 'Grade 11',
        subtitle: 'Analytical geometry, thermodynamics, stoichiometry, and physiology',
        imageUrl: '/images/hero-oda-learn.jpg',
        order: 3,
        subjects: [
          {
            id: 'g11-math',
            title: 'Mathematics',
            subtitle: 'Relations, functions, matrices, determinants, and conic sections',
            imageUrl: '/images/landscape-mathematics.jpg',
            order: 1,
            chapters: [
              {
                id: 'g11-math-ch1',
                title: 'Chapter 1: Matrices & Linear Systems',
                subtitle: 'Matrix multiplication, inverses, and Cramer’s rule',
                imageUrl: '/images/landscape-mathematics.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g11-math-ch1-p1',
                    title: 'Part 1: Matrix Operations & Determinants',
                    description: 'Computing 2x2 and 3x3 determinants cleanly.',
                    duration: '18:10',
                    thumbnailUrl: '/images/landscape-mathematics.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
          {
            id: 'g11-chemistry',
            title: 'Chemistry',
            subtitle: 'Chemical equilibrium, reaction kinetics, and gas laws',
            imageUrl: '/images/landscape-sciences.jpg',
            order: 2,
            chapters: [
              {
                id: 'g11-chem-ch1',
                title: 'Chapter 1: Chemical Kinetics & Equilibrium',
                subtitle: "Collision theory, rate laws, and Le Chatelier's principle",
                imageUrl: '/images/landscape-sciences.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g11-chem-ch1-p1',
                    title: 'Part 1: Dynamic Equilibrium Constants',
                    description: 'Writing Kc and Kp expressions for reversible reactions.',
                    duration: '15:40',
                    thumbnailUrl: '/images/landscape-sciences.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'grade-12',
        title: 'Grade 12',
        subtitle: 'Calculus, electromagnetism, electrochemistry, and national exam prep',
        imageUrl: '/images/landscape-mathematics.jpg',
        order: 4,
        subjects: [
          {
            id: 'g12-math',
            title: 'Mathematics',
            subtitle: 'Limits, continuity, derivatives, and integral calculus',
            imageUrl: '/images/landscape-mathematics.jpg',
            order: 1,
            chapters: [
              {
                id: 'g12-math-ch1',
                title: 'Chapter 1: Limits & Continuity',
                subtitle: 'One-sided limits, squeeze theorem, and asymptotes',
                imageUrl: '/images/landscape-mathematics.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g12-math-ch1-p1',
                    title: 'Part 1: Evaluating Indeterminate Limits',
                    description: 'Factoring, rationalizing, and trigonometric limit identities.',
                    duration: '19:25',
                    thumbnailUrl: '/images/landscape-mathematics.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
          {
            id: 'g12-physics',
            title: 'Physics',
            subtitle: 'Thermodynamics, oscillations, AC circuits, and modern physics',
            imageUrl: '/images/landscape-sciences.jpg',
            order: 2,
            chapters: [
              {
                id: 'g12-phys-ch1',
                title: 'Chapter 1: Electromagnetic Induction',
                subtitle: "Faraday's law, Lenz's law, and transformers",
                imageUrl: '/images/landscape-sciences.jpg',
                order: 1,
                parts: [
                  {
                    id: 'g12-phys-ch1-p1',
                    title: 'Part 1: Magnetic Flux & Induced EMF',
                    description: 'Visualizing changing magnetic flux through conducting loops.',
                    duration: '16:50',
                    thumbnailUrl: '/images/landscape-sciences.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'freshman-program',
        title: 'Freshman Program',
        subtitle: 'University common courses: Applied Math, General Physics, Logic & Communicative English',
        imageUrl: '/images/landscape-freshman.jpg',
        order: 5,
        subjects: [
          {
            id: 'fr-math',
            title: 'Mathematics for Natural Sciences',
            subtitle: 'Propositional logic, set theory, functions, and analytic geometry',
            imageUrl: '/images/landscape-freshman.jpg',
            order: 1,
            chapters: [
              {
                id: 'fr-math-ch1',
                title: 'Chapter 1: Propositional Logic & Set Theory',
                subtitle: 'Truth tables, quantifiers, and formal proof techniques',
                imageUrl: '/images/landscape-freshman.jpg',
                order: 1,
                parts: [
                  {
                    id: 'fr-math-ch1-p1',
                    title: 'Part 1: Compound Statements & Logical Equivalence',
                    description: 'Mastering implications, contrapositives, and De Morgan’s laws.',
                    duration: '21:10',
                    thumbnailUrl: '/images/landscape-freshman.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
          {
            id: 'fr-physics',
            title: 'General Physics (Phys 1011)',
            subtitle: 'Kinematics, work & energy, fluid mechanics, and heat transfer',
            imageUrl: '/images/landscape-sciences.jpg',
            order: 2,
            chapters: [
              {
                id: 'fr-phys-ch1',
                title: 'Chapter 1: Kinematics & Particle Dynamics',
                subtitle: 'Vector calculus kinematics and circular motion',
                imageUrl: '/images/landscape-sciences.jpg',
                order: 1,
                parts: [
                  {
                    id: 'fr-phys-ch1-p1',
                    title: 'Part 1: Projectile & Circular Motion Problems',
                    description: 'University exam problem walkthroughs with free-body diagrams.',
                    duration: '22:40',
                    thumbnailUrl: '/images/landscape-sciences.jpg',
                    videoUrl: '',
                    order: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    users: [
      {
        id: 'admin-oda-1',
        name: 'Oda Worku',
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash: adminCreds.hash,
        salt: adminCreds.salt,
        role: 'admin',
        completedPartIds: [],
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function readDB(): DatabaseSchema {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = makeInitialSeed();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch {
    const seed = makeInitialSeed();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

function writeDB(db: DatabaseSchema): void {
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
}

function sanitizeUser(user: StoredUser): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    gradePreference: user.gradePreference,
    completedPartIds: user.completedPartIds || [],
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('oda_session=')) {
        return decodeURIComponent(cookie.slice('oda_session='.length));
      }
    }
  }
  return null;
}

function getAuthenticatedUser(req: Request): StoredUser | null {
  const token = extractToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const db = readDB();
  return db.users.find((u) => u.id === payload.userId) || null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to your Oda Learn account.' });
    return;
  }
  (req as Request & { currentUser?: StoredUser }).currentUser = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin privileges required.' });
    return;
  }
  (req as Request & { currentUser?: StoredUser }).currentUser = user;
  next();
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function getExtensionFromMimeOrName(filename: string, mimeType: string): { ext: string; kind: 'image' | 'video' } | null {
  const cleanExt = path.extname(filename).toLowerCase().replace('.', '');
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
  const videoExts = ['mp4', 'webm', 'mov', 'm4v', 'ogg'];

  if (imageExts.includes(cleanExt)) return { ext: cleanExt, kind: 'image' };
  if (videoExts.includes(cleanExt)) return { ext: cleanExt, kind: 'video' };

  if (mimeType.startsWith('image/')) {
    const mExt = mimeType.split('/')[1]?.split(';')[0]?.toLowerCase() || 'jpg';
    return { ext: mExt === 'jpeg' ? 'jpg' : mExt, kind: 'image' };
  }
  if (mimeType.startsWith('video/')) {
    const mExt = mimeType.split('/')[1]?.split(';')[0]?.toLowerCase() || 'mp4';
    return { ext: mExt === 'quicktime' ? 'mov' : mExt, kind: 'video' };
  }

  return null;
}

const activeCompressionJobs = new Map<string, Promise<string>>();

function getCompressedVideoFilename(originalFilename: string): string {
  const base = path.basename(originalFilename, path.extname(originalFilename));
  return `compressed-${base}.mp4`;
}

function compressVideoFile(inputPath: string, outputPath: string): Promise<string> {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return Promise.resolve(outputPath);
  }
  const existingJob = activeCompressionJobs.get(outputPath);
  if (existingJob) return existingJob;

  const tmpOutput = `${outputPath}.part.mp4`;
  const job = new Promise<string>((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-vf', "scale='min(854,iw)':-2",
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-movflags', '+faststart',
      tmpOutput,
    ];
    execFile('ffmpeg', args, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
      activeCompressionJobs.delete(outputPath);
      if (err) {
        fs.unlink(tmpOutput, () => {});
        reject(err);
        return;
      }
      try {
        fs.renameSync(tmpOutput, outputPath);
        resolve(outputPath);
      } catch (renameErr) {
        fs.unlink(tmpOutput, () => {});
        reject(renameErr);
      }
    });
  });

  activeCompressionJobs.set(outputPath, job);
  return job;
}

async function optimizeImageFile(filePath: string): Promise<number> {
  const tmpPath = `${filePath}.opt.jpg`;
  try {
    await sharp(filePath)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toFile(tmpPath);

    const origSize = fs.statSync(filePath).size;
    const optSize = fs.statSync(tmpPath).size;
    if (optSize > 0 && optSize < origSize) {
      fs.renameSync(tmpPath, filePath);
      return optSize;
    }
    fs.unlinkSync(tmpPath);
    return origSize;
  } catch {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
    return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  }
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use('/uploads', express.static(UPLOADS_DIR, { acceptRanges: true }));
  app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

  app.use('/api', (req, res, next) => {
    if (req.path === '/upload') {
      next();
      return;
    }
    express.json({ limit: '5mb' })(req, res, next);
  });

  // Public curriculum endpoint
  app.get('/api/curriculum', (_req, res) => {
    const db = readDB();
    const payload: CurriculumData = {
      settings: db.settings,
      grades: [...db.grades].sort((a, b) => a.order - b.order),
    };
    res.json(payload);
  });

  // Auth endpoints (100% Oda Learn branded)
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    res.json({ user: user ? sanitizeUser(user) : null });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, gradePreference } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      gradePreference?: string;
    };

    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = password || '';

    if (!cleanName || !cleanEmail || cleanPassword.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 characters) are required.' });
      return;
    }

    const db = readDB();
    if (db.users.some((u) => u.email === cleanEmail)) {
      res.status(409).json({ error: 'An Oda Learn account with this email already exists.' });
      return;
    }

    const { hash, salt } = hashPassword(cleanPassword);
    const newUser: StoredUser = {
      id: generateId('stu'),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      role: 'student',
      gradePreference: gradePreference || 'grade-9',
      completedPartIds: [],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDB(db);

    const token = signToken({ userId: newUser.id, role: newUser.role, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    res.cookie('oda_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
      path: '/',
    });
    res.status(201).json({ user: sanitizeUser(newUser), token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = password || '';

    if (!cleanEmail || !cleanPassword) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = readDB();
    const user = db.users.find((u) => u.email === cleanEmail);
    if (!user || !verifyPassword(cleanPassword, user.passwordHash, user.salt)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    res.cookie('oda_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
      path: '/',
    });
    res.json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('oda_session', { path: '/' });
    res.json({ ok: true });
  });

  // Student lesson completion toggle
  app.post('/api/progress/toggle', requireAuth, (req, res) => {
    const currentUser = (req as Request & { currentUser: StoredUser }).currentUser;
    const { partId } = req.body as { partId?: string };
    if (!partId) {
      res.status(400).json({ error: 'partId is required.' });
      return;
    }

    const db = readDB();
    const user = db.users.find((u) => u.id === currentUser.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const exists = user.completedPartIds.includes(partId);
    user.completedPartIds = exists
      ? user.completedPartIds.filter((id) => id !== partId)
      : [...user.completedPartIds, partId];
    writeDB(db);
    res.json({ completedPartIds: user.completedPartIds });
  });

  // Sync offline progress when returning online
  app.post('/api/progress/sync', requireAuth, (req, res) => {
    const currentUser = (req as Request & { currentUser: StoredUser }).currentUser;
    const { completedPartIds } = req.body as { completedPartIds?: string[] };
    if (!Array.isArray(completedPartIds)) {
      res.status(400).json({ error: 'completedPartIds array required.' });
      return;
    }
    const db = readDB();
    const user = db.users.find((u) => u.id === currentUser.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const merged = Array.from(new Set([...(user.completedPartIds || []), ...completedPartIds]));
    user.completedPartIds = merged;
    writeDB(db);
    res.json({ completedPartIds: merged });
  });

  // Video size / compression info for student download UI
  app.get('/api/videos/info', async (req, res) => {
    const src = String(req.query.src || '').trim();
    if (!src) {
      res.status(400).json({ error: 'src is required.' });
      return;
    }
    if (src.startsWith('/uploads/')) {
      const safeName = path.basename(src);
      const origPath = path.join(UPLOADS_DIR, safeName);
      if (!fs.existsSync(origPath)) {
        res.status(404).json({ error: 'Video file not found.' });
        return;
      }
      const compressedName = getCompressedVideoFilename(safeName);
      const compressedPath = path.join(UPLOADS_DIR, compressedName);
      const origSize = fs.statSync(origPath).size;
      const compressedReady = fs.existsSync(compressedPath) && fs.statSync(compressedPath).size > 0;
      const compressedSize = compressedReady ? fs.statSync(compressedPath).size : null;
      res.json({
        originalSize: origSize,
        compressedSize,
        compressedReady,
        downloadUrl: `/api/videos/download?src=${encodeURIComponent(src)}`,
      });
      return;
    }

    res.json({
      originalSize: null,
      compressedSize: null,
      compressedReady: false,
      downloadUrl: `/api/videos/download?src=${encodeURIComponent(src)}`,
    });
  });

  // Compressed video download endpoint (serves compressed MP4 with exact Content-Length)
  app.get('/api/videos/download', async (req, res) => {
    const src = String(req.query.src || '').trim();
    if (!src) {
      res.status(400).json({ error: 'src is required.' });
      return;
    }

    if (src.startsWith('/uploads/')) {
      const safeName = path.basename(src);
      const origPath = path.join(UPLOADS_DIR, safeName);
      if (!fs.existsSync(origPath)) {
        res.status(404).json({ error: 'Video file not found.' });
        return;
      }

      const compressedName = getCompressedVideoFilename(safeName);
      const compressedPath = path.join(UPLOADS_DIR, compressedName);

      let targetFile = origPath;
      let isCompressed = false;
      try {
        targetFile = await compressVideoFile(origPath, compressedPath);
        isCompressed = true;
      } catch {
        targetFile = origPath;
      }

      const stat = fs.statSync(targetFile);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(targetFile)}"`);
      res.setHeader('X-Compressed', isCompressed ? 'true' : 'false');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      fs.createReadStream(targetFile).pipe(res);
      return;
    }

    try {
      const upstream = await fetch(src);
      if (!upstream.ok || !upstream.body) {
        res.status(upstream.status || 502).json({ error: 'Unable to fetch remote video.' });
        return;
      }
      const len = upstream.headers.get('content-length');
      const ct = upstream.headers.get('content-type') || 'video/mp4';
      if (len) res.setHeader('Content-Length', len);
      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Disposition', 'attachment; filename="oda-lesson.mp4"');
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to stream remote video.' });
      }
    }
  });

  // Gallery Image & Video Streaming Upload (Admin only)
  app.post('/api/upload', requireAdmin, (req, res) => {
    const rawName = decodeURIComponent(String(req.headers['x-file-name'] || 'upload.bin'));
    const mimeType = String(req.headers['content-type'] || 'application/octet-stream');
    const resolved = getExtensionFromMimeOrName(rawName, mimeType);

    if (!resolved) {
      res.status(400).json({ error: 'Unsupported file type. Upload an image (JPG, PNG, WebP) or video (MP4, WebM, MOV).' });
      return;
    }

    const filename = `${resolved.kind}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${resolved.ext}`;
    const targetPath = path.join(UPLOADS_DIR, filename);
    const writeStream = fs.createWriteStream(targetPath);

    let totalBytes = 0;
    const MAX_BYTES = 300 * 1024 * 1024; // 300MB cap for video lessons

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BYTES) {
        writeStream.destroy();
        fs.unlink(targetPath, () => {});
        if (!res.headersSent) {
          res.status(413).json({ error: 'File exceeds 300MB upload limit.' });
        }
        req.destroy();
      }
    });

    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      if (res.headersSent) return;
      let finalSize = totalBytes;

      if (resolved.kind === 'image') {
        finalSize = await optimizeImageFile(targetPath);
      } else if (resolved.kind === 'video') {
        // Compress in background immediately so student downloads are small & instant
        const compressedPath = path.join(UPLOADS_DIR, getCompressedVideoFilename(filename));
        void compressVideoFile(targetPath, compressedPath).catch(() => {});
      }

      res.status(201).json({
        filename,
        url: `/uploads/${filename}`,
        kind: resolved.kind,
        size: finalSize,
        createdAt: new Date().toISOString(),
      });
    });

    writeStream.on('error', () => {
      fs.unlink(targetPath, () => {});
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to save uploaded media file.' });
      }
    });
  });

  // Admin media library
  app.get('/api/admin/media', requireAdmin, (_req, res) => {
    const files = fs.readdirSync(UPLOADS_DIR).filter(
      (f) => !f.startsWith('compressed-') && !f.endsWith('.part.mp4') && !f.endsWith('.opt.jpg')
    );
    const items: UploadedMediaItem[] = files
      .map((filename) => {
        const stat = fs.statSync(path.join(UPLOADS_DIR, filename));
        const ext = path.extname(filename).toLowerCase();
        const isVideo = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'].includes(ext);
        return {
          filename,
          url: `/uploads/${filename}`,
          kind: (isVideo ? 'video' : 'image') as 'image' | 'video',
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ items });
  });

  app.delete('/api/admin/media/:filename', requireAdmin, (req, res) => {
    const safeName = path.basename(req.params.filename);
    const target = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    const compressedTarget = path.join(UPLOADS_DIR, getCompressedVideoFilename(safeName));
    if (fs.existsSync(compressedTarget)) {
      fs.unlinkSync(compressedTarget);
    }
    res.json({ ok: true });
  });

  // Admin: Update Opening Appearance & Hero Headline
  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const incoming = req.body as Partial<SiteSettings>;
    const db = readDB();
    db.settings = {
      ...db.settings,
      ...incoming,
      appName: (incoming.appName ?? db.settings.appName).trim() || 'Oda Learn',
      heroMediaType: incoming.heroMediaType === 'video' ? 'video' : 'image',
      heroMediaUrl: incoming.heroMediaUrl ?? db.settings.heroMediaUrl,
      heroKicker: incoming.heroKicker ?? db.settings.heroKicker,
      heroTitle: incoming.heroTitle ?? db.settings.heroTitle,
      heroSubtitle: incoming.heroSubtitle ?? db.settings.heroSubtitle,
      heroCtaLabel: incoming.heroCtaLabel ?? db.settings.heroCtaLabel,
      showOpeningSplash: Boolean(incoming.showOpeningSplash ?? db.settings.showOpeningSplash),
    };
    writeDB(db);
    res.json({ settings: db.settings });
  });

  // Admin: Grades CRUD
  app.post('/api/admin/grades', requireAdmin, (req, res) => {
    const { title, subtitle, imageUrl } = req.body as Partial<GradeItem>;
    if (!title?.trim()) {
      res.status(400).json({ error: 'Grade title is required.' });
      return;
    }
    const db = readDB();
    const newGrade: GradeItem = {
      id: generateId('grade'),
      title: title.trim(),
      subtitle: (subtitle || '').trim(),
      imageUrl: imageUrl || '/images/hero-oda-learn.jpg',
      order: db.grades.length + 1,
      subjects: [],
    };
    db.grades.push(newGrade);
    writeDB(db);
    res.status(201).json({ grade: newGrade, grades: db.grades });
  });

  app.put('/api/admin/grades/:gradeId', requireAdmin, (req, res) => {
    const { title, subtitle, imageUrl, order } = req.body as Partial<GradeItem>;
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    if (!grade) {
      res.status(404).json({ error: 'Grade not found.' });
      return;
    }
    if (title !== undefined) grade.title = title.trim();
    if (subtitle !== undefined) grade.subtitle = subtitle.trim();
    if (imageUrl !== undefined) grade.imageUrl = imageUrl;
    if (order !== undefined) grade.order = order;
    writeDB(db);
    res.json({ grade, grades: db.grades });
  });

  app.delete('/api/admin/grades/:gradeId', requireAdmin, (req, res) => {
    const db = readDB();
    db.grades = db.grades.filter((g) => g.id !== req.params.gradeId);
    writeDB(db);
    res.json({ grades: db.grades });
  });

  // Admin: Subjects CRUD
  app.post('/api/admin/grades/:gradeId/subjects', requireAdmin, (req, res) => {
    const { title, subtitle, imageUrl } = req.body as Partial<SubjectItem>;
    if (!title?.trim()) {
      res.status(400).json({ error: 'Subject title is required.' });
      return;
    }
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    if (!grade) {
      res.status(404).json({ error: 'Grade not found.' });
      return;
    }
    const newSubject: SubjectItem = {
      id: generateId('subj'),
      title: title.trim(),
      subtitle: (subtitle || '').trim(),
      imageUrl: imageUrl || '/images/landscape-sciences.jpg',
      order: grade.subjects.length + 1,
      chapters: [],
    };
    grade.subjects.push(newSubject);
    writeDB(db);
    res.status(201).json({ subject: newSubject, grades: db.grades });
  });

  app.put('/api/admin/grades/:gradeId/subjects/:subjectId', requireAdmin, (req, res) => {
    const { title, subtitle, imageUrl, order } = req.body as Partial<SubjectItem>;
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    const subject = grade?.subjects.find((s) => s.id === req.params.subjectId);
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    if (title !== undefined) subject.title = title.trim();
    if (subtitle !== undefined) subject.subtitle = subtitle.trim();
    if (imageUrl !== undefined) subject.imageUrl = imageUrl;
    if (order !== undefined) subject.order = order;
    writeDB(db);
    res.json({ subject, grades: db.grades });
  });

  app.delete('/api/admin/grades/:gradeId/subjects/:subjectId', requireAdmin, (req, res) => {
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    if (!grade) {
      res.status(404).json({ error: 'Grade not found.' });
      return;
    }
    grade.subjects = grade.subjects.filter((s) => s.id !== req.params.subjectId);
    writeDB(db);
    res.json({ grades: db.grades });
  });

  // Admin: Chapters CRUD
  app.post('/api/admin/grades/:gradeId/subjects/:subjectId/chapters', requireAdmin, (req, res) => {
    const { title, subtitle, imageUrl } = req.body as Partial<ChapterItem>;
    if (!title?.trim()) {
      res.status(400).json({ error: 'Chapter title is required.' });
      return;
    }
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    const subject = grade?.subjects.find((s) => s.id === req.params.subjectId);
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    const newChapter: ChapterItem = {
      id: generateId('chap'),
      title: title.trim(),
      subtitle: (subtitle || '').trim(),
      imageUrl: imageUrl || '/images/landscape-mathematics.jpg',
      order: subject.chapters.length + 1,
      parts: [],
    };
    subject.chapters.push(newChapter);
    writeDB(db);
    res.status(201).json({ chapter: newChapter, grades: db.grades });
  });

  app.put('/api/admin/grades/:gradeId/subjects/:subjectId/chapters/:chapterId', requireAdmin, (req, res) => {
    const { title, subtitle, imageUrl, order } = req.body as Partial<ChapterItem>;
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    const subject = grade?.subjects.find((s) => s.id === req.params.subjectId);
    const chapter = subject?.chapters.find((c) => c.id === req.params.chapterId);
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }
    if (title !== undefined) chapter.title = title.trim();
    if (subtitle !== undefined) chapter.subtitle = subtitle.trim();
    if (imageUrl !== undefined) chapter.imageUrl = imageUrl;
    if (order !== undefined) chapter.order = order;
    writeDB(db);
    res.json({ chapter, grades: db.grades });
  });

  app.delete('/api/admin/grades/:gradeId/subjects/:subjectId/chapters/:chapterId', requireAdmin, (req, res) => {
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    const subject = grade?.subjects.find((s) => s.id === req.params.subjectId);
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    subject.chapters = subject.chapters.filter((c) => c.id !== req.params.chapterId);
    writeDB(db);
    res.json({ grades: db.grades });
  });

  // Admin: Video Parts CRUD
  app.post('/api/admin/grades/:gradeId/subjects/:subjectId/chapters/:chapterId/parts', requireAdmin, (req, res) => {
    const { title, description, duration, thumbnailUrl, videoUrl } = req.body as Partial<VideoPartItem>;
    if (!title?.trim()) {
      res.status(400).json({ error: 'Video part title is required.' });
      return;
    }
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    const subject = grade?.subjects.find((s) => s.id === req.params.subjectId);
    const chapter = subject?.chapters.find((c) => c.id === req.params.chapterId);
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }
    const newPart: VideoPartItem = {
      id: generateId('part'),
      title: title.trim(),
      description: (description || '').trim(),
      duration: (duration || '10:00').trim(),
      thumbnailUrl: thumbnailUrl || chapter.imageUrl || '/images/hero-oda-learn.jpg',
      videoUrl: videoUrl || '',
      order: chapter.parts.length + 1,
    };
    chapter.parts.push(newPart);
    writeDB(db);
    res.status(201).json({ part: newPart, grades: db.grades });
  });

  app.put('/api/admin/grades/:gradeId/subjects/:subjectId/chapters/:chapterId/parts/:partId', requireAdmin, (req, res) => {
    const { title, description, duration, thumbnailUrl, videoUrl, order } = req.body as Partial<VideoPartItem>;
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    const subject = grade?.subjects.find((s) => s.id === req.params.subjectId);
    const chapter = subject?.chapters.find((c) => c.id === req.params.chapterId);
    const part = chapter?.parts.find((p) => p.id === req.params.partId);
    if (!part) {
      res.status(404).json({ error: 'Video part not found.' });
      return;
    }
    if (title !== undefined) part.title = title.trim();
    if (description !== undefined) part.description = description.trim();
    if (duration !== undefined) part.duration = duration.trim();
    if (thumbnailUrl !== undefined) part.thumbnailUrl = thumbnailUrl;
    if (videoUrl !== undefined) part.videoUrl = videoUrl;
    if (order !== undefined) part.order = order;
    writeDB(db);
    res.json({ part, grades: db.grades });
  });

  app.delete('/api/admin/grades/:gradeId/subjects/:subjectId/chapters/:chapterId/parts/:partId', requireAdmin, (req, res) => {
    const db = readDB();
    const grade = db.grades.find((g) => g.id === req.params.gradeId);
    const subject = grade?.subjects.find((s) => s.id === req.params.subjectId);
    const chapter = subject?.chapters.find((c) => c.id === req.params.chapterId);
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }
    chapter.parts = chapter.parts.filter((p) => p.id !== req.params.partId);
    writeDB(db);
    res.json({ grades: db.grades });
  });

  const distDir = path.join(__dirname, 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (process.env.npm_lifecycle_event === 'start' && fs.existsSync(path.join(distDir, 'index.html')));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Oda Learn server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Oda Learn server:', err);
  process.exit(1);
});
