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
  <a href="https://nasa-cme.github.io/Nasa-Cme-Dashboard/">
    <img src="https://img.shields.io/badge/GitHub%20Pages-Live-blue?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/nasa-cme/Nasa-Cme-Dashboard">
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
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Contributors](#contributors)
- [License](#license)

---

# About

CME Watch is a browser-based dashboard for exploring space weather data from NASA's DONKI (Database Of Notifications, Knowledge, Information) API. It fetches Coronal Mass Ejection events for any user-defined date range, calculates statistics such as average velocity and Earth-directed count, and renders an interactive velocity profile chart alongside a sortable event log.

The entire application runs client-side with no build step — just HTML, CSS and JavaScript — deployed on GitHub Pages.

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
- Custom API key support — falls back to `DEMO_KEY`
- Stats cards: events detected, average velocity, fastest event, Earth-directed count
- Velocity profile chart with threshold line (Chart.js)
- Event log sortable by date or velocity
- Event detail modal with full CME metadata
- Status LED and live clock
- Error/alert bar with HTTP status feedback
- CRT visual effects (scanlines + noise overlay)

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
| Deployment | GitHub Pages |
| Version Control | Git & GitHub |

---

# Architecture

```text
User (Browser)
      │
      ▼
GitHub Pages CDN
      │
      ▼
HTML / CSS / JavaScript
      │
      ▼
NASA DONKI REST API
(api.nasa.gov/DONKI/CME)
      │
      ▼
Client-side processing
(filter, sort, deduplicate)
      │
      ▼
Chart.js velocity chart
+ DOM event list
+ stats cards
```

---

# Project Structure

```text
Nasa-Cme-Dashboard/
│
├── index.html    # Application shell, component markup and modal
├── style.css     # Global styles, CRT effects, layout
├── script.js     # API integration, chart rendering, event log logic
└── README.md
```

---

# Getting Started

## Prerequisites

- A modern browser (Chrome, Firefox, Edge, Safari)

## Installation

```bash
git clone https://github.com/nasa-cme/Nasa-Cme-Dashboard.git
cd Nasa-Cme-Dashboard
```

Open `index.html` in a browser, or use a local server:

```bash
# Node.js
npx serve .

# Python
python -m http.server 8000
```

## NASA API Key

The dashboard defaults to `DEMO_KEY`, which is rate-limited to approximately 30 requests per hour per IP. For unrestricted use, register a free key at [api.nasa.gov](https://api.nasa.gov) and enter it in the **NASA API KEY** field.

---

# Deployment

Deployed on **GitHub Pages**. Any push to `main` is reflected immediately.

```
https://nasa-cme.github.io/Nasa-Cme-Dashboard/
```

---

# Known Limitations

- `DEMO_KEY` is rate-limited (~30 req/hour per IP) and may return HTTP 403 under heavy use. Registering a personal key at [api.nasa.gov](https://api.nasa.gov) resolves this.
- DONKI events are typically published hours after detection, not in real time.
- No data persistence — results are lost on page reload.

---

# Contributors

| Name | GitHub |
|---|---|
| Murilo de Souza Cândido | [@murilotecoteco](https://github.com/murilotecoteco) |



