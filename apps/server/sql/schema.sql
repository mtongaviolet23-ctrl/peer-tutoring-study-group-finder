CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  department VARCHAR(255),
  program_of_study VARCHAR(255),
  student_number VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS tutors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  department VARCHAR(255) NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0,
  availability VARCHAR(255),
  bio TEXT
);

CREATE TABLE IF NOT EXISTS study_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  department VARCHAR(255) NOT NULL,
  members_count INTEGER DEFAULT 0,
  next_session VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS study_group_memberships (
  group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_group_join_requests (
  group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  student_user_id INTEGER REFERENCES users(id),
  tutor_id INTEGER REFERENCES tutors(id),
  student_name VARCHAR(255) NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  session_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_user_id INTEGER REFERENCES users(id),
  receiver_user_id INTEGER REFERENCES users(id),
  sender_name VARCHAR(255) NOT NULL,
  receiver_name VARCHAR(255),
  group_name VARCHAR(255),
  content TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  download_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS practice_quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  questions JSONB NOT NULL
);

ALTER TABLE tutors ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS student_user_id INTEGER REFERENCES users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_user_id INTEGER REFERENCES users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_user_id INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS program_of_study VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_number VARCHAR(64);
