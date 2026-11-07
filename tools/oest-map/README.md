# OEST — mapa połączeń (prototyp V1)

Wyłącznie narzędzie diagnostyczne. Nie jest częścią aplikacji Android ani procesu generowania APK.

## Uruchomienie
Otwórz \`tools/oest-map/index.html\` w zwykłej przeglądarce (np. pobierz plik z GitHub Raw i otwórz lokalnie). Widok sam odczytuje najnowsze publicznie dostępne źródła gałęzi \`main\` GitHuba. Nie potrzebuje instalacji, API key, GitHub Actions ani Node. GitHub Pages można dodać później po weryfikacji, bez zmieniania aplikacji.

## Co znaczy połączenie?
- Zielona linia: statyczny \`<script src>\` albo \`<link href>\` z dwóch HTML; pliki zewnętrzne CDN nie są mapowane.
- Niebieska przerywana: wykryto odwołanie do nazwy \`window.OEST*\` w pliku oraz przypisanie do tego samego symbolu w drugim pliku. To tylko syntaktyczne powiązanie — nie dowód, że wywołanie zaszło.
- „Brak krawędzi” NIE znaczy „brak zależności”. Nie są analizowane m.in. dynamiczne importy, nazwy złożone w runtime, natywne pluginy Android, IndexedDB, przepływ danych, CSS dependencies, ukryte zależności i interakcje użytkownika.

## Zasady wiarygodności
- Każda nazwa pliku pochodzi z aktualnego drzewa GitHub; gdy plik nie może być odczytany, pokazujemy błąd, nie zmyślony pełny diagram.
- Kliknięcie węzła pokazuje jego nazwę, plik źródłowy, typ i krawędzie z identyfikatorem dowodu.
- Eksport JSON zawiera SHA pobranego drzewa i listę krawędzi. Uwaga: w trakcie równoległych commitów \`main\` może się przesunąć, więc wersja V1 nie gwarantuje atomowego snapshotu; do audytu wymagającego ścisłego SHA trzeba przypiąć pobranie źródeł do commita.
- Status „gotowe/zweryfikowane” nie jest tu automatycznie wyliczany. To narzędzie do eksploracji, nie test E2E.

## Następny etap (po odrębnej zgodzie)
Zasilić widok raportami ze skanera uruchamianego w CI na pojedynczym SHA (bez publicznych API/limitów), dodać widoki ekranów/nawigacji oraz etykiety dynamicznego przepływu danych; dopiero później rozważyć automatyczny GitHub Pages i interaktywną edycję.
