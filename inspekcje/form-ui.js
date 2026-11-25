// Ekran inspekcji wg makiety Grzegorza (31/10/2026): ← nazwa ⋮, Imię☐ Data☐, ile do końca + licznik,
// Galeria / Zdjęcie / Notatka na górze, checklista kropkami, rzadkie rzeczy w menu ⋮.
// Zachowanie widoku Vue; logika formularza i raportu zostaje w i-*.js.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("v-form"); if (!form) return;
  // pasek z tytułem może być już przeniesiony do nagłówka ramy (Rama.vue: ulozNaglowek) – szukamy go po tytule formularza, nie w #v-form
  // (wejście prosto z karty PPM: formularz widoczny od pierwszej klatki, więc rama zabiera pasek, zanim ten plik się wczyta)
  var top = ($("formTitle") || form).closest("[data-ui~=top]"), bar = top && top.querySelector("[data-ui~=ppmbar]"); if (!top) return;

  // ---- menu ⋮ (małe menu w rogu, bez przechodzenia na inny ekran) ----
  var kb = top.querySelector("[data-ui~=kebab]");
  var title = $("formTitle");
  title.title = title.textContent;
  new MutationObserver(function () { title.title = title.textContent; }).observe(title, { childList: true, subtree: true });
  var menu = top.querySelector("[data-ui~=kmenu]");
  if (window.OESTBledy) OESTBledy.applyDom(menu);
  kb.addEventListener("click", function () { menu.hidden = !menu.hidden; });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest("[data-ui~=kmenu],[data-ui~=kebab]")) menu.hidden = true; });
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]"); if (!b) return;
    var k = b.getAttribute("data-k"); menu.hidden = true;
    if (k === "def") $("allOk").click();
    if (k === "prev") $("toPreview").click();
    if (k === "clear" && window.OEST_clearInspection) window.OEST_clearInspection();
    if (k === "more") { ovp.dataset.expanded = "true"; ovp.hidden = false; ovp.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });

  // ---- nagłówek: Imię ☐  Data ☐ | ile do końca, licznik ----
  var head = form.querySelector("[data-ui~=ihead]");
  if (window.OESTBledy) OESTBledy.applyDom(head);
  var dz = $("dzien"), pd = $("podpis");
  $("nameOn").addEventListener("change", function () {
    if (!this.checked) { pd.dataset.v = pd.value; pd.value = ""; } else { pd.value = pd.dataset.v || pd.value; }
    syncHead();
  });
  $("dateOn").addEventListener("change", function () { dz.disabled = !this.checked; form.querySelector('ion-datetime-button').disabled = !this.checked; });

  // ---- zdjęcia na górę: Galeria · Zdjęcie · Notatka ----
  var note = form.querySelector("[data-form-note]");
  if (window.OESTBledy) OESTBledy.applyDom(note);
  var kp = $("komentarz").closest("[data-ui~=panel]");
  note.addEventListener("click", function () { kp.dataset.expanded = "true"; kp.hidden = false; $("komentarz").setFocus(); });

  // ---- Overall/Quote: liczone samo z odpowiedzi, ręcznie z menu ⋮ ----
  var ovp = $("ov").closest("[data-ui~=panel]");

  // ---- checklista: zwijana sekcja, licznik ----
  var ckp = $("ck").closest("[data-ui~=panel]");
  $("ckTitle").addEventListener("click", function () { $("ck").hidden = !$("ck").hidden; });

  function syncHead() {
    // licznik = ile OK z pytań w użyciu (N/A nie liczy się do sumy), np. jedno NIE → 7/8
    var rows = $("ck").querySelectorAll("[data-ui~=ck-row]"), ok = 0, used = 0;
    Array.prototype.forEach.call(rows, function (r) {
      var st = r.dataset.state;
      if (st === "na") return; used++; if (st === "ok") ok++;
    });
    $("iCnt").textContent = ok + "/" + used;
    $("iCntBox").hidden = !rows.length || $("ck").closest("[data-ui~=panel]").hidden; // pytania wyłączone w tej inspekcji: bez licznika
    var b = bar && bar.querySelector("[data-termin]");
    $("iEnds").textContent = b ? b.textContent : "";
    if (b && b.dataset.alt && window.OESTPodmien) OESTPodmien.miejsce($("iEnds"), b.dataset.alt); // termin PL/EN w tym samym miejscu: etap obok nie skacze
    $("nameTx").textContent = $("nameOn").checked ? (pd.value || window.OESTT("Imię", "Name")) : window.OESTT("Imię", "Name");
  }
  new MutationObserver(syncHead).observe($("ck"), { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
  if (bar) new MutationObserver(syncHead).observe(bar, { childList: true, subtree: true });

  // szkic wczytany (index.html → restoreDraft): Name/Date, notatka i licznik według zapisu
  form.addEventListener("oest:restored", function () {
    dz.disabled = !$("dateOn").checked; form.querySelector("ion-datetime-button").disabled = dz.disabled;
    if (!$("nameOn").checked) { pd.dataset.v = pd.value; pd.value = ""; }
    kp.hidden = !$("komentarz").value.trim(); kp.dataset.expanded = String(!kp.hidden);
    setTimeout(syncHead, 0);
  });

  // przy każdym otwarciu formularza: znaczniki od nowa, notatka zwinięta (chyba że coś w niej jest)
  new MutationObserver(function () {
    if (form.hidden) return;
    $("nameOn").checked = true; $("dateOn").checked = true; dz.disabled = false; form.querySelector("ion-datetime-button").disabled = false; $("updOn").checked = false;
    kp.hidden = !$("komentarz").value.trim(); kp.dataset.expanded = String(!kp.hidden); ovp.hidden = true; ovp.dataset.expanded = "false"; menu.hidden = true;
    setTimeout(syncHead, 0);
  }).observe(form, { attributes: true, attributeFilter: ["hidden"] });
})();
