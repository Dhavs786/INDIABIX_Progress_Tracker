# BIXTracker - IndiaBIX Interactive Companion

BIXTracker is a high-end, responsive companion dashboard designed for practicing Quantitative Aptitude, Logical Reasoning, Verbal Ability, Technical Programming, GK, and Engineering questions on the official **IndiaBIX** website. 

It keeps track of solved questions, computes progress metrics, catalogs custom notes, manages active study session stopwatches, and provides direct resuming features.

---

## 🚀 Key Features

- **Standard IndiaBIX Syllabus Preloaded**: Comes preloaded with all core categories and topics (Arithmetic, Data Interpretation, Logical Reasoning, Verbal Ability, C/C++/Java/Python, core Engineering branches, and General Knowledge).
- **Direct Link Generator**: One-click navigation to IndiaBIX official topics and discussion pages corresponding to the active question.
- **Accurate Statistics & Analytics**: Instant computations for completion rates, correct vs. incorrect accuracy charts, and active stopwatch timing.
- **Interactive Question Matrix Grid**: Dynamically filters questions by status (All, Correct, Incorrect, Bookmark, In Progress, Unsolved).
- **Study Stopwatch**: Integrated timer to track how long you spend solving each question (automatically saves time metrics upon saving status).
- **Rich Notepad Scratchpad**: Save equations, shortcuts, or key steps for questions. Includes quick templates for Formulas, Mistakes, and Shortcut notes.
- **Backup & Restore**: Easily download progress as a JSON file to transfer across machines or secure against browser cache clearing.
- **Modern Premium Design**: Dark-themed glassmorphism interface built using React, Vite, and Tailwind CSS.

---

## 🛠️ Getting Started

### 1. Run Development Server
To launch the companion app locally, run the following commands:
```powershell
# Start the Vite local development server
npm run dev
```

### 2. View in Browser
Open the local development link (typically `http://localhost:5173`) in your web browser. 

---

## 📂 Project Architecture

- `src/data/syllabus.js`: Complete preset database of IndiaBIX categories, topics, question counts, and URL mappings.
- `src/App.jsx`: Full React UI, dashboard layouts, timer mechanics, notepad sync, local storage, search filter algorithms, and export-import routines.
- `src/index.css`: Tailwind entry point.
- `index.html`: Main page load loading Outfit and Plus Jakarta Sans Google fonts.
