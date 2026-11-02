# Moduł checkboxa (`moduly/checkbox`)

**Zasada (Grzegorz 02/11/2026):** jeden checkbox w całej apce. Przy zaznaczeniu kwadrat lekko wyskakuje, wypełnia się kolorem apki (`--accent`), a ✓ rysuje się od lewej. Odznaczenie chowa ✓ i kolor.

## Użycie
Nic nie trzeba dopisywać: moduł zmienia wygląd każdego `<input type="checkbox">` na stronie, również dorysowanego później. Reguły mają zerową wagę (`:where`), więc ekran, który chowa swój checkbox (np. chipy) albo ustawia mu rozmiar, dalej wygrywa.

Strona: `<script src="moduly/checkbox/checkbox.js"></script>` (inspekcje: `../moduly/checkbox/checkbox.js`).
