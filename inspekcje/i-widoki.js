"use strict";
// Adapter widoków: dane i działania zostają w i-*.js, Vue posiada wyłącznie DOM.
function widokInspekcji(id, nazwa, dane, akcja) {
  var el = typeof id === "string" ? document.getElementById(id) : id;
  var k = el.__inspKontroler;
  if (!k) {
    k = { stan: dane, dane: function () { return k.stan; }, akcja: function () { if (k.wykonaj) return k.wykonaj.apply(null, arguments); } };
    var s = OESTCzesci.sluchacze(k.dane); k.na = s.na; k.emit = s.emit;
    el.__inspKontroler = k;
    k.wykonaj = akcja;
    OESTCzesci.montuj(el, "inspekcja/" + nazwa, { kontroler: k });
  } else { k.stan = dane; k.wykonaj = akcja; k.emit(); }
  return k;
}
