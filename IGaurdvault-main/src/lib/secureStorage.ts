import localforage from "localforage";

// Initialize a specific store for secure data
const secureStore = localforage.createInstance({
  name: "iGuardOne",
  storeName: "secure_vault"
});

/**
 * Encrypts data using AES-GCM before saving to localforage.
 * We derive a master key from a PIN or fixed entropy if unavailable in demo mode.
 * In a full production app, this key would be derived from the user's password using PBKDF2 or Argon2.
 */

const DEMO_SALT = new TextEncoder().encode("iguard-secure-salt-2026");

async function getMasterKey(pin: string = "default-secure-key"): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: DEMO_SALT,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string value.
 */
async function encryptValue(value: string, pin?: string): Promise<{ cipher: string; iv: string }> {
  const key = await getMasterKey(pin);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  
  // Convert buffers to base64 for storage
  const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
  const ivB64 = btoa(String.fromCharCode(...iv));
  
  return { cipher: cipherB64, iv: ivB64 };
}

/**
 * Decrypts a cipher text.
 */
async function decryptValue(cipherB64: string, ivB64: string, pin?: string): Promise<string> {
  const key = await getMasterKey(pin);
  
  const cipherBytes = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    cipherBytes
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Saves JSON-serializable data securely to IndexedDB.
 */
export async function setItemEncrypted<T>(key: string, value: T, pin?: string): Promise<void> {
  try {
    const jsonStr = JSON.stringify(value);
    const encrypted = await encryptValue(jsonStr, pin);
    await secureStore.setItem(key, encrypted);
  } catch (error) {
    console.error("Failed to encrypt and save item", error);
    throw new Error("Secure storage write failed");
  }
}

/**
 * Retrieves and decrypts JSON data from IndexedDB.
 */
export async function getItemDecrypted<T>(key: string, pin?: string): Promise<T | null> {
  try {
    const encrypted = await secureStore.getItem<{ cipher: string; iv: string }>(key);
    if (!encrypted) return null;
    
    const decryptedStr = await decryptValue(encrypted.cipher, encrypted.iv, pin);
    return JSON.parse(decryptedStr) as T;
  } catch (error) {
    console.error("Failed to decrypt item", error);
    return null;
  }
}

/**
 * Removes an item from the secure store.
 */
export async function removeSecureItem(key: string): Promise<void> {
  await secureStore.removeItem(key);
}

/**
 * Clears the entire secure store.
 */
export async function clearSecureStore(): Promise<void> {
  await secureStore.clear();
}
