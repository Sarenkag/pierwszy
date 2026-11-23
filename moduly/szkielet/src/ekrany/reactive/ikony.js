// Rysunki Reactive z main (te same ścieżki SVG co w app/www/reactive.js i formularzu inspekcji): klucz na kafelku, aparat i galeria przy zdjęciach.
// ion-icon wstawia SVG do środka, więc currentColor działa jak dawniej (kolor napisu przycisku).
const svg = tresc => 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + tresc + '</svg>'; // ionicons czyta treść po przecinku wprost (bez kodowania, bez przecinków w środku)
const kreska = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
export const KLUCZ = svg('<path ' + kreska + ' stroke-width="1.6" d="M14 5a5 5 0 0 0-6 6L2 17l5 5 6-6a5 5 0 0 0 6-6l-3 3-5-5z"/>');
export const APARAT = svg('<path ' + kreska + ' stroke-width="1.8" d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle ' + kreska + ' stroke-width="1.8" cx="12" cy="13" r="4"/>');
export const GALERIA = svg('<rect ' + kreska + ' stroke-width="1.8" x="3" y="4" width="18" height="16" rx="2"/><path ' + kreska + ' stroke-width="1.8" d="M3 16l5-5 4 4 3-3 6 6"/>');
