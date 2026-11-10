CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidat',   -- candidat | recruteur | admin
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT,
  contract TEXT,
  description TEXT,
  recruiter_id INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES jobs(id),
  candidate_id INT REFERENCES users(id),
  cover_letter TEXT,
  cv_path TEXT,
  status TEXT NOT NULL DEFAULT 'Nouvelle',
  recruiter_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS recruiter_message TEXT;
