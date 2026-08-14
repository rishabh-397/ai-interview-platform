-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'candidate', -- candidate, admin, recruiter
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  xp INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Companies (for company-wise interview prep)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT
);

-- Question bank
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  category VARCHAR(50), -- DSA, System Design, HR, Behavioural
  difficulty VARCHAR(20), -- easy, medium, hard
  question_text TEXT NOT NULL,
  expected_keywords TEXT[], -- for keyword-based scoring
  created_at TIMESTAMP DEFAULT NOW()
);

-- Interview sessions
CREATE TABLE IF NOT EXISTS interview_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id),
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
  overall_score DECIMAL(5,2),
  communication_score DECIMAL(5,2),
  technical_score DECIMAL(5,2),
  confidence_score DECIMAL(5,2),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Individual answers within a session
CREATE TABLE IF NOT EXISTS session_answers (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  answer_text TEXT,
  code_submission TEXT,
  audio_url TEXT,
  ai_feedback TEXT,
  ai_score DECIMAL(5,2),
  filler_word_count INTEGER DEFAULT 0,
  answered_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard is derived from interview_sessions but this table can cache ranks
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50), -- overall, dsa, system_design, hr, company:<id>
  rank INTEGER,
  score DECIMAL(6,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_session ON session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_category ON leaderboard_cache(category);

-- Badges earned by users
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_code VARCHAR(50) NOT NULL, -- e.g. 'first_interview', 'streak_5', 'top_10_percent'
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_code)
);

-- Self-scheduled practice interview reminders
CREATE TABLE IF NOT EXISTS scheduled_interviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id),
  scheduled_at TIMESTAMP NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);


-- Question Bank: tracks which questions a user has marked solved (independent of interview sessions)
CREATE TABLE IF NOT EXISTS question_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  solved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);