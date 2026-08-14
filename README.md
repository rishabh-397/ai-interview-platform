# AI Interview Platform

A full-stack, AI-powered mock interview platform built to help candidates prepare for technical and behavioural interviews — with live code execution, real-time proctoring, voice-based interviews, adaptive difficulty, and a searchable question bank across 30+ real companies.

## ✨ Key Features

- **AI-scored mock interviews** with live Monaco code editor (5 languages), real code execution via Judge0, and custom stdin input
- **Voice interview mode** — questions are read aloud (Web Speech API); answer by speaking, with a live speech-pace (WPM) analyzer
- **Adaptive difficulty** — question difficulty adjusts in real time based on running performance
- **Selectable AI interviewer persona** — Friendly / Strict / Technical feedback tone
- **Proctoring suite** — tab-switch detection, copy-paste detection, webcam face/multiple-face detection (face-api.js), fullscreen enforcement, code similarity/plagiarism checking, session recording
- **Question Bank** — 30 real companies (with logos) and ~90 curated questions, filterable by company/category/difficulty, with a click-to-practice modal and an AI helper that debugs your code errors
- **Resume ↔ Job Description matcher** — PDF parsing, match score, missing-skills gap list, personalized study plan
- **Gamification** — XP, streaks, badges, skill-based leaderboards
- **Auth** — email/password with Brevo email verification, Google OAuth, forgot/reset password, per-user rate limiting
- **Admin tools** — analytics dashboard, live session monitor, audit log
- **Account controls** — GDPR-style data export, account deletion, API keys, webhooks (e.g. for ATS integrations)
- **Reliability & scale** — Node cluster mode + Socket.io Redis adapter (fixed a real bcrypt/event-loop bottleneck found via k6 load testing), Sentry error tracking, Jest unit tests, Playwright E2E tests, GitHub Actions CI

## 🛠 Tech Stack

**Frontend:** React (Vite), Monaco Editor, Recharts, react-datepicker, face-api.js
**Backend:** Node.js, Express, Socket.io, PostgreSQL, Redis
**AI/ML service:** Python, FastAPI (answer scoring, sentiment/confidence detection, resume matching)
**Infra:** Docker Compose, GitHub Actions CI, Sentry, Jest, Playwright, k6
**External APIs:** Groq (AI chatbot), Judge0 (code execution), Brevo (transactional email), Google OAuth

## 🏗 Architecture

```
                     ┌─────────────┐
                     │   Browser    │
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │   Frontend   │  React + Vite
                     │  (port 5173) │
                     └──────┬──────┘
                            │ REST + WebSocket
                     ┌──────▼──────┐
                     │   Backend    │  Express (clustered, 4 workers)
                     │  (port 5000) │
                     └──┬───┬───┬──┘
              ┌─────────┘   │   └─────────┐
       ┌──────▼─────┐ ┌─────▼─────┐ ┌─────▼──────┐
       │ PostgreSQL │ │   Redis    │ │ AI Service  │  FastAPI
       │            │ │(sessions,  │ │ (port 8000) │
       │            │ │pub/sub for │ │             │
       │            │ │ Socket.io) │ │             │
       └────────────┘ └────────────┘ └─────────────┘
```

## 🚀 Running Locally

**Prerequisites:** Docker Desktop

```bash
git clone https://github.com/rishabh-397/ai-interview-platform.git
cd ai-interview-platform
cp backend/.env.example backend/.env   # fill in your own API keys — see below
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- AI service: http://localhost:8000

### Required environment variables (`backend/.env`)
| Variable | Purpose | Where to get it |
|---|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Auth token signing | any random string |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Email verification/reminders | free at brevo.com |
| `GROQ_API_KEY` | AI chatbot | free at console.groq.com |
| `GOOGLE_CLIENT_ID` | Google OAuth login | console.cloud.google.com |
| `SENTRY_DSN` | Error tracking (optional) | free at sentry.io |
| `SLACK_WEBHOOK_URL` | Admin alerts (optional) | Slack app incoming webhook |

## 🧪 Testing

```bash
# Backend unit tests
docker exec -it ai-interview-platform-backend-1 npm test

# E2E tests (from host machine)
cd e2e-tests && npm install && npx playwright install && npm test

# Load test
cd load-tests && k6 run load-test.js
```

## 📈 What I learned building this

- Diagnosed and fixed a real concurrency bottleneck: k6 load testing revealed login latency spiking to a **2.36s p95** under 50 concurrent users due to bcrypt blocking Node's single-threaded event loop — fixed with **Node cluster mode** (4 worker processes) and a **Socket.io Redis adapter** to keep real-time features (proctoring alerts, live typing, code sync) working correctly across processes
- Built a multi-service Docker Compose architecture (5 services) with proper environment-based configuration
- Implemented defense-in-depth for a proctored exam experience: multiple independent signals (visibility API, fullscreen API, webcam ML inference, code-paste detection) rather than relying on any single check
- Practiced graceful degradation — every external API call (AI service, code execution, email) has a fallback path so one dependency going down doesn't break the whole app

## 📄 License
MIT