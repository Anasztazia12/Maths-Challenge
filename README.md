# Maths Challenge 

Maths Challenge – A Fun Practice App for Kids
Maths Challenge is a simple, child‑friendly web app designed to help primary school students practise essential arithmetic skills. It focuses on the four core operations — addition, subtraction, multiplication, and division — and offers multiple difficulty levels so children can learn at their own pace.
The app was originally created for my own child, who needed a fun and motivating way to prepare for the Year 4 multiplication tables check (MTC). After seeing how much it helped, several classmates also started using it, which inspired me to improve and publish it.

### Purpose of the App 🎯

Many children struggle with:

- slow recall of multiplication facts
- difficulty staying focused during practice
- anxiety around timed tests
- lack of engaging tools for daily revision

Maths Challenge solves these problems by providing:

- short, repeatable practice sessions
- instant feedback
- optional timed challenges
- a clean, distraction‑free interface
- difficulty levels that grow with the child
The goal is to make maths practice simple, fun, and confidence‑building.

### Key Features ✨

✔ Six operation types

- Addition
- Subtraction
- Multiplication
- Division
- Mixed practise
- Weekly Challenge

✔ Difficulty levels
Children can choose from multiple difficulty settings, allowing them to progress gradually.

✔ Multiplication practice modes
Two modes are available:

- Input mode – the child types the answer
- Timed mode – 6‑second or 12‑second challenges to simulate the Year 4 MTC environment
This helps them build both accuracy and speed.

✔ Clean, child‑friendly UI
Designed to be simple enough for young learners to use independently.

✔ Motivating and repeatable
Short sessions encourage daily practice without overwhelming the child.

### Who is it for? 👦

- Primary school children (especially Year 3–4)
- Students preparing for the Year 4 Multiplication Tables Check
- Kids who need extra practice with basic arithmetic
- Parents and teachers looking for a simple, free practice tool

### Why this app is useful 💡

- Helps build confidence in maths
- Supports school curriculum expectations
- Encourages independent practice
- Reduces test anxiety by simulating real timed conditions
- Works on any device (phone, tablet, laptop)

### Tech Stack 🛠️

- HTML, CSS, JavaScript
- Firebase (optional, if you use login or progress tracking)
- GitHub Pages for hosting

### Motivation 📌

This project started as a personal tool for my own child, but it quickly proved useful for other children as well. It shows how a simple idea can solve a real problem and help kids learn in a fun, stress‑free way.

**Current Version:** v1.0.0

## 1. Scope

Maths Challenge is a browser-based math learning and practice project for children, featuring multiple practice modes, a weekly progression system, and an arcade-style game mode. The main goal is to provide fun and effective practice for the four basic operations (addition, subtraction, multiplication, division), with both structured and game-based learning experiences.

## 2. Main Features

- **Main Play Menu**: Choose between Quiz and Math Runner (arcade) modes, or practice individual operations.
- **Operation Practice Pages**:
- Addition
- Subtraction
- Multiplication (with custom table selection)
- Division (with custom table selection)
- Mixed Practice (Easy / Medium / Hard)
- **Weekly Challenge**: Complete 2 tasks per day, 10 total per week, with daily progress limits and weekly completion tracking. Earn a trophy for finishing the week.
- **Result View**: Get per-question feedback, see your results, and preview/export a certificate.
- **Timed Mode**: For multiplication and division, answer 20 questions with a 20-second time limit per question.
- **Arcade Mode (Math Runner)**: Platformer-style game where you solve math problems by collecting the right items, with points, lives, combos, and increasing difficulty.
- **Progress Saving**: Weekly progress and results are saved in the browser (localStorage).
- **Service Worker**: Offline support and fast loading via caching.

## 3. Technology

- HTML, CSS, Vanilla JavaScript (no frameworks required)
- Service Worker for offline support and caching
- Responsive design for desktop and mobile browsers

## 4. Project Structure

