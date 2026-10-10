import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

import {
  mockTutors,
  mockGroups,
  mockSessions,
  mockUsers,
  mockMessages,
  mockCourseResources,
  mockPracticeQuizzes,
} from './data/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const authTokenSecret = process.env.AUTH_TOKEN_SECRET || randomBytes(32).toString('hex');
if (process.env.NODE_ENV === 'production' && !process.env.AUTH_TOKEN_SECRET) {
  throw new Error('AUTH_TOKEN_SECRET must be set in production.');
}
const { Pool } = pg;
const schemaSql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
const databaseUrl = process.env.DATABASE_URL || '';
const mockGroupMemberships = new Map();
const mockGroupJoinRequests = new Map();
let pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 10000,
  max: 5,
}) : null;

app.use(cors());
app.use(express.json({ limit: '32kb' }));

const normalizeTutor = (row) => ({
  id: row.id,
  name: row.name,
  courseCode: row.course_code,
  department: row.department,
  rating: Number(row.rating),
  availability: row.availability,
  bio: row.bio,
});

const normalizeGroup = (row) => ({
  id: row.id,
  name: row.name,
  courseCode: row.course_code,
  department: row.department,
  members: Number(row.members_count),
  nextSession: row.next_session,
});

const normalizeSession = (row) => ({
  id: row.id,
  tutorId: row.tutor_id,
  studentName: row.student_name,
  courseCode: row.course_code,
  date: row.session_date,
  status: row.status,
  notes: row.notes,
});

const normalizeMessage = (row) => ({
  id: row.id,
  sender: row.sender_name,
  receiver: row.receiver_name || 'Study group members',
  content: row.content,
  sentAt: row.sent_at,
});

const normalizeResource = (row) => ({
  id: row.id,
  title: row.title,
  courseCode: row.course_code || row.courseCode,
  resourceType: row.resource_type || row.resourceType,
  description: row.description,
  source: row.source,
  downloadName: row.download_name || row.downloadName,
  downloadUrl: `/resources/${row.id}/download`,
  uploadedAt: row.uploaded_at || row.uploadedAt || null,
});

const normalizeQuiz = (row) => ({
  id: row.id,
  title: row.title,
  courseCode: row.course_code || row.courseCode,
  description: row.description,
  questions: row.questions,
});

const toPublicQuiz = (quiz) => ({
  ...quiz,
  questions: quiz.questions.map(({ prompt, options }) => ({ prompt, options })),
});

const normalizeUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  department: row.department,
  programOfStudy: row.program_of_study || row.programOfStudy || '',
  studentNumber: row.student_number || row.studentNumber || '',
});

const createAuthToken = (user) => {
  const payload = Buffer.from(JSON.stringify({
    sub: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  })).toString('base64url');
  const signature = createHmac('sha256', authTokenSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const authenticate = (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return res.status(401).json({ success: false, message: 'Invalid or expired sign-in.' });
  }

  const expected = createHmac('sha256', authTokenSecret).update(payload).digest();
  let provided;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired sign-in.' });
  }

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ success: false, message: 'Invalid or expired sign-in.' });
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims.sub || !claims.name || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired sign-in.' });
    }
    req.user = { id: claims.sub, name: claims.name, email: claims.email, role: claims.role };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired sign-in.' });
  }
};

const passwordMatches = async (password, storedPassword) => {
  if (String(storedPassword).startsWith('$2')) {
    return bcrypt.compare(String(password), storedPassword);
  }
  return storedPassword === String(password);
};

const hashPassword = (password) => bcrypt.hash(String(password), 12);

const authResponse = (user) => ({
  success: true,
  data: { user: normalizeUser(user), token: createAuthToken(user) },
});

const buildSummary = () => ({
  tutors: mockTutors.length,
  groups: mockGroups.length,
  sessions: mockSessions.length,
  messages: mockMessages.length,
});

