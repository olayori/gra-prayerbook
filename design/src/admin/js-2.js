/* GRA Prayer Library — languages (English, French, Spanish).
   UI: hand-written dictionary below; anything missing is translated once by DeepL (via the Supabase "translate" function) and cached.
   Books and weekly prayers: translated with GRAi18n.translateData() and cached on the device and in Supabase. */
(function () {
  var SB = 'https://sjcosqxtgllfwldhnoax.supabase.co';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY29zcXh0Z2xsZndsZGhub2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTQ5MjYsImV4cCI6MjEwNzQzMDkyNn0.HQsm-M6Ut1RHoXtDHEIjiCvPQq-P3irRh0uHgQ3lFx0';
  var NAMES = { en: 'English', fr: 'Français', es: 'Español' };
  var LOCALE = { en: undefined, fr: 'fr-FR', es: 'es-ES' };
  var TTS = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' };
  var BIBLE = { fr: { id: 'ls1910', label: 'Louis Segond 1910' }, es: { id: 'valera', label: 'Reina-Valera 1909' } };

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function bookKey() { var m = /\/(covenant|jcfp|weekly)\/?(index\.html)?$/.exec(location.pathname); return m ? m[1] : new URLSearchParams(location.search).get('book'); }
  function phone() { var l = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase(); return NAMES[l] ? l : 'en'; }
  function pref() { var p = get('gra-lang'); return p && (p === 'auto' || NAMES[p]) ? p : 'auto'; }
  function bookPref(b) { var p = b ? get('gra-lang-' + b) : null; return p && NAMES[p] ? p : 'app'; }
  function resolve(b) { var bp = bookPref(b === undefined ? bookKey() : b); if (bp !== 'app') return bp; var p = pref(); return p === 'auto' ? phone() : p; }
  var BOOK = bookKey(), LANG = /\/admin\/|Admin Console/.test(decodeURIComponent(location.pathname)) ? 'en' : resolve(BOOK);

  /* ---------- UI dictionary: English | French | Spanish ---------- */
  var RAW = [
    'Home|Accueil|Inicio', 'Library|Bibliothèque|Biblioteca', 'Search|Rechercher|Buscar', 'Plan|Plan|Plan', 'Saved|Enregistrés|Guardados', 'Stats|Statistiques|Estadísticas', 'Reminders|Rappels|Recordatorios', 'Account|Compte|Cuenta', 'Menu|Menu|Menú', 'On|Activé|Activado', 'Off|Désactivé|Desactivado',
    'Theme|Thème|Tema', 'Light|Clair|Claro', 'Sepia|Sépia|Sepia', 'Dark|Sombre|Oscuro', 'Auto|Auto|Auto', 'Language|Langue|Idioma', 'Phone|Téléphone|Teléfono', 'Same as app|Comme l’app|Igual que la app',
    'Overcomer’s Library|Overcomer’s Library|Overcomer’s Library', 'My Prayer Library|Ma bibliothèque de prière|Mi biblioteca de oración',
    'Good morning|Bonjour|Buenos días', 'Good afternoon|Bon après-midi|Buenas tardes', 'Good evening|Bonsoir|Buenas noches',
    'Sign in|Se connecter|Iniciar sesión', 'Sign out|Se déconnecter|Cerrar sesión', 'Sign in to open your prayer library|Connectez-vous pour ouvrir votre bibliothèque de prière|Inicia sesión para abrir tu biblioteca de oración',
    'Your check marks, favorites and notes follow you to every book once you sign in.|Une fois connecté, vos coches, favoris et notes vous suivent dans chaque livre.|Al iniciar sesión, tus marcas, favoritos y notas te acompañan en cada libro.',
    'GRA Weekly Kingdom Prayers|Prières hebdomadaires du Royaume GRA|Oraciones semanales del Reino GRA', 'Weekly Kingdom Prayers|Prières hebdomadaires du Royaume|Oraciones semanales del Reino', 'This week|Cette semaine|Esta semana', 'Open|Ouvrir|Abrir', 'Past weeks|Semaines passées|Semanas anteriores', 'All weeks|Toutes les semaines|Todas las semanas',
    'Today’s Plan|Plan du jour|Plan de hoy', 'Today|Aujourd’hui|Hoy', 'Continue ·|Continuer ·|Continuar ·', 'Not started|Pas commencé|Sin empezar', 'New every Monday|Nouveau chaque lundi|Nuevo cada lunes',
    'Book of Covenant Prayers|Livre des prières de l’alliance|Libro de oraciones del pacto', 'Covenant Prayers|Prières de l’alliance|Oraciones del pacto', 'Jesus Chosen Fast and Prayer|Le jeûne choisi de Jésus et la prière|El ayuno escogido de Jesús y la oración', 'Jesus Chosen Fast and Prayer Prayer Manual|Manuel de prière : Le jeûne choisi de Jésus|Manual de oración: El ayuno escogido de Jesús', 'God’s Remnant Assembly|God’s Remnant Assembly|God’s Remnant Assembly',
    'Pray through your books at your own pace|Priez vos livres à votre rythme|Ora tus libros a tu propio ritmo', 'Create a plan|Créer un plan|Crear un plan', 'Edit plan|Modifier le plan|Editar plan', 'End plan|Terminer le plan|Terminar plan', 'In your plan|Dans votre plan|En tu plan', 'Each prayer day|Chaque jour de prière|Cada día de oración', 'Prayer days|Jours de prière|Días de oración', 'Cancel|Annuler|Cancelar', 'Fewer|Moins|Menos', 'More|Plus|Más',
    'A Covenant section or a whole prayer watch counts as one.|Une section de l’Alliance ou une veille de prière entière compte pour une.|Una sección del Pacto o una vigilia completa cuenta como una.',
    'Favorites|Favoris|Favoritos', 'Bookmarks|Signets|Marcadores', 'Last 12 weeks|12 dernières semaines|Últimas 12 semanas', 'By book|Par livre|Por libro', 'Day streak|Jours d’affilée|Días seguidos', 'Longest streak|Plus longue série|Racha más larga', 'Days prayed|Jours de prière|Días de oración', 'Prayers checked|Prières cochées|Oraciones marcadas', 'Plan streak|Série du plan|Racha del plan', 'Plan days|Jours du plan|Días del plan', 'Through plan|Du plan accompli|Del plan completado',
    'Daily reminders|Rappels quotidiens|Recordatorios diarios', 'A gentle nudge at the times you set aside to pray.|Un doux rappel aux heures que vous réservez à la prière.|Un suave aviso en las horas que apartas para orar.', 'Remind me to pray|Me rappeler de prier|Recordarme orar', 'Times|Heures|Horas', '+ Add a time|+ Ajouter une heure|+ Añadir una hora', 'Days|Jours|Días', 'Notifications on this device|Notifications sur cet appareil|Notificaciones en este dispositivo', 'Allow notifications|Autoriser les notifications|Permitir notificaciones', 'Send a test|Envoyer un test|Enviar una prueba', 'Never miss one|N’en manquez aucun|No te pierdas ninguno', 'Add to calendar|Ajouter au calendrier|Añadir al calendario',
    'Signed in as|Connecté en tant que|Sesión iniciada como', 'Sync|Synchronisation|Sincronización', 'Change password|Changer le mot de passe|Cambiar contraseña', 'At least 8 characters.|Au moins 8 caractères.|Al menos 8 caracteres.', 'Update password|Mettre à jour|Actualizar contraseña', 'Delete account|Supprimer le compte|Eliminar cuenta', 'Delete account…|Supprimer le compte…|Eliminar cuenta…', 'Delete permanently|Supprimer définitivement|Eliminar definitivamente', 'Type|Tapez|Escribe', 'to confirm|pour confirmer|para confirmar', 'New password|Nouveau mot de passe|Nueva contraseña', 'Confirm new password|Confirmer le mot de passe|Confirmar contraseña', 'Password|Mot de passe|Contraseña', 'Email|E-mail|Correo electrónico', 'Your name|Votre nom|Tu nombre', 'Create account|Créer un compte|Crear cuenta', 'Forgot password?|Mot de passe oublié ?|¿Olvidaste tu contraseña?', 'or|ou|o', 'Back to sign in|Retour à la connexion|Volver a iniciar sesión', 'Use a different account|Utiliser un autre compte|Usar otra cuenta', 'Continue with access code|Continuer avec un code d’accès|Continuar con código de acceso', 'Open the book|Ouvrir le livre|Abrir el libro',
    'Search every book|Rechercher dans tous les livres|Buscar en todos los libros', 'Clear|Effacer|Borrar', 'All books|Tous les livres|Todos los libros', 'Covenant|Alliance|Pacto', 'Fast and Prayer|Jeûne et prière|Ayuno y oración', 'Weekly|Hebdomadaire|Semanal', 'Search prayers, section titles and weekly prayers across every book.|Recherchez des prières, des titres de sections et les prières hebdomadaires dans tous les livres.|Busca oraciones, títulos de secciones y oraciones semanales en todos los libros.',
    'Table of Contents|Table des matières|Índice', 'Contents|Sommaire|Índice', 'Settings|Réglages|Ajustes', 'Top|Haut|Arriba', 'Back to top|Retour en haut|Volver arriba', 'Back to Library|Retour à la bibliothèque|Volver a la biblioteca', 'Back to this week|Retour à cette semaine|Volver a esta semana', 'Back to the beginning|Retour au début|Volver al inicio', 'Show less|Afficher moins|Mostrar menos', 'Listen|Écouter|Escuchar', 'Share|Partager|Compartir', 'Share prayer|Partager la prière|Compartir oración', 'Close|Fermer|Cerrar', 'Done|Terminé|Listo', 'Reset|Réinitialiser|Restablecer', 'Stop|Arrêter|Detener', 'Dismiss|Ignorer|Descartar', 'Not now|Plus tard|Ahora no', 'Install|Installer|Instalar',
    'Today’s Prayers|Prières du jour|Oraciones de hoy', 'Focused Mode|Mode concentré|Modo enfocado', 'Reset part|Réinitialiser la partie|Restablecer parte', 'Scripture Foundation|Fondement biblique|Fundamento bíblico', 'Themes|Thèmes|Temas', 'History|Historique|Historial', 'Your plan|Votre plan|Tu plan', 'Read ahead|Lire en avance|Leer por adelantado', 'Days complete|Jours terminés|Días completados', 'Last 7 days|7 derniers jours|Últimos 7 días', 'Plan complete|Plan terminé|Plan completado', 'Start a new plan|Commencer un nouveau plan|Empezar un nuevo plan', 'What to pray|Quoi prier|Qué orar', 'Sections each prayer day|Sections par jour de prière|Secciones por día de oración', 'More prayers|Plus de prières|Más oraciones', 'Prayers this month|Prières ce mois-ci|Oraciones este mes', 'prayed|priées|oradas', 'Previous month|Mois précédent|Mes anterior', 'Next month|Mois suivant|Mes siguiente',
    'Share with an app…|Partager avec une app…|Compartir con una app…', 'Text message|SMS|Mensaje de texto', 'Copy text|Copier le texte|Copiar texto', 'Prayer copied|Prière copiée|Oración copiada', 'Loading passage…|Chargement du passage…|Cargando pasaje…', 'Read this passage|Lire ce passage|Leer este pasaje', 'KJV|Louis Segond 1910|Reina-Valera 1909',
    'Text size|Taille du texte|Tamaño del texto', 'Line spacing|Interligne|Interlineado', 'Reading font|Police de lecture|Fuente de lectura', 'Letter spacing|Espacement des lettres|Espaciado de letras', 'Page|Page|Página', 'Book|Livre|Libro', 'Clean|Épurée|Limpia', 'Easy read|Lecture facile|Lectura fácil', 'Normal|Normal|Normal', 'Wide|Large|Amplio', 'Compact|Compact|Compacto', 'Relaxed|Aéré|Holgado', 'Show|Afficher|Mostrar', 'Hide|Masquer|Ocultar', 'Scripture under each prayer|Écriture sous chaque prière|Escritura bajo cada oración',
    'Read aloud|Lecture à voix haute|Leer en voz alta', 'Best available voice|Meilleure voix disponible|Mejor voz disponible', 'Voice|Voix|Voz', 'Hear a sample|Écouter un extrait|Escuchar una muestra', 'Pause between prayers|Pause entre les prières|Pausa entre oraciones', 'None|Aucune|Ninguna', 'Slow|Lent|Lento', 'Fast|Rapide|Rápido', 'Faster|Plus rapide|Más rápido', 'Reading speed|Vitesse de lecture|Velocidad de lectura', 'Sleep timer|Minuterie de sommeil|Temporizador', 'Stop reading|Arrêter la lecture|Detener lectura', 'Previous prayer|Prière précédente|Oración anterior', 'Next prayer|Prière suivante|Oración siguiente', 'Read the scripture under each prayer|Lire l’Écriture sous chaque prière|Leer la Escritura bajo cada oración', 'Check off each prayer as it’s read|Cocher chaque prière lue|Marcar cada oración al leerla',
    'Reset book|Réinitialiser le livre|Restablecer libro', 'Pen notes|Notes au stylet|Notas a mano', 'Clear all notes|Effacer toutes les notes|Borrar todas las notas', 'Export|Exporter|Exportar', 'My prayer journal|Mon journal de prière|Mi diario de oración', 'My Prayer Journal|Mon journal de prière|Mi diario de oración', 'Full book with my pen notes|Livre complet avec mes notes|Libro completo con mis notas', 'Print or save as PDF|Imprimer ou enregistrer en PDF|Imprimir o guardar como PDF', 'Favorite prayers|Prières favorites|Oraciones favoritas', 'Prayer history|Historique de prière|Historial de oración', 'Pages with pen notes|Pages avec notes|Páginas con notas',
    'Share anonymous usage counts|Partager des statistiques anonymes|Compartir estadísticas anónimas', 'Open admin console|Ouvrir la console d’administration|Abrir la consola de administración', 'Keep it on your home screen|Gardez-la sur votre écran d’accueil|Tenla en tu pantalla de inicio', 'Add to your home screen|Ajouter à l’écran d’accueil|Añadir a la pantalla de inicio', 'Add to home screen|Ajouter à l’écran d’accueil|Añadir a la pantalla de inicio', 'Sync now|Synchroniser|Sincronizar ahora', 'Sign in or create account|Se connecter ou créer un compte|Iniciar sesión o crear cuenta',
    'Time per prayer|Temps par prière|Tiempo por oración', 'Prayer timer|Minuteur de prière|Temporizador de oración', 'Timer settings|Réglages du minuteur|Ajustes del temporizador', 'End session|Terminer la session|Terminar sesión', 'Amen.|Amen.|Amén.', 'Amen · Next|Amen · Suivante|Amén · Siguiente', 'Go to the next prayer when time is up|Passer à la prière suivante à la fin du temps|Pasar a la siguiente oración al acabar el tiempo', 'Chime for the last 3 seconds|Carillon pendant les 3 dernières secondes|Sonido en los últimos 3 segundos', 'Read each prayer aloud|Lire chaque prière à voix haute|Leer cada oración en voz alta', 'Stop reading aloud|Arrêter la lecture|Dejar de leer', 'You’ve prayed through to the end of the book.|Vous avez prié jusqu’à la fin du livre.|Has orado hasta el final del libro.',
    'Contents|Sommaire|Índice', 'Pen|Stylet|Lápiz', 'Highlighter|Surligneur|Resaltador', 'Eraser|Gomme|Borrador', 'Draw with finger|Dessiner au doigt|Dibujar con el dedo', 'Undo|Annuler|Deshacer', 'Skip to contents|Aller au sommaire|Ir al índice',
    'Switch to light page|Passer en page claire|Cambiar a página clara', 'Switch to dark page|Passer en page sombre|Cambiar a página oscura', 'Offline · the book still works|Hors ligne · le livre fonctionne toujours|Sin conexión · el libro sigue funcionando', 'Back online|De retour en ligne|De nuevo en línea',
    'Search words, a phrase or a verse|Rechercher des mots, une phrase ou un verset|Busca palabras, una frase o un versículo', 'No prayers checked on this day.|Aucune prière cochée ce jour-là.|No se marcaron oraciones este día.',
    'This week’s prayers appear here once they are published on Monday.|Les prières de la semaine apparaissent ici dès leur publication le lundi.|Las oraciones de la semana aparecen aquí cuando se publican el lunes.', 'No weekly prayers yet. New prayers are shared on Mondays.|Pas encore de prières hebdomadaires. De nouvelles prières sont publiées le lundi.|Aún no hay oraciones semanales. Se publican nuevas cada lunes.', 'All Weekly Kingdom Prayers|Toutes les prières hebdomadaires du Royaume|Todas las oraciones semanales del Reino', 'Shared every Monday|Publiées chaque lundi|Se comparten cada lunes',
    'Translating…|Traduction…|Traduciendo…', 'My Library|Ma bibliothèque|Mi biblioteca', 'Prayer Books|Livres de prière|Libros de oración', 'Spiritual Nourishment|Nourriture spirituelle|Alimento espiritual', 'Highlights|Surlignages|Resaltados', 'Nourishment|Nourriture|Alimento', 'Current password|Mot de passe actuel|Contraseña actual', 'Remind me to pray and read|Me rappeler de prier et de lire|Recordarme orar y leer', 'A gentle nudge at the times you set aside to pray and read.|Un doux rappel aux heures que vous réservez à la prière et à la lecture.|Un suave aviso en las horas que apartas para orar y leer.', 'Sign in to open your library|Connectez-vous pour ouvrir votre bibliothèque|Inicia sesión para abrir tu biblioteca', 'Reading|En cours de lecture|Leyendo', 'Chapter|Chapitre|Capítulo', 'Reading now|En cours|Leyendo ahora', 'Previous chapter|Chapitre précédent|Capítulo anterior', 'Finish and return to Library|Terminer et revenir à la bibliothèque|Terminar y volver a la biblioteca', 'left in chapter|restantes dans le chapitre|restantes en el capítulo', 'End of chapter|Fin du chapitre|Fin del capítulo', 'Marker|Marqueur|Marcador', 'Clear page|Effacer la page|Borrar página', 'Note|Note|Nota', 'Copy|Copier|Copiar', 'Remove|Retirer|Quitar', 'Chapters|Chapitres|Capítulos', 'Notes & bookmarks|Notes et signets|Notas y marcadores', 'Reading settings|Réglages de lecture|Ajustes de lectura', 'Margins|Marges|Márgenes', 'Read this chapter aloud|Lire ce chapitre à voix haute|Leer este capítulo en voz alta', 'Search this book|Rechercher dans ce livre|Buscar en este libro', 'Save note|Enregistrer la note|Guardar nota', 'Bookmark|Signet|Marcador', 'Reading aloud|Lecture à voix haute|Leyendo en voz alta', 'Opening the book…|Ouverture du livre…|Abriendo el libro…', 'Page bookmarked|Page marquée|Página marcada', 'Bookmark removed|Signet retiré|Marcador quitado', 'Note saved|Note enregistrée|Nota guardada', 'Copied|Copié|Copiado', 'Draw anywhere on the page|Dessinez n’importe où sur la page|Dibuja en cualquier parte de la página', 'Bookmark this page|Marquer cette page|Marcar esta página', 'Remove bookmark|Retirer le signet|Quitar marcador', 'Search words or a phrase in this book.|Recherchez des mots ou une phrase dans ce livre.|Busca palabras o una frase en este libro.', 'results|résultats|resultados', 'result|résultat|resultado', 'Write your note|Écrivez votre note|Escribe tu nota', 'Clear all pen notes on this chapter?|Effacer toutes les notes au stylet de ce chapitre ?|¿Borrar todas las notas a mano de este capítulo?', 'Enter your current password.|Saisissez votre mot de passe actuel.|Introduce tu contraseña actual.', 'Your current password isn’t right.|Votre mot de passe actuel est incorrect.|Tu contraseña actual no es correcta.', 'Choose a password different from your current one.|Choisissez un mot de passe différent de l’actuel.|Elige una contraseña distinta de la actual.', 'Page colour and language are shared with the rest of the library.|La couleur de page et la langue sont partagées avec le reste de la bibliothèque.|El color de página y el idioma se comparten con el resto de la biblioteca.', 'Highlight words or add a note in any Spiritual Nourishment book and it appears here.|Surlignez des mots ou ajoutez une note dans un livre de nourriture spirituelle et ils apparaîtront ici.|Resalta palabras o añade una nota en cualquier libro de alimento espiritual y aparecerán aquí.', 'Not started|Pas commencé|Sin empezar', 'Scripture|Écriture|Escritura', 'You’re offline. Connect to the internet to read this passage.|Vous êtes hors ligne. Connectez-vous à Internet pour lire ce passage.|Estás sin conexión. Conéctate a internet para leer este pasaje.', 'Couldn’t load this passage. Try again later.|Impossible de charger ce passage. Réessayez plus tard.|No se pudo cargar este pasaje. Inténtalo más tarde.', 'days of prayer|jours de prière|días de oración', 'My month of prayer|Mon mois de prière|Mi mes de oración', 'Open the Library|Ouvrir la bibliothèque|Abrir la biblioteca', 'Check off a prayer in any book and your days of prayer start to show here.|Cochez une prière dans n’importe quel livre et vos jours de prière apparaîtront ici.|Marca una oración en cualquier libro y tus días de oración empezarán a aparecer aquí.', 'Welcome|Bienvenue|Bienvenido', 'Your pace|À votre rythme|A tu ritmo', 'Every day|Chaque jour|Cada día', 'Follow phone|Suivre le téléphone|Seguir el teléfono', 'Three books in one place|Trois livres réunis|Tres libros en un solo lugar', 'Covenant Prayers, Jesus Chosen Fast and Prayer, and the Weekly Kingdom Prayers, with new prayers every Monday.|Les Prières de l’alliance, Le jeûne choisi de Jésus et la prière, et les Prières hebdomadaires du Royaume, avec de nouvelles prières chaque lundi.|Oraciones del pacto, El ayuno escogido de Jesús y la oración, y las Oraciones semanales del Reino, con nuevas oraciones cada lunes.', 'Pray and keep track|Priez et suivez vos progrès|Ora y sigue tu progreso', 'Check off prayers as you go, build a daily plan, save favorites and bookmarks, and see your days of prayer in Stats.|Cochez les prières au fil de votre lecture, créez un plan quotidien, enregistrez favoris et signets, et retrouvez vos jours de prière dans Statistiques.|Marca las oraciones a medida que avanzas, crea un plan diario, guarda favoritos y marcadores, y mira tus días de oración en Estadísticas.', 'Listen, read and remember|Écoutez, lisez, souvenez-vous|Escucha, lee y recuerda', 'Have prayers read aloud, tap any Bible reference to read it, and set daily reminders from the profile menu. The app follows your phone’s language: English, French or Spanish.|Faites lire les prières à voix haute, touchez une référence biblique pour la lire et réglez des rappels quotidiens depuis le menu du profil. L’app suit la langue de votre téléphone : anglais, français ou espagnol.|Escucha las oraciones en voz alta, toca cualquier referencia bíblica para leerla y configura recordatorios diarios desde el menú del perfil. La app sigue el idioma de tu teléfono: inglés, francés o español.', 'Overcomer’s Library|Overcomer’s Library|Overcomer’s Library', 'Share this month|Partager ce mois|Compartir este mes', 'Milestones|Étapes|Hitos', 'This month|Ce mois-ci|Este mes', 'Share this month|Partager ce mois|Compartir este mes', 'Get started|Commencer|Empezar', 'Next|Suivant|Siguiente', 'Skip|Passer|Omitir', 'Back|Retour|Atrás'
  ];
  var DICT = { fr: {}, es: {} };
  RAW.forEach(function (r) { var p = r.split('|'); DICT.fr[p[0]] = p[1]; DICT.es[p[0]] = p[2]; });
  var RUNTIME = { fr: {}, es: {} };

  var PAT = [
    [/^(\d+) of (\d+) chapters$/, { fr: '$1 chapitres sur $2', es: '$1 de $2 capítulos' }],
    [/^(\d+) prayer books · (\d+) for spiritual nourishment$/, { fr: '$1 livres de prière · $2 de nourriture spirituelle', es: '$1 libros de oración · $2 de alimento espiritual' }],
    [/^(\d+) of (\d+) prayed$/, { fr: '$1 sur $2 priées', es: '$1 de $2 oradas' }],
    [/^(\d+) of (\d+) done$/, { fr: '$1 sur $2 faites', es: '$1 de $2 hechas' }],
    [/^(\d+) of (\d+) prayers checked$/, { fr: '$1 prières cochées sur $2', es: '$1 de $2 oraciones marcadas' }],
    [/^(\d+) prayers?$/, { fr: '$1 prières', es: '$1 oraciones' }],
    [/^(\d+) days?$/, { fr: '$1 jours', es: '$1 días' }],
    [/^(\d+) weeks?$/, { fr: '$1 semaines', es: '$1 semanas' }],
    [/^(\d+) days? prayed$/, { fr: '$1 jours de prière', es: '$1 días de oración' }],
    [/^Week of (.+)$/, { fr: 'Semaine du $1', es: 'Semana del $1' }],
    [/^Latest · (.+)$/, { fr: 'Dernière · $1', es: 'Última · $1' }],
    [/^Pray all (\d+) prayers$/, { fr: 'Prier les $1 prières', es: 'Orar las $1 oraciones' }],
    [/^Favorites · (\d+)$/, { fr: 'Favoris · $1', es: 'Favoritos · $1' }],
    [/^Bookmarks · (\d+)$/, { fr: 'Signets · $1', es: 'Marcadores · $1' }],
    [/^(\d+) more days?$/, { fr: 'Encore $1 jours', es: 'Faltan $1 días' }]
  ];
  function tr(s, lang) {
    lang = lang || LANG; if (lang === 'en' || !s) return s;
    var d = DICT[lang][s]; if (d != null) return d;
    d = RUNTIME[lang][s]; if (d != null) return d;
    for (var i = 0; i < PAT.length; i++) if (PAT[i][0].test(s)) return s.replace(PAT[i][0], PAT[i][1][lang]);
    return null;
  }
  function t(s) { var r = tr(s); return r == null ? s : r; }

  /* ---------- cache (IndexedDB) ---------- */
  function idb() {
    if (idb.p) return idb.p;
    idb.p = new Promise(function (res) { try { var r = indexedDB.open('gra-i18n', 1); r.onupgradeneeded = function () { r.result.createObjectStore('t'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; } catch (e) { res(null); } });
    return idb.p;
  }
  function cGet(keys) { return idb().then(function (db) { if (!db) return {}; return new Promise(function (res) { var out = {}; try { var tx = db.transaction('t', 'readonly'), st = tx.objectStore('t'); keys.forEach(function (k) { var q = st.get(k); q.onsuccess = function () { if (q.result != null) out[k] = q.result; }; }); tx.oncomplete = function () { res(out); }; tx.onerror = function () { res(out); }; } catch (e) { res(out); } }); }); }
  function cPut(obj) { return idb().then(function (db) { if (!db) return; return new Promise(function (res) { try { var tx = db.transaction('t', 'readwrite'), st = tx.objectStore('t'); Object.keys(obj).forEach(function (k) { st.put(obj[k], k); }); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); }); }
  function cClear() { return idb().then(function (db) { if (!db) return; return new Promise(function (res) { try { var tx = db.transaction('t', 'readwrite'); tx.objectStore('t').clear(); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); }); }

  // Admin edits bump updated_at; when it moves, drop the device cache so edits show up.
  var fresh = null;
  function freshen() {
    if (fresh) return fresh;
    fresh = (async function () {
      if (navigator.onLine === false) return;
      try {
        var r = await fetch(SB + '/rest/v1/translations?select=updated_at&order=updated_at.desc&limit=1', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
        if (!r.ok) return; var j = await r.json(), stamp = j[0] && j[0].updated_at; if (!stamp) return;
        if (get('gra-i18n-stamp') !== stamp) { await cClear(); set('gra-i18n-stamp', stamp); }
      } catch (e) {}
    })();
    return fresh;
  }

  /* ---------- bundled translations (i18n-fr.json / i18n-es.json) ---------- */
  // Weekly prayers are hand-translated into i18n-fr.json / i18n-es.json. Set REMOTE to true once the Supabase "translate" function and DeepL key are live.
  var REMOTE = false, STATIC = {};
  function loadStatic(lang) {
    if (STATIC[lang]) return STATIC[lang];
    var base = /\/(covenant|jcfp|weekly|admin)\/?(index\.html)?$/.test(location.pathname) ? '../' : '';
    STATIC[lang] = fetch(base + 'i18n-' + lang + '.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    return STATIC[lang];
  }

  /* ---------- remote translation ---------- */
  async function translate(texts, lang, remote) {
    lang = lang || LANG; var out = {}; if (lang === 'en') { texts.forEach(function (s) { out[s] = s; }); return out; }
    var st = await loadStatic(lang);
    texts = texts.filter(function (s) { if (s && st[s] != null) { out[s] = st[s]; return false; } return !!s; });
    if (!texts.length || !(REMOTE || remote)) return out;
    await freshen();
    var uniq = Array.from(new Set(texts.filter(Boolean))), keys = uniq.map(function (s) { return lang + '\u0001' + s; });
    var hit = await cGet(keys), miss = [];
    uniq.forEach(function (s, i) { if (hit[keys[i]] != null) out[s] = hit[keys[i]]; else miss.push(s); });
    if (!miss.length || navigator.onLine === false) return out;
    var chunks = []; for (var i = 0; i < miss.length; i += 80) chunks.push(miss.slice(i, i + 80));
    var put = {};
    async function run(ch) {
      try {
        var r = await fetch(SB + '/functions/v1/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: JSON.stringify({ texts: ch, lang: lang }) });
        if (!r.ok) return; var j = await r.json();
        (j.out || []).forEach(function (v, n) { if (v != null) { out[ch[n]] = v; put[lang + '\u0001' + ch[n]] = v; } });
      } catch (e) {}
    }
    for (var c = 0; c < chunks.length; c += 3) await Promise.all(chunks.slice(c, c + 3).map(run));
    await cPut(put);
    return out;
  }

  /* ---------- book / weekly data ---------- */
  var SKIP = { ref: 1, refs: 1, n: 1, o: 1, o2: 1, u: 1, id: 1, kind: 1, link: 1, week_of: 1, publish_at: 1, created_at: 1, updated_at: 1, updated_by_email: 1, list: 1, href: 1, key: 1, orig: 1, date: 1, name: 1, sub: 1 };
  var CONTENT = new Set(), CONTENT_ARR = [];
  function addContent(s) { if (!CONTENT.has(s)) { CONTENT.add(s); if (s.length > 12) CONTENT_ARR.push(s); } }
  function collect(o, acc) {
    if (Array.isArray(o)) { o.forEach(function (x) { collect(x, acc); }); return; }
    if (!o || typeof o !== 'object') return;
    for (var k in o) { if (SKIP[k] || k === 'verses') continue; var v = o[k]; if (typeof v === 'string') { if (/[A-Za-z]/.test(v)) acc.add(v); } else collect(v, acc); }
  }
  function apply(o, m) {
    if (Array.isArray(o)) return o.map(function (x) { return apply(x, m); });
    if (!o || typeof o !== 'object') return o;
    var r = {}; for (var k in o) { var v = o[k]; r[k] = SKIP[k] ? v : k === 'verses' ? [] : typeof v === 'string' ? (m[v] != null ? m[v] : v) : apply(v, m); }
    return r;
  }
  async function translateData(data, lang, remote) {
    lang = lang || LANG; if (lang === 'en' || !data) return { data: data, complete: true };
    var acc = new Set(); collect(data, acc); var list = Array.from(acc);
    list.forEach(addContent);
    var m = await translate(list, lang, remote), done = 0;
    list.forEach(function (s) { if (m[s] != null) { done++; addContent(m[s]); } });
    return { data: apply(data, m), complete: done === list.length };
  }

  /* ---------- DOM: translate interface text in place ---------- */
  var ATTRS = ['placeholder', 'aria-label', 'title'], pending = new Set(), asked = new Set(), timer = null;
  function skipEl(el) { return !el || (el.closest && el.closest('script,style,textarea,input,[data-i18n-skip],[contenteditable="true"]')); }
  function contentish(s) { if (CONTENT.has(s)) return true; if (s.length < 14) return false; for (var i = 0; i < CONTENT_ARR.length; i++) if (CONTENT_ARR[i].indexOf(s) >= 0) return true; return false; }
  function queue(s) {
    if (asked.has(s) || s.length < 2 || s.length > 160 || /@|https?:/.test(s) || !/[A-Za-z]{2}/.test(s) || /^[\d\s.,:;·\/%×+−\-–()]+$/.test(s) || contentish(s)) return;
    pending.add(s); clearTimeout(timer); timer = setTimeout(flush, 700);
  }
  async function flush() {
    var list = Array.from(pending); pending.clear(); list.forEach(function (s) { asked.add(s); }); if (!list.length) return;
    var m = await translate(list, LANG), any = false;
    list.forEach(function (s) { if (m[s] != null && m[s] !== s) { RUNTIME[LANG][s] = m[s]; any = true; } });
    if (any) walk(document.body);
  }
  function trText(n) {
    var v = n.nodeValue; if (!v || n.__gt === v || !/[A-Za-z]/.test(v) || skipEl(n.parentElement)) return;
    var s = v.trim(), r = tr(s);
    if (r == null) { queue(s); return; }
    if (r === s) return; var out = v.replace(s, r); n.__gt = out; n.nodeValue = out;
  }
  function trAttrs(el) {
    if (skipEl(el) && !(el.tagName === 'INPUT' && el.hasAttribute('placeholder'))) return;
    for (var i = 0; i < ATTRS.length; i++) { var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a); if (!v || el['__ga' + a] === v || !/[A-Za-z]/.test(v)) continue; var r = tr(v.trim()); if (r == null) { queue(v.trim()); continue; } el['__ga' + a] = r; if (r !== v) el.setAttribute(a, r); }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { trText(root); return; }
    if (root.nodeType !== 1) return;
    trAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) trText(n); else trAttrs(n); }
  }
  var obs = null, q = [], raf = 0;
  function startDom() {
    if (LANG === 'en' || obs || typeof MutationObserver === 'undefined') return;
    var go = function () {
      walk(document.body);
      obs = new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'characterData') q.push(m.target); else if (m.type === 'attributes') q.push(m.target); else m.addedNodes.forEach(function (x) { q.push(x); }); }); if (!raf) raf = requestAnimationFrame(function () { raf = 0; var l = q; q = []; l.forEach(walk); }); });
      obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }

  /* ---------- dates in the chosen language ---------- */
  if (LANG !== 'en') {
    ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString'].forEach(function (f) { var o = Date.prototype[f]; Date.prototype[f] = function (l, opt) { return o.call(this, l == null ? LOCALE[LANG] : l, opt); }; });
    try { document.documentElement.lang = LANG; } catch (e) {}
  }

  /* ---------- Scripture: Louis Segond 1910 / Reina-Valera 1909 ---------- */
  var BK = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth', '1samuel', '2samuel', '1kings', '2kings', '1chronicles', '2chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi', 'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1corinthians', '2corinthians', 'galatians', 'ephesians', 'philippians', 'colossians', '1thessalonians', '2thessalonians', '1timothy', '2timothy', 'titus', 'philemon', 'hebrews', 'james', '1peter', '2peter', '1john', '2john', '3john', 'jude', 'revelation'];
  var ALIAS = { psalm: 19, ps: 19, psa: 19, song: 22, songofsongs: 22, canticles: 22, jas: 59, jn: 43, jhn: 43, mt: 40, mk: 41, mrk: 41, lk: 42, jdg: 7, judg: 7, phm: 57, philem: 57, jud: 65, revelations: 66, ezek: 26, eze: 26, ezk: 26 };
  function bookNr(name) {
    var n = name.toLowerCase().replace(/^(i{1,3})\s+/, function (m, r) { return r.length + ''; }).replace(/first\s*/, '1').replace(/second\s*/, '2').replace(/third\s*/, '3').replace(/[^a-z0-9]/g, '');
    if (ALIAS[n]) return ALIAS[n];
    var i = BK.indexOf(n); if (i >= 0) return i + 1;
    if (n.length >= 2) for (i = 0; i < BK.length; i++) if (BK[i].indexOf(n) === 0) return i + 1;
    return 0;
  }
  var chap = {};
  async function chapter(tid, b, c) {
    var k = tid + '/' + b + '/' + c; if (chap[k]) return chap[k];
    var cached = await cGet(['bible\u0001' + k]); if (cached['bible\u0001' + k]) return (chap[k] = cached['bible\u0001' + k]);
    var r = await fetch('https://api.getbible.net/v2/' + tid + '/' + b + '/' + c + '.json'); if (!r.ok) throw new Error('bible');
    var j = await r.json(), v = { name: j.book_name, verses: (j.verses || []).map(function (x) { return { n: x.verse, text: String(x.text).replace(/\s+/g, ' ').trim() }; }) };
    var o = {}; o['bible\u0001' + k] = v; cPut(o); return (chap[k] = v);
  }
  async function bible(ref, lang) {
    lang = lang || LANG; var B = BIBLE[lang]; if (!B) throw new Error('lang');
    var parts = ref.split(/\s*;\s*/).filter(Boolean), out = [], last = 0, multi = parts.length > 1;
    for (var p = 0; p < parts.length; p++) {
      var s = parts[p].replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
      var m = /^((?:[1-3]|i{1,3})?\s*[A-Za-z][A-Za-z ]*?)\s*(\d+)(?:\s*:\s*([\d\s,\-–]+?))?(?:\s*[-–]\s*(\d+)\s*:\s*(\d+))?\s*$/.exec(s), b, c, spec, c2, v2;
      if (m) { b = bookNr(m[1]); c = +m[2]; spec = m[3]; c2 = m[4] ? +m[4] : 0; v2 = m[5] ? +m[5] : 0; }
      else { var m2 = /^(\d+)(?:\s*:\s*([\d\s,\-–]+))?$/.exec(s); if (!m2 || !last) continue; b = last; c = +m2[1]; spec = m2[2]; }
      if (!b) continue; last = b;
      if (c2) {
        for (var cc = c; cc <= c2; cc++) { var ch = await chapter(B.id, b, cc), lo = cc === c ? +(spec || '1').split(/[-–,]/)[0] : 1, hi = cc === c2 ? v2 : 999; ch.verses.forEach(function (v) { if (v.n >= lo && v.n <= hi) out.push({ n: ch.name.slice(0, 3) + ' ' + cc + ':' + v.n, text: v.text }); }); }
        continue;
      }
      var chp = await chapter(B.id, b, c), want = null;
      if (spec) { want = new Set(); spec.split(',').forEach(function (r) { var a = r.split(/[-–]/).map(function (x) { return +x.trim(); }); for (var k = a[0]; k <= (a[1] || a[0]); k++) want.add(k); }); }
      chp.verses.forEach(function (v) { if (!want || want.has(v.n)) out.push({ n: (multi ? chp.name.slice(0, 3) + ' ' + c + ':' : '') + v.n, text: v.text }); });
    }
    if (!out.length) throw new Error('empty');
    return out;
  }

  window.GRAi18n = {
    lang: LANG, names: NAMES, book: BOOK, tts: TTS[LANG], locale: LOCALE[LANG], bibleLabel: BIBLE[LANG] ? BIBLE[LANG].label : 'KJV',
    pref: pref, bookPref: bookPref, phone: phone, resolve: resolve,
    setPref: function (p) { set('gra-lang', p === 'auto' ? null : p); },
    setBookPref: function (b, p) { set('gra-lang-' + b, p === 'app' ? null : p); },
    t: t, tr: tr, translate: translate, translateData: translateData, bible: bible, walk: function () { walk(document.body); }, start: startDom,
    prewarm: async function (data) { for (var l of ['fr', 'es']) await translateData(data, l); }
  };
  startDom();
})();
