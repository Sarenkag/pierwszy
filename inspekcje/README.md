# Inspekcje

Aplikacja na telefon do raportów z inspekcji (checklista + zdjęcia → DOCX i PDF, raporty po angielsku).

- Rodzaje: Distribution Boards, ATS, Local Isolators.
- Szybki tryb: urządzenie → usterki jednym dotknięciem / checklista (domyślnie OK) → zdjęcie → data (proponowana ze zdjęcia) → **Do kolejki**.
- Działa bez zasięgu: raport powstaje w telefonie i czeka w kolejce. Kolejka wysyła się sama, gdy wróci sieć (apka musi być otwarta).
- Wysyłka i zapis idą przez Google Apps Script na Twoim koncie (Gmail + Google Drive).

Pliki:
- `index.html` — aplikacja.
- `sw.js`, `manifest.webmanifest`, `icon-*.png` — instalacja na ekranie głównym i praca offline.
- `Code.gs.txt` — wzór skryptu Apps Script (dane obiektu i listy urządzeń uzupełnia się w kopii na koncie Google).

## Wdrożenie (raz, na laptopie, ok. 15 min)

### 1. Skrypt Google
1. Wejdź na https://script.google.com → **Nowy projekt**. Nazwij go „Inspekcje”.
2. Usuń zawartość `Code.gs` i wklej całą treść `Code.gs.txt` z tego folderu.
3. Uzupełnij `CFG` na górze: `email`, `site`, `engineer` i listy urządzeń w `devices` (`db`, `ats`, `iso` — rejestr 27 izolatorów).
4. Zapisz (Ctrl+S).
5. Na górze wybierz funkcję **ustawKlucz** → **Uruchom**. Google poprosi o zgody (Drive, Gmail, połączenia zewnętrzne): **Zezwól**. Przy „Google nie zweryfikował tej aplikacji” kliknij **Zaawansowane → Przejdź do Inspekcje**. To Twój własny skrypt.
6. **Wdróż → Nowe wdrożenie** → typ **Aplikacja internetowa**:
   - Wykonaj jako: **Ja**
   - Kto ma dostęp: **Każdy** (telefon łączy się bez logowania; chroni to klucz z kroku 5)
   - **Wdróż**.
7. Wybierz funkcję **linkDoTelefonu** → **Uruchom**. W **Dzienniku wykonania** pojawi się link zaczynający się od `https://sarenkag.github.io/pierwszy/inspekcje/#api=…`. Skopiuj go i wyślij sobie (np. mailem). Nie udostępniaj go nikomu: zawiera klucz.

Szablon `Szablon - Engineers Report DB.docx` musi leżeć w folderze `Inspekcje` na Twoim Google Drive.

### 2. GitHub Pages (adres apki)
Na https://github.com/Sarenkag/pierwszy → **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)** → **Save**. Po 1–2 minutach apka jest pod https://sarenkag.github.io/pierwszy/inspekcje/.

### 3. Telefon (Pixel)
1. Otwórz link z kroku 1.7 w Chrome. Apka zapamięta adres skryptu i klucz.
2. Sprawdź, że na górze jest „Online” i w Ustawieniach widać „Używany: Szablon - Engineers Report DB.docx”.
3. Menu Chrome (⋮) → **Dodaj do ekranu głównego → Zainstaluj**. Od teraz otwieraj apkę z ikony.

### Zmiany w skrypcie później
Po edycji `Code.gs`: **Wdróż → Zarządzaj wdrożeniami → ✎ → Wersja: Nowa wersja → Wdróż**. Adres zostaje ten sam, telefonu nie trzeba ustawiać od nowa.