const filterTutors = (rows, { courseCode, department, search }) => {
  let filteredTutors = [...rows];

  if (courseCode) {
    filteredTutors = filteredTutors.filter((tutor) => tutor.courseCode.toLowerCase() === String(courseCode).toLowerCase());
  }

  if (department) {
    filteredTutors = filteredTutors.filter((tutor) => tutor.department.toLowerCase().includes(String(department).toLowerCase()));
  }

  if (search) {
    const term = String(search).toLowerCase();
    filteredTutors = filteredTutors.filter((tutor) =>
      tutor.name.toLowerCase().includes(term) ||
      tutor.courseCode.toLowerCase().includes(term) ||
      tutor.department.toLowerCase().includes(term)
    );
  }

  return filteredTutors;
};

const filterGroups = (rows, { courseCode, search }) => {
  let filteredGroups = [...rows];

  if (courseCode) {
    filteredGroups = filteredGroups.filter((group) => group.courseCode.toLowerCase() === String(courseCode).toLowerCase());
  }

  if (search) {
    const term = String(search).toLowerCase();
    filteredGroups = filteredGroups.filter((group) =>
      group.name.toLowerCase().includes(term) ||
      group.courseCode.toLowerCase().includes(term)
    );
  }

  return filteredGroups;
};

const filterResources = (rows, { courseCode, resourceType, search }) => {
  const term = String(search || '').toLowerCase();
  return rows.filter((resource) =>
    (!courseCode || resource.courseCode.toLowerCase() === String(courseCode).toLowerCase()) &&
    (!resourceType || resource.resourceType === resourceType) &&
    (!term || `${resource.title} ${resource.courseCode} ${resource.description}`.toLowerCase().includes(term))
  );
};

const filterQuizzes = (rows, { courseCode, search }) => {
  const term = String(search || '').toLowerCase();
  return rows.filter((quiz) =>
    (!courseCode || quiz.courseCode.toLowerCase() === String(courseCode).toLowerCase()) &&
    (!term || `${quiz.title} ${quiz.courseCode} ${quiz.description}`.toLowerCase().includes(term))
  );
};

const countRows = async (tableName) => {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return Number(result.rows[0].count);
};

const seedDatabase = async () => {
  if (!pool) {
    return;
  }

  await pool.query(schemaSql);

  const tables = {
    users: await countRows('users'),
    tutors: await countRows('tutors'),
    study_groups: await countRows('study_groups'),
    sessions: await countRows('sessions'),
    messages: await countRows('messages'),
    course_resources: await countRows('course_resources'),
    practice_quizzes: await countRows('practice_quizzes'),
  };

  if (tables.users === 0) {
    for (const user of mockUsers) {
      await pool.query(
        `INSERT INTO users (name, email, password, role, department, program_of_study, student_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.name, user.email, await hashPassword(user.password), user.role, user.department, user.programOfStudy || null, user.studentNumber || null]
      );
    }
  }

  for (const tutor of mockTutors) {
    await pool.query(
      `INSERT INTO tutors (name, course_code, department, rating, availability, bio)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM tutors
         WHERE LOWER(name) = LOWER($1) AND LOWER(course_code) = LOWER($2)
       )`,
      [tutor.name, tutor.courseCode, tutor.department, tutor.rating, tutor.availability, tutor.bio]
    );
  }

  await pool.query(`
    UPDATE tutors t SET user_id = u.id
    FROM users u
    WHERE u.role = 'tutor' AND LOWER(t.name) = LOWER(u.name) AND t.user_id IS NULL
  `);
  await pool.query(`
    UPDATE sessions s SET student_user_id = u.id
    FROM users u
    WHERE LOWER(s.student_name) = LOWER(u.name) AND s.student_user_id IS NULL
  `);
  await pool.query(`
    UPDATE messages m SET sender_user_id = sender.id, receiver_user_id = receiver.id
    FROM users sender, users receiver
    WHERE LOWER(m.sender_name) = LOWER(sender.name)
      AND LOWER(m.receiver_name) = LOWER(receiver.name)
      AND (m.sender_user_id IS NULL OR m.receiver_user_id IS NULL)
  `);

  for (const group of mockGroups) {
    await pool.query(
      `INSERT INTO study_groups (name, course_code, department, members_count, next_session)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (
         SELECT 1 FROM study_groups
         WHERE LOWER(name) = LOWER($1) AND LOWER(course_code) = LOWER($2)
       )`,
      [group.name, group.courseCode, group.department, group.members, group.nextSession]
    );
  }

  if (tables.course_resources === 0) {
    for (const resource of mockCourseResources) {
      await pool.query(
        `INSERT INTO course_resources (title, course_code, resource_type, description, source, download_name, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [resource.title, resource.courseCode, resource.resourceType, resource.description, resource.source, resource.downloadName, resource.content]
      );
    }
  }

  if (tables.practice_quizzes === 0) {
    for (const quiz of mockPracticeQuizzes) {
      await pool.query(
        `INSERT INTO practice_quizzes (title, course_code, description, questions)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [quiz.title, quiz.courseCode, quiz.description, JSON.stringify(quiz.questions)]
      );
    }
  }

  if (tables.sessions === 0) {
    for (const session of mockSessions) {
      await pool.query(
        `INSERT INTO sessions (tutor_id, student_name, course_code, session_date, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [session.tutorId, session.studentName, session.courseCode, session.date, session.status, session.notes]
      );
    }
  }

  if (tables.messages === 0) {
    for (const message of mockMessages) {
      await pool.query(
        `INSERT INTO messages (sender_name, receiver_name, content, sent_at)
         VALUES ($1, $2, $3, $4)`,
        [message.sender, message.receiver, message.content, message.sentAt]
      );
    }
  }
};

const disableDatabaseFallback = async () => {
  if (pool) {
    await pool.end().catch(() => {});
  }

  pool = null;
};

const ensureDatabaseReady = async () => {
  if (!pool) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL must be set in production.');
    }
    console.log('DATABASE_URL not set. Running with mock data fallback.');
    return;
  }

  try {
    await pool.query('SELECT 1');
    await seedDatabase();
    console.log('Connected to PostgreSQL and initialized schema/data successfully.');
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.error('Failed to initialize PostgreSQL. Falling back to mock data.', error.message);
    await disableDatabaseFallback();
  }
};

