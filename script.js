document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');
    // Inicializar animación de entrada al cargar
    newsContainer.classList.add('fade-in');
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');
    const dateDisplay = document.getElementById('current-date-display');

    let currentDate = new Date();
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
        if (!articles || articles.length === 0) {
            newsContainer.innerHTML = `<p class="error-message">No se encontraron noticias para esta fecha.</p>`;
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
            } catch (error) {
                console.error('Error fetching news:', error);
                newsContainer.innerHTML = `<p class="error-message">No se encontraron noticias para esta fecha.</p>`;
            }
            // Animación de entrada
            newsContainer.classList.remove('fade-out');
            newsContainer.classList.add('fade-in');
        }, 700);
    }

    // Event Listeners para la navegación
    prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        fetchNews(currentDate);
    });

    nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        fetchNews(currentDate);
    });

    // Carga inicial de noticias
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