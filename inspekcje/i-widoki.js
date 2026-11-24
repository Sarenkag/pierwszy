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

document.addEventListener("ionChange", function (e) {
  if (!e.target.closest("[id^=v-]" ) && e.target.id !== "dzien") return;
  if (e.target.tagName === "ION-DATETIME" && e.target.presentation === "date") e.target.value = String(e.target.value || "").slice(0, 10);
  var event = new Event("change", { bubbles: true }); event.oestTrusted = true; e.target.dispatchEvent(event);
});
document.addEventListener("ionInput", function (e) {
  if (!e.target.closest("[id^=v-]")) return;
  var event = new Event("input", { bubbles: true }); event.oestTrusted = true; e.target.dispatchEvent(event);
});
