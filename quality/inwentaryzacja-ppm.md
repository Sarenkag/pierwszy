# Inwentaryzacja pozostałych typów PPM (07/11/2026)

Zlecenie Grzegorza (07/11/2026): spisać DB, Isolators i podwykonawców, **bez dodawania arbitralnych wymagań dotyczących raportów**.
Ten plik jest tylko spisem stanu. Nic z niego nie jest bramką Quality Gate – `raport-ui-check.cjs` sprawdza wyłącznie inspekcje EFA-INS.

Źródło listy: `window.OEST_PPM.tasks` z `app/www/ppm.js` (odczyt: `app/tests/ppm-lista.cjs`). Zachowanie sprawdzone w przeglądarce (Chromium, 412×900)
przez otwarcie `inspekcje/index.html#ppm=<id>` – tak jak dotknięcie klocka na liście PPM – dodanie jednego zdjęcia, „Wszystko OK” i Wyślij z domyślnym ⚙.

| Typ | Zadań | Co otwiera klocek | Formularz | Wyślij (domyślne ⚙) | Uwagi |
|---|---|---|---|---|---|
| EFA-INS (katalog inspekcji) | 27 | formularz inspekcji | wg `ppm.js forms` / skan kartki / pomiary | Word + PDF | w bramce: `raport-ui-check.cjs`, każda z 27 |
| Distribution Boards (`db-*`, `open: "db"`) | 18 | od razu formularz danej rozdzielnicy | istniejący typ `db` – 16 punktów | Word + PDF (18/18) | jedna rozdzielnica = osobna inspekcja i termin |
| Isolators (`iso`, `open: "iso"`) | 1 | lista urządzeń „Local Isolators” | typ `iso` (pytania ogólne + powody, „ask”) | brak – lista jest pusta (`devices: []`) | brakuje rejestru 27 izolatorów i pytań SFG20 (czeka na materiały) |
| In-house bez zleceń Vantify (`shower`, `ahu`, `efans`, `odh`, `hru`) | 5 | formularz ogólny „<nazwa> - Inspection” | 6 ogólnych punktów (GENERIC_CPS) + zdjęcie | Word + PDF | przywrócone 09/11/2026 (zgoda Grzegorza); bez terminu, dopóki nie ma zlecenia w Vantify albo Update |
| Podwykonawcy (`s-*`, grupa `sub`) | 19 | formularz ogólny „<nazwa> - Inspection” | 6 ogólnych punktów (GENERIC_CPS) + zdjęcie | Word + PDF (19/19) | wykonuje firma zewnętrzna (`by`); czy inżynier ma tu tworzyć raport – decyzja właściciela |

Razem w apce: **70** kart (27 + 18 + 1 + 5 + 19) = 78 zadań Vantify, bo 8 zadań Sub jest zebranych w karty z innym zadaniem (test: `app/tests/ppm-78.test.cjs`). Błędów JavaScript przy otwieraniu: 0.

## Podwykonawcy – lista

s-fa Fire Alarm System (Thompson Group, 3M) · s-refuge Disabled Refuge System (Thompson Group, 6M) · s-intruder Intruder Alarms (Thompson Group, 6M) ·
s-cctv CCTV (Thompson Group, 6M) · s-access Door Access Control (Thompson Group, 12M) · s-icv Sprinkler ICVs, Sprinkler ZoneCheck (J&J Fire, 3M) ·
s-spumps Commercial Sprinkler Pumps (J&J Fire, 6M+12M) · s-risers Dry Risers (J&J Fire, 6M+12M) · s-smoke AOVs, Smoke Extraction, Smoke Control System (Smoke Control Solutions, 6M) ·
s-dampers Fire Dampers (Adexsi, 12M) · s-ahu Air Handling Units (Accent, 6M) · s-vrv VRVs (Accent, 6M+12M) · s-lcs Lighting Control System (ZEN Controls, 6M) ·
s-doors Automatic Doors (Geze, 6M) · s-lightning Lightning Protection (Cuttings / Omega Red, 11M) · s-hygiene Water Hygiene Sampling, CWST Inspections (Hydrocert, 6M) ·
s-cwst Cold Water Storage Tank (Hydrocert, 6M+12M) · s-pat Portable Appliance Testing (bez firmy, 12M) · s-spa Monthly Spa Maintenance & Sampling (bez firmy, 1M)

## Niespójności do decyzji właściciela (nie poprawiane)

1. ~~78 vs 65~~ – wyjaśnione 09/11/2026: 8 zadań Sub zebranych w karty, 5 in-house wypadło 31/10/2026 i wróciło (`ppm-78.test.cjs` pilnuje pełnej listy 78).
2. Nagłówek `app/www/ppm.js` mówi „28 inspekcji startowych”, a lista ma 27 (EFA-INS-028 usunięte 02/11/2026 – zlecenie reactive w Vantify). Komentarz nieaktualny.
3. Isolators: klocek otwiera pustą listę, więc z PPM nie da się wykonać tej inspekcji (znane: brak rejestru 27 izolatorów).
4. Podwykonawcy dostają ogólny formularz inżyniera z 6 punktami. Nie wiadomo, czy to zamierzone (np. odnotowanie wizyty firmy), czy powinni mieć inny tryb – nie dodaję wymagań.
