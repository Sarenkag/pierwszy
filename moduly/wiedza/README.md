# Moduł wiedzy o budynku (`moduly/wiedza`)

**Zasada:** jedna baza wiedzy dla całej apki i przyszłych apek. Info, Power trace, Klucze i „Dodaj do bazy” czytają i zapisują przez ten moduł, nikt nie trzyma własnej kopii. Działa bez internetu i bez AI.

## Model
- **Obiekt**: `kod` (unikalny), `typ`, `nazwa`, `miejsce` (kod obiektu nadrzędnego, **obowiązkowe** poza budynkiem), `status` (`propozycja` / `zatwierdzone`), `zdjecia` (linki/id), `punkt` (`{plan, x, y}` w % planu), `notatka`, `zrodlo`, `pola` (dowolne dane, np. marka, model, zabezpieczenie).
- **Typy**: budynek, pietro, pomieszczenie, plan, urzadzenie, rozdzielnica, obwod, ats, drzwi, klucz, wlacznik, oprawa, gniazdko, kran, zawor, callpoint, sterownik, narzedzie, dokument, inne.
- **Powiązanie**: `z → rel → do`, relacje: zasila, steruje, otwiera, prowadzi_do, opisuje, zasilany_woda, nalezy_do, zwiazany.
- „Gdzie stoi” to pole `miejsce`, więc budynek → piętro → pomieszczenie → urządzenie tworzy drzewo.

## Użycie
```js
const W = OESTWiedza.create();   // IndexedDB „oest-wiedza” na telefonie
await W.zapisz({ kod: 'S2-UV', typ: 'urzadzenie', nazwa: 'UV BIO-UV NEO 12', miejsce: 'B-UG-SPA-PLANT', zdjecia: [link] });
await W.powiaz('LL-10-L7', 'zasila', 'B-L10-KOR');
await W.lancuch('B-L10-KOR', 'zasila', 'wstecz');   // korytarz ← obwód ← DB ← MSDB
await W.szukaj('pompa spa');                       // bez polskich znaków też znajdzie
await W.lista({ miejsce: 'B-UG' });                // wszystko na piętrze, z pod-miejscami
await W.sprawdz();                                 // do zatwierdzenia, bez zdjęcia, duplikaty, złe powiązania
await W.eksportJSON(); await W.importJSON(json);   // kopia / przeniesienie, nowsze wygrywa
await W.arkusz(); await W.csv();                   // tabele jak w „OEST – Rejestr budynku” na Dysku
```

## Pilnowanie
Moduł odrzuca: zły kod, nieznany typ, brak miejsca, miejsce, które nie istnieje, pętlę w miejscach, punkt poza 0–100 % albo na nieistniejącym planie, podwójne lub wiszące powiązania, usunięcie miejsca, w którym coś jest. Zapisy idą po kolei, więc dwa szybkie zapisy nie nadpiszą się nawzajem.

## Podłączenie (następne kroki)
1. Strona: `<script src="moduly/wiedza/wiedza.js"></script>`.
2. „Dodaj do bazy”: `OESTAparat.take()` → `OESTZdjecia.save()` → `W.zapisz({... status: 'propozycja'})`.
3. Power trace, Klucze, Info: przejście z własnych magazynów na ten moduł (osobne PR-y, uzgodnione z ich wątkami).
4. Synchronizacja z arkuszem Google przez `arkusz()` / import (adapter jak w module zdjęć).
