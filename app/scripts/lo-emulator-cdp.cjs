// PRÓBA LO na emulatorze: przez DevTools WebView (debug) otwiera stronę próby i robi PDF z Worda (Plant), czeka na wynik.
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
  console.log("strona:", page.url);
  console.log("wtyczka:", JSON.stringify((await ev("!!(window.Capacitor && Capacitor.isPluginAvailable('LibreOffice'))")).result));
  const fs = require("fs");
  for (const f of ["plant", "flushing-tb", "temp-tb", "basic-el", "reactive"]) {
    const t0 = Date.now();
    const r = ev(`fetch("proba-lo/${f}.docx").then(r=>r.arrayBuffer()).then(buf=>{var s="",b=new Uint8Array(buf);for(var i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));return Capacitor.Plugins.LibreOffice.toPdf({docx:btoa(s)})}).then(x=>({ok:1,pdf:x.pdf,bytes:x.bytes,ms:x.ms,initMs:x.initMs}), e=>({ok:0,err:String(e&&e.message||e)}))`);
    const out = await Promise.race([r, sleep(300000).then(() => null)]);
    const v = out && out.result && out.result.value;
    if (!v) { console.log(f, "BRAK ODPOWIEDZI (apka padła?) po", Date.now() - t0, "ms"); break; }
    if (!v.ok) { console.log(f, "BŁĄD", v.err); continue; }
    const pdf = Buffer.from(v.pdf, "base64"); fs.writeFileSync("lo-emu/" + f + ".pdf", pdf);
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    console.log(f, "OK stron", pages, "KB", Math.round(v.bytes / 1024), "konwersja ms", v.ms, "start silnika ms", v.initMs, "razem ms", Date.now() - t0);
  }
  try { ws.close(); } catch (e) {}
  process.exit(0);
})();
