# Maths Challenge

Maths Challenge is a browser-based math learning project with multiple practice modes, a weekly progression system, and an arcade-style game mode.

## Features

- **Main Play Menu** with Quiz and Math Runner (arcade) modes
- **Operation Practice Pages**
  - Addition
  - Subtraction
  - Multiplication (custom table selection)
  - Division (custom table selection)
  - Mixed Practice (Easy / Medium / Hard)
- **Weekly Challenge** with daily progress limits and weekly completion tracking
- **Result View** with per-question feedback and certificate preview/export options
- **Timed Mode** for multiplication and division (20 questions, 20 seconds per question)

## Getting Started

1. Open [index.html](index.html) in your browser.
2. Choose a mode from the main menu and start practicing.

> If you do not see the latest changes immediately, perform a hard refresh because service worker cache may still be active.

## Project Structure

- [index.html](index.html) – Main menu
- [game.html](game.html) – Quiz / arcade selection page
- [play.html](play.html) – Quiz gameplay and result screen
- [weekly.html](weekly.html) – Weekly challenge page
- [game.js](game.js) – Core quiz logic and result/certificate handling
- [arcade.js](arcade.js) – Math Runner (arcade) gameplay logic
- [weekly.js](weekly.js) – Weekly challenge flow and progression
- [style.css](style.css) – Global styles
- [sw.js](sw.js), [sw-register.js](sw-register.js) – Service worker caching

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript

## Author

**Anasztázia Karalyos-Kecskés**