const getDatabaseFallback = async (callback, fallbackData) => {
  if (!pool) {
    return fallbackData();
  }

  try {
    return await callback();
  } catch (error) {
    console.error('Database query failed, falling back to mock data.', error.message);
    return fallbackData();
  }
};

app.get('/api/health', async (req, res) => {
  const databaseState = pool ? 'postgresql' : 'mock-data';

  res.json({
    ok: true,
    message: 'Peer tutoring API is running',
    database: databaseState,
  });
});

app.get('/api/dashboard', async (req, res) => {
  const data = await getDatabaseFallback(async () => {
    const summaryResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM tutors) AS tutors,
        (SELECT COUNT(*) FROM study_groups) AS groups,
        (SELECT COUNT(*) FROM sessions) AS sessions,
        (SELECT COUNT(*) FROM messages) AS messages
    `);

    const summary = summaryResult.rows[0];

    return {
      summary: {
        tutors: Number(summary.tutors),
        groups: Number(summary.groups),
        sessions: Number(summary.sessions),
        messages: Number(summary.messages),
      },
    };
  }, () => ({
    summary: buildSummary(),
  }));

  res.json({ success: true, data });
});

app.get('/api/tutors', async (req, res) => {
  const { courseCode, department, search } = req.query;

  const data = await getDatabaseFallback(async () => {
    let query = 'SELECT * FROM tutors';
    const values = [];

    if (courseCode) {
      query += ' WHERE course_code ILIKE $1';
      values.push(String(courseCode));
    }

    if (department) {
      query += values.length ? ' AND department ILIKE $2' : ' WHERE department ILIKE $1';
      values.push(`%${String(department)}%`);
    }

    const result = await pool.query(query, values);
    return filterTutors(result.rows.map(normalizeTutor), { courseCode, department, search });
  }, () => filterTutors(mockTutors, { courseCode, department, search }));

  res.json({ success: true, data });
});

app.get('/api/groups', async (req, res) => {
  const { courseCode, search } = req.query;

  const data = await getDatabaseFallback(async () => {
    let result;

    if (courseCode) {
      result = await pool.query('SELECT * FROM study_groups WHERE course_code ILIKE $1', [String(courseCode)]);
    } else {
      result = await pool.query('SELECT * FROM study_groups');
    }

    return filterGroups(result.rows.map(normalizeGroup), { courseCode, search });
  }, () => filterGroups(mockGroups, { courseCode, search }));

  res.json({ success: true, data });
});

app.get('/api/resources', async (req, res) => {
  const { courseCode, resourceType, search } = req.query;
  const data = await getDatabaseFallback(async () => {
    const result = await pool.query('SELECT * FROM course_resources ORDER BY uploaded_at DESC, id DESC');
    return filterResources(result.rows.map(normalizeResource), { courseCode, resourceType, search });
  }, () => filterResources(mockCourseResources.map(normalizeResource), { courseCode, resourceType, search }));

  res.json({ success: true, data });
});

app.get('/api/resources/:resourceId/download', async (req, res) => {
  const resourceId = Number(req.params.resourceId);
  if (!Number.isInteger(resourceId) || resourceId < 1) {
    return res.status(400).json({ success: false, message: 'A valid resource is required.' });
  }

  const resource = await getDatabaseFallback(async () => {
    const result = await pool.query('SELECT * FROM course_resources WHERE id = $1', [resourceId]);
    return result.rows[0] ? { ...normalizeResource(result.rows[0]), content: result.rows[0].content } : null;
  }, () => {
    const matchingResource = mockCourseResources.find((entry) => entry.id === resourceId);
    return matchingResource ? { ...normalizeResource(matchingResource), content: matchingResource.content } : null;
  });

  if (!resource) {
    return res.status(404).json({ success: false, message: 'Course resource not found.' });
  }

  return res.type('text/plain').attachment(resource.downloadName).send(resource.content);
});

app.get('/api/quizzes', async (req, res) => {
  const { courseCode, search } = req.query;
  const data = await getDatabaseFallback(async () => {
    const result = await pool.query('SELECT * FROM practice_quizzes ORDER BY id');
    return filterQuizzes(result.rows.map(normalizeQuiz), { courseCode, search }).map(toPublicQuiz);
  }, () => filterQuizzes(mockPracticeQuizzes, { courseCode, search }).map(toPublicQuiz));

  res.json({ success: true, data });
});

app.post('/api/quizzes/:quizId/attempts', async (req, res) => {
  const quizId = Number(req.params.quizId);
  if (!Number.isInteger(quizId) || quizId < 1) {
    return res.status(400).json({ success: false, message: 'A valid practice test is required.' });
  }

  const quiz = await getDatabaseFallback(async () => {
    const result = await pool.query('SELECT * FROM practice_quizzes WHERE id = $1', [quizId]);
    return result.rows[0] ? normalizeQuiz(result.rows[0]) : null;
  }, () => mockPracticeQuizzes.find((entry) => entry.id === quizId) || null);

  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Practice test not found.' });
  }

  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length || answers.some((answer, index) =>
    !Number.isInteger(answer) || answer < 0 || answer >= quiz.questions[index].options.length
  )) {
    return res.status(400).json({ success: false, message: 'Answer every question before submitting.' });
  }

  const results = quiz.questions.map((question, index) => ({
    prompt: question.prompt,
    selectedIndex: answers[index],
    correctIndex: question.correctIndex,
    correctAnswer: question.options[question.correctIndex],
    isCorrect: answers[index] === question.correctIndex,
    explanation: question.explanation,
  }));
  const correctCount = results.filter((result) => result.isCorrect).length;

  return res.json({
    success: true,
    data: { score: correctCount, total: quiz.questions.length, results },
  });
});

app.get('/api/groups/memberships', authenticate, async (req, res) => {
  const data = await getDatabaseFallback(async () => {
    const result = await pool.query(
      'SELECT group_id FROM study_group_memberships WHERE user_id = $1',
      [req.user.id]
    );
    return result.rows.map((row) => row.group_id);
  }, () => Array.from(mockGroupMemberships.get(String(req.user.id)) || []));

  res.json({ success: true, data });
});

app.get('/api/groups/requests', authenticate, async (req, res) => {
  const data = await getDatabaseFallback(async () => {
    const result = await pool.query(
      "SELECT group_id FROM study_group_join_requests WHERE user_id = $1 AND status = 'pending'",
      [req.user.id]
    );
    return result.rows.map((row) => row.group_id);
  }, () => Array.from(mockGroupJoinRequests.get(String(req.user.id)) || []));

  res.json({ success: true, data });
});

app.get('/api/sessions', authenticate, async (req, res) => {
  const data = await getDatabaseFallback(async () => {
    const result = await pool.query(
      `SELECT s.* FROM sessions s
        LEFT JOIN tutors t ON t.id = s.tutor_id
        WHERE s.student_user_id = $1 OR ($2 = 'tutor' AND t.user_id = $1)
       ORDER BY s.session_date DESC`,
            [req.user.id, req.user.role]
    );
    return result.rows.map(normalizeSession);
  }, () => mockSessions.filter((session) => session.studentName === req.user.name));

  res.json({ success: true, data });
});

app.get('/api/messages', authenticate, async (req, res) => {
  const data = await getDatabaseFallback(async () => {
    const result = await pool.query(
      'SELECT * FROM messages WHERE sender_user_id = $1 OR receiver_user_id = $1 ORDER BY sent_at DESC',
      [req.user.id]
    );
    return result.rows.map(normalizeMessage);
  }, () => mockMessages.filter((message) => message.sender === req.user.name || message.receiver === req.user.name));

  res.json({ success: true, data });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);

      const user = result.rows[0];

      if (!user || !(await passwordMatches(password, user.password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      if (!String(user.password).startsWith('$2')) {
        user.password = await hashPassword(password);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [user.password, user.id]);
      }

      return res.json(authResponse(user));
    } catch (error) {
      console.error('Database login failed.', error.message);
      return res.status(503).json({ success: false, message: 'Sign-in is temporarily unavailable.' });
    }
  }

  const user = mockUsers.find((entry) => entry.email.toLowerCase() === email);

  if (!user || !(await passwordMatches(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (!String(user.password).startsWith('$2')) {
    user.password = await hashPassword(password);
  }

  return res.json(authResponse(user));
});

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role || 'student';
  const department = String(req.body.department || '').trim();
  const programOfStudy = String(req.body.programOfStudy || '').trim();
  const studentNumber = String(req.body.studentNumber || '').trim();

  if (!name || name.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 72 || department.length > 255 || programOfStudy.length > 255 || studentNumber.length > 64) {
    return res.status(400).json({ success: false, message: 'Enter a valid name, email, school, program of study, student number, and a password of 8 to 72 characters.' });
  }

  if (!department || !programOfStudy) {
    return res.status(400).json({ success: false, message: 'School and program of study are required.' });
  }

  if (!['student', 'tutor'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be student or tutor.' });
  }

  if (role === 'student' && !studentNumber) {
    return res.status(400).json({ success: false, message: 'Student number is required for student accounts.' });
  }

  if (pool) {
    try {
      const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'User already exists.' });
      }

      const passwordHash = await hashPassword(password);
      const result = await pool.query(
        `INSERT INTO users (name, email, password, role, department, program_of_study, student_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, email, passwordHash, role, department, programOfStudy, studentNumber || null]
      );

      return res.status(201).json(authResponse(result.rows[0]));
    } catch (error) {
      console.error('Database registration failed.', error.message);
      return res.status(503).json({ success: false, message: 'Account creation is temporarily unavailable.' });
    }
  }

  const alreadyExists = mockUsers.some((entry) => entry.email.toLowerCase() === email);

  if (alreadyExists) {
    return res.status(409).json({ success: false, message: 'User already exists.' });
  }

  const newUser = {
    id: mockUsers.length + 1,
    name,
    email,
    password: await hashPassword(password),
    role,
    department,
    programOfStudy,
    studentNumber
  };

  mockUsers.push(newUser);

  return res.status(201).json(authResponse(newUser));
});

