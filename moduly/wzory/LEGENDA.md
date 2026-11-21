# Legenda nawiasów we wzorach Word (OEST)

Plik generowany automatycznie ze słownika apki (moduly/wzory/wzory.js) poleceniem `node app/scripts/wzory-legenda.cjs`. Nie edytować ręcznie.
Każdy nawias `{nazwa}` we wzorze Word apka zastępuje daną opisaną niżej. Ta sama nazwa znaczy to samo w każdym wzorze.
Nawias spoza tej listy nie zostanie wypełniony (test go zatrzyma). „STARA” = nazwa sprzed wspólnego słownika, do zamiany.

## Słownik

| Nawias | Co wstawia apka | In English | Używają |
|---|---|---|---|
| `{site}` | obiekt | site | basic, plant |
| `{date}` | data inspekcji dd/mm/rrrr | inspection date dd/mm/yyyy | basic, plant |
| `{job number}` | nr zlecenia Vantify | Vantify job number | basic, plant |
| `{engineer}` | inżynier | engineer | basic, plant |
| `{building}` | budynek | building | basic, plant |
| `{level}` | piętro | level | basic, plant |
| `{title}` | rodzaj inspekcji | inspection type | basic, plant |
| `{condition}` | stan ogólny | overall condition | basic, plant |
| `{details}` | opis i ustalenia | details and findings | basic |
| `{quote}` | wycena tak/nie | quote yes/no | basic, plant |
| `{%photos}` | zdjęcia (siatka) | photos (grid) | basic, plant |
| `{a}` | Plant: kolumna a | Plant: column a | plant |
| `{b}` | Plant: kolumna b | Plant: column b | plant |
| `{c}` | Plant: kolumna c | Plant: column c | plant |
| `{d}` | Plant: kolumna d | Plant: column d | plant |
| `{.}` | Plant: wiersz uwag | Plant: notes row | plant |
| `{temp}` | QHS-031: kolejny pomiar temperatury | QHS-031: next temperature reading | temp-tb |
| `{data}` STARA | QHS-031: data (stara nazwa, wspólna = date) | QHS-031: date (old name, common = date) | temp-tb |
| `{name}` STARA | QHS-031: inżynier (stara nazwa, wspólna = engineer) | QHS-031: engineer (old name, common = engineer) | temp-tb |
| `{o}` STARA | Flushing: nazwa kranu (kod skryptu) | Flushing: outlet name (script code) | flush |
| `{bld}` STARA | Flushing: budynek w nagłówku (kod skryptu, wspólna = building) | Flushing: header building (script code, common = building) | flush |
| `{twr}` STARA | Flushing: wieża w tytule (kod skryptu) | Flushing: tower in title (script code) | flush |
| `{comms}` | Plant: pomieszczenie comms | Plant: room comms | plant |
| `{comms_notes}` | Plant: uwagi comms | Plant: notes comms | plant |
| `{mechanical}` | Plant: pomieszczenie mechanical | Plant: room mechanical | plant |
| `{mechanical_notes}` | Plant: uwagi mechanical | Plant: notes mechanical | plant |
| `{primary_switch}` | Plant: pomieszczenie primary_switch | Plant: room primary_switch | plant |
| `{primary_switch_notes}` | Plant: uwagi primary_switch | Plant: notes primary_switch | plant |
| `{secondary_switch}` | Plant: pomieszczenie secondary_switch | Plant: room secondary_switch | plant |
| `{secondary_switch_notes}` | Plant: uwagi secondary_switch | Plant: notes secondary_switch | plant |
| `{spa_filtration}` | Plant: pomieszczenie spa_filtration | Plant: room spa_filtration | plant |
| `{spa_filtration_notes}` | Plant: uwagi spa_filtration | Plant: notes spa_filtration | plant |
| `{spa_pump}` | Plant: pomieszczenie spa_pump | Plant: room spa_pump | plant |
| `{spa_pump_notes}` | Plant: uwagi spa_pump | Plant: notes spa_pump | plant |
| `{sprinkler}` | Plant: pomieszczenie sprinkler | Plant: room sprinkler | plant |
| `{sprinkler_notes}` | Plant: uwagi sprinkler | Plant: notes sprinkler | plant |
| `{y0}` STARA | Flushing: rok 1 (kod skryptu) | Flushing: year 1 (script code) | flush |
| `{y1}` STARA | Flushing: rok 2 (kod skryptu) | Flushing: year 2 (script code) | flush |
| `{y2}` STARA | Flushing: rok 3 (kod skryptu) | Flushing: year 3 (script code) | flush |
| `{y3}` STARA | Flushing: rok 4 (kod skryptu) | Flushing: year 4 (script code) | flush |
| `{y4}` STARA | Flushing: rok 5 (kod skryptu) | Flushing: year 5 (script code) | flush |
| `{y5}` STARA | Flushing: rok 6 (kod skryptu) | Flushing: year 6 (script code) | flush |
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
- **Plant Rooms Weekly / Monthly** (`plant`, plik `plant.docx`): `{site}` `{date}` `{job number}` `{engineer}` `{building}` `{level}` `{title}` `{condition}` `{quote}` `{%photos}` `{a}` `{b}` `{c}` `{d}` `{.}` `{comms}` `{mechanical}` `{primary_switch}` `{secondary_switch}` `{spa_filtration}` `{spa_pump}` `{sprinkler}` `{comms_notes}` `{mechanical_notes}` `{primary_switch_notes}` `{secondary_switch_notes}` `{spa_filtration_notes}` `{spa_pump_notes}` `{sprinkler_notes}`
- **Weekly Taps/Shower Flushing Record (TA / TB / P)** (`flush`, plik `flush.docx`): `{o}` `{bld}` `{twr}` `{y0}` `{y1}` `{y2}` `{y3}` `{y4}` `{y5}` `{c1}` `{c2}` `{c3}` `{c4}` `{c5}` `{c6}` `{c7}` `{c8}` `{c9}` `{c10}` `{c11}` `{c12}`
- **Monthly Tap Temperature Check TB (QHS-031)** (`temp-tb`, plik `temp-tb.docx`): `{temp}` `{name}` `{data}`
