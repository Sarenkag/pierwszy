# Moduł Wstecz (`moduly/wstecz`)

**Zasada (Grzegorz 08/11/2026):** „back powinien cofać max o poziom wyżej lub spuszczać dane okienko”.
Jedno miejsce obsługi systemowego klawisza/gestu Wstecz telefonu w całej apce (ekrany apki i formularze inspekcji).

Wstecz telefonu, po kolei:
1. zamyka okienko na wierzchu: podgląd zdjęcia i edytor (`moduly/aparat`), pytania (`OESTPytaj`), okienka ekranu głównego, podgląd raportu;
2. robi to samo co strzałka ‹ widocznego ekranu (jeden poziom wyżej): aparat → ta sama inspekcja → lista, z której przyszedł → ekran główny;
3. na ekranie głównym: okienko „Chcesz wyjść z aplikacji?” (Tak / Nie, EN: „Do you want to exit the app?” Yes / No). Wstecz w okienku = Nie.

Bez modułu Android cofał się po całej historii przeglądania (nawet kilkanaście naciśnięć do ekranu głównego, powrót do zamkniętej inspekcji).

## Użycie
```js
// strona (raz): jak dojść poziom wyżej, gdy ekran nie ma strzałki ‹, który ekran jest główny i okienko pytania apki
OESTWstecz.ustaw({ pytaj: OESTPrzycisk.confirm, glowny: () => trasa === "home", gora: () => { idzDoGlownego(); return true; } });
// okienko bez wpisu w historii (np. podgląd zdjęcia): rejestracja przy otwarciu, zwolnienie przy zamknięciu
const zwolnij = OESTWstecz.okno(() => zamknij(null));
OESTWstecz.wstecz(); // to, co robi klawisz (testy w przeglądarce)
```
W telefonie moduł słucha `backButton` wtyczki `@capacitor/app` – to wyłącza domyślne cofanie Androida po historii WebView.
Ekran apki otwarty od razu w głębi (np. powrót z inspekcji na `#settings/reports`) dostaje historię = drogę od ekranu głównego (`app/www/index.html`), więc ‹ i Wstecz idą o jeden poziom wyżej.

Strona: `<script src="moduly/wstecz/wstecz.js"></script>` (inspekcje: `../moduly/wstecz/wstecz.js`), przed `moduly/aparat`.
Test: `app/tests/wstecz-ui-check.cjs`. Nie zastępuje sprawdzenia gestu Wstecz na Pixelu 8 Pro.
