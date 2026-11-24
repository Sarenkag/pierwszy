// Ekran inspekcji wg makiety Grzegorza (31/10/2026): ← nazwa ⋮, Imię☐ Data☐, ile do końca + licznik,
// Galeria / Zdjęcie / Notatka na górze, checklista kropkami, rzadkie rzeczy w menu ⋮.
// Zachowanie widoku Vue; logika formularza i raportu zostaje w i-*.js.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("v-form"); if (!form) return;
  var top = form.querySelector(".top"), bar = form.querySelector(".ppmbar");

  // ---- menu ⋮ (małe menu w rogu, bez przechodzenia na inny ekran) ----
  var kb = top.querySelector(".kebab");
  // przytrzymanie palca na nazwie: szary dymek z pełną nazwą inspekcji (03/11)
  (function () {
    var h1 = top.querySelector("h1"), tip = null, timer = 0;
    if (!h1) return;
    function hide() { clearTimeout(timer); if (tip) { tip.remove(); tip = null; } }
    function full() { return h1.textContent || ""; }
    h1.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    h1.addEventListener("pointerdown", function () { hide(); timer = setTimeout(function () { tip = document.createElement("div"); tip.className = "fulltitle"; tip.textContent = full(); document.body.appendChild(tip); }, 450); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { h1.addEventListener(ev, function () { clearTimeout(timer); if (tip) setTimeout(hide, 1500); }); });
  })();
  var menu = top.querySelector(".kmenu");
  if (window.OESTBledy) OESTBledy.applyDom(menu);
  kb.addEventListener("click", function () { menu.hidden = !menu.hidden; });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".kmenu,.kebab")) menu.hidden = true; });
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]"); if (!b) return;
    var k = b.getAttribute("data-k"); menu.hidden = true;
    if (k === "def") $("allOk").click();
    if (k === "prev") $("toPreview").click();
    if (k === "clear" && window.OEST_clearInspection) window.OEST_clearInspection();
    if (k === "more") { ovp.classList.add("open"); ovp.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });

  // ---- nagłówek: Imię ☐  Data ☐ | ile do końca, licznik ----
  var head = form.querySelector(".ihead");
  if (window.OESTBledy) OESTBledy.applyDom(head);
  var dz = $("dzien"), pd = $("podpis");
  $("nameOn").addEventListener("change", function () {
    if (!this.checked) { pd.dataset.v = pd.value; pd.value = ""; } else { pd.value = pd.dataset.v || pd.value; }
    syncHead();
  });
  $("dateOn").addEventListener("change", function () { dz.disabled = !this.checked; });

  // ---- zdjęcia na górę: Galeria · Zdjęcie · Notatka ----
  var note = form.querySelector("[data-form-note]");
  if (window.OESTBledy) OESTBledy.applyDom(note);
  var kp = $("komentarz").closest(".panel");
  note.addEventListener("click", function () { kp.classList.add("open"); $("komentarz").focus(); });

  // ---- Overall/Quote: liczone samo z odpowiedzi, ręcznie z menu ⋮ ----
  var ovp = $("ov-1").closest(".panel");

  // ---- checklista: zwijana sekcja, licznik ----
  var ckp = $("ck").closest(".panel");
  $("ckTitle").addEventListener("click", function () { ckp.classList.toggle("shut"); });

  function syncHead() {
    // licznik = ile OK z pytań w użyciu (N/A nie liczy się do sumy), np. jedno NIE → 7/8
    var rows = $("ck").querySelectorAll(".ck-row"), ok = 0, used = 0;
    Array.prototype.forEach.call(rows, function (r) {
      var on = r.querySelector(".seg .on"), st = on && on.getAttribute("data-s");
      if (st === "na") return; used++; if (st === "ok") ok++;
    });
    $("iCnt").textContent = ok + "/" + used;
    $("iCntBox").hidden = !rows.length || $("ck").closest(".panel").hidden; // pytania wyłączone w tej inspekcji: bez licznika
    var b = bar && bar.querySelector("b");
    $("iEnds").textContent = b ? b.textContent : "";
    if (b && b.dataset.alt && window.OESTPodmien) OESTPodmien.miejsce($("iEnds"), b.dataset.alt); // termin PL/EN w tym samym miejscu: etap obok nie skacze
    $("nameTx").textContent = $("nameOn").checked ? (pd.value || window.OESTT("Imię", "Name")) : window.OESTT("Imię", "Name");
  }
  new MutationObserver(syncHead).observe($("ck"), { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  if (bar) new MutationObserver(syncHead).observe(bar, { childList: true, subtree: true });

  // szkic wczytany (index.html → restoreDraft): Name/Date, notatka i licznik według zapisu
  form.addEventListener("oest:restored", function () {
    dz.disabled = !$("dateOn").checked;
    if (!$("nameOn").checked) { pd.dataset.v = pd.value; pd.value = ""; }
    kp.classList.toggle("open", !!$("komentarz").value.trim());
    setTimeout(syncHead, 0);
  });

  // przy każdym otwarciu formularza: znaczniki od nowa, notatka zwinięta (chyba że coś w niej jest)
  new MutationObserver(function () {
    if (form.hidden) return;
    $("nameOn").checked = true; $("dateOn").checked = true; dz.disabled = false; $("updOn").checked = false;
    kp.classList.toggle("open", !!$("komentarz").value.trim()); ovp.classList.remove("open"); menu.hidden = true;
    setTimeout(syncHead, 0);
  }).observe(form, { attributes: true, attributeFilter: ["hidden"] });
})();
