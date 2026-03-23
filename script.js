// ══════════════════════════════════════════
//  TEMA (se inicializa antes del DOM para
//  evitar flash of wrong theme)
// ══════════════════════════════════════════
(function () {
    const root    = document.documentElement;
    const btn     = document.getElementById('toggle-theme-btn');
    const iconEl  = document.getElementById('theme-icon');
    const prefer  = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme     = localStorage.getItem('theme') || (prefer ? 'dark' : 'light');

    const icons = {
        dark:  `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
        light: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    };

    function setTheme(t) {
        theme = t;
        root.classList.toggle('dark', t === 'dark');
        iconEl.innerHTML = t === 'dark' ? icons.light : icons.dark;
        localStorage.setItem('theme', t);
    }

    setTheme(theme);

    btn.addEventListener('click', () => setTheme(root.classList.contains('dark') ? 'light' : 'dark'));

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light');
    });
}());


// ══════════════════════════════════════════
//  APP PRINCIPAL
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // — Elementos —
    const newsContainer = document.getElementById('news-container');
    const prevBtn       = document.getElementById('prev-day-btn');
    const nextBtn       = document.getElementById('next-day-btn');
    const dateDisplay   = document.getElementById('current-date-display');
    const statsBar      = document.getElementById('stats-bar');
    const backToTop     = document.getElementById('back-to-top');
    const searchInput   = document.getElementById('search-input');
    const sourceFilter  = document.getElementById('source-filter');

    let allArticles = [];
    let currentDate = getDateFromUrl();
    const today = new Date();

    // ── Utilidades de fecha ──────────────────

    function getDateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        let p = params.get('fecha');
        if (!p) {
            const m = window.location.pathname.match(/\/(\d{8})(?:\/)?$/);
            if (m) p = m[1];
        }
        if (p && /^\d{8}$/.test(p)) {
            return new Date(
                parseInt(p.slice(0, 4), 10),
                parseInt(p.slice(4, 6), 10) - 1,
                parseInt(p.slice(6, 8), 10)
            );
        }
        return new Date();
    }

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
    }

    function isTodayOrLater(date) {
        const a = new Date(date); a.setHours(0, 0, 0, 0);
        const b = new Date(today); b.setHours(0, 0, 0, 0);
        return a >= b;
    }

    function displayDate(date) {
        return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function updateUrlWithDate(date) {
        const ds = formatDate(date);
        const parts = window.location.pathname.split('/');
        if (/^\d{8}$/.test(parts[parts.length - 1])) parts.pop();
        const base = parts.join('/').replace(/\/$/, '') + '/';
        window.history.replaceState({}, '', `${base}${ds}`);
    }

    // ── Utilidades de artículo ───────────────

    function getSource(article) {
        if (!article.source) return '';
        return (typeof article.source === 'object' ? article.source.name : article.source) || '';
    }

    /** Elimina el artefacto de truncación "[+N chars]" del contenido */
    function cleanContent(text) {
        if (!text) return '';
        return text.replace(/\s*\[?\+?\d[\d\s]*chars?\]?\s*$/i, '').trim();
    }

    function relativeTime(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d)) return '';
        const diff = Date.now() - d;
        const h = Math.floor(diff / 3_600_000);
        const days = Math.floor(diff / 86_400_000);
        if (h < 1)   return 'hace menos de 1h';
        if (h < 24)  return `hace ${h}h`;
        if (days < 7) return `hace ${days}d`;
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    // ── Skeleton ─────────────────────────────

    function showSkeleton(n = 6) {
        const tpl = `
            <div class="skeleton-card">
                <div class="skeleton-body">
                    <div class="skeleton-line skeleton-base s"></div>
                    <div class="skeleton-line skeleton-base l"></div>
                    <div class="skeleton-line skeleton-base xl"></div>
                    <div class="skeleton-line skeleton-base m"></div>
                </div>
                <div class="skeleton-thumb skeleton-base"></div>
            </div>`;
        newsContainer.innerHTML = Array.from({ length: n }, () => tpl).join('');
    }

    // ── Render de noticias ───────────────────

    function renderNews(articles) {
        newsContainer.innerHTML = '';

        if (!articles || articles.length === 0) {
            newsContainer.innerHTML = `
                <div class="state-msg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <strong>Sin resultados</strong>
                    <small>Prueba con otra búsqueda o cambia la fuente</small>
                </div>`;
            return;
        }

        const frag = document.createDocumentFragment();

        articles.forEach(article => {
            const card   = document.createElement('article');
            card.className = 'news-card';

            const source  = getSource(article);
            const relTime = relativeTime(article.publishedAt);
            const desc    = article.description || cleanContent(article.content) || '';
            const title   = article.title || 'Sin título';
            const url     = article.url || '';
            const author  = article.author || '';

            card.innerHTML = `
                <div class="card-body">
                    <div class="card-meta-top">
                        ${source   ? `<span class="source-badge">${source}</span>` : ''}
                        ${relTime  ? `<time class="card-time">${relTime}</time>` : ''}
                    </div>
                    <h3 class="card-title">
                        ${url
                            ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`
                            : title}
                    </h3>
                    ${desc ? `<p class="card-desc">${desc}</p>` : ''}
                    <div class="card-footer">
                        <span class="card-author">${author}</span>
                        ${url ? `<a class="card-link" href="${url}" target="_blank" rel="noopener noreferrer">Leer artículo →</a>` : ''}
                    </div>
                </div>`;

            // Imagen: reserva espacio inmediatamente; quita si falla
            if (article.urlToImage) {
                const wrap = document.createElement('div');
                wrap.className = 'card-image-wrap';
                card.appendChild(wrap);

                const img = new Image();
                img.loading = 'lazy';
                img.alt = '';
                img.onload  = () => wrap.appendChild(img);
                img.onerror = () => wrap.remove();
                img.src = article.urlToImage;
            }

            frag.appendChild(card);
        });

        newsContainer.appendChild(frag);
    }

    // ── Filtrado ─────────────────────────────

    function filterAndRender() {
        const search = searchInput.value.trim().toLowerCase();
        const source = sourceFilter.value;

        const filtered = allArticles.filter(a => {
            const src  = getSource(a);
            const text = [a.title, a.description, a.content, src].join(' ').toLowerCase();
            return text.includes(search) && (!source || src === source);
        });

        renderNews(filtered);

        if (filtered.length !== allArticles.length) {
            statsBar.textContent = `${filtered.length} de ${allArticles.length} noticias`;
        } else {
            statsBar.textContent = `${allArticles.length} noticias`;
        }
    }

    function updateSourceFilter(articles) {
        const sources = new Set(articles.map(getSource).filter(Boolean));
        const prev = sourceFilter.value;
        sourceFilter.innerHTML =
            '<option value="">Todas las fuentes</option>' +
            Array.from(sources).sort()
                .map(s => `<option value="${s}"${s === prev ? ' selected' : ''}>${s}</option>`)
                .join('');
    }

    // ── Fetch de noticias ────────────────────

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function fetchNews(date) {
        statsBar.textContent = '';

        // Fade out
        newsContainer.style.opacity = '0';
        await sleep(220);

        showSkeleton(6);
        newsContainer.style.opacity = '1';

        let found      = false;
        let searchDate = new Date(date);
        let articles   = null;
        let tries      = 0;
        const maxTries = 30;

        while (!found && tries < maxTries) {
            dateDisplay.textContent = displayDate(searchDate);
            nextBtn.disabled = isTodayOrLater(searchDate);

            try {
                const res = await fetch(`data/${formatDate(searchDate)}.json`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        articles = data;
                        found = true;
                        break;
                    }
                }
            } catch (_) { /* continuar */ }

            searchDate.setDate(searchDate.getDate() - 1);
            tries++;
        }

        // Fade out skeleton
        newsContainer.style.opacity = '0';
        await sleep(180);

        if (found && articles) {
            allArticles = articles;
            searchInput.value = '';
            sourceFilter.value = '';
            updateSourceFilter(articles);
            filterAndRender();

            if (tries > 0) {
                const notice = document.createElement('div');
                notice.className = 'notice-msg';
                notice.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Mostrando la edición más reciente disponible.`;
                newsContainer.insertAdjacentElement('afterbegin', notice);
            }

            dateDisplay.textContent = displayDate(searchDate);
            updateUrlWithDate(searchDate);
            currentDate = searchDate;
        } else {
            newsContainer.innerHTML = `
                <div class="state-msg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <strong>Sin noticias disponibles</strong>
                    <small>No se encontraron noticias en los últimos ${maxTries} días.</small>
                </div>`;
            statsBar.textContent = '';
        }

        nextBtn.disabled = isTodayOrLater(currentDate);

        // Fade in
        newsContainer.style.opacity = '1';
    }

    // ── Eventos ──────────────────────────────

    searchInput.addEventListener('input', filterAndRender);
    sourceFilter.addEventListener('change', filterAndRender);

    prevBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateUrlWithDate(currentDate);
        fetchNews(currentDate);
    });

    nextBtn.addEventListener('click', () => {
        if (isTodayOrLater(currentDate)) return;
        currentDate.setDate(currentDate.getDate() + 1);
        updateUrlWithDate(currentDate);
        fetchNews(currentDate);
    });

    // Navegación por teclado (← →) cuando no se está en un input
    document.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        if (e.key === 'ArrowLeft'  && !prevBtn.disabled) prevBtn.click();
        if (e.key === 'ArrowRight' && !nextBtn.disabled) nextBtn.click();
    });

    // Botón volver arriba
    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ── Carga inicial ────────────────────────
    updateUrlWithDate(currentDate);
    fetchNews(currentDate);
});
