#!/usr/bin/env node
// Plan audytu 19/11/2026, punkt 1.8 (ustalenie nr 83): APK podpisany TYM SAMYM kluczem co dotąd.
// Inny klucz = Android nie zainstaluje aktualizacji na starej apce (trzeba odinstalować = utrata inspekcji i zdjęć w telefonie),
// a logowanie Google przestaje działać (SHA-1 w Google Cloud). Czyta certyfikat z bloku podpisu APK (schemat v3 i v2,
// bez narzędzi Androida) i porównuje SHA-256 oraz SHA-1 z quality/klucz-podpisu.json. Każdy podpisujący we wszystkich schematach
// musi się zgadzać; APK bez podpisu v2/v3 = FAIL. Ważność samego podpisu sprawdza w CI apksigner verify (android.yml).
// Użycie: node quality/klucz-podpisu.cjs <plik.apk>
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const WZOR = JSON.parse(fs.readFileSync(path.join(__dirname, 'klucz-podpisu.json'), 'utf8'));
const odcisk = (alg, b) => crypto.createHash(alg).update(b).digest('hex').toUpperCase().match(/../g).join(':');

function certyfikaty(apk) {
  const d = fs.readFileSync(apk), e = d.lastIndexOf(Buffer.from('504b0506', 'hex'));
  if (e < 0) throw Error('to nie jest plik ZIP/APK');
  const cd = d.readUInt32LE(e + 16);
  if (d.toString('latin1', cd - 16, cd) !== 'APK Sig Block 42') throw Error('APK bez bloku podpisu v2/v3 (podpis tylko v1 albo brak podpisu)');
  const size = Number(d.readBigUInt64LE(cd - 24)), start = cd - size - 8, out = [];
  const lp = (b, o) => { const n = b.readUInt32LE(o); return [b.subarray(o + 4, o + 4 + n), o + 4 + n]; };
  for (let p = start + 8; p < cd - 24;) {
    const len = Number(d.readBigUInt64LE(p)), id = d.readUInt32LE(p + 8), v = d.subarray(p + 12, p + 8 + len); p += 8 + len;
    const schemat = { 0x7109871a: 'v2', 0xf05368c0: 'v3', 0x1b93ad61: 'v3.1' }[id]; if (!schemat) continue;
    let [signers] = lp(v, 0);
    for (let o = 0; o < signers.length;) {
      let signer; [signer, o] = lp(signers, o);
      const [sd] = lp(signer, 0), [, o2] = lp(sd, 0), [certs] = lp(sd, o2);
      for (let c = 0; c < certs.length;) { let cert; [cert, c] = lp(certs, c); out.push({ schemat, cert }); }
    }
  }
  return out;
}

const apk = process.argv[2];
try {
  if (!apk) throw Error('podaj plik APK');
  const c = certyfikaty(apk), zle = [];
  if (!c.length) throw Error('w bloku podpisu nie ma certyfikatu v2/v3');
  for (const { schemat, cert } of c) {
    const s256 = odcisk('sha256', cert), s1 = odcisk('sha1', cert);
    if (s256 !== WZOR.sha256 || s1 !== WZOR.sha1) zle.push(schemat + ': SHA-256 ' + s256 + ', SHA-1 ' + s1);
  }
  if (zle.length) throw Error('APK podpisany INNYM kluczem niż dotąd (wzór SHA-256 ' + WZOR.sha256 + '):\n - ' + zle.join('\n - '));
  console.log('KLUCZ PODPISU PASS: ' + path.basename(apk) + ' – ' + [...new Set(c.map(x => x.schemat))].join(', ') + ', certyfikat SHA-256 ' + WZOR.sha256 + ' (SHA-1 ' + WZOR.sha1 + ' jak w Google Cloud)');
} catch (e) { console.error('KLUCZ PODPISU FAIL: ' + e.message); process.exit(1); }
