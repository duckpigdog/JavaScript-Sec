import { STR_TABLE, md5Hex } from './vendor.js';

function b64VariantEncode(bytes) {
  const table = STR_TABLE[0x00];
  let out = '', i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++] || 0;
    const b2 = bytes[i++] || 0;
    const b3 = bytes[i++] || 0;
    const trip = (b1 << 16) | (b2 << 8) | b3;
    out += table[(trip >> 18) & 63] + table[(trip >> 12) & 63] + table[(trip >> 6) & 63] + table[trip & 63];
  }
  const pad = bytes.length % 3;
  if (pad === 1) out = out.slice(0, -2) + '--';
  else if (pad === 2) out = out.slice(0, -1) + '-';
  return out;
}

function xorBytes(utf8Str, key) {
  const enc = new TextEncoder().encode(utf8Str);
  const k = new TextEncoder().encode(key);
  const out = new Uint8Array(enc.length);
  for (let i = 0; i < enc.length; i++) out[i] = enc[i] ^ k[i % k.length];
  return out;
}

function hex(buf) { return Array.from(buf, b => ('0' + b.toString(16)).slice(-2)).join(''); }
function unhexSwap(h) {
  const arr = h.match(/.{2}/g) || [];
  for (let i = 0; i + 3 < arr.length; i += 4) { const t = arr[i]; arr[i] = arr[i+2]; arr[i+2] = t; const t2 = arr[i+1]; arr[i+1] = arr[i+3]; arr[i+3] = t2; }
  return arr.join('');
}

async function aesCbcHex(plainUtf8, keyStr, ivStr) {
  const BEGIN = 'BEGIN', END = 'END';
  const data = new TextEncoder().encode(BEGIN + plainUtf8 + END);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(keyStr), { name: 'AES-CBC' }, false, ['encrypt']);
  const iv = new TextEncoder().encode(ivStr);
  const ct = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data);
  return unhexSwap(hex(new Uint8Array(ct)));
}

function mid3(md2Hex, t) {
  const tag = STR_TABLE[0x02];
  const md = md5Hex(md2Hex + '|' + String(t) + '|' + tag);
  const tmp = md.substr(8, 16);
  return tmp.split('').reverse().join('');
}

function rawStr(uid, page, t) {
  const salt = STR_TABLE[0x01];
  return String(uid) + '|' + String(page) + '|' + String(t) + '|' + salt;
}

export const Security = {
  async buildAuth(uid, page) {
    const t = Math.floor(Date.now() / 1000);
    const K1 = 'jk9Qw!';
    const mid1 = b64VariantEncode(xorBytes(rawStr(uid, page, t), K1));
    const keyStr = 'P@ssw0rd2025Key!';
    const ivStr  = 'OrderList2025IV!';
    const mid2 = await aesCbcHex(mid1, keyStr, ivStr);
    const auth = mid3(mid2, t);
    return { auth, t };
  }
};

window.Security = Security;
