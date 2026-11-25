// Wspólne interakcje z kontrolkami Ionic; asercje pozostają w scenariuszach.
const fs = require('node:fs');
const assert = require('node:assert/strict');

function cel(pageOrLocator, selectorOrValue, value) {
  return typeof pageOrLocator.locator === 'function' && typeof pageOrLocator.goto === 'function'
    ? [pageOrLocator.locator(selectorOrValue), value]
    : [pageOrLocator, selectorOrValue];
}
async function wpisz(p, s, v) {
  const [l, value] = cel(p, s, v);
  const tag = await l.evaluate(e => e.tagName);
  if (tag === 'ION-DATETIME' || await l.locator('ion-datetime').count()) {
    const d = tag === 'ION-DATETIME' ? l : l.locator('ion-datetime');
    await d.evaluate((e, value) => { e.value = value; e.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, composed: true, detail: { value } })); }, value);
    return;
  }
  await (tag === 'ION-INPUT' ? l.locator('input') : tag === 'ION-TEXTAREA' ? l.locator('textarea') : l).fill(value);
}
async function wybierz(p, s, v) {
  const [l, value] = cel(p, s, v);
  if (await l.evaluate(e => e.tagName === 'ION-SELECT')) {
    const selected = await l.evaluate((e, value) => {
      const o = [...e.querySelectorAll('ion-select-option')].find(o => String(o.value) === String(value));
      if (!o || o.disabled || e.disabled) throw new Error('Niedostępna opcja: ' + value);
      e.value = o.value;
      e.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, composed: true, detail: { value: o.value } }));
      return String(o.value);
    }, value);
    assert.equal(selected, String(value));
  } else await l.selectOption(value);
}
async function ptaszek(l, checked = true) {
  if (await l.evaluate(e => e.tagName === 'ION-CHECKBOX' || e.tagName === 'ION-TOGGLE')) {
    await l.evaluate((e, checked) => {
      if (e.disabled) throw new Error('Checkbox wyłączony');
      if (e.checked === checked) return;
      e.checked = checked;
      e.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, composed: true, detail: { checked, value: e.value } }));
    }, checked);
    assert.equal(await l.evaluate(e => e.checked), checked);
  } else await l.setChecked(checked);
}
async function wartosc(l) {
  return l.evaluate(e => {
    const d = e.tagName === 'ION-DATETIME' ? e : e.querySelector('ion-datetime');
    return d ? String(d.value || '').slice(0, 10) : e.value;
  });
}
async function zdjecia(p, s, v) {
  const [l, files] = cel(p, s, v), page = l.page();
  const payload = (Array.isArray(files) ? files : [files]).map(f => {
    if (typeof f === 'string') return { name: require('node:path').basename(f), mimeType: /png$/i.test(f) ? 'image/png' : 'image/jpeg', b64: fs.readFileSync(f).toString('base64') };
    return { name: f.name, mimeType: f.mimeType, b64: f.buffer.toString('base64') };
  });
  await page.evaluate(payload => {
    if (window.__ionicZdjecia) throw new Error('Poprzedni wybór zdjęć nie zakończony');
    const pliki = payload.map(p => new File([Uint8Array.from(atob(p.b64), c => c.charCodeAt(0))], p.name, { type: p.mimeType }));
    const take = window.OESTAparat?.take, click = HTMLInputElement.prototype.click;
    const stan = window.__ionicZdjecia = { wybrane: false };
    stan.przywroc = () => { if (window.OESTAparat) window.OESTAparat.take = take; HTMLInputElement.prototype.click = click; delete window.__ionicZdjecia; };
    if (window.OESTAparat) window.OESTAparat.take = async () => { stan.wybrane = true; return pliki[0]; };
    HTMLInputElement.prototype.click = function () {
      if (this.type !== 'file') return click.call(this);
      const dt = new DataTransfer(); pliki.forEach(f => dt.items.add(f)); this.files = dt.files;
      stan.wybrane = true; this.dispatchEvent(new Event('change', { bubbles: true }));
    };
  }, payload);
  try {
    await l.click();
    await page.waitForFunction(() => window.__ionicZdjecia.wybrane);
    await page.waitForFunction(e => e.isConnected && !e.disabled, await l.elementHandle());
  } finally { await page.evaluate(() => window.__ionicZdjecia?.przywroc()); }
}
module.exports = { wpisz, wybierz, ptaszek, wartosc, zdjecia };
