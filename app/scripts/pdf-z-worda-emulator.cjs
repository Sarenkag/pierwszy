// PDF z Worda na emulatorze: przez DevTools WebView (debug) otwiera stronę inspekcji OEST, wypełnia wzory firmy tą samą
// funkcją co apka (fillDocx) i robi PDF silnikiem przez moduł (OESTWordPdf.zWorda). Wypisuje strony i czasy.
const fs = require("fs");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let list = [];
  for (let i = 0; i < 20 && !list.length; i++) { try { list = await (await fetch("http://127.0.0.1:9222/json")).json(); } catch (e) {} if (!list.length) await sleep(2000); }
  const page = list.find(p => p.type === "page");
  if (!page) { console.log("BRAK STRONY WEBVIEW", JSON.stringify(list)); return; }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const wait = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
  ws.onclose = () => console.log("DEVTOOLS ZAMKNIĘTE (apka padła?) " + new Date().toISOString());
  const ev = expr => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
  const val = async (expr, ms) => { const out = await Promise.race([ev(expr), sleep(ms || 300000).then(() => null)]); return out && out.result && out.result.result ? out.result.result.value : (out ? { blad: JSON.stringify(out).slice(0, 800) } : null); };
  await ev('location.href = "inspekcje/index.html"');
  await sleep(8000);
  console.log("strona:", await val("location.href", 10000));
  console.log("silnik dostępny:", await val("!!(window.OESTWordPdf && OESTWordPdf.dostepny())", 10000));
  let ok = 0;
  for (const nazwa of ["plant", "basic", "flush", "temp-tb"]) {
    const t0 = Date.now();
    const v = await val(`(function(){var b=OESTWzory.bajty("${nazwa}");
      var docx=fillDocx(PizZip,docxtemplater,b,{},[]).generate({type:"uint8array"});
      return OESTWordPdf.zWorda(docx).then(function(p){if(!p)return {ok:0};var s2="";for(var i=0;i<p.length;i+=32768)s2+=String.fromCharCode.apply(null,p.subarray(i,i+32768));return {ok:1,b64:btoa(s2)};});})()`);
    if (!v || !v.ok) { console.log(nazwa, "BŁĄD / brak PDF", JSON.stringify(v).slice(0, 500)); continue; }
    const pdf = Buffer.from(v.b64, "base64"); fs.writeFileSync("lo-emu/" + nazwa + ".pdf", pdf);
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    console.log(nazwa, "OK stron", pages, "KB", Math.round(pdf.length / 1024), "ms", Date.now() - t0); ok++;
  }
  console.log(ok === 4 ? "WYNIK OK 4/4" : "WYNIK ZŁY " + ok + "/4");
  try { ws.close(); } catch (e) {}
  process.exit(0);
})();