app.get('/api/auth/profile', authenticate, async (req, res) => {
  if (pool) {
    try {
      const result = await pool.query(
        'SELECT id, name, email, role, department, program_of_study, student_number FROM users WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found.' });
      }
      return res.json({ success: true, data: normalizeUser(result.rows[0]) });
    } catch (error) {
      console.error('Profile lookup failed.', error.message);
      return res.status(503).json({ success: false, message: 'Unable to load your profile.' });
    }
  }

  const user = mockUsers.find((entry) => entry.id === Number(req.user.id));
  return res.json({ success: true, data: normalizeUser(user || mockUsers[0]) });
});

app.put('/api/auth/profile', authenticate, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const department = String(req.body.department || '').trim();
  const programOfStudy = String(req.body.programOfStudy || '').trim();
  const studentNumber = String(req.body.studentNumber || '').trim();

  if (!name || name.length > 255 || department.length > 255 || programOfStudy.length > 255 || studentNumber.length > 64) {
    return res.status(400).json({ success: false, message: 'Name, school, program of study, and student number must be within their allowed lengths.' });
  }

  if (pool) {
    try {
      const result = await pool.query(
        `UPDATE users SET name = $1, department = $2, program_of_study = $3, student_number = $4 WHERE id = $5 RETURNING id, name, email, role, department, program_of_study, student_number`,
        [name, department || null, programOfStudy || null, studentNumber || null, req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found.' });
      }
      return res.json({ success: true, data: normalizeUser(result.rows[0]) });
    } catch (error) {
      console.error('Profile update failed.', error.message);
      return res.status(503).json({ success: false, message: 'Unable to update your profile.' });
    }
  }

  const user = mockUsers.find((entry) => entry.id === Number(req.user.id));
  if (user) {
    user.name = name;
    user.department = department || user.department;
    user.programOfStudy = programOfStudy;
    user.studentNumber = studentNumber;
  }
  return res.json({ success: true, data: normalizeUser(user || mockUsers[0]) });
});

