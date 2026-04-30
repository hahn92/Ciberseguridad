// ══════════════════════════════════════════════════════════════
//  SecureByte News · v2 — client logic
// ══════════════════════════════════════════════════════════════

/* ---- THEME (init early to prevent FOUC) ---- */
(function () {
  const root  = document.documentElement;
  try {
    var stored = localStorage.getItem('sbn-theme');
  } catch (e) { stored = null; }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = stored || (prefersLight ? 'light' : 'dark');
  if (initial === 'light') root.classList.add('light');

  document.addEventListener('DOMContentLoaded', () => {
    const btn  = document.getElementById('toggle-theme-btn');
    const icon = document.getElementById('theme-icon');
    const icons = {
      sun:  `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
      moon: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    };
    function paint() { icon.innerHTML = root.classList.contains('light') ? icons.moon : icons.sun; }
    paint();
    btn.addEventListener('click', () => {
      root.classList.toggle('light');
      try {
        localStorage.setItem('sbn-theme', root.classList.contains('light') ? 'light' : 'dark');
      } catch (e) {}
      paint();
    });
  });
}());

/* ---- UTC clock ticker ---- */
(function () {
  function tick() {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2,'0');
    const mm = String(d.getUTCMinutes()).padStart(2,'0');
    const ss = String(d.getUTCSeconds()).padStart(2,'0');
    const el = document.getElementById('t-clock');
    if (el) el.textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}());


/* ══════════════════════════════════════════════════════════════
   APP
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  const newsContainer = document.getElementById('news-container');
  const prevBtn       = document.getElementById('prev-day-btn');
  const nextBtn       = document.getElementById('next-day-btn');
  const dateDisplay   = document.getElementById('current-date-display');
  const feedCount     = document.getElementById('feed-count');
  const feedFilterInfo= document.getElementById('feed-filter-info');
  const searchInput   = document.getElementById('search-input');
  const sourceFilter  = document.getElementById('source-filter');
  const sortSelect    = document.getElementById('sort-select');
  const sourceListEl  = document.getElementById('source-list');
  const backToTop     = document.getElementById('back-to-top');

  const mTotal   = document.getElementById('m-total');
  const mSources = document.getElementById('m-sources');
  const mAuthors = document.getElementById('m-authors');
  const mImgs    = document.getElementById('m-imgs');
  const mIssue   = document.getElementById('m-issue');
  const mDate    = document.getElementById('m-date');
  const tFeed    = document.getElementById('t-feed');
  const tSrc     = document.getElementById('t-src');
  const tEdition = document.getElementById('t-edition');
  const tLatest  = document.getElementById('t-latest');
  const sourcesCount = document.getElementById('sources-count');
  const metricId  = document.getElementById('metric-id');
  const hourlyBars = document.getElementById('hourly-bars');
  const hourlyTotal = document.getElementById('hourly-total');
  const peakTag    = document.getElementById('peak-tag');
  const vtList = document.getElementById('vt-list');
  const vtGrid = document.getElementById('vt-grid');

  let allArticles = [];
  let currentDate = getDateFromUrl();
  let currentView;
  try { currentView = localStorage.getItem('sbn-view') || 'list'; }
  catch (e) { currentView = 'list'; }
  const today = new Date();

  // Compute a stable base URL for fetching data, regardless of any /YYYYMMDD
  // suffix present in the current location. This prevents 404s when the URL
  // has been rewritten via history.replaceState to look like a "directory".
  const dataBase = (() => {
    const path = window.location.pathname
      .replace(/\/\d{8}\/?$/, '/')
      .replace(/\/[^/]*\.html?\/?$/, '/');
    const dir  = path.endsWith('/') ? path : path.replace(/[^/]*$/, '');
    return new URL(dir, window.location.origin).href;
  })();
  function dataUrl(ds) { return new URL(`data/${ds}.json`, dataBase).href; }

  /* ─── date utils ─── */
  function getDateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    let p = params.get('fecha');
    if (!p) {
      const m = window.location.pathname.match(/\/(\d{8})(?:\/)?$/);
      if (m) p = m[1];
    }
    if (p && /^\d{8}$/.test(p)) {
      return new Date(+p.slice(0,4), +p.slice(4,6)-1, +p.slice(6,8));
    }
    return new Date();
  }
  function fmtDate(d) {
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  }
  function isTodayOrLater(d) {
    const a = new Date(d); a.setHours(0,0,0,0);
    const b = new Date(today); b.setHours(0,0,0,0);
    return a >= b;
  }
  function dispDate(d) {
    return d.toLocaleDateString('es-ES', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  }
  function dispShort(d) {
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  }
  function updateUrl(d) {
    const ds = fmtDate(d);
    const parts = window.location.pathname.split('/');
    if (/^\d{8}$/.test(parts[parts.length-1])) parts.pop();
    const base = parts.join('/').replace(/\/$/, '') + '/';
    window.history.replaceState({}, '', `${base}${ds}`);
  }

  /* ─── article utils ─── */
  function getSource(a) {
    if (!a.source) return '';
    return (typeof a.source === 'object' ? a.source.name : a.source) || '';
  }
  function cleanContent(t) {
    if (!t) return '';
    return t.replace(/\s*\[?\+?\d[\d\s]*chars?\]?\s*$/i, '').trim();
  }
  function relTime(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    const diff = Date.now() - d;
    const h = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (h < 1)  return '<1h';
    if (h < 24) return `${h}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
  }
  function exactTime(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}Z`;
  }

  // Hash-based muted color for source badge — no fake severity
  function srcAccent(s) {
    let h = 0; for (let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
  }

  /* ─── skeleton ─── */
  function showSkeleton(n = 6) {
    const tpl = `
      <div class="skel-card">
        <div class="skel skel-id"></div>
        <div>
          <div class="skel skel-meta"></div>
          <div class="skel skel-title"></div>
          <div class="skel skel-desc"></div>
          <div class="skel skel-desc-2"></div>
        </div>
        <div class="skel skel-thumb"></div>
      </div>`;
    newsContainer.innerHTML = Array.from({length:n}, () => tpl).join('');
  }

  /* ─── view mode ─── */
  function applyView() {
    newsContainer.classList.toggle('grid', currentView === 'grid');
    vtList.classList.toggle('active', currentView === 'list');
    vtGrid.classList.toggle('active', currentView === 'grid');
  }
  vtList.addEventListener('click', () => { currentView='list'; try { localStorage.setItem('sbn-view','list'); } catch (e) {} applyView(); });
  vtGrid.addEventListener('click', () => { currentView='grid'; try { localStorage.setItem('sbn-view','grid'); } catch (e) {} applyView(); });

  /* ─── render ─── */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderNews(articles, dateForId) {
    newsContainer.innerHTML = '';
    if (!articles || articles.length === 0) {
      newsContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <strong>NO_RESULTS</strong>
          <small>// ajusta los filtros o la búsqueda</small>
        </div>`;
      return;
    }

    const idDate = dateForId ? fmtDate(dateForId) : 'XXXXXXXX';
    const frag = document.createDocumentFragment();

    articles.forEach((a, idx) => {
      const card = document.createElement('article');
      card.className = 'card';

      const src   = getSource(a);
      const url   = a.url || '';
      const title = a.title || 'Sin título';
      const desc  = a.description || cleanContent(a.content) || '';
      const author= a.author || '';
      const id    = `NEWS-${idDate}-${String(idx+1).padStart(3,'0')}`;

      const titleHtml = url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`
        : escapeHtml(title);

      const idCell = `<div class="card-id-wrap"><div class="card-id">${id}</div></div>`;
      const idPlain = `<div class="card-id">${id}</div>`;

      const bodyHtml = `
        ${currentView==='grid' ? idCell : idPlain}
        <div class="card-body">
          <div class="card-meta">
            ${src ? `<span class="src-dot" style="--h:${srcAccent(src)}"></span><span class="card-source">${escapeHtml(src)}</span>` : ''}
            <span class="card-time">${relTime(a.publishedAt)}${a.publishedAt ? ' · '+exactTime(a.publishedAt):''}</span>
          </div>
          <h3 class="card-title">${titleHtml}</h3>
          ${desc ? `<p class="card-desc">${escapeHtml(desc)}</p>` : ''}
          <div class="card-foot">
            ${author ? `<span class="author">${escapeHtml(author)}</span>` : ''}
            ${url ? `<a class="read" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">READ <span class="arrow">→</span></a>` : ''}
          </div>
        </div>`;

      card.innerHTML = bodyHtml;

      // image (with terminal-style corner stamp)
      if (a.urlToImage) {
        const wrap = document.createElement('div');
        wrap.className = 'card-thumb';
        const corner = document.createElement('span');
        corner.className = 'card-thumb-corner';
        corner.textContent = 'IMG';
        wrap.appendChild(corner);

        const img = new Image();
        img.alt = '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.onload  = () => wrap.appendChild(img);
        img.onerror = () => wrap.remove();
        img.src = a.urlToImage;

        if (currentView === 'grid') {
          card.insertBefore(wrap, card.firstChild);
        } else {
          card.appendChild(wrap);
        }
      }

      frag.appendChild(card);
    });

    newsContainer.appendChild(frag);
  }

  /* ─── filtering / sorting ─── */
  function getFiltered() {
    const search = searchInput.value.trim().toLowerCase();
    const source = sourceFilter.value;
    const sort   = sortSelect.value;

    let filtered = allArticles.filter(a => {
      const src = getSource(a);
      const text = [a.title, a.description, a.content, src].join(' ').toLowerCase();
      return text.includes(search) && (!source || src === source);
    });

    if (sort === 'oldest') {
      filtered = [...filtered].sort((a,b) => new Date(a.publishedAt||0) - new Date(b.publishedAt||0));
    } else if (sort === 'source') {
      filtered = [...filtered].sort((a,b) => getSource(a).localeCompare(getSource(b)));
    } else {
      filtered = [...filtered].sort((a,b) => new Date(b.publishedAt||0) - new Date(a.publishedAt||0));
    }
    return filtered;
  }

  function filterAndRender() {
    const filtered = getFiltered();
    renderNews(filtered, currentDate);
    feedCount.textContent = filtered.length;
    if (filtered.length !== allArticles.length) {
      feedFilterInfo.textContent = `// filtrado de ${allArticles.length}`;
    } else {
      feedFilterInfo.textContent = '';
    }
  }

  /* ─── source list (sidebar) ─── */
  function buildSourceList(articles) {
    const counts = new Map();
    articles.forEach(a => {
      const s = getSource(a);
      if (!s) return;
      counts.set(s, (counts.get(s)||0) + 1);
    });
    const sorted = [...counts.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));

    // legacy <select>
    const prev = sourceFilter.value;
    sourceFilter.innerHTML = '<option value="">all_sources</option>' +
      sorted.map(([s]) => `<option value="${escapeHtml(s)}"${s===prev?' selected':''}>${escapeHtml(s)}</option>`).join('');

    // sidebar list
    sourceListEl.innerHTML = `<li class="source-item ${!prev?'active':''}" data-source=""><span class="name">all_sources</span><span class="num">${articles.length}</span></li>` +
      sorted.map(([s,n]) => `<li class="source-item ${s===prev?'active':''}" data-source="${escapeHtml(s)}"><span class="name">${escapeHtml(s)}</span><span class="num">${n}</span></li>`).join('');

    sourcesCount.textContent = sorted.length;
  }

  sourceListEl.addEventListener('click', (e) => {
    const li = e.target.closest('.source-item');
    if (!li) return;
    const s = li.dataset.source || '';
    sourceFilter.value = s;
    [...sourceListEl.querySelectorAll('.source-item')].forEach(x => x.classList.toggle('active', x === li));
    filterAndRender();
  });

  /* ─── metrics (only honest counts derived from data) ─── */
  function updateMetrics(articles, dateObj) {
    const sources = new Set(articles.map(getSource).filter(Boolean));
    const authors = new Set(articles.map(a => a.author).filter(Boolean));
    const withImg = articles.filter(a => !!a.urlToImage).length;

    // hourly distribution + latest timestamp
    const hours = new Array(24).fill(0);
    let latest = null;
    articles.forEach(a => {
      if (!a.publishedAt) return;
      const d = new Date(a.publishedAt); if (isNaN(d)) return;
      hours[d.getUTCHours()]++;
      if (!latest || d > latest) latest = d;
    });

    mTotal.textContent   = articles.length;
    mSources.textContent = sources.size;
    mAuthors.textContent = authors.size;
    mImgs.textContent    = withImg;
    tFeed.textContent    = ` ${articles.length}`;
    tSrc.textContent     = ` ${sources.size}`;
    tEdition.textContent = ` ${dispShort(dateObj)}`;
    tLatest.textContent  = latest
      ? ` ${String(latest.getUTCHours()).padStart(2,'0')}:${String(latest.getUTCMinutes()).padStart(2,'0')}Z`
      : ' —';
    metricId.textContent = `ID:${fmtDate(dateObj)}`;

    // issue / date in masthead
    const ed = `VOL. ${dateObj.getFullYear()-2022}`.padEnd(7,' ');
    const dy = String(Math.ceil((dateObj - new Date(dateObj.getFullYear(),0,0))/86_400_000)).padStart(3,'0');
    mIssue.textContent = `${ed} · ISSUE ${dy}`;
    mDate.textContent  = dispDate(dateObj).toUpperCase();

    // hourly bars
    const max = Math.max(1, ...hours);
    const peakHour = hours.indexOf(Math.max(...hours));
    hourlyBars.innerHTML = '';
    hours.forEach((n, i) => {
      const bar = document.createElement('div');
      bar.className = 'hbar' + (i === peakHour && n > 0 ? ' peak' : '') + (n === 0 ? ' empty' : '');
      bar.style.height = `${Math.max(2, Math.round((n / max) * 100))}%`;
      bar.title = `${String(i).padStart(2,'0')}:00 UTC · ${n} artículos`;
      hourlyBars.appendChild(bar);
    });
    hourlyTotal.textContent = `${articles.length} total`;
    peakTag.textContent = articles.length
      ? `PEAK ${String(peakHour).padStart(2,'0')}:00`
      : '—';
  }

  /* ─── fetch (with XHR fallback for older Safari) ─── */
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function fetchJson(url) {
    if (typeof fetch === 'function') {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      return res.json();
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(e); }
        } else { reject(new Error('xhr failed')); }
      };
      xhr.onerror = () => reject(new Error('xhr network error'));
      xhr.send();
    });
  }

  async function fetchNews(date) {
    newsContainer.style.opacity = '0';
    await sleep(180);
    showSkeleton(6);
    newsContainer.style.opacity = '1';

    let found = false;
    let searchDate = new Date(date);
    let articles = null;
    let tries = 0;
    const maxTries = 30;

    while (!found && tries < maxTries) {
      dateDisplay.textContent = dispShort(searchDate);
      nextBtn.disabled = isTodayOrLater(searchDate);
      const url = dataUrl(fmtDate(searchDate));
      try {
        console.log('fetching:', url);
        const data = await fetchJson(url);
        console.log('got data:', data?.length, 'articles');
        if (Array.isArray(data) && data.length > 0) {
            articles = data; found = true; break;
          }
        }
      } catch (e) {
      console.warn('fetch error:', e.message || e);
    }
      searchDate.setDate(searchDate.getDate() - 1);
      tries++;
    }

    newsContainer.style.opacity = '0';
    await sleep(160);

    if (found && articles) {
      allArticles = articles;
      searchInput.value = '';
      sourceFilter.value = '';
      buildSourceList(articles);
      updateMetrics(articles, searchDate);
      filterAndRender();
      currentDate = searchDate;
      dateDisplay.textContent = dispShort(searchDate);
      updateUrl(searchDate);

      if (tries > 0) {
        const notice = document.createElement('div');
        notice.className = 'notice';
        notice.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> // mostrando edición disponible más reciente`;
        const wrap = document.createElement('div');
        wrap.style.marginBottom = '12px';
        wrap.appendChild(notice);
        newsContainer.parentNode.insertBefore(wrap, newsContainer);
        // remove on next fetch
        wrap.dataset.notice = '1';
      }
      // cleanup old notice
      document.querySelectorAll('[data-notice]').forEach((el, i, list) => {
        if (i < list.length - 1) el.remove();
      });
    } else {
      newsContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <strong>NO_DATA</strong>
          <small>// no hay noticias en los últimos ${maxTries} días</small>
        </div>`;
    }

    nextBtn.disabled = isTodayOrLater(currentDate);
    newsContainer.style.opacity = '1';
  }

  /* ─── events ─── */
  searchInput.addEventListener('input', filterAndRender);
  sourceFilter.addEventListener('change', () => {
    [...sourceListEl.querySelectorAll('.source-item')].forEach(x => x.classList.toggle('active', (x.dataset.source||'') === sourceFilter.value));
    filterAndRender();
  });
  sortSelect.addEventListener('change', filterAndRender);

  prevBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateUrl(currentDate);
    fetchNews(currentDate);
  });
  nextBtn.addEventListener('click', () => {
    if (isTodayOrLater(currentDate)) return;
    currentDate.setDate(currentDate.getDate() + 1);
    updateUrl(currentDate);
    fetchNews(currentDate);
  });

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft' && !prevBtn.disabled) prevBtn.click();
    if (e.key === 'ArrowRight' && !nextBtn.disabled) nextBtn.click();
    if (e.key === '/') { e.preventDefault(); searchInput.focus(); }
  });

  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 500);
  }, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ─── init ─── */
  applyView();
  console.log('SBN init — view:', currentView, 'date:', currentDate);
  fetchNews(currentDate);
});
