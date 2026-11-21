# moduly/word-pdf – PDF z wypełnionego Worda silnikiem LibreOffice (21/11/2026)

**Kontrakt:**
- `OESTWordPdf.dostepny()` → `true`, gdy w apce jest silnik LibreOffice (wtyczka Capacitor `LibreOffice`, `app/android/.../LibreOfficePlugin.java`, silnik dokłada CI: `app/scripts/libreoffice-silnik.py`).
- `OESTWordPdf.zWorda(docxBytes)` → `Promise<Uint8Array | null>` – PDF z tego samego Worda.
- `OESTWordPdf.zWordow([docx, …], PDFLib?)` → `Promise<Uint8Array | null>` – każdy Word przez silnik, strony sklejone biblioteką pdf-lib (Flushing: formularz firmy + basic form w jednym PDF).

`null` = PDF nie powstał (brak silnika: przeglądarka, testy bez atrapy; albo błąd silnika). Wywołujący wysyła wtedy sam Word i mówi to wprost. Własnego rysownika PDF nie ma (Grzegorz 21/11/2026: „mamy profesjonalny sprzęt”). To jedyne miejsce w JS, które woła wtyczkę (adapter R22).

**Konsumenci:** `inspekcje/index.html` (`buildAll`: każdy PDF raportu inspekcji), `app/www/reactive-report.js` (Reactive, Job Sheet).

**Zależności:** wtyczka `LibreOffice`, pdf-lib 1.17.1 (`window.PDFLib`, `docs/ZALEZNOSCI.md`). Brak zależności od OEST.

**Testy:** `app/tests/pdf-z-docx-ui-check.cjs` (każdy PDF z tych samych bajtów wysyłanego Worda, atrapa silnika), workflow „PDF z Worda – emulator” (prawdziwy silnik na Androidzie).
