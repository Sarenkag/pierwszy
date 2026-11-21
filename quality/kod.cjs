'use strict';
// Kod wykonywalny JS dla bramek (R23 ratchet, R27 LOGIKA): jedna implementacja, bez kopii.
// sam kod wykonywalny: jeden przebieg z kontekstem usuwa komentarze i treść napisów oraz literałów RegExp
// (z szablonów `…` zostają tylko wyrażenia ${…}), więc „assert(” w napisie albo w komentarzu się nie liczy
function kodWykonywalny(t) { return skan(t, 0, false).out; }
// skan od pozycji k; wDolarze = wnętrze ${…} szablonu: kończy na „}” na zerowej głębokości (klamry w napisach, komentarzach
// i zagnieżdżonych szablonach się nie liczą); zwraca kod wykonywalny i pozycję tej „}”
function skan(t, k, wDolarze) {
  let out = '', d = 0;
  const regexp = i => { let j = i - 1; while (j >= 0 && /\s/.test(t[j])) j--; if (j < 0) return true; if ((t[j] === '+' || t[j] === '-') && t[j - 1] === t[j]) return false; /* „x++ / 2”: dzielenie */ if ('(,=:[!&|?{};+-*%<>~^'.includes(t[j])) return true; const w = t.slice(Math.max(0, j - 10), j + 1).match(/([\w$]+)$/); return !!w && ['return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'throw'].includes(w[1]); };
  while (k < t.length) {
    const ch = t[k];
    if (ch === '/' && t[k + 1] === '/') { const e = t.indexOf('\n', k); k = e < 0 ? t.length : e; continue; }
    if (ch === '/' && t[k + 1] === '*') { const e = t.indexOf('*/', k + 2); out += ' '; k = e < 0 ? t.length : e + 2; continue; }
    if (ch === '"' || ch === "'") { let e = k + 1; while (e < t.length && t[e] !== ch && t[e] !== '\n') e += t[e] === '\\' ? 2 : 1; out += ch + ch; k = e + 1; continue; }
    if (ch === '`') {
      let e = k + 1; out += '`';
      while (e < t.length && t[e] !== '`') {
        if (t[e] === '\\') { e += 2; continue; }
        if (t[e] === '$' && t[e + 1] === '{') { const r = skan(t, e + 2, true); out += ' ' + r.out + ' '; e = r.end + 1; continue; }
        e++;
      }
      out += '`'; k = e + 1; continue;
    }
    if (ch === '/' && regexp(k)) { let w = false, e = k + 1; while (e < t.length && t[e] !== '\n' && (w || t[e] !== '/')) { if (t[e] === '\\') e++; else if (t[e] === '[') w = true; else if (t[e] === ']') w = false; e++; } out += '/ /'; k = e + 1; continue; }
    if (wDolarze && ch === '{') d++;
    if (wDolarze && ch === '}') { if (!d) return { out, end: k }; d--; }
    out += ch; k++;
  }
  return { out, end: t.length };
}

module.exports = { kodWykonywalny };
