document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');
    // Inicializar animación de entrada al cargar
    newsContainer.classList.add('fade-in');
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');
    const dateDisplay = document.getElementById('current-date-display');

    // --- NUEVO: Obtener fecha desde la URL (soporta ?fecha=YYYYMMDD y /YYYYMMDD) ---
    function getDateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        let fechaParam = params.get('fecha');
        if (!fechaParam) {
            // Buscar en la ruta tipo /20250723
            const match = window.location.pathname.match(/\/(\d{8})$/);
            if (match) {
                fechaParam = match[1];
            }
        }
        if (fechaParam && /^\d{8}$/.test(fechaParam)) {
            // Formato esperado: YYYYMMDD
            const year = parseInt(fechaParam.slice(0, 4), 10);
            const month = parseInt(fechaParam.slice(4, 6), 10) - 1;
            const day = parseInt(fechaParam.slice(6, 8), 10);
            return new Date(year, month, day);
        }
        return new Date();
    }

    let currentDate = getDateFromUrl();
    const today = new Date();

    // Función para formatear la fecha a YYYYMMDD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    // Función para mostrar las noticias en el DOM
    function displayNews(articles) {
        newsContainer.innerHTML = ''; // Limpiar contenedor
        allArticles = articles;
        updateSourceFilter(articles);
        filterAndRender();
    }

    // Función para cargar las noticias de una fecha específica
    async function fetchNews(date) {
        const dateString = formatDate(date);
        const url = `data/${dateString}.json`;

        // Animación de salida
        newsContainer.classList.remove('fade-in');
        newsContainer.classList.add('fade-out');

        setTimeout(async () => {
            newsContainer.innerHTML = '<div class="loader">Cargando noticias...</div>';
            dateDisplay.textContent = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            // Deshabilitar el botón "siguiente" si estamos viendo el día de hoy
            nextDayBtn.disabled = (date.toDateString() === today.toDateString());
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    // Si el archivo no existe (404), es un error esperado
                    throw new Error('No hay noticias para esta fecha.');
                }
                const articles = await response.json();
                displayNews(articles);
                updateSourceFilter(articles); // Actualizar fuentes disponibles
                allArticles = articles; // Guardar todas las noticias para búsqueda/filtro
            } catch (error) {
                console.error('Error fetching news:', error);
                newsContainer.innerHTML = `<p class="error-message">No se encontraron noticias para esta fecha.</p>`;
            }
            // Animación de entrada
            newsContainer.classList.remove('fade-out');
            newsContainer.classList.add('fade-in');
        }, 700);
    }

    // --- Buscador y filtro de noticias ---
    let allArticles = [];
    const searchInput = document.getElementById('search-input');
    const sourceFilter = document.getElementById('source-filter');

    function renderNews(articles) {
        newsContainer.innerHTML = '';
        if (!articles || articles.length === 0) {
            newsContainer.innerHTML = `<p class="error-message">No se encontraron noticias para esta búsqueda.</p>`;
            return;
        }
        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'news-article';

            // Título y enlace
            let html = '';
            if (article.title && article.url) {
                html += `<h3><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>`;
            } else if (article.title) {
                html += `<h3>${article.title}</h3>`;
            }

            // Autor
            if (article.author) {
                html += `<p><strong>Autor:</strong> ${article.author}</p>`;
            }

            // Imagen (solo si carga correctamente)
            if (article.urlToImage) {
                const img = new window.Image();
                img.src = article.urlToImage;
                img.alt = 'Imagen de la noticia';
                img.style.maxWidth = '300px';
                img.style.marginBottom = '10px';
                // img.loading = 'lazy'; // Lazy loading para optimización
                img.setAttribute('role', 'presentation');
                img.onload = function() {
                    articleElement.insertBefore(img, articleElement.firstChild.nextSibling);
                };
                // No se agrega si falla (onerror)
            }

            // Descripción
            if (article.description) {
                html += `<p>${article.description}</p>`;
            }

            // Contenido extendido
            if (article.content) {
                html += `<p>${article.content}</p>`;
            }

            // Fuente (puede ser string o objeto)
            let fuente = '';
            if (article.source) {
                if (typeof article.source === 'object' && article.source.name) {
                    fuente = article.source.name;
                } else {
                    fuente = article.source;
                }
            }

            // Fecha
            let fecha = '';
            if (article.publishedAt) {
                fecha = new Date(article.publishedAt).toLocaleString();
            }

            if (fuente || fecha) {
                html += `<p class="source">${fuente ? 'Fuente: ' + fuente : ''}${fuente && fecha ? ' - ' : ''}${fecha}</p>`;
            }

            articleElement.innerHTML = html;
            newsContainer.appendChild(articleElement);
        });
    }

    function filterAndRender() {
        const search = searchInput.value.trim().toLowerCase();
        const source = sourceFilter.value;
        let filtered = allArticles.filter(article => {
            let fuente = '';
            if (article.source) {
                if (typeof article.source === 'object' && article.source.name) {
                    fuente = article.source.name;
                } else {
                    fuente = article.source;
                }
            }
            const matchText = [article.title, article.description, article.content, fuente].join(' ').toLowerCase();
            const matchSource = !source || fuente === source;
            return matchText.includes(search) && matchSource;
        });
        renderNews(filtered);
    }

    searchInput.addEventListener('input', filterAndRender);
    sourceFilter.addEventListener('change', filterAndRender);

    function updateSourceFilter(articles) {
        const fuentes = new Set();
        articles.forEach(article => {
            let fuente = '';
            if (article.source) {
                if (typeof article.source === 'object' && article.source.name) {
                    fuente = article.source.name;
                } else {
                    fuente = article.source;
                }
            }
            if (fuente) fuentes.add(fuente);
        });
        sourceFilter.innerHTML = '<option value="">Todas las fuentes</option>' +
            Array.from(fuentes).sort().map(f => `<option value="${f}">${f}</option>`).join('');
    }

    // --- NUEVO: Actualizar la URL al cambiar de fecha (usa /YYYYMMDD) ---
    function updateUrlWithDate(date) {
        const dateString = formatDate(date);
        // Detectar si la web está en una subcarpeta (por ejemplo, /Ciberseguridad/)
        const basePath = window.location.pathname.split('/').slice(0,2).join('/') + '/';
        window.history.replaceState({}, '', `${basePath}${dateString}`);
    }

    // Event Listeners para la navegación
    prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateUrlWithDate(currentDate);
        fetchNews(currentDate);
    });

    nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateUrlWithDate(currentDate);
        fetchNews(currentDate);
    });

    // Carga inicial de noticias
    updateUrlWithDate(currentDate);
    fetchNews(currentDate);
});

