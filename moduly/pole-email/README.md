# Moduł pola e-mail (`moduly/pole-email`)

**Zasada (Grzegorz 02/11/2026):** jedno pole e-mail z jednym zachowaniem w całej apce.

Przy wpisywaniu adresu po prawej pojawia się zielone ✓ (rysowane), a przy błędnym adresie czerwone ✗, czerwona ramka i podpowiedź „Wpisz poprawny adres e-mail”. Błąd pokazuje się dopiero po wyjściu z pola, żeby nie krzyczał w trakcie pisania. Puste pole nie jest oceniane.

## Użycie
Nic nie trzeba dopisywać w ekranach. Wystarczy `<input type="email">`, a moduł sam się podpina, także do pól dorysowanych później. Kilka adresów: `<input type="email" multiple>` (przecinek lub średnik).

Strona: `<script src="moduly/pole-email/pole-email.js"></script>` (inspekcje: `../moduly/pole-email/pole-email.js`). CSS moduł dokłada sam. Sprawdzenie w kodzie: `OESTPoleEmail.valid("a@b.pl")`.