app.post('/api/groups', authenticate, async (req, res) => {
  const { name, courseCode, department, members = 1 } = req.body;
  const memberCount = Number(members);

  if (!name || !courseCode || !department || name.length > 255 || courseCode.length > 50 || department.length > 255 || !Number.isInteger(memberCount) || memberCount < 1) {
    return res.status(400).json({ success: false, message: 'Group name, course code, and department are required.' });
  }

  if (pool) {
    try {
      const result = await pool.query(
        `INSERT INTO study_groups (name, course_code, department, members_count, next_session)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, courseCode, department, memberCount, 'To be scheduled']
      );
      await pool.query(
        `INSERT INTO study_group_memberships (group_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [result.rows[0].id, req.user.id]
      );

      return res.status(201).json({ success: true, data: normalizeGroup(result.rows[0]) });
    } catch (error) {
      console.error('Database group creation failed.', error.message);
      return res.status(503).json({ success: false, message: 'Study group creation is temporarily unavailable.' });
    }
  }

  const newGroup = {
    id: mockGroups.length + 1,
    name,
    courseCode,
    department,
    members: memberCount,
    nextSession: 'To be scheduled'
  };

  mockGroups.unshift(newGroup);
  const memberships = mockGroupMemberships.get(String(req.user.id)) || new Set();
  memberships.add(newGroup.id);
  mockGroupMemberships.set(String(req.user.id), memberships);

  return res.status(201).json({ success: true, data: newGroup });
});

app.post('/api/groups/:groupId/join', authenticate, async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isInteger(groupId) || groupId < 1) {
    return res.status(400).json({ success: false, message: 'A valid study group is required.' });
  }

  if (pool) {
    try {
      const result = await pool.query(
        `INSERT INTO study_group_join_requests (group_id, user_id)
           SELECT groups.id, $2
           FROM study_groups AS groups
           WHERE groups.id = $1
             AND NOT EXISTS (
               SELECT 1 FROM study_group_memberships
               WHERE group_id = groups.id AND user_id = $2
             )
           ON CONFLICT (group_id, user_id) DO NOTHING
           RETURNING group_id
        `,
        [groupId, req.user.id]
      );

      if (result.rows.length > 0) {
        return res.status(202).json({
            success: true,
            data: { groupId: result.rows[0].group_id, status: 'pending' }
        });
      }

      const existingGroup = await pool.query(
        `SELECT id,
                  EXISTS (
                    SELECT 1 FROM study_group_memberships
                    WHERE group_id = study_groups.id AND user_id = $2
                  ) AS is_member,
                  EXISTS (
                    SELECT 1 FROM study_group_join_requests
                    WHERE group_id = study_groups.id AND user_id = $2 AND status = 'pending'
                  ) AS has_pending_request
           FROM study_groups
           WHERE id = $1`,
        [groupId, req.user.id]
      );
      if (existingGroup.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Study group not found.' });
      }
      const state = existingGroup.rows[0];
      if (state.is_member) {
        return res.status(409).json({ success: false, message: 'You are already a member of this study group.' });
      }
      return res.status(409).json({ success: false, message: 'Your request to join this study group is already pending.' });
    } catch (error) {
      console.error('Database group join request failed.', error.message);
      return res.status(503).json({ success: false, message: 'Unable to request to join this study group right now.' });
    }
  }

  const group = mockGroups.find((entry) => entry.id === groupId);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Study group not found.' });
  }

  const userId = String(req.user.id);
  const memberships = mockGroupMemberships.get(userId) || new Set();
  if (memberships.has(groupId)) {
    return res.status(409).json({ success: false, message: 'You are already a member of this study group.' });
  }
  const requests = mockGroupJoinRequests.get(userId) || new Set();
  if (requests.has(groupId)) {
    return res.status(409).json({ success: false, message: 'Your request to join this study group is already pending.' });
  }
  requests.add(groupId);
  mockGroupJoinRequests.set(userId, requests);

  return res.status(202).json({ success: true, data: { groupId, status: 'pending' } });
});

