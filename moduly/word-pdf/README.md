# moduly/word-pdf – PDF z wypełnionego Worda (08/11/2026)

**Kontrakt:** `OESTWordPdf.pdf(docxBytes, { PizZip, jsPDF, czcionka, skala? })` → `Uint8Array` (PDF).
- `czcionka` – obiekt z `dodaj(pdf)` rejestrujący czcionkę `DV` (`moduly/czcionka-pdf`),
- `skala` – mnożnik wielkości czcionki (domyślnie 0,88: DejaVu jest szerszy od Times/Calibri, wiersze łamią się wtedy jak w Wordzie).

**Po co:** zasada „każdy raport w dwóch identycznych wersjach Word i PDF”. Dla formularza firmy (np. QHS-031 Temperature Log Record) PDF jest rysowany z TEGO SAMEGO wypełnionego Worda, więc treść jest identyczna z założenia, a układ to układ formularza.

**Co obsługuje:** strona i marginesy z `sectPr` (także poziomo), nagłówek i stopka (tekst, tabela, logo), akapity (wyrównanie, tabulatory, pogrubienie, wielkość, WIELKIE LITERY, zakreślenie), tabele (siatka, `gridSpan`, `vMerge`, obramowania pojedyncze/podwójne/kropkowane, wysokość wierszy, wyrównanie w pionie), łamanie stron między wierszami tabeli.

**Czego nie obsługuje:** pływające obrazy z pozycją bezwzględną, pola tekstowe (text box), kolumny, cieniowanie komórek, przypisy. Nowy wzór Word trzeba sprawdzić testem Word = PDF.

**Konsumenci:** `inspekcje/index.html` – raport temperatur TB (EFA-INS-024).

**Zależności:** `DOMParser` (przeglądarka / WebView), PizZip, jsPDF, `moduly/czcionka-pdf`. Brak zależności od OEST.

**Testy:** `app/tests/word-pdf-ui-check.cjs`, `app/tests/raport-ui-check.cjs` (pomiary w kolejności tabeli w Wordzie i w PDF).
