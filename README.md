# Four Us — Private Two-Player Daily Competition

**Four Us** is a responsive, mobile-first two-player web game designed for couples and pairs. Over ten consecutive 24-hour rounds, both players tackle the same four daily challenges asynchronously. Results, points, and comparisons remain securely hidden until each 24-hour boundary closes.

---

## 🎮 The Four Daily Games

1. **Five Letter (Word Deduction)**: 6 attempts to deduce a secret 5-letter word with standard color tiles (green, yellow, gray). Server-timed from player tap.
2. **Mini Sudoku**: 6×6 Sudoku grid (2×3 subgrids, digits 1–6) with a 5-minute timer. Incorrect checks add a 15-second penalty.
3. **Word Grid**: 4×4 connected-letter board (horizontal, vertical, diagonal). Reach 10 word points within a 2-minute limit.
4. **Know Me**: 4-option personality question where each player chooses their own answer, then predicts their partner's answer. Both players can independently earn points!

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Mobile-first CSS system optimized for 360px–430px portrait viewports
- **Backend**: Firebase Cloud Firestore + Firebase Anonymous Authentication + Cloud Functions
- **Hosting**: Netlify (Frontend) + Firebase (Cloud Functions)
- **Dictionaries**: Embedded offline English word list & valid path solver

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18 or newer)
- npm

### 2. Install Dependencies
```bash
cd four-us
npm install
```

### 3. Setup Firebase
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. In **Authentication** → **Sign-in method**, enable **Anonymous**.
3. In **Firestore Database**, create a database in production mode.
4. Apply the security rules located in `firestore.rules`.
5. In **Project Settings** → **General** → **Your apps**, create a Web App and copy your config values into `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_USE_EMULATORS=false
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your mobile browser or browser mobile device preview.

---

## 🧪 Running Automated Tests

Run the unit test suite verifying scoring rules, tiebreakers, and edge cases:
```bash
npx vitest run
```

---

## 🌐 Deploying the Game

### Deploying the Frontend to Netlify

1. **Option A: Netlify Git Integration (Recommended)**
   - Push this repository to GitHub or GitLab.
   - In Netlify, click **"Add new site"** → **"Import an existing project"**.
   - Set Build command to `npm run build`.
   - Set Publish directory to `dist`.
   - Under **Site settings** → **Environment variables**, add all `VITE_FIREBASE_*` variables from your `.env`.
   - Click **Deploy Site**. `netlify.toml` will automatically handle SPA routing redirects.

2. **Option B: Netlify CLI**
   ```bash
   npm run build
   npx netlify-cli deploy --prod --dir=dist
   ```

### Deploying Firebase Cloud Functions (Optional / Scheduled Rollover)

1. Upgrade your Firebase project to the **Blaze (Pay as you go) plan** (free tier covers 2 million invocations/month).
2. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use your_project_id
   ```
3. Deploy Firestore rules and Cloud Functions:
   ```bash
   firebase deploy --only firestore:rules,functions
   ```

> **Note:** The client frontend also features an automatic idempotent fallback finalizer: when either player opens the app after a day boundary expires, it automatically executes the transactional finalization logic safely in Firestore without duplicating points.

---

## 📝 Customizing Game Content

All daily puzzles and prompts are separated from visual UI components:
- **Five Letter answers**: `src/lib/wordList.ts` (`ANSWER_WORDS` array)
- **Mini Sudoku boards**: `src/lib/sudokuGenerator.ts`
- **Word Grid boards**: `src/lib/wordGridGenerator.ts` (`DAILY_BOARDS` array)
- **Know Me questions**: `src/content/knowMePrompts.ts` (`KNOW_ME_PROMPTS` array)

---

## 🔒 Security & Privacy Guarantees

- **Authoritative Server Timers**: All round boundaries and elapsed timers reference server timestamps.
- **Hidden Results**: During an active day, public statuses only report `Attempted: true/false`. Word choices, Sudoku progress, elapsed times, and points are never transmitted to the partner's device until the day is finalized.
- **Two-Player Lock**: Room membership is strictly capped at two players. Additional join requests are rejected.
- **Idempotency**: Repeated finalization calls will never duplicate points.
