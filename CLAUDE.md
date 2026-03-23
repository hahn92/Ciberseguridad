# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static Spanish-language cybersecurity news aggregator hosted at `thesecurebytenews.hahndev.com` via GitHub Pages. No build system — pure HTML/CSS/vanilla JS.

## Running Locally

Open `index.html` directly in a browser, or use any static file server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Architecture

Three files form the entire application:
- `index.html` — Structure and semantic markup
- `style.css` — Theming via CSS custom properties (dark/light), responsive layout
- `script.js` — All client-side logic

### Data Layer

News articles live in `data/YYYYMMDD.json`. Each file is an array of article objects:

```json
{
  "source": { "id": null, "name": "Source Name" },
  "author": "Author",
  "title": "Title",
  "description": "Short description",
  "url": "https://...",
  "urlToImage": "https://...",
  "publishedAt": "2026-02-01T20:08:00Z",
  "content": "Full content"
}
```

Adding news for a new day = creating a new `data/YYYYMMDD.json` file with this structure.

### Navigation and Routing

- URL supports `?fecha=YYYYMMDD` query param and `/YYYYMMDD` path-based routing
- If a requested date has no data, JS searches up to 30 days back as fallback
- Client-side navigation uses `history.replaceState()`

### Theming

CSS variables defined on `:root` and `[data-theme="dark"]` drive the entire color system. Theme preference is persisted in `localStorage` with system `prefers-color-scheme` as default.

### Filtering

Real-time search filters across title, description, content, and source. A dynamic source dropdown is built from the loaded day's articles.
