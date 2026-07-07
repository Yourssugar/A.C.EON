// ============================================================
// A.C.EON // CIPHER ENGINE
// Работает и в браузере (<script src>), и в Node (require) для тестов.
// Каждая операция строго обратима (кроме сведений в desc).
// ============================================================
(function (root) {
"use strict";

const SITE_KEY = "A.C.EON//SINGULARITY//KEY";

const ALPH = {
  latL: "abcdefghijklmnopqrstuvwxyz",
  latU: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  cyrL: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
  cyrU: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
};
const SETS = [ALPH.latL, ALPH.latU, ALPH.cyrL, ALPH.cyrU];

function shiftChar(ch, n) { for (const s of SETS) { const i = s.indexOf(ch); if (i >= 0) { const L = s.length; return s[((i + n) % L + L) % L]; } } return ch; }
function atbashChar(ch) { for (const s of SETS) { const i = s.indexOf(ch); if (i >= 0) return s[s.length - 1 - i]; } return ch; }
function isLetter(ch) { for (const s of SETS) if (s.indexOf(ch) >= 0) return true; return false; }
function letterIndex(ch) { for (const s of SETS) { const i = s.indexOf(ch); if (i >= 0) return i; } return null; }
function caseChar(ch) { let i = ALPH.latL.indexOf(ch); if (i >= 0) return ALPH.latU[i]; i = ALPH.latU.indexOf(ch); if (i >= 0) return ALPH.latL[i]; i = ALPH.cyrL.indexOf(ch); if (i >= 0) return ALPH.cyrU[i]; i = ALPH.cyrU.indexOf(ch); if (i >= 0) return ALPH.cyrL[i]; return ch; }

// ---- байты / UTF-8 / base64 ----
const _enc = new TextEncoder(), _dec = new TextDecoder();
function utf8Bytes(str) { return _enc.encode(str); }
function bytesUtf8(b) { return _dec.decode(b); }
function bytesToB64(b) { let s = ""; b.forEach(x => s += String.fromCharCode(x)); return btoa(s); }
function b64ToBytes(b64) { const bin = atob(b64); return Uint8Array.from(bin, c => c.charCodeAt(0)); }

// ---- Виженер ----
function vigenere(str, key, dir) {
  const sh = Array.from(key || "").map(letterIndex).filter(x => x !== null);
  if (!sh.length) return str; let ki = 0;
  return Array.from(str).map(ch => { if (!isLetter(ch)) return ch; const v = sh[ki % sh.length] * dir; ki++; return shiftChar(ch, v); }).join("");
}

// ---- перестановки ----
function reverseWordOrder(str) { const words = str.match(/\S+/g) || []; const gaps = str.split(/\S+/); const rw = words.slice().reverse(); let out = gaps[0] || ""; for (let i = 0; i < rw.length; i++) out += rw[i] + (gaps[i + 1] || ""); return out; }
const swap23 = w => { const a = Array.from(w); if (a.length >= 3) { const t = a[1]; a[1] = a[2]; a[2] = t; } return a.join(""); };
const swapfl = w => { const a = Array.from(w); if (a.length >= 2) { const t = a[0]; a[0] = a[a.length - 1]; a[a.length - 1] = t; } return a.join(""); };
function railEnc(str, rails) { rails = Math.max(1, rails | 0); if (rails === 1) return str; const a = Array.from(str); const rows = Array.from({ length: rails }, () => []); let r = 0, dir = 1; for (const ch of a) { rows[r].push(ch); if (r === 0) dir = 1; else if (r === rails - 1) dir = -1; r += dir; } return rows.map(x => x.join("")).join(""); }
function railDec(str, rails) { rails = Math.max(1, rails | 0); if (rails === 1) return str; const a = Array.from(str); const n = a.length; const pat = []; let r = 0, dir = 1; for (let i = 0; i < n; i++) { pat.push(r); if (r === 0) dir = 1; else if (r === rails - 1) dir = -1; r += dir; } const counts = Array(rails).fill(0); pat.forEach(p => counts[p]++); const rows = []; let idx = 0; for (let k = 0; k < rails; k++) { rows.push(a.slice(idx, idx + counts[k])); idx += counts[k]; } const pos = Array(rails).fill(0), out = []; for (let i = 0; i < n; i++) { const p = pat[i]; out.push(rows[p][pos[p]++]); } return out.join(""); }

// ---- ROT47 / XOR ----
function rot47(s) { return Array.from(s).map(ch => { const c = ch.codePointAt(0); return (c >= 33 && c <= 126) ? String.fromCodePoint(33 + ((c - 33 + 47) % 94)) : ch; }).join(""); }
function xorGamma(s, key, dec) { const k = utf8Bytes(key && key.length ? key : "eon"); if (dec) { const b = b64ToBytes(s); return bytesUtf8(b.map((x, i) => x ^ k[i % k.length])); } const b = utf8Bytes(s); return bytesToB64(b.map((x, i) => x ^ k[i % k.length])); }

// ---- base32 ----
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32enc(bytes) { let bits = 0, val = 0, out = ""; for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out; }
function base32dec(str) { let bits = 0, val = 0; const out = []; for (const c of str) { const i = B32.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Uint8Array.from(out); }

// ---- base58 (Bitcoin) ----
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58enc(bytes) { if (bytes.length === 0) return ""; let x = 0n; for (const b of bytes) x = (x << 8n) + BigInt(b); let out = ""; while (x > 0n) { out = B58[Number(x % 58n)] + out; x /= 58n; } for (const b of bytes) { if (b === 0) out = "1" + out; else break; } return out; }
function base58dec(str) { if (str === "") return new Uint8Array(); let x = 0n; for (const c of str) { const i = B58.indexOf(c); if (i < 0) continue; x = x * 58n + BigInt(i); } const bytes = []; while (x > 0n) { bytes.unshift(Number(x & 255n)); x >>= 8n; } for (const c of str) { if (c === "1") bytes.unshift(0); else break; } return Uint8Array.from(bytes); }

// ---- base85 (Ascii85, без сокращений) ----
function base85enc(bytes) { let out = ""; for (let i = 0; i < bytes.length; i += 4) { const n = Math.min(4, bytes.length - i); let val = 0; for (let j = 0; j < 4; j++) val = (val * 256) + (j < n ? bytes[i + j] : 0); val = val >>> 0; const enc = []; for (let j = 0; j < 5; j++) { enc.unshift(val % 85); val = Math.floor(val / 85); } for (let j = 0; j < n + 1; j++) out += String.fromCharCode(33 + enc[j]); } return out; }
function base85dec(str) { const out = []; for (let i = 0; i < str.length; i += 5) { const m = Math.min(5, str.length - i); let val = 0; for (let j = 0; j < 5; j++) val = val * 85 + (j < m ? str.charCodeAt(i + j) - 33 : 84); val = val >>> 0; const b = [(val >>> 24) & 255, (val >>> 16) & 255, (val >>> 8) & 255, val & 255]; for (let j = 0; j < m - 1; j++) out.push(b[j]); } return Uint8Array.from(out); }

// ---- Брайль (байт → символ Брайля U+2800..U+28FF) ----
function brailleEnc(s) { return Array.from(utf8Bytes(s)).map(b => String.fromCharCode(0x2800 + b)).join(""); }
function brailleDec(s) { const bytes = Array.from(s).map(ch => ch.codePointAt(0) - 0x2800).filter(b => b >= 0 && b < 256); return bytesUtf8(Uint8Array.from(bytes)); }

// ---- Морзе (через base32-форму → полностью обратимо для любого текста) ----
const MORSE = { A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--..." };
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
function morseEnc(s) { const b32 = base32enc(utf8Bytes(s)); return Array.from(b32).map(c => MORSE[c] || "").join(" "); }
function morseDec(s) { const t = s.trim(); const b32 = t === "" ? "" : t.split(/\s+/).map(code => MORSE_REV[code] || "").join(""); return bytesUtf8(base32dec(b32)); }

// ---- Плейфер (по hex-форме, таблица 4×4 из ключа) ----
function pfGrid(key) { const sym = "0123456789abcdef".split(""); let seed = 0; for (const c of (key || "eon")) seed = (seed * 31 + c.charCodeAt(0)) >>> 0; const arr = sym.slice(); for (let i = arr.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; const j = seed % (i + 1);[arr[i], arr[j]] = [arr[j], arr[i]]; } const pos = {}; arr.forEach((ch, idx) => pos[ch] = { r: idx >> 2, c: idx & 3 }); return { arr, pos }; }
function pfPair(a, b, g, d) { if (a === b) return [a, b]; const A = g.pos[a], B = g.pos[b]; if (A.r === B.r) return [g.arr[A.r * 4 + (A.c + d + 4) % 4], g.arr[B.r * 4 + (B.c + d + 4) % 4]]; if (A.c === B.c) return [g.arr[((A.r + d + 4) % 4) * 4 + A.c], g.arr[((B.r + d + 4) % 4) * 4 + B.c]]; return [g.arr[A.r * 4 + B.c], g.arr[B.r * 4 + A.c]]; }
function playfair(s, key, dir) {
  const g = pfGrid(key);
  const hex = dir > 0 ? Array.from(utf8Bytes(s)).map(b => b.toString(16).padStart(2, "0")).join("") : s;
  const a = hex.split(""); let out = "";
  for (let i = 0; i < a.length; i += 2) { const p = pfPair(a[i], a[i + 1], g, dir > 0 ? 1 : -1); out += p[0] + p[1]; }
  if (dir > 0) return out;
  return out === "" ? "" : bytesUtf8(Uint8Array.from(out.match(/.{1,2}/g) || [], x => parseInt(x, 16)));
}

// ---- Хилл (матрица 2×2 mod 256 из ключа) ----
function egcd(a, b) { if (b === 0) return [a, 1, 0]; const r = egcd(b, a % b); return [r[0], r[2], r[1] - Math.floor(a / b) * r[2]]; }
function modInv(a, m) { a = ((a % m) + m) % m; const r = egcd(a, m); if (r[0] !== 1) return null; return ((r[1] % m) + m) % m; }
function hillMatrix(key) { let s = 0; for (const c of (key || "eon")) s = (s * 131 + c.charCodeAt(0)) >>> 0; let a = s & 255, b = (s >>> 8) & 255, c = (s >>> 16) & 255, d = (s >>> 24) & 255; const det = () => (((a * d - b * c) % 256) + 256) % 256; if (det() % 2 === 0) { d = (d + 1) & 255; } if (det() % 2 === 0) { a = (a + 1) & 255; } if (det() % 2 === 0) { a = 3; b = 3; c = 2; d = 5; } return [a, b, c, d]; }
function hillApply(bytes, m) { const out = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i += 2) { const x = bytes[i], y = bytes[i + 1]; out[i] = (m[0] * x + m[1] * y) & 255; out[i + 1] = (m[2] * x + m[3] * y) & 255; } return out; }
function hillEnc(s, key) { const data = utf8Bytes(s); const pad = (data.length % 2 === 0) ? 1 : 0; const buf = new Uint8Array(1 + data.length + pad); buf[0] = pad; buf.set(data, 1); return bytesToB64(hillApply(buf, hillMatrix(key))); }
function hillDec(s, key) { const enc = b64ToBytes(s); const m = hillMatrix(key); const det = (((m[0] * m[3] - m[1] * m[2]) % 256) + 256) % 256; const di = modInv(det, 256); const inv = [(m[3] * di) & 255, (((-m[1] * di) % 256) + 256) & 255, (((-m[2] * di) % 256) + 256) & 255, (m[0] * di) & 255]; const dec = hillApply(enc, inv); const pad = dec[0]; return bytesUtf8(dec.slice(1, dec.length - pad)); }

// ---- RSA (учебная: p=61,q=53,n=3233,e=17,d=2753) ----
function modpow(base, exp, mod) { let r = 1; base %= mod; while (exp > 0) { if (exp & 1) r = (r * base) % mod; exp = Math.floor(exp / 2); base = (base * base) % mod; } return r; }
function rsaEnc(s) { let out = ""; for (const b of utf8Bytes(s)) out += modpow(b, 17, 3233).toString(16).padStart(3, "0"); return out; }
function rsaDec(s) { const g = s.match(/.{1,3}/g) || []; return bytesUtf8(Uint8Array.from(g.map(h => modpow(parseInt(h, 16), 2753, 3233)))); }

// ---- Вернам (одноразовый блокнот; ключ генерится под длину сообщения) ----
function vernamGen(s) { const n = utf8Bytes(s).length; const pad = new Uint8Array(n); for (let i = 0; i < n; i++) pad[i] = (Math.random() * 256) | 0; return bytesToB64(pad); }
function vernamFwd(s, p) { const b = utf8Bytes(s), pad = b64ToBytes(p || ""); return bytesToB64(b.map((x, i) => x ^ (pad.length ? pad[i % pad.length] : 0))); }
function vernamInv(s, p) { const b = b64ToBytes(s), pad = b64ToBytes(p || ""); return bytesUtf8(b.map((x, i) => x ^ (pad.length ? pad[i % pad.length] : 0))); }

// ============================================================
// РЕЕСТР ОПЕРАЦИЙ
// grp — группа в палитре, plabel — подпись поля параметра, gen — генерация ключа под сообщение
// ============================================================
const OPS = {
  // --- Кодировки ---
  b64: { name: "Base64", grp: "Кодировки", desc: "Текст превращается в поток латинских букв, цифр и +/=. Базовая маскировка — читается только машиной.", fwd: s => bytesToB64(utf8Bytes(s)), inv: s => bytesUtf8(b64ToBytes(s)) },
  base32: { name: "Base32", grp: "Кодировки", desc: "Как Base64, но алфавит скромнее: только A–Z и 2–7. Длиннее, зато без спецсимволов.", fwd: s => base32enc(utf8Bytes(s)), inv: s => bytesUtf8(base32dec(s)) },
  base58: { name: "Base58", grp: "Кодировки", desc: "Компактная кодировка на 58 символах (как адреса Bitcoin), без похожих 0/O/I/l.", fwd: s => base58enc(utf8Bytes(s)), inv: s => bytesUtf8(base58dec(s)) },
  base85: { name: "Base85", grp: "Кодировки", desc: "Плотная кодировка Ascii85: 4 байта → 5 символов. Короче, чем Base64.", fwd: s => base85enc(utf8Bytes(s)), inv: s => bytesUtf8(base85dec(s)) },
  hex: { name: "HEX 16-ричный", grp: "Кодировки", desc: "Каждый символ становится парой шестнадцатеричных цифр (0–9, a–f). Вид дампа памяти.", fwd: s => Array.from(utf8Bytes(s)).map(b => b.toString(16).padStart(2, "0")).join(""), inv: s => s === "" ? "" : bytesUtf8(Uint8Array.from(s.match(/.{1,2}/g) || [], x => parseInt(x, 16))) },
  bin: { name: "Двоичный код", grp: "Кодировки", desc: "Каждый символ разворачивается в восьмёрку нулей и единиц. Самый «машинный» вид.", fwd: s => Array.from(utf8Bytes(s)).map(b => b.toString(2).padStart(8, "0")).join(" "), inv: s => { const t = s.trim(); return t === "" ? "" : bytesUtf8(Uint8Array.from(t.split(/\s+/), x => parseInt(x, 2))); } },
  url: { name: "URL-кодирование", grp: "Кодировки", desc: "Символы заменяются на %XX, как в адресах сайтов. Пробелы и кириллица прячутся за процентами.", fwd: s => encodeURIComponent(s), inv: s => decodeURIComponent(s) },

  // --- Визуальное ---
  braille: { name: "Брайль", grp: "Визуальное", desc: "Каждый байт превращается в символ шрифта Брайля ⠿ — как тактильные точки. Полностью обратимо.", fwd: s => brailleEnc(s), inv: s => brailleDec(s) },
  morse: { name: "Азбука Морзе", grp: "Визуальное", desc: "Текст сводится к точкам и тире (через base32-форму), разделённым пробелами. Телеграф.", fwd: s => morseEnc(s), inv: s => morseDec(s) },

  // --- Перестановки ---
  revall: { name: "Перевернуть всё", grp: "Перестановки", desc: "Вся строка читается задом наперёд — от последнего символа к первому.", fwd: s => Array.from(s).reverse().join(""), inv: s => Array.from(s).reverse().join("") },
  revword: { name: "Слова наоборот", grp: "Перестановки", desc: "Каждое слово переворачивается по буквам, порядок слов сохраняется.", fwd: s => s.replace(/\S+/gu, w => Array.from(w).reverse().join("")), inv: s => s.replace(/\S+/gu, w => Array.from(w).reverse().join("")) },
  wordorder: { name: "Порядок слов наоборот", grp: "Перестановки", desc: "Слова переставляются в обратном порядке. Буквы внутри слов остаются на месте.", fwd: reverseWordOrder, inv: reverseWordOrder },
  swap23: { name: "2-я ↔ 3-я буква", grp: "Перестановки", desc: "В каждом слове вторая и третья буквы меняются местами. Короткие слова не трогаем.", fwd: s => s.replace(/\S+/gu, swap23), inv: s => s.replace(/\S+/gu, swap23) },
  swapfl: { name: "1-я ↔ последняя", grp: "Перестановки", desc: "В каждом слове первая и последняя буквы обмениваются местами.", fwd: s => s.replace(/\S+/gu, swapfl), inv: s => s.replace(/\S+/gu, swapfl) },
  rail: { name: "Шифр забора", grp: "Перестановки", param: "num", plabel: "рейки", pdefault: 3, desc: "Текст пишется зигзагом по N строкам-рейкам, читается построчно. Параметр — число реек.", fwd: (s, p) => railEnc(s, p), inv: (s, p) => railDec(s, p) },

  // --- Классика ---
  caesar: { name: "Шифр Цезаря", grp: "Классика", param: "num", plabel: "сдвиг", pdefault: 3, desc: "Каждая буква сдвигается по алфавиту на N позиций. Параметр — величина сдвига.", fwd: (s, p) => Array.from(s).map(ch => shiftChar(ch, (+p | 0))).join(""), inv: (s, p) => Array.from(s).map(ch => shiftChar(ch, -(p | 0))).join("") },
  vigenere: { name: "Виженер по ключу", grp: "Классика", param: "key", plabel: "ключ", pdefault: "eon", desc: "Сдвиг каждой буквы задаётся буквами ключевого слова по кругу. Параметр — ключ.", fwd: (s, p) => vigenere(s, p, +1), inv: (s, p) => vigenere(s, p, -1) },
  xor: { name: "XOR-гамма (ключ)", grp: "Классика", param: "key", plabel: "ключ", pdefault: "eon", desc: "Байты текста складываются с ключом по XOR, результат в Base64. Жёстче Виженера.", fwd: (s, p) => xorGamma(s, p, false), inv: (s, p) => xorGamma(s, p, true) },
  vernam: { name: "Вернам (блокнот)", grp: "Классика", gen: vernamGen, desc: "Одноразовый блокнот: XOR со случайным ключом длиной с сообщение. Ключ вшивается в передачу — это демо, не защита!", fwd: vernamFwd, inv: vernamInv },
  playfair: { name: "Плейфер", grp: "Классика", param: "key", plabel: "ключ", pdefault: "eon", desc: "Парный шифр по таблице 4×4: символы hex-формы шифруются двойками. Ключ задаёт таблицу.", fwd: (s, p) => playfair(s, p, +1), inv: (s, p) => playfair(s, p, -1) },
  hill: { name: "Шифр Хилла", grp: "Классика", param: "key", plabel: "ключ", pdefault: "eon", desc: "Матричный шифр: байты умножаются на секретную матрицу 2×2 по модулю 256. Ключ задаёт матрицу.", fwd: (s, p) => hillEnc(s, p), inv: (s, p) => hillDec(s, p) },
  rsa: { name: "RSA (учебная)", grp: "Классика", desc: "Учебная RSA (малые p=61, q=53): каждый байт возводится в степень по модулю 3233. Демонстрация асимметрии.", fwd: s => rsaEnc(s), inv: s => rsaDec(s) },
  atbash: { name: "Атбаш (зеркало)", grp: "Классика", desc: "Алфавит отражается: А↔Я, Б↔Э, A↔Z. Древний шифр-перевёртыш.", fwd: s => Array.from(s).map(atbashChar).join(""), inv: s => Array.from(s).map(atbashChar).join("") },
  rot47: { name: "ROT47", grp: "Классика", desc: "Сдвиг на 47 по видимым ASCII-знакам. Латиница, цифры и символы перемешиваются; кириллица не меняется.", fwd: s => rot47(s), inv: s => rot47(s) },
  caseswap: { name: "Инверсия регистра", grp: "Классика", desc: "Строчные буквы становятся ЗАГЛАВНЫМИ и наоборот.", fwd: s => Array.from(s).map(caseChar).join(""), inv: s => Array.from(s).map(caseChar).join("") },
};

// ============================================================
// МАРКЕР И СБОРКА ПЕРЕДАЧИ
// ============================================================
function packRecipe(recipe) { const b = utf8Bytes(JSON.stringify(recipe)), k = utf8Bytes(SITE_KEY); return bytesToB64(b.map((x, i) => x ^ k[i % k.length])); }
function unpackRecipe(b64) { const b = b64ToBytes(b64), k = utf8Bytes(SITE_KEY); return JSON.parse(bytesUtf8(b.map((x, i) => x ^ k[i % k.length]))); }

const PREFIX = "⟨ACEON:", SEP = "⟩";

function encode(text, recipe) {
  let s = text;
  for (const st of recipe) {
    const op = OPS[st.id];
    if (op.gen && (st.p === undefined || st.p === null)) st.p = op.gen(s); // генерим ключ под текущую стадию
    s = op.fwd(s, st.p);
  }
  return PREFIX + packRecipe(recipe) + SEP + s;
}
function decodeParts(t) {
  if (!t.startsWith(PREFIX)) throw new Error("Это не передача A.C.EON — нет метки ⟨ACEON:…⟩");
  const end = t.indexOf(SEP); if (end < 0) throw new Error("Маркер повреждён — обрезан заголовок");
  let recipe; try { recipe = unpackRecipe(t.slice(PREFIX.length, end)); } catch (e) { throw new Error("Не удалось прочитать рецепт — маркер испорчен"); }
  let s = t.slice(end + 1);
  for (let i = recipe.length - 1; i >= 0; i--) s = OPS[recipe[i].id].inv(s, recipe[i].p);
  return { recipe, plain: s };
}
function decode(t) { return decodeParts(t).plain; }

const API = { OPS, encode, decode, decodeParts, packRecipe, unpackRecipe, PREFIX, SEP };
if (typeof module !== "undefined" && module.exports) module.exports = API;      // Node
else { root.ACEON = API; root.OPS = OPS; root.encode = encode; root.decode = decode; root.decodeParts = decodeParts; root.PREFIX = PREFIX; root.SEP = SEP; } // браузер

})(typeof globalThis !== "undefined" ? globalThis : this);
