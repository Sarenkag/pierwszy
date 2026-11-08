# moduly/czcionka-pdf – czcionka raportów PDF (08/11/2026)

**Kontrakt:** `OESTCzcionkaPdf.dodaj(pdf)` rejestruje w obiekcie jsPDF czcionkę `DV` (DejaVu Sans, `normal` i `bold`) i zwraca `pdf`. Potem `pdf.setFont("DV", "normal" | "bold")`.

**Po co:** wbudowane czcionki jsPDF znają tylko Latin-1 – „—”, „☑”, polskie litery wychodziły jako krzaki albo obrazki, przez co tekst PDF różnił się od Worda. Jedna czcionka dla wszystkich raportów PDF.

**Konsumenci:** `inspekcje/index.html` (raport podstawowy, Flushing), `app/www/reactive-report.js` (Reactive), `moduly/word-pdf` (formularze firmy).

**Zależności:** jsPDF (`addFileToVFS`, `addFont`). Brak zależności od OEST.

**Testy:** `app/tests/word-pdf-ui-check.cjs` (Word = PDF dla 27 inspekcji i Reactive), `app/tests/raport-ui-check.cjs`.

**Ograniczenia:** ok. 80 KB (base64) wczytywane razem ze stroną; DejaVu jest szerszy od Calibri/Times.