- **index.html** – Main menu
- **game.html** – Quiz / arcade selection page
- **play.html** – Quiz gameplay and result screen
- **weekly.html** – Weekly challenge page
- **addition.html, subtraction.html, multiplication.html, division.html, mixed.html** – Individual operation practice pages
- **game.js** – Core quiz logic, result/certificate handling
- **arcade.js** – Math Runner (arcade) gameplay logic
- **weekly.js** – Weekly challenge flow and progression
- **assets/css/style.css** – Global styles
- **sw.js, sw-register.js** – Service worker caching and registration
- **Assets**: Images in **assets/image/** (e.g., pophunters.webp, background images), audio (correct.mp3, wrong.mp3)

## 5. Usage

1. Open **index.html** in your browser.
2. Choose a mode from the main menu: play a quiz, try Math Runner, or practice a specific operation.
3. For the Weekly Challenge, complete up to 2 tasks per day to reach 10 for the week and earn a trophy.
4. Review your results and export a certificate if desired.

> **Note:** The service worker now fetches updated HTML, JS, and CSS directly, so the latest changes should appear without a hard refresh.

## 5.1 Screenshots

<!-- markdownlint-disable MD033 -->
<p align="center">
    <img src="assets/image/screenshot1.png" alt="Maths Challenge home screen" width="48%" />
    <img src="assets/image/screenshot2.png" alt="Maths Challenge gameplay screen" width="48%" />
</p>
<!-- markdownlint-enable MD033 -->

## 6. Firebase Auth + Cloud Save Setup

This project can register/login users and save quiz results per user (UID based).

1. For local development, copy `firebase.local.example.js` to `firebase.local.js`.
2. Open `firebase.local.js` and replace all `REPLACE_WITH_...` values with your Firebase project config.
3. For GitHub Pages, add a repository secret named `FIREBASE_WEB_CONFIG_JSON` with your Firebase web config JSON.
4. The workflow `.github/workflows/deploy-pages.yml` generates `firebase.public.js` during deploy, so secrets are not stored in the repository.
5. In Firebase Console -> Authentication -> Sign-in method, enable `Email/Password`.
6. In Firebase Console -> Authentication -> Settings -> Authorized domains, add:
   - your GitHub Pages domain (`yourname.github.io`)
   - `localhost` for local testing
7. `firebase.local.js` and generated `firebase.public.js` are ignored by git.
8. In Firebase Console -> Firestore Database -> Rules, use:

`FIREBASE_WEB_CONFIG_JSON` example value:

```json
{"apiKey":"AIza...","authDomain":"your-project.firebaseapp.com","projectId":"your-project","storageBucket":"your-project.appspot.com","messagingSenderId":"1234567890","appId":"1:1234567890:web:abc123","measurementId":"G-XXXXXXX"}
```

Do not put service account keys into this secret. This must be the client-side Firebase web config only.

```text
rules_version = '2';
service cloud.firestore {
    match /databases/{database}/documents {
        match /users/{userId}/{document=**} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
        }
    }
}
```

Data structure used by the app:

- `users/{uid}/profile/main` for profile/login metadata
- `users/{uid}/profiles/{profileId}/quizResults/{autoId}` for profile-specific quiz summaries

## 7. Email Code (OTP) Login Backend Contract

Frontend UI now includes email-code login, but it requires backend endpoints to send and verify OTP.

Required endpoints:

- `POST /api/auth/send-login-code`
- body: `{ "email": "user@example.com" }`
- response: `{ "ok": true, "message": "Code sent" }`

- `POST /api/auth/verify-login-code`
- body: `{ "email": "user@example.com", "code": "123456" }`
- response: `{ "ok": true, "customToken": "<firebase-custom-token>" }`

The `customToken` must be generated on the server with Firebase Admin SDK and is consumed by `signInWithCustomToken` on the client.

If these endpoints are not available, the app shows a clear status error and falls back to normal email/password or Firebase password reset email.

---

**Developer:** Anasztázia Karalyos-Kecskés