// --- Modo oscuro/automático ---
(function() {
    const root = document.documentElement;
    const themeBtn = document.getElementById('toggle-theme-btn');
    const themeIcon = document.getElementById('theme-icon');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');

    function setTheme(newTheme) {
        if (newTheme === 'dark') {
            root.classList.add('dark');
            themeIcon.textContent = '☀️';
        } else {
            root.classList.remove('dark');
            themeIcon.textContent = '🌙';
        }
        localStorage.setItem('theme', newTheme);
    }

    setTheme(theme);

    themeBtn.addEventListener('click', () => {
        theme = (root.classList.contains('dark')) ? 'light' : 'dark';
        setTheme(theme);
    });

    // Detectar cambio de preferencia del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
})();

// --- Notificaciones Push ---
if ('Notification' in window && 'serviceWorker' in navigator) {
    const pushBtn = document.createElement('button');
    pushBtn.textContent = '🔔 Suscríbete a notificaciones';
    pushBtn.setAttribute('aria-label', 'Suscribirse a notificaciones push');
    pushBtn.style.position = 'absolute';
    pushBtn.style.bottom = '85%';
    pushBtn.style.right = '15%';
    pushBtn.style.transform = 'translate(50%, 50%)';
    pushBtn.style.zIndex = '1000';
    pushBtn.style.background = 'var(--color-btn-bg)';
    pushBtn.style.color = 'var(--color-btn-text)';
    pushBtn.style.border = 'none';
    pushBtn.style.padding = '0.8rem 1.3rem';
    pushBtn.style.borderRadius = '8px';
    pushBtn.style.fontSize = '1.1rem';
    pushBtn.style.fontWeight = '700';
    pushBtn.style.boxShadow = '0 2px 8px rgba(78,84,200,0.10)';
    pushBtn.style.cursor = 'pointer';
    pushBtn.style.transition = 'background 0.3s, color 0.3s, box-shadow 0.2s';
    document.body.appendChild(pushBtn);

    function hidePushBtn() {
        pushBtn.style.opacity = '0';
        pushBtn.style.pointerEvents = 'none';
        setTimeout(() => { if (pushBtn.parentNode) pushBtn.parentNode.removeChild(pushBtn); }, 700);
    }

    function askPermissionAndSubscribe() {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                pushBtn.textContent = '✅ Suscrito a notificaciones';
                pushBtn.disabled = true;
                // Aquí podrías registrar un Service Worker real y suscribirte a un servidor push
                // Ejemplo: navigator.serviceWorker.register('sw.js')
                // ...
                new Notification('¡Gracias por suscribirte!', {
                    body: 'Recibirás alertas de nuevas noticias importantes.',
                    icon: '/Images/favicon.ico'
                });
            } else {
                pushBtn.textContent = '❌ Permiso denegado';
                setTimeout(() => { pushBtn.textContent = '🔔 Suscríbete a notificaciones'; }, 3000);
            }
        });
        setTimeout(hidePushBtn, 10000);
    }

    pushBtn.addEventListener('click', askPermissionAndSubscribe);
    setTimeout(hidePushBtn, 5000);
}