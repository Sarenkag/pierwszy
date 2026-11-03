// Ekran inspekcji wg makiety Grzegorza (31/10/2026): ← nazwa ⋮, Imię☐ Data☐, ile do końca + licznik,
// Galeria / Zdjęcie / Notatka na górze, checklista kropkami, rzadkie rzeczy w menu ⋮.
// Tylko układ – logika formularza i raportu zostaje w index.html.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("v-form"); if (!form) return;
  var top = form.querySelector(".top"), bar = form.querySelector(".ppmbar");

  // ---- menu ⋮ (małe menu w rogu, bez przechodzenia na inny ekran) ----
  var kb = document.createElement("button");
  kb.type = "button"; kb.className = "kebab"; kb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>'; kb.setAttribute("aria-label", "Menu");
  // strzałka powrotu jako rysunek: znak „‹” siedział niżej niż nazwa inspekcji (03/11)
  var back = top.querySelector(".back");
  if (back) back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
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
  var menu = document.createElement("div");
  menu.className = "kmenu"; menu.hidden = true;
  menu.innerHTML = '<div class="kupd"></div>' +
    '<button type="button" data-k="def" data-en="Restore defaults (all OK)">Przywróć domyślne (wszystko OK)</button>' +
    '<button type="button" data-k="more">Overall / Quote</button>' +
    '<button type="button" data-k="prev" data-en="Report preview">Podgląd raportu</button>' +
    '<button type="button" data-k="clear" class="kclear" data-en="Clear inspection">Wyczyść inspekcję</button>';
  top.appendChild(kb); top.appendChild(menu);
  if (window.OESTBledy) OESTBledy.applyDom(menu);
  if (bar) menu.querySelector(".kupd").appendChild(bar);
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
  var head = document.createElement("div");
  head.className = "ihead";
  head.innerHTML = '<div class="ileft"><label class="icb"><input type="checkbox" id="nameOn" checked><span id="nameTx">Name</span></label>' +
    '<label class="icb"><input type="checkbox" id="dateOn" checked><span>Date</span></label></div>' +
    '<div class="iright"><div id="iEnds"></div><div id="iCntBox"><b id="iCnt"></b> answered</div></div>';
  top.after(head);
  var dz = $("dzien"), pd = $("podpis"), datePanel = dz.closest(".panel");
  head.querySelector("#dateOn").closest("label").appendChild(dz);
  datePanel.classList.add("gone");
  $("nameOn").addEventListener("change", function () {
    if (!this.checked) { pd.dataset.v = pd.value; pd.value = ""; } else { pd.value = pd.dataset.v || pd.value; }
    syncHead();
  });
  $("dateOn").addEventListener("change", function () { dz.disabled = !this.checked; });

  // ---- zdjęcia na górę: Galeria · Zdjęcie · Notatka ----
  var ph = $("photos").closest(".panel"), btns = ph.querySelector(".photo-btns");
  ph.classList.add("iphotos"); head.after(ph);
  var labels = btns.querySelectorAll("label");
  function relabel(l, t) { Array.prototype.forEach.call(l.childNodes, function (n) { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = t; }); }
  if (labels[1]) { relabel(labels[1], "Gallery"); btns.insertBefore(labels[1], labels[0]); }
  if (labels[0]) relabel(labels[0], "Photo");
  var note = document.createElement("button");
  note.type = "button"; note.className = "pbtn";
  note.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/></svg>Note';
  btns.appendChild(note);
  var kp = $("komentarz").closest(".panel"); kp.classList.add("fold");
  note.addEventListener("click", function () { kp.classList.add("open"); $("komentarz").focus(); });

  // ---- Overall/Quote: liczone samo z odpowiedzi, ręcznie z menu ⋮ ----
  var ovp = $("ov-1").closest(".panel"); ovp.classList.add("fold");

  // ---- checklista: zwijana sekcja, licznik ----
  var ckp = $("ck").closest(".panel"); ckp.classList.add("isec");
  $("ckTitle").addEventListener("click", function () { ckp.classList.toggle("shut"); });

  function syncHead() {
    // licznik = ile OK z pytań w użyciu (N/A nie liczy się do sumy), np. jedno NIE → 7/8
    var rows = $("ck").querySelectorAll(".ck-row"), ok = 0, used = 0;
    Array.prototype.forEach.call(rows, function (r) {
      var on = r.querySelector(".seg .on"), st = on && on.getAttribute("data-s");
      if (st === "na") return; used++; if (st === "ok") ok++;
    });
    $("iCnt").textContent = ok + "/" + used;
    $("iCntBox").hidden = !rows.length;
    var b = bar && bar.querySelector("b");
    $("iEnds").textContent = b ? b.textContent : "";
    $("nameTx").textContent = $("nameOn").checked ? (pd.value || "Name") : "Name";
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
    $("nameOn").checked = true; $("dateOn").checked = true; dz.disabled = false;
    kp.classList.toggle("open", !!$("komentarz").value.trim()); ovp.classList.remove("open"); menu.hidden = true;
    setTimeout(syncHead, 0);
  }).observe(form, { attributes: true, attributeFilter: ["hidden"] });
})();
