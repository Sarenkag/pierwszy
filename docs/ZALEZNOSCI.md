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
| `@capacitor/app` | 8.1.2 | MIT | tak | `moduly/szkielet` (Wstecz Androida przez Ionic) | zastana |
| `@capgo/capacitor-social-login` | 8.5.15 | MPL-2.0 | logowanie wymaga sieci | `app/www/index.html` (logowanie Google) | zastana |
| `docxtemplater` | 3.71.0 | MIT | tak (`www/inspekcje/lib`) | `inspekcje/index.html` | zastana |
| `pizzip` | 3.3.0 | MIT lub GPL-3.0 | tak (`www/inspekcje/lib`) | `moduly/raporty`, `moduly/word-pdf`, `inspekcje/index.html` | zastana |
| `jspdf` | 4.2.1 | MIT | tak (`www/inspekcje/lib`) | `moduly/word-pdf`, `moduly/czcionka-pdf`, `inspekcje/index.html`, `app/www/index.html` | zastana |
| LibreOfficeKit – silnik z oficjalnego LibreOffice Viewer (F-Droid, `org.documentfoundation.libreoffice_135.apk`, sha256 sprawdzany) + powiązania `org.libreoffice.kit` (bez zmian) | 26.2.7.3 | MPL-2.0 | tak (silnik w telefonie, bez sieci; +~79 MB APK) | adapter `moduly/word-pdf` (`zWorda`) → `LibreOfficePlugin.java`; silnik dokłada CI `app/scripts/libreoffice-silnik.py` | Grzegorz 20/11/2026, karta „Tak, LibreOfficeKit” (PDF z Worda); 23:42 „zrobienie update'u oryginalnej apki” |
| `pdf-lib` | 1.17.1 | MIT | tak (`www/inspekcje/lib`) | `moduly/word-pdf` (`zWordow`: sklejenie PDF-ów z silnika – Flushing: formularz firmy + basic form) | Grzegorz 21/11/2026, PR #196 (PDF wszystkich raportów z Worda) – czeka na jego „tak” |
| `@ionic/core` | 9.0.13 | MIT | tak | `moduly/szkielet` (rama, komponenty, Wstecz) | Grzegorz 21/11/2026, wątek „Ionic + Vue” (apka stoi na Ionic + Vue) |
| `@ionic/vue` | 9.0.13 | MIT | tak | `moduly/szkielet` | Grzegorz 21/11/2026, wątek „Ionic + Vue” (apka stoi na Ionic + Vue) |
| `vue` | 3.5.46 | MIT | tak | `moduly/szkielet` (ekrany Vue) | Grzegorz 21/11/2026, wątek „Ionic + Vue” (apka stoi na Ionic + Vue) |
| `vue-router` | 4.6.5 | MIT | tak | `moduly/szkielet` (trasy z `moduly/ekrany/ekrany.json`) | Grzegorz 21/11/2026, wątek „Ionic + Vue” (apka stoi na Ionic + Vue) |

## Narzędzia budowania, testów i CI (nie trafiają do APK)

| Narzędzie | Wersja | Licencja | Gdzie | Zgoda |
|---|---|---|---|---|
| `@capacitor/cli` | 8.5.3 | MIT | `app/package.json` (`devDependencies`), budowanie APK | zastana |
| `playwright-core` | 1.48.2 | Apache-2.0 | `quality/package.json` (`devDependencies`), testy przeglądarkowe G2 | zastana |
| `vite` | 8.3.8 | MIT | `app/package.json` (`devDependencies`), budowanie paczki `moduly/szkielet` (`npm run copy-web`) | Grzegorz 21/11/2026, wątek „Ionic + Vue” (apka stoi na Ionic + Vue) |
| `@vitejs/plugin-vue` | 6.0.11 | MIT | `app/package.json` (`devDependencies`), budowanie ekranów Vue | Grzegorz 21/11/2026, wątek „Ionic + Vue” (apka stoi na Ionic + Vue) |
