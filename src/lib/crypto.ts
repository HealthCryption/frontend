/**
 * Web Crypto API wrapper for client-side encryption
 * Implements AES-256-GCM encryption compatible with backend
 */

// Convert string to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert ArrayBuffer to string
function ab2str(buf: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buf);
}

// Convert ArrayBuffer to Base64
function ab2base64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// Convert Base64 to ArrayBuffer
function base642ab(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a random AES-256 key
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a random 96-bit nonce for AES-GCM
 */
export function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12)); // 96 bits
}

/**
 * Derive a key from password using PBKDF2 (Web Crypto API)
 * Note: Backend uses Scrypt, but Web Crypto doesn't support it
 * For production, consider using a library like scrypt-js
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    str2ab(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, // Adjust based on performance
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data using AES-256-GCM
 * @param key - CryptoKey for AES-256-GCM
 * @param data - Data to encrypt (string or ArrayBuffer)
 * @param aad - Additional Authenticated Data (optional)
 * @returns Object with ciphertext and nonce (both base64 encoded)
 */
export async function encryptData(
  key: CryptoKey,
  data: string | ArrayBuffer,
  aad?: string
): Promise<{ ciphertext: string; nonce: string }> {
  const nonce = generateNonce();
  const dataBuffer = typeof data === "string" ? str2ab(data) : data;

  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv: nonce,
  };

  if (aad) {
    algorithm.additionalData = str2ab(aad);
  }

  const ciphertext = await crypto.subtle.encrypt(algorithm, key, dataBuffer);

  return {
    ciphertext: ab2base64(ciphertext),
    nonce: ab2base64(nonce.buffer),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param key - CryptoKey for AES-256-GCM
 * @param ciphertext - Base64 encoded ciphertext
 * @param nonce - Base64 encoded nonce
 * @param aad - Additional Authenticated Data (must match encryption)
 * @returns Decrypted data as string
 */
export async function decryptData(
  key: CryptoKey,
  ciphertext: string,
  nonce: string,
  aad?: string
): Promise<string> {
  const ciphertextBuffer = base642ab(ciphertext);
  const nonceBuffer = base642ab(nonce);

  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv: nonceBuffer,
  };

  if (aad) {
    algorithm.additionalData = str2ab(aad);
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      algorithm,
      key,
      ciphertextBuffer
    );
    return ab2str(decrypted);
  } catch (error) {
    throw new Error("Decryption failed. Data may be tampered or wrong key.");
  }
}

/**
 * Export CryptoKey to raw bytes (for storage or transmission)
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return ab2base64(exported);
}

/**
 * Import raw key bytes to CryptoKey
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base642ab(keyData);
  return await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a file (useful for medical images)
 * @param key - AES-256 key
 * @param file - File object
 * @returns Encrypted file as Blob with metadata
 */
export async function encryptFile(
  key: CryptoKey,
  file: File
): Promise<{ encryptedBlob: Blob; nonce: string; originalName: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const { ciphertext, nonce } = await encryptData(key, arrayBuffer);

  // Convert base64 ciphertext back to binary blob
  const encryptedBuffer = base642ab(ciphertext);
  const encryptedBlob = new Blob([encryptedBuffer], {
    type: "application/octet-stream",
  });

  return {
    encryptedBlob,
    nonce,
    originalName: file.name,
  };
}

/**
 * Decrypt a file
 * @param key - AES-256 key
 * @param encryptedData - Encrypted file data
 * @param nonce - Nonce used for encryption
 * @param mimeType - Original MIME type
 * @returns Decrypted file as Blob
 */
export async function decryptFile(
  key: CryptoKey,
  encryptedData: ArrayBuffer,
  nonce: string,
  mimeType: string = "application/octet-stream"
): Promise<Blob> {
  const ciphertext = ab2base64(encryptedData);
  const decrypted = await decryptData(key, ciphertext, nonce);

  // Convert decrypted string back to binary
  const binaryString = atob(ab2base64(str2ab(decrypted)));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

/**
 * Hash data using SHA-256
 */
export async function sha256(data: string): Promise<string> {
  const buffer = str2ab(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return ab2base64(hashBuffer);
}
