# moduly/word – jeden silnik Word dla całej apki (24/11/2026)

**Po co:** wcześniej Word składały trzy kopie kodu (inspekcje `i-word.js`/`i-ustawienia.js`, Reactive `reactive-report.js`, podgląd w `raporty.js`). Grzegorz 24/11/2026: „zmiana w jednym miejscu działa wszędzie” – teraz każdy plik .docx w apce przechodzi przez ten moduł. Bramka pilnuje tego wpisem `word-silnik` w `quality/jedno-miejsce.json`.

**Kontrakt (`OESTWord`):**
- `wypelnij(wzor, dane, zdjecia, { uklad, autor })` → `Uint8Array` – wzór z nawiasami `{pole}`; zdjęcia: układ `"siatka"` (domyślny, inspekcje) albo `"przed-po"` (Reactive).
- `zdjeciaKartki(zdjecia, male)` → Word z samych zdjęć formularza z kartki.
- `zmien(wzor, { "word/document.xml": fn, … })` → wzór firmy z podmianą tekstu (Flushing, temperatury).
- `otworz(bajty)`, `nowy()`, `zapisz(zip)` – składanie wzorów (`moduly/wzory`).
- `info(wzor)` (nagłówek, stopka, logo), `tekst(wzor)`, `podglad(docx)` (Moje raporty), `photoPages`, `photoGrid`.

**Konsumenci:** strona inspekcji (`i-ustawienia.js`, `i-raport.js`, `i-checklista.js`), `app/www/reactive-report.js`, `moduly/raporty/przegladarka.js`, `moduly/wzory/wzory.js`.

**Zależności:** PizZip, docxtemplater (`docs/ZALEZNOSCI.md`), `moduly/narzedzia` (esc). PDF z gotowego Worda robi `moduly/word-pdf`.

**Testy:** `app/tests/report-template.test.cjs`, `reactive-report.test.cjs`, `wzory.test.cjs`, `flush.test.cjs`.
