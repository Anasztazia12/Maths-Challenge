# Maths Challenge – Project Plan

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

> **Note:** If you do not see the latest changes immediately, perform a hard refresh (Ctrl+F5) because the service worker cache may still be active.

---

**Developer:** Anasztázia Karalyos-Kecskés
