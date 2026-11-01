# Moduł: wysyłka raportów (Gmail) + pasek stanu

Samodzielny moduł do każdej apki OEST. Wysyła raporty z kolejki prosto z Gmaila zalogowanego użytkownika i pokazuje cienki pasek stanu na dole ekranu (lampka sieci, wysyłam 1/2, czekam na Wi‑Fi, wysłano, błąd + Ponów).

## Jak podpiąć w nowej apce
1. Skopiuj folder `moduly/wysylka/` (i `app/www/settings-google.js`, który daje logowanie Google z zakresem `gmail.send`).
2. Na stronie: `<script src="moduly/wysylka/wysylka.js"></script>`, potem `OESTSender.init({ onChange, onIdle, onQueue, onShare })` (wszystkie opcjonalne).
3. Raport do wysłania = rekord w IndexedDB `inspekcje`, magazyn `queue`:
   `{ id, created, acct, code, name, to, subject, body, pdf: Uint8Array, docx: Uint8Array, status: "wait" }`.
   Po zapisaniu wywołaj `OESTSender.run({ login: true })`.

## Wymagania po stronie Google Cloud
- Gmail API włączone; klient OAuth (Android + Web) jak w `app/README.md`.
- Odbiorca: `to` z rekordu, a gdy puste — firmowy e-mail z profilu bieżącego konta.

## Zasady (nie zmieniać bez powodu)
- Wysyła tylko przez `gmail/v1/users/me/messages/send` (JSON). Adres `/upload` nie zwraca nagłówków CORS i w WebView wygląda jak „brak odpowiedzi”.
- Raport z błędem albo przerwany w trakcie wysyła się ponownie tylko po „Ponów” (bez dubli).
- Okno logowania Google tylko po kliknięciu; w tle wysyła, gdy sesja już jest.
- Czekanie na Wi‑Fi domyślnie włączone; nieznana sieć = jak dane komórkowe.
