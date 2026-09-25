/**
 * AES-GCM 256-bit client-side encryption via Web Crypto API.
 * Key derived from vault PIN using PBKDF2 with 150k iterations.
 */

let cachedKey: CryptoKey | null = null;
let cachedPin: string | null = null;

const PBKDF2_ITERATIONS = 150_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function getSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function unlockVault(pin: string): Promise<boolean> {
  const salt = getSalt();
  cachedKey = await deriveKey(pin, salt);
  cachedPin = pin;
  return true;
}

export function lockVault(): void {
  cachedKey = null;
  cachedPin = null;
}

export function isVaultUnlocked(): boolean {
  return cachedKey !== null;
}

export function getCachedPin(): string | null {
  return cachedPin;
}

async function encryptText(plaintext: string): Promise<string> {
  if (!cachedKey) throw new Error("Vault is locked. Unlock with PIN first.");
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    cachedKey,
    enc.encode(plaintext) as BufferSource,
  );
  return `${bufToBase64(iv.buffer)}:${bufToBase64(ciphertext)}`;
}

async function decryptText(encrypted: string): Promise<string> {
  if (!cachedKey) throw new Error("Vault is locked. Unlock with PIN first.");
  const [ivB64, dataB64] = encrypted.split(":");
  const iv = base64ToBuf(ivB64);
  const data = base64ToBuf(dataB64);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    cachedKey,
    data as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptFields(fields: Record<string, string | null>): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = value ? await encryptText(value) : null;
  }
  return result;
}

export async function decryptField(encrypted: string | null): Promise<string | null> {
  if (!encrypted) return null;
  try { return await decryptText(encrypted); } catch { return null; }
}

export async function decryptFields(fields: Record<string, string | null>): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = value ? await decryptText(value) : null;
  }
  return result;
}

// ─── Password Strength ───────────────────────────────────────

export interface PasswordStrengthResult {
  score: number;
  level: "very_weak" | "weak" | "fair" | "strong" | "very_strong";
  label: string;
  color: string;
  issues: string[];
}

export function passwordStrength(password: string): PasswordStrengthResult {
  const issues: string[] = [];
  let score = 0;
  if (password.length >= 8) score += 20; else issues.push("Use at least 8 characters");
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10; else issues.push("Add lowercase letters");
  if (/[A-Z]/.test(password)) score += 10; else issues.push("Add uppercase letters");
  if (/[0-9]/.test(password)) score += 15; else issues.push("Add numbers");
  if (/[^a-zA-Z0-9]/.test(password)) score += 20; else issues.push("Add special characters");
  if (/(.)\1{2,}/.test(password)) { score -= 15; issues.push("Avoid repeated characters"); }
  if (/^(123|abc|qwe|password|admin|letmein)/i.test(password)) { score -= 25; issues.push("Avoid common patterns"); }
  score = Math.max(0, Math.min(100, score));

  let level: PasswordStrengthResult["level"], label: string, color: string;
  if (score < 25) { level = "very_weak"; label = "Very Weak"; color = "#EF4444"; }
  else if (score < 45) { level = "weak"; label = "Weak"; color = "#F97316"; }
  else if (score < 65) { level = "fair"; label = "Fair"; color = "#F59E0B"; }
  else if (score < 85) { level = "strong"; label = "Strong"; color = "#22C55E"; }
  else { level = "very_strong"; label = "Very Strong"; color = "#00E5FF"; }

  return { score, level, label, color, issues: issues.slice(0, 3) };
}

// ─── Password Generator ──────────────────────────────────────

export function generatePassword(
  length = 16,
  options: { upper?: boolean; lower?: boolean; numbers?: boolean; symbols?: boolean } = {},
): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  let chars = "";
  if (options.upper !== false) chars += upper;
  if (options.lower !== false) chars += lower;
  if (options.numbers !== false) chars += numbers;
  if (options.symbols !== false) chars += symbols;
  if (!chars) chars = lower + upper + numbers;
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];
  return result;
}
