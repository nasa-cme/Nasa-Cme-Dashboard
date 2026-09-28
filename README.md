<p align="center">
  Browser-based dashboard that fetches, analyzes and visualizes Coronal Mass Ejection (CME) events from NASA's DONKI API, with real-time velocity profiling and interactive event tracking.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-completed-brightgreen" alt="Status">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js">
  <img src="https://img.shields.io/badge/NASA%20DONKI-0B3D91?style=for-the-badge&logo=nasa&logoColor=white" alt="NASA DONKI API">
  <img src="https://img.shields.io/badge/GitHub%20Pages-121013?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Pages">
</p>

<p align="center">
  <b>Click the buttons below to open the project:</b>
</p>

<p align="center">
  <a href="https://SN-2026-GRUPO-03-NASA.github.io/DONKI-CME/">
    <img src="https://img.shields.io/badge/GitHub%20Pages-Live-blue?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/SN-2026-GRUPO-03-NASA/DONKI-CME">
    <img src="https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge" alt="GitHub Repository">
  </a>
</p>

---

# Table of Contents

- [About](#about)
- [Screenshots](#screenshots)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributors](#contributors)
- [License](#license)

---

# About

CME Watch is a browser-based dashboard for exploring space weather data from NASA's DONKI (Database Of Notifications, Knowledge, Information) API. It fetches Coronal Mass Ejection events for any user-defined date range, calculates statistics such as average velocity and Earth-directed count, and renders an interactive velocity profile chart alongside a sortable event log.

The application uses a data pipeline architecture: NASA DONKI API → GitHub Actions → Supabase → GitHub Pages.

---

# Screenshots

## Dashboard

<p align="center">
  <!-- Add screenshot here -->
</p>

## Velocity Profile & Event Log

<p align="center">
  <!-- Add screenshot here -->
</p>

---

# Features

- NASA DONKI API integration with configurable date range
- Quick range presets (7D / 30D / 90D / 1A)
- Stats cards: events detected, average velocity, fastest event, Earth-directed count
- Velocity profile chart with threshold line (Chart.js)
- Event log sortable by date or velocity
- Event detail modal with full CME metadata
- Status LED and live clock
- Error/alert bar with HTTP status feedback
- CRT visual effects (scanlines + noise overlay)
- Data persistence via Supabase
- Automated data updates via GitHub Actions

---

# Technology Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 |
| Logic | JavaScript (Vanilla) |
| Charts | Chart.js |
| Fonts | Google Fonts (Michroma + JetBrains Mono) |
| Data Source | NASA DONKI API |
| Database | Supabase (PostgreSQL) |
| Backend | GitHub Actions (Python) |
| Deployment | GitHub Pages |
| Version Control | Git & GitHub |

---

# Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   NASA DONKI    │────▶│  GitHub Actions  │────▶│    Supabase     │────▶│  GitHub Pages   │
│      API        │     │  (Python Script) │     │   (PostgreSQL)  │     │  (Static Site)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │                        │
        │                        │                        │                        │
   CME Events              Batch Upsert            cme_events              Browser
   (JSON)                  (50 records)            execucoes               Dashboard
```

---

# Project Structure

```text
DONKI-CME/
│
├── index.html              # Application shell, component markup and modal
├── style.css               # Global styles, CRT effects, layout
├── script.js               # Supabase integration, chart rendering, event log logic
├── scripts/
│   └── fetch_nasa.py       # Pipeline de coleta de dados (GitHub Actions)
├── sql/
│   └── setup.sql           # Setup inicial do banco de dados Supabase
├── supabase/
│   └── migrations/
│       └── 001_create_tables.sql  # Migração inicial das tabelas
├── docs/
│   ├── ai-interaction.md   # Registro de interações com IA
│   └── reflexao.md         # Reflexões do grupo
├── .github/
│   └── workflows/
│       └── update-data.yml # Workflow de atualização automatizada
└── README.md
```

---

# Getting Started

## Prerequisites

- A modern browser (Chrome, Firefox, Edge, Safari)
- Node.js (optional, for local server)
- Python 3.11+ (for running the pipeline locally)

## Installation

```bash
git clone https://github.com/SN-2026-GRUPO-03-NASA/DONKI-CME.git
cd DONKI-CME
```

Open `index.html` in a browser, or use a local server:

```bash
# Node.js
npx serve .

# Python
python -m http.server 8000
```

---

# Configuration

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and execute the contents of `sql/setup.sql`
3. Note your project URL and keys from **Settings → API**

## 2. GitHub Secrets

Add the following secrets to your repository (Settings → Secrets and variables → Actions):

| Name | Description |
|------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `NASA_API_KEY` | Your NASA API key (optional, defaults to DEMO_KEY) |

## 3. Frontend Configuration

Edit `script.js` and update the Supabase configuration:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

## 4. GitHub Pages

1. Go to **Settings → Pages**
2. Select **Source: Deploy from a branch**
3. Choose **main** branch and **/ (root)** folder
4. Click **Save**

---

# Deployment

Deployed on **GitHub Pages**. Any push to `main` is reflected immediately.

```
https://SN-2026-GRUPO-03-NASA.github.io/DONKI-CME/
```

---

# Documentation

- [AI Interaction Log](docs/ai-interaction.md) - Registro de interações com IA
- [Reflexão do Grupo](docs/reflexao.md) - Reflexões sobre o desenvolvimento

## Pendentes

- `docs/tutorial.pdf` - Tutorial em PDF (a ser produzido)
- `docs/apresentacao.pdf` - Apresentação em PDF (a ser produzido)

---

# Known Limitations

- `DEMO_KEY` is rate-limited (~30 req/hour per IP) and may return HTTP 403 under heavy use. Registering a personal key at [api.nasa.gov](https://api.nasa.gov) resolves this.
- DONKI events are typically published hours after detection, not in real time.
- Data is updated daily via GitHub Actions cron schedule (06:00 UTC).

---

# Contributors

| Name | GitHub |
|---|---|
| Murilo de Souza Cândido | [@murilotecoteco](https://github.com/murilotecoteco) |

---

# License

This project is licensed under the MIT License.
