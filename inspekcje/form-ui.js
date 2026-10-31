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
  kb.type = "button"; kb.className = "kebab"; kb.textContent = "⋮"; kb.setAttribute("aria-label", "Menu");
  var menu = document.createElement("div");
  menu.className = "kmenu"; menu.hidden = true;
  menu.innerHTML = '<div class="kupd"></div>' +
    '<button type="button" data-k="def">Przywróć domyślne (wszystko OK)</button>' +
    '<button type="button" data-k="more">Overall / Quote</button>' +
    '<button type="button" data-k="prev">Podgląd raportu</button>';
  top.appendChild(kb); top.appendChild(menu);
  if (bar) menu.querySelector(".kupd").appendChild(bar);
  kb.addEventListener("click", function () { menu.hidden = !menu.hidden; });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".kmenu,.kebab")) menu.hidden = true; });
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]"); if (!b) return;
    var k = b.getAttribute("data-k"); menu.hidden = true;
    if (k === "def") $("allOk").click();
    if (k === "prev") $("toPreview").click();
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
    var rows = $("ck").querySelectorAll(".ck-row"), done = 0;
    Array.prototype.forEach.call(rows, function (r) { if (r.querySelector(".seg .on")) done++; });
    $("iCnt").textContent = done + "/" + rows.length;
    $("iCntBox").hidden = !rows.length;
    var b = bar && bar.querySelector("b");
    $("iEnds").textContent = b ? b.textContent : "";
    $("nameTx").textContent = $("nameOn").checked ? (pd.value || "Name") : "Name";
  }
  new MutationObserver(syncHead).observe($("ck"), { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  if (bar) new MutationObserver(syncHead).observe(bar, { childList: true, subtree: true });

  // przy każdym otwarciu formularza: znaczniki od nowa, notatka zwinięta (chyba że coś w niej jest)
  new MutationObserver(function () {
    if (form.hidden) return;
    $("nameOn").checked = true; $("dateOn").checked = true; dz.disabled = false;
    kp.classList.toggle("open", !!$("komentarz").value.trim()); ovp.classList.remove("open"); menu.hidden = true;
    setTimeout(syncHead, 0);
  }).observe(form, { attributes: true, attributeFilter: ["hidden"] });
})();
