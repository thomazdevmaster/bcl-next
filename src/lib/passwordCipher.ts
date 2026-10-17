/**
 * Senhas nunca saem do navegador em claro.
 *
 * O front busca a chave pública da API (`GET /auth/public-key`, JWK RSA) e cifra a
 * senha com RSA-OAEP + SHA-256 antes de montar o JSON. A API abre o envelope e
 * só então valida/grava. Qualquer senha enviada sem cifrar é rejeitada pela API.
 *
 * `crypto.subtle` só existe em contexto seguro (https ou localhost). No celular
 * em rede local (`http://192.168…`) ele é `undefined`, então existe uma
 * implementação em BigInt do mesmo RSA-OAEP para esse caso.
 */
import { apiFetch } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';

export type PasswordPublicKey = {
  kty: 'RSA';
  n: string;
  e: string;
  alg: string;
  use?: string;
  kid?: string;
};

const HASH_BYTES = 32;
const MAX_PASSWORD_BYTES = 190; // 2048 bits: k - 2·hLen - 2

async function fetchPublicKey(): Promise<PasswordPublicKey> {
  const key = await apiFetch<PasswordPublicKey>('/auth/public-key');
  if (!key || key.kty !== 'RSA' || !key.n || !key.e) {
    throw new Error(failureMessage(undefined, 'A API não forneceu a chave para proteger a senha.'));
  }
  return key;
}

/** Cifra a senha para envio. Sempre busca a chave atual: ela muda quando a API reinicia. */
export async function sealPassword(rawPassword: string): Promise<string> {
  const plain = new TextEncoder().encode(rawPassword);
  if (plain.byteLength > MAX_PASSWORD_BYTES) {
    throw new Error('A senha é longa demais.');
  }
  const key = await fetchPublicKey();
  const subtle = globalThis.crypto?.subtle;
  const sealed = subtle ? await sealWithWebCrypto(subtle, key, plain) : sealWithBigInt(key, plain);
  return toBase64(sealed);
}

async function sealWithWebCrypto(subtle: SubtleCrypto, jwk: PasswordPublicKey, plain: Uint8Array): Promise<Uint8Array> {
  const key = await subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RSA-OAEP-256', ext: true },
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  const buffer = await subtle.encrypt({ name: 'RSA-OAEP' }, key, plain.slice().buffer as ArrayBuffer);
  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// Fallback sem `crypto.subtle` (RFC 8017 RSAES-OAEP com SHA-256 e MGF1-SHA-256)
// ---------------------------------------------------------------------------

function sealWithBigInt(jwk: PasswordPublicKey, plain: Uint8Array): Uint8Array {
  const modulus = bytesToBigInt(fromBase64Url(jwk.n));
  const exponent = bytesToBigInt(fromBase64Url(jwk.e));
  const k = fromBase64Url(jwk.n).length;

  const lHash = sha256(new Uint8Array(0));
  const db = new Uint8Array(k - HASH_BYTES - 1);
  db.set(lHash, 0);
  db[db.length - plain.length - 1] = 0x01;
  db.set(plain, db.length - plain.length);

  const seed = new Uint8Array(HASH_BYTES);
  globalThis.crypto.getRandomValues(seed);

  const maskedDb = xor(db, mgf1(seed, db.length));
  const maskedSeed = xor(seed, mgf1(maskedDb, HASH_BYTES));

  const encoded = new Uint8Array(k);
  encoded[0] = 0x00;
  encoded.set(maskedSeed, 1);
  encoded.set(maskedDb, 1 + HASH_BYTES);

  return bigIntToBytes(modPow(bytesToBigInt(encoded), exponent, modulus), k);
}

function mgf1(seed: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  const input = new Uint8Array(seed.length + 4);
  input.set(seed, 0);
  for (let counter = 0, offset = 0; offset < length; counter++) {
    input[seed.length] = (counter >>> 24) & 0xff;
    input[seed.length + 1] = (counter >>> 16) & 0xff;
    input[seed.length + 2] = (counter >>> 8) & 0xff;
    input[seed.length + 3] = counter & 0xff;
    const block = sha256(input);
    out.set(block.subarray(0, Math.min(HASH_BYTES, length - offset)), offset);
    offset += HASH_BYTES;
  }
  return out;
}

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

// Literais `1n` exigem target ES2020; o projeto compila para ES2017, então usamos BigInt().
const ZERO = BigInt(0);
const ONE = BigInt(1);
const EIGHT = BigInt(8);
const BYTE_MASK = BigInt(0xff);

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = ONE;
  let b = base % modulus;
  let e = exponent;
  while (e > ZERO) {
    if (e & ONE) result = (result * b) % modulus;
    e >>= ONE;
    b = (b * b) % modulus;
  }
  return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = ZERO;
  for (const byte of bytes) value = (value << EIGHT) | BigInt(byte);
  return value;
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(v & BYTE_MASK);
    v >>= EIGHT;
  }
  return out;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

export function sha256(data: Uint8Array): Uint8Array {
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLength = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    state[0] += a;
    state[1] += b;
    state[2] += c;
    state[3] += d;
    state[4] += e;
    state[5] += f;
    state[6] += g;
    state[7] += h;
  }
  const out = new Uint8Array(HASH_BYTES);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, state[i]);
  return out;
}

// ---------------------------------------------------------------------------
// Base64
// ---------------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
