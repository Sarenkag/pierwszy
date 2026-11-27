# Legenda nawiasów we wzorach Word (OEST)

Plik generowany automatycznie ze słownika apki (moduly/wzory/wzory.js) poleceniem `node app/scripts/wzory-legenda.cjs`. Nie edytować ręcznie.
Każdy nawias `{nazwa}` we wzorze Word apka zastępuje daną opisaną niżej. Ta sama nazwa znaczy to samo w każdym wzorze.
Nawias spoza tej listy nie zostanie wypełniony (test go zatrzyma). „STARA” = nazwa sprzed wspólnego słownika, do zamiany.

## Słownik

| Nawias | Co wstawia apka | In English | Używają |
|---|---|---|---|
| `{site}` | obiekt | site | basic |
| `{date}` | data inspekcji dd/mm/rrrr | inspection date dd/mm/yyyy | basic |
| `{job number}` | nr zlecenia Vantify | Vantify job number | basic |
| `{engineer}` | inżynier | engineer | basic |
| `{building}` | budynek | building | basic |
| `{level}` | piętro | level | basic |
| `{title}` | rodzaj inspekcji | inspection type | basic |
| `{condition}` | stan ogólny | overall condition | basic |
| `{details}` | opis i ustalenia | details and findings | basic |
| `{quote}` | wycena tak/nie | quote yes/no | basic |
| `{%photos}` | zdjęcia (siatka) | photos (grid) | basic |
| `{o}` STARA | Flushing: nazwa kranu (kod skryptu) | Flushing: outlet name (script code) | flush |
| `{bld}` STARA | Flushing: budynek w nagłówku (kod skryptu, wspólna = building) | Flushing: header building (script code, common = building) | flush |
| `{twr}` STARA | Flushing: wieża w tytule (kod skryptu) | Flushing: tower in title (script code) | flush |
| `{podtytul}` | grupy: linia nad grupami | groups: line above the groups | grupy-basic |
| `{grupy}` | grupy: lista grup | groups: group list | grupy-basic |
| `{nazwa}` | grupy: nazwa grupy (pasek) | groups: group name (bar) | grupy-basic |
| `{licznik}` | grupy: licznik w pasku (np. 5/6) | groups: count in the bar (e.g. 5/6) | grupy-basic |
| `{wiersze}` | grupy: wiersz z 2 punktami | groups: row with 2 points | grupy-basic |
| `{szare}` | grupy: akapity szarej ramki | groups: grey box paragraphs | grupy-basic |
| `{n1}` | grupy: nazwa punktu 1 w wierszu | groups: point 1 name in row | grupy-basic |
| `{u1}` | grupy: szara uwaga punktu 1 | groups: point 1 grey note | grupy-basic |
| `{n2}` | grupy: nazwa punktu 2 w wierszu | groups: point 2 name in row | grupy-basic |
| `{u2}` | grupy: szara uwaga punktu 2 | groups: point 2 grey note | grupy-basic |
| `{y0}` STARA | Flushing: rok 1 (kod skryptu) | Flushing: year 1 (script code) | flush |
| `{y1}` STARA | Flushing: rok 2 (kod skryptu) | Flushing: year 2 (script code) | flush |
| `{y2}` STARA | Flushing: rok 3 (kod skryptu) | Flushing: year 3 (script code) | flush |
| `{y3}` STARA | Flushing: rok 4 (kod skryptu) | Flushing: year 4 (script code) | flush |
| `{y4}` STARA | Flushing: rok 5 (kod skryptu) | Flushing: year 5 (script code) | flush |
| `{y5}` STARA | Flushing: rok 6 (kod skryptu) | Flushing: year 6 (script code) | flush |
| `{ok1}` | Flushing basic: ☑ kran 1 przepłukany | Flushing basic: ☑ outlet 1 flushed | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic, grupy-basic |
| `{no1}` | Flushing basic: ☒ kran 1 nie przepłukany | Flushing basic: ☒ outlet 1 not flushed | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic, grupy-basic |
| `{na1}` | Flushing basic: N/A kran 1 | Flushing basic: N/A outlet 1 | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic, grupy-basic |
| `{note1}` | Flushing basic: notatka kranu 1 | Flushing basic: outlet 1 note | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic |
| `{ok2}` | Flushing basic: ☑ kran 2 przepłukany | Flushing basic: ☑ outlet 2 flushed | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic, grupy-basic |
| `{no2}` | Flushing basic: ☒ kran 2 nie przepłukany | Flushing basic: ☒ outlet 2 not flushed | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic, grupy-basic |
| `{na2}` | Flushing basic: N/A kran 2 | Flushing basic: N/A outlet 2 | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic, grupy-basic |
| `{note2}` | Flushing basic: notatka kranu 2 | Flushing basic: outlet 2 note | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic |
| `{ok3}` | Flushing basic: ☑ kran 3 przepłukany | Flushing basic: ☑ outlet 3 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no3}` | Flushing basic: ☒ kran 3 nie przepłukany | Flushing basic: ☒ outlet 3 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na3}` | Flushing basic: N/A kran 3 | Flushing basic: N/A outlet 3 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note3}` | Flushing basic: notatka kranu 3 | Flushing basic: outlet 3 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok4}` | Flushing basic: ☑ kran 4 przepłukany | Flushing basic: ☑ outlet 4 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no4}` | Flushing basic: ☒ kran 4 nie przepłukany | Flushing basic: ☒ outlet 4 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na4}` | Flushing basic: N/A kran 4 | Flushing basic: N/A outlet 4 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note4}` | Flushing basic: notatka kranu 4 | Flushing basic: outlet 4 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok5}` | Flushing basic: ☑ kran 5 przepłukany | Flushing basic: ☑ outlet 5 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no5}` | Flushing basic: ☒ kran 5 nie przepłukany | Flushing basic: ☒ outlet 5 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na5}` | Flushing basic: N/A kran 5 | Flushing basic: N/A outlet 5 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note5}` | Flushing basic: notatka kranu 5 | Flushing basic: outlet 5 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok6}` | Flushing basic: ☑ kran 6 przepłukany | Flushing basic: ☑ outlet 6 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no6}` | Flushing basic: ☒ kran 6 nie przepłukany | Flushing basic: ☒ outlet 6 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na6}` | Flushing basic: N/A kran 6 | Flushing basic: N/A outlet 6 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note6}` | Flushing basic: notatka kranu 6 | Flushing basic: outlet 6 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok7}` | Flushing basic: ☑ kran 7 przepłukany | Flushing basic: ☑ outlet 7 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no7}` | Flushing basic: ☒ kran 7 nie przepłukany | Flushing basic: ☒ outlet 7 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na7}` | Flushing basic: N/A kran 7 | Flushing basic: N/A outlet 7 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note7}` | Flushing basic: notatka kranu 7 | Flushing basic: outlet 7 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok8}` | Flushing basic: ☑ kran 8 przepłukany | Flushing basic: ☑ outlet 8 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no8}` | Flushing basic: ☒ kran 8 nie przepłukany | Flushing basic: ☒ outlet 8 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na8}` | Flushing basic: N/A kran 8 | Flushing basic: N/A outlet 8 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note8}` | Flushing basic: notatka kranu 8 | Flushing basic: outlet 8 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok9}` | Flushing basic: ☑ kran 9 przepłukany | Flushing basic: ☑ outlet 9 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no9}` | Flushing basic: ☒ kran 9 nie przepłukany | Flushing basic: ☒ outlet 9 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na9}` | Flushing basic: N/A kran 9 | Flushing basic: N/A outlet 9 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note9}` | Flushing basic: notatka kranu 9 | Flushing basic: outlet 9 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok10}` | Flushing basic: ☑ kran 10 przepłukany | Flushing basic: ☑ outlet 10 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no10}` | Flushing basic: ☒ kran 10 nie przepłukany | Flushing basic: ☒ outlet 10 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na10}` | Flushing basic: N/A kran 10 | Flushing basic: N/A outlet 10 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note10}` | Flushing basic: notatka kranu 10 | Flushing basic: outlet 10 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok11}` | Flushing basic: ☑ kran 11 przepłukany | Flushing basic: ☑ outlet 11 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no11}` | Flushing basic: ☒ kran 11 nie przepłukany | Flushing basic: ☒ outlet 11 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na11}` | Flushing basic: N/A kran 11 | Flushing basic: N/A outlet 11 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note11}` | Flushing basic: notatka kranu 11 | Flushing basic: outlet 11 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok12}` | Flushing basic: ☑ kran 12 przepłukany | Flushing basic: ☑ outlet 12 flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{no12}` | Flushing basic: ☒ kran 12 nie przepłukany | Flushing basic: ☒ outlet 12 not flushed | flush-basic-ta, flush-basic-tb, gen-basic |
| `{na12}` | Flushing basic: N/A kran 12 | Flushing basic: N/A outlet 12 | flush-basic-ta, flush-basic-tb, gen-basic |
| `{note12}` | Flushing basic: notatka kranu 12 | Flushing basic: outlet 12 note | flush-basic-ta, flush-basic-tb, gen-basic |
| `{ok13}` | Flushing basic: ☑ kran 13 przepłukany | Flushing basic: ☑ outlet 13 flushed | flush-basic-tb |
| `{no13}` | Flushing basic: ☒ kran 13 nie przepłukany | Flushing basic: ☒ outlet 13 not flushed | flush-basic-tb |
| `{na13}` | Flushing basic: N/A kran 13 | Flushing basic: N/A outlet 13 | flush-basic-tb |
| `{note13}` | Flushing basic: notatka kranu 13 | Flushing basic: outlet 13 note | flush-basic-tb |
| `{ok14}` | Flushing basic: ☑ kran 14 przepłukany | Flushing basic: ☑ outlet 14 flushed | flush-basic-tb |
| `{no14}` | Flushing basic: ☒ kran 14 nie przepłukany | Flushing basic: ☒ outlet 14 not flushed | flush-basic-tb |
| `{na14}` | Flushing basic: N/A kran 14 | Flushing basic: N/A outlet 14 | flush-basic-tb |
| `{note14}` | Flushing basic: notatka kranu 14 | Flushing basic: outlet 14 note | flush-basic-tb |
| `{ok15}` | Flushing basic: ☑ kran 15 przepłukany | Flushing basic: ☑ outlet 15 flushed | flush-basic-tb |
| `{no15}` | Flushing basic: ☒ kran 15 nie przepłukany | Flushing basic: ☒ outlet 15 not flushed | flush-basic-tb |
| `{na15}` | Flushing basic: N/A kran 15 | Flushing basic: N/A outlet 15 | flush-basic-tb |
| `{note15}` | Flushing basic: notatka kranu 15 | Flushing basic: outlet 15 note | flush-basic-tb |
| `{ok16}` | Flushing basic: ☑ kran 16 przepłukany | Flushing basic: ☑ outlet 16 flushed | flush-basic-tb |
| `{no16}` | Flushing basic: ☒ kran 16 nie przepłukany | Flushing basic: ☒ outlet 16 not flushed | flush-basic-tb |
| `{na16}` | Flushing basic: N/A kran 16 | Flushing basic: N/A outlet 16 | flush-basic-tb |
| `{note16}` | Flushing basic: notatka kranu 16 | Flushing basic: outlet 16 note | flush-basic-tb |
| `{ok17}` | Flushing basic: ☑ kran 17 przepłukany | Flushing basic: ☑ outlet 17 flushed | — |
| `{no17}` | Flushing basic: ☒ kran 17 nie przepłukany | Flushing basic: ☒ outlet 17 not flushed | — |
| `{na17}` | Flushing basic: N/A kran 17 | Flushing basic: N/A outlet 17 | — |
| `{note17}` | Flushing basic: notatka kranu 17 | Flushing basic: outlet 17 note | — |
| `{ok18}` | Flushing basic: ☑ kran 18 przepłukany | Flushing basic: ☑ outlet 18 flushed | — |
| `{no18}` | Flushing basic: ☒ kran 18 nie przepłukany | Flushing basic: ☒ outlet 18 not flushed | — |
| `{na18}` | Flushing basic: N/A kran 18 | Flushing basic: N/A outlet 18 | — |
| `{note18}` | Flushing basic: notatka kranu 18 | Flushing basic: outlet 18 note | — |
| `{ok19}` | Flushing basic: ☑ kran 19 przepłukany | Flushing basic: ☑ outlet 19 flushed | — |
| `{no19}` | Flushing basic: ☒ kran 19 nie przepłukany | Flushing basic: ☒ outlet 19 not flushed | — |
| `{na19}` | Flushing basic: N/A kran 19 | Flushing basic: N/A outlet 19 | — |
| `{note19}` | Flushing basic: notatka kranu 19 | Flushing basic: outlet 19 note | — |
| `{ok20}` | Flushing basic: ☑ kran 20 przepłukany | Flushing basic: ☑ outlet 20 flushed | — |
| `{no20}` | Flushing basic: ☒ kran 20 nie przepłukany | Flushing basic: ☒ outlet 20 not flushed | — |
| `{na20}` | Flushing basic: N/A kran 20 | Flushing basic: N/A outlet 20 | — |
| `{note20}` | Flushing basic: notatka kranu 20 | Flushing basic: outlet 20 note | — |
| `{zone1}` | Flushing basic: przepłukane w strefie 1 (np. 7/7) | Flushing basic: flushed in zone 1 (e.g. 7/7) | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic |
| `{zone2}` | Flushing basic: przepłukane w strefie 2 (np. 7/7) | Flushing basic: flushed in zone 2 (e.g. 7/7) | flush-basic-ta, flush-basic-tb, gen-basic |
| `{zone3}` | Flushing basic: przepłukane w strefie 3 (np. 7/7) | Flushing basic: flushed in zone 3 (e.g. 7/7) | flush-basic-ta, flush-basic-tb |
| `{zone4}` | Flushing basic: przepłukane w strefie 4 (np. 7/7) | Flushing basic: flushed in zone 4 (e.g. 7/7) | flush-basic-tb |
| `{zone5}` | Flushing basic: przepłukane w strefie 5 (np. 7/7) | Flushing basic: flushed in zone 5 (e.g. 7/7) | — |
| `{zone6}` | Flushing basic: przepłukane w strefie 6 (np. 7/7) | Flushing basic: flushed in zone 6 (e.g. 7/7) | — |
| `{statement}` | Flushing basic: stałe zdanie pod strefami | Flushing basic: fixed statement below zones | flush-basic-ta, flush-basic-tb, flush-basic-p, gen-basic |
| `{c1}` STARA | Flushing: kolumna 1 (kod skryptu) | Flushing: column 1 (script code) | flush |
| `{c2}` STARA | Flushing: kolumna 2 (kod skryptu) | Flushing: column 2 (script code) | flush |
| `{c3}` STARA | Flushing: kolumna 3 (kod skryptu) | Flushing: column 3 (script code) | flush |
| `{c4}` STARA | Flushing: kolumna 4 (kod skryptu) | Flushing: column 4 (script code) | flush |
| `{c5}` STARA | Flushing: kolumna 5 (kod skryptu) | Flushing: column 5 (script code) | flush |
| `{c6}` STARA | Flushing: kolumna 6 (kod skryptu) | Flushing: column 6 (script code) | flush |
| `{c7}` STARA | Flushing: kolumna 7 (kod skryptu) | Flushing: column 7 (script code) | flush |
| `{c8}` STARA | Flushing: kolumna 8 (kod skryptu) | Flushing: column 8 (script code) | flush |
| `{c9}` STARA | Flushing: kolumna 9 (kod skryptu) | Flushing: column 9 (script code) | flush |
| `{c10}` STARA | Flushing: kolumna 10 (kod skryptu) | Flushing: column 10 (script code) | flush |
| `{c11}` STARA | Flushing: kolumna 11 (kod skryptu) | Flushing: column 11 (script code) | flush |
| `{c12}` STARA | Flushing: kolumna 12 (kod skryptu) | Flushing: column 12 (script code) | flush |

## Wzory

- **OEST basic Engineers Report** (`basic`, plik `basic.docx`): `{site}` `{date}` `{job number}` `{engineer}` `{building}` `{level}` `{title}` `{condition}` `{details}` `{quote}` `{%photos}`
- **Weekly Taps/Shower Flushing Record (TA / TB / P)** (`flush`, plik `flush.docx`): `{o}` `{bld}` `{twr}` `{y0}` `{y1}` `{y2}` `{y3}` `{y4}` `{y5}` `{c1}` `{c2}` `{c3}` `{c4}` `{c5}` `{c6}` `{c7}` `{c8}` `{c9}` `{c10}` `{c11}` `{c12}`
- **Weekly Flushing Tower A – basic form middle** (`flush-basic-ta`, plik `flush-ta-srodek.docx`): `{statement}` `{ok1}` `{no1}` `{na1}` `{note1}` `{ok2}` `{no2}` `{na2}` `{note2}` `{ok3}` `{no3}` `{na3}` `{note3}` `{ok4}` `{no4}` `{na4}` `{note4}` `{ok5}` `{no5}` `{na5}` `{note5}` `{ok6}` `{no6}` `{na6}` `{note6}` `{ok7}` `{no7}` `{na7}` `{note7}` `{ok8}` `{no8}` `{na8}` `{note8}` `{ok9}` `{no9}` `{na9}` `{note9}` `{ok10}` `{no10}` `{na10}` `{note10}` `{ok11}` `{no11}` `{na11}` `{note11}` `{ok12}` `{no12}` `{na12}` `{note12}` `{zone1}` `{zone2}` `{zone3}`
- **Weekly Flushing Tower B – basic form middle** (`flush-basic-tb`, plik `flush-tb-srodek.docx`): `{statement}` `{ok1}` `{no1}` `{na1}` `{note1}` `{ok2}` `{no2}` `{na2}` `{note2}` `{ok3}` `{no3}` `{na3}` `{note3}` `{ok4}` `{no4}` `{na4}` `{note4}` `{ok5}` `{no5}` `{na5}` `{note5}` `{ok6}` `{no6}` `{na6}` `{note6}` `{ok7}` `{no7}` `{na7}` `{note7}` `{ok8}` `{no8}` `{na8}` `{note8}` `{ok9}` `{no9}` `{na9}` `{note9}` `{ok10}` `{no10}` `{na10}` `{note10}` `{ok11}` `{no11}` `{na11}` `{note11}` `{ok12}` `{no12}` `{na12}` `{note12}` `{ok13}` `{no13}` `{na13}` `{note13}` `{ok14}` `{no14}` `{na14}` `{note14}` `{ok15}` `{no15}` `{na15}` `{note15}` `{ok16}` `{no16}` `{na16}` `{note16}` `{zone1}` `{zone2}` `{zone3}` `{zone4}`
- **Weekly Flushing Pavilion – basic form middle** (`flush-basic-p`, plik `flush-p-srodek.docx`): `{statement}` `{ok1}` `{no1}` `{na1}` `{note1}` `{ok2}` `{no2}` `{na2}` `{note2}` `{zone1}`
- **Generator Checks – Weekly – basic form middle** (`gen-basic`, plik `gen-srodek.docx`): `{statement}` `{ok1}` `{no1}` `{na1}` `{note1}` `{ok2}` `{no2}` `{na2}` `{note2}` `{ok3}` `{no3}` `{na3}` `{note3}` `{ok4}` `{no4}` `{na4}` `{note4}` `{ok5}` `{no5}` `{na5}` `{note5}` `{ok6}` `{no6}` `{na6}` `{note6}` `{ok7}` `{no7}` `{na7}` `{note7}` `{ok8}` `{no8}` `{na8}` `{note8}` `{ok9}` `{no9}` `{na9}` `{note9}` `{ok10}` `{no10}` `{na10}` `{note10}` `{ok11}` `{no11}` `{na11}` `{note11}` `{ok12}` `{no12}` `{na12}` `{note12}` `{zone1}` `{zone2}`
- **Reactive Job Sheet – basic form middle (no Overall Condition)** (`reactive-basic`, plik `reactive-srodek.docx`): `{wstep}` `{sekcje}` `{tekstowa}` `{naglowek}` `{akapity}` `{tekst}` `{tabela}` `{pary}` `{l1}` `{w1}` `{l2}` `{w2}` `{koniec}`
- **Inspection groups – basic form middle** (`grupy-basic`, plik `grupy-srodek.docx`): `{podtytul}` `{tekst}` `{grupy}` `{nazwa}` `{licznik}` `{wiersze}` `{n1}` `{u1}` `{ok1}` `{no1}` `{na1}` `{n2}` `{u2}` `{ok2}` `{no2}` `{na2}` `{szare}`
