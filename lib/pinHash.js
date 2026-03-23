import {
  CryptoDigestAlgorithm,
  digest,
} from 'expo-crypto';

const PEPPER = 'children-task-manager:parent-pin:v1';

export const MIN_PIN_LENGTH = 4;
/** Max digits stored for parent PIN (numeric only in UI). */
export const MAX_PIN_LENGTH = 16;

/** SHA-256 hex digest length from expo-crypto (hex encoding). */
export const PIN_HASH_HEX_LENGTH = 64;

/** Keep only digits; cap length for PIN fields. */
export function digitsOnlyPin(raw) {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, MAX_PIN_LENGTH);
}

function bytesToHexLower(buffer) {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

/** Stored parent PIN is a lowercase SHA-256 hex string. */
export function isValidStoredPinHash(value) {
  if (typeof value !== 'string') return false;
  const s = value.trim().toLowerCase();
  return s.length === PIN_HASH_HEX_LENGTH && /^[0-9a-f]+$/.test(s);
}

function constTimeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Deterministic SHA-256 hex (64 chars) from UTF-8 input.
 * Uses binary `digest()` + manual hex — avoids `digestStringAsync` returning
 * non-hex or wrong-length strings on some native builds, which made stored
 * hashes fail validation so the app always treated the user as "no PIN yet"
 * (any matching 4 digits could "unlock").
 */
export async function hashParentPin(pin) {
  const digits = digitsOnlyPin(pin);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PEPPER}\u0000${digits}`);
  const out = await digest(CryptoDigestAlgorithm.SHA256, data);
  return bytesToHexLower(out);
}

export async function pinsEqual(pin, storedHash) {
  if (!isValidStoredPinHash(storedHash)) return false;
  const h = await hashParentPin(pin);
  const s = String(storedHash).trim().toLowerCase();
  return constTimeEqualHex(h, s);
}
