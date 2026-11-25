# Moduł `moduly/ladowanie`

```
Moduł ładowania (moduly/ladowanie) – JEDNO kółko „pracuję” w całej apce (Grzegorz 04/11/2026):
kółko ze smugą (wzór „Zapisuję…”, Grzegorz 03/11) – w przycisku, na środku ekranu, w liście i na pasku wysyłki.

  OESTLadowanie.ring()             → '<ion-spinner name="crescent">' (napis do starego kodu)
  OESTLadowanie.show("Zapisuję…")  → ion-loading na środku ekranu: kółko nad tekstem jak dawniej, nie zasłania stuknięć (jak na main), hide() je chowa
  OESTLadowanie.inline(el, "Wczytuję…") → w miejscu treści: część Ionic Ladowanie.vue (kółko 22 px obok tekstu, jak dawniej), dopóki ekran nie wstawi danych
  Ekran Vue: <ion-spinner> / loadingController wprost albo OESTCzesci.ladowanie (to samo).
```

Strona: `<script src="moduly/ladowanie/ladowanie.js"></script>` (inspekcje: `../moduly/ladowanie/ladowanie.js`). Moduł przekazuje wszystko do szkieletu (`window.OESTCzesci.ladowanie`, `moduly/szkielet/src/czesci.js`) – sam nic nie rysuje.
