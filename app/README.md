# OEST — apka na Androida

Ta sama apka co w przeglądarce (`www/` + `../inspekcje`), zamknięta w aplikację na Androida (Capacitor).
Ekrany: start z logowaniem Google → menu główne (Planowane inspekcje / PPM, Reactive, Power trace, Calendar, Keys / Doors, Settings).
Po pierwszym logowaniu apka otwiera się bez internetu: konto i profil są zapisane w telefonie.

Plik APK buduje GitHub (`.github/workflows/android.yml`) przy każdej zmianie w `app/` albo `inspekcje/`.

## 1. Podpis apki (raz, ok. 2 min)

Bez tego GitHub zbuduje tylko wersję testową, w której logowanie Google nie działa, a każda nowa wersja wymaga odinstalowania starej.

1. Otwórz plik `sekrety-github.txt` z plików projektu (folder `oest-app`).
2. Na https://github.com/Sarenkag/pierwszy/settings/secrets/actions kliknij **New repository secret** i dodaj dwa sekrety:
   - Name: `ANDROID_KEYSTORE_B64`, Secret: długi ciąg znaków z pliku,
   - Name: `ANDROID_KEYSTORE_PASSWORD`, Secret: hasło z pliku.

Plik `oest-podpis.jks` to kopia klucza podpisu. Zachowaj ją: bez niej nie da się wydać aktualizacji tej samej apki.

## 2. Logowanie Google (raz, ok. 5 min)

1. https://console.cloud.google.com → nowy projekt, np. „OEST”.
2. **APIs & Services → OAuth consent screen**: typ **External**, nazwa „OEST”, Twój e-mail. W **Audience → Test users** dodaj swój adres Gmail.
3. **Credentials → Create credentials → OAuth client ID**:
   - typ **Android**, Package name: `com.oest.inspekcje`, SHA-1:
     `8C:E7:78:57:39:CE:C6:D4:2A:B4:64:6D:1F:A9:F8:72:B0:3F:A9:D5`
   - drugi raz: typ **Web application** (bez adresów). Skopiuj jego **Client ID** (kończy się na `.apps.googleusercontent.com`).
4. Client ID typu Web wpisz w `www/config.js` (`googleWebClientId`) albo wyślij go Claude. To nie jest tajne.

## 3. Instalacja na telefonie

1. Po scaleniu zmian do `main`: https://github.com/Sarenkag/pierwszy/releases → najnowsze „OEST N” → plik `OEST-N.apk`.
   (Wersje z gałęzi przed scaleniem: zakładka **Actions** → budowa → **Artifacts**.)
2. Otwórz pobrany plik na Pixelu. Za pierwszym razem Android zapyta o zgodę na instalację z Chrome: **Ustawienia → Zezwól**.
3. Kolejne wersje instalują się na poprzedniej, dane zostają.

## Praca nad kodem

```
cd app
npm ci
npm run sync        # kopiuje ../inspekcje do www/ i aktualizuje projekt Androida
```

Strona startowa: `www/index.html`. Ustawienia zależne od konta: `www/config.js`.