app.post('/api/messages', authenticate, async (req, res) => {
  const { receiver, content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length > 5000) {
    return res.status(400).json({ success: false, message: 'Message content is required and must be at most 5000 characters.' });
  }

  if (pool) {
    try {
      const result = await pool.query(
        `INSERT INTO messages (sender_user_id, receiver_user_id, sender_name, receiver_name, content)
         VALUES ($1, (SELECT id FROM users WHERE LOWER(name) = LOWER($2) LIMIT 1), $3, $2, $4)
         RETURNING *`,
        [req.user.id, receiver || 'Study group members', req.user.name, content.trim()]
      );

      return res.status(201).json({ success: true, data: normalizeMessage(result.rows[0]) });
    } catch (error) {
      console.error('Database message creation failed.', error.message);
      return res.status(503).json({ success: false, message: 'Message sending is temporarily unavailable.' });
    }
  }

  const newMessage = {
    id: mockMessages.length + 1,
    sender: req.user.name,
    receiver: receiver || 'Study group members',
    content: content.trim(),
    sentAt: new Date().toISOString()
  };

  mockMessages.push(newMessage);

  return res.status(201).json({ success: true, data: newMessage });
});

app.post('/api/sessions', authenticate, async (req, res) => {
  const { tutorId, courseCode, date, notes } = req.body;
  const numericTutorId = Number(tutorId);
  const sessionDate = new Date(date);

  if (!Number.isInteger(numericTutorId) || numericTutorId < 1 || !courseCode || Number.isNaN(sessionDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Choose a tutor, course code, and valid session date.' });
  }

  if (pool) {
    try {
      const result = await pool.query(
        `INSERT INTO sessions (student_user_id, tutor_id, student_name, course_code, session_date, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.id, numericTutorId, req.user.name, String(courseCode).trim(), sessionDate.toISOString(), 'confirmed', String(notes || '').slice(0, 5000)]
      );

      return res.status(201).json({ success: true, data: normalizeSession(result.rows[0]) });
    } catch (error) {
      console.error('Database session booking failed.', error.message);
      return res.status(503).json({ success: false, message: 'Session booking is temporarily unavailable.' });
    }
  }

  const newSession = {
    id: mockSessions.length + 1,
    tutorId: numericTutorId,
    studentName: req.user.name,
    courseCode,
    date: sessionDate.toISOString(),
    status: 'confirmed',
    notes: notes || '',
  };

  mockSessions.unshift(newSession);

  return res.status(201).json({ success: true, data: newSession });
});

const startServer = async () => {
  await ensureDatabaseReady();

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
};

startServer();
