# Rejestr zależności OEST (R22)

Jedyne miejsce, w którym zapisujemy biblioteki apki i narzędzia testowe. Zasada R22 w `docs/ZASADY.md` (decyzja Grzegorza 20/11/2026):

- **Kod w APK:** nowa biblioteka tylko za zgodą Grzegorza, każda osobno, z wpisem tutaj i z modułem-adapterem w `moduly/`.
- **Narzędzia testowe i CI** (nie trafiają do APK): też tylko za jego zgodą i z wpisem tutaj.
- Wersja zawsze dokładna (bez `^` i `~`). Biblioteka w APK działa lokalnie i offline.

Nowy wpis = osobny PR za „tak” właściciela. Kolumna „Zgoda” podaje datę i miejsce zgody.

## Kod w APK (`app/package.json`, `dependencies`)

Wpisy zastane, sprzed rejestru (stan main 20/11/2026). Kolumna „Gdzie używana” to stan faktyczny z kodu, nie cel. Zastana biblioteka bez jednego modułu-adaptera nie jest nowym naruszeniem. Porządkowanie jej użycia to osobna praca planu naprawy.

| Biblioteka | Wersja | Licencja | Lokalnie / offline | Gdzie używana | Zgoda |
|---|---|---|---|---|---|
| `@capacitor/core` | 8.5.3 | MIT | tak | rdzeń apki Android | zastana |
| `@capacitor/android` | 8.5.3 | MIT | tak | rdzeń apki Android | zastana |
| `@capacitor/app` | 8.1.2 | MIT | tak | `moduly/wstecz` (przycisk Wstecz) | zastana |
| `@capgo/capacitor-social-login` | 8.5.15 | MPL-2.0 | logowanie wymaga sieci | `app/www/index.html` (logowanie Google) | zastana |
| `docxtemplater` | 3.71.0 | MIT | tak (`www/inspekcje/lib`) | `inspekcje/index.html` | zastana |
| `pizzip` | 3.3.0 | MIT lub GPL-3.0 | tak (`www/inspekcje/lib`) | `moduly/raporty`, `moduly/word-pdf`, `inspekcje/index.html` | zastana |
| `jspdf` | 4.2.1 | MIT | tak (`www/inspekcje/lib`) | `moduly/word-pdf`, `moduly/czcionka-pdf`, `inspekcje/index.html`, `app/www/index.html` | zastana |
| LibreOfficeKit – silnik z oficjalnego LibreOffice Viewer (F-Droid, `org.documentfoundation.libreoffice_135.apk`) + powiązania `org.libreoffice.kit` | 26.2.7.3 | MPL-2.0 | tak (silnik w telefonie, bez sieci) | PRÓBA: tylko osobna apka „OEST próba LO” z gałęzi `proba-lo-*` (`app/scripts/lok-proba.py`, `LibreOfficePlugin.java`); do main dopiero po próbie na Pixelu, wtedy z modułem-adapterem w `moduly/` | Grzegorz 20/11/2026, karta „Tak, LibreOfficeKit” (PDF z Worda) |

## Narzędzia budowania, testów i CI (nie trafiają do APK)

| Narzędzie | Wersja | Licencja | Gdzie | Zgoda |
|---|---|---|---|---|
| `@capacitor/cli` | 8.5.3 | MIT | `app/package.json` (`devDependencies`), budowanie APK | zastana |
| `playwright-core` | 1.48.2 | Apache-2.0 | `quality/package.json` (`devDependencies`), testy przeglądarkowe G2 | zastana |
