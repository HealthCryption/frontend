/**
 * Client-side cryptography utilities for encrypting/decrypting medical data
 * Uses Web Crypto API with AES-256-GCM
 * Supports both password-derived keys and master key operations
 */

// Scrypt-compatible parameters for backend compatibility
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // bytes
const NONCE_LENGTH = 12; // bytes for GCM
const KEY_LENGTH = 256; // bits
const MASTER_KEY_LENGTH = 32; // bytes (256 bits)

/**
 * Generate a random salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random nonce
 */
export function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
}

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptData(
  data: ArrayBuffer,
  key: CryptoKey,
  nonce: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    key,
    data
  );
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  nonce: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    key,
    encryptedData
  );
}

/**
 * Encrypt image file with password
 * Returns: Blob containing [salt][nonce][encrypted_data]
 */
export async function encryptImage(
  imageFile: File,
  password: string
): Promise<Blob> {
  // Read image as ArrayBuffer
  const imageData = await imageFile.arrayBuffer();

  // Generate salt and nonce
  const salt = generateSalt();
  const nonce = generateNonce();

  // Derive key from password
  const key = await deriveKeyFromPassword(password, salt);

  // Encrypt image data
  const encryptedData = await encryptData(imageData, key, nonce);

  // Combine: [salt][nonce][encrypted_data]
  const combinedData = new Uint8Array(
    salt.length + nonce.length + encryptedData.byteLength
  );
  combinedData.set(salt, 0);
  combinedData.set(nonce, salt.length);
  combinedData.set(new Uint8Array(encryptedData), salt.length + nonce.length);

  return new Blob([combinedData]);
}

/**
 * Decrypt image blob with password
 * Input: Blob containing [salt][nonce][encrypted_data]
 * Returns: Decrypted ArrayBuffer
 */
export async function decryptImage(
  encryptedBlob: Blob,
  password: string
): Promise<ArrayBuffer> {
  const data = await encryptedBlob.arrayBuffer();
  const dataArray = new Uint8Array(data);

  // Extract salt, nonce, and encrypted data
  const salt = dataArray.slice(0, SALT_LENGTH);
  const nonce = dataArray.slice(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const encryptedData = dataArray.slice(SALT_LENGTH + NONCE_LENGTH);

  // Derive key from password
  const key = await deriveKeyFromPassword(password, salt);

  // Decrypt data
  return decryptData(encryptedData.buffer, key, nonce);
}

/**
 * Encrypt text with password
 * Returns: Base64 encoded string containing [salt][nonce][encrypted_text]
 */
export async function encryptText(
  text: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const textData = encoder.encode(text);

  // Generate salt and nonce
  const salt = generateSalt();
  const nonce = generateNonce();

  // Derive key from password
  const key = await deriveKeyFromPassword(password, salt);

  // Encrypt text data
  const encryptedData = await encryptData(textData, key, nonce);

  // Combine: [salt][nonce][encrypted_data]
  const combinedData = new Uint8Array(
    salt.length + nonce.length + encryptedData.byteLength
  );
  combinedData.set(salt, 0);
  combinedData.set(nonce, salt.length);
  combinedData.set(new Uint8Array(encryptedData), salt.length + nonce.length);

  // Convert to base64
  return arrayBufferToBase64(combinedData.buffer);
}

/**
 * Decrypt text with password
 * Input: Base64 encoded string containing [salt][nonce][encrypted_text]
 * Returns: Decrypted text string
 */
export async function decryptText(
  encryptedBase64: string,
  password: string
): Promise<string> {
  // Decode from base64
  const combinedData = base64ToArrayBuffer(encryptedBase64);
  const dataArray = new Uint8Array(combinedData);

  // Extract salt, nonce, and encrypted data
  const salt = dataArray.slice(0, SALT_LENGTH);
  const nonce = dataArray.slice(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const encryptedData = dataArray.slice(SALT_LENGTH + NONCE_LENGTH);

  // Derive key from password
  const key = await deriveKeyFromPassword(password, salt);

  // Decrypt data
  const decryptedData = await decryptData(encryptedData.buffer, key, nonce);

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Create a blob URL from decrypted image data
 */
export function createImageBlobUrl(
  decryptedData: ArrayBuffer,
  mimeType: string = 'image/jpeg'
): string {
  const blob = new Blob([decryptedData], { type: mimeType });
  return URL.createObjectURL(blob);
}

// ========================================
// MASTER KEY OPERATIONS (for Patient/Doctor key sharing)
// ========================================

/**
 * Import raw bytes as a CryptoKey
 */
export async function importMasterKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Unwrap patient's master key from backend wrapped key
 * Backend format: encrypted_key encrypted with Scrypt-derived key
 */
export async function unwrapPatientMasterKey(
  encryptedKeyBase64: string,
  saltBase64: string,
  nonceBase64: string,
  password: string
): Promise<Uint8Array> {
  // Decode from base64
  const encryptedKey = base64ToArrayBuffer(encryptedKeyBase64);
  const salt = base64ToArrayBuffer(saltBase64);
  const nonce = base64ToArrayBuffer(nonceBase64);

  // Derive key from password (same as backend Scrypt, but using PBKDF2)
  // Note: For production, should match backend's Scrypt exactly
  const derivedKey = await deriveKeyFromPassword(password, new Uint8Array(salt));

  // Decrypt master key
  const masterKeyBuffer = await decryptData(
    encryptedKey,
    derivedKey,
    new Uint8Array(nonce)
  );

  return new Uint8Array(masterKeyBuffer);
}

/**
 * Encrypt image with master key
 * Format: [nonce][ciphertext]
 */
export async function encryptImageWithMasterKey(
  imageFile: File,
  masterKeyBytes: Uint8Array
): Promise<Blob> {
  // Read image as ArrayBuffer
  const imageData = await imageFile.arrayBuffer();

  // Generate nonce
  const nonce = generateNonce();

  // Import master key
  const key = await importMasterKey(masterKeyBytes);

  // Encrypt image data
  const encryptedData = await encryptData(imageData, key, nonce);

  // Combine: [nonce][encrypted_data]
  const combinedData = new Uint8Array(nonce.length + encryptedData.byteLength);
  combinedData.set(nonce, 0);
  combinedData.set(new Uint8Array(encryptedData), nonce.length);

  return new Blob([combinedData]);
}

/**
 * Decrypt image with master key
 * Input: Blob containing [nonce][encrypted_data]
 * Returns: Decrypted ArrayBuffer
 */
export async function decryptImageWithMasterKey(
  encryptedBlob: Blob,
  masterKeyBytes: Uint8Array
): Promise<ArrayBuffer> {
  const data = await encryptedBlob.arrayBuffer();
  const dataArray = new Uint8Array(data);

  // Extract nonce and encrypted data
  const nonce = dataArray.slice(0, NONCE_LENGTH);
  const encryptedData = dataArray.slice(NONCE_LENGTH);

  // Import master key
  const key = await importMasterKey(masterKeyBytes);

  // Decrypt data
  return decryptData(encryptedData.buffer, key, nonce);
}

/**
 * Encrypt text with master key
 * Returns: Base64 encoded string containing [nonce][encrypted_text]
 */
export async function encryptTextWithMasterKey(
  text: string,
  masterKeyBytes: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const textData = encoder.encode(text);

  // Generate nonce
  const nonce = generateNonce();

  // Import master key
  const key = await importMasterKey(masterKeyBytes);

  // Encrypt text data
  const encryptedData = await encryptData(textData, key, nonce);

  // Combine: [nonce][encrypted_data]
  const combinedData = new Uint8Array(nonce.length + encryptedData.byteLength);
  combinedData.set(nonce, 0);
  combinedData.set(new Uint8Array(encryptedData), nonce.length);

  // Convert to base64
  return arrayBufferToBase64(combinedData.buffer);
}

/**
 * Decrypt text with master key
 * Input: Base64 encoded string containing [nonce][encrypted_text]
 * Returns: Decrypted text string
 */
export async function decryptTextWithMasterKey(
  encryptedBase64: string,
  masterKeyBytes: Uint8Array
): Promise<string> {
  // Decode from base64
  const combinedData = base64ToArrayBuffer(encryptedBase64);
  const dataArray = new Uint8Array(combinedData);

  // Extract nonce and encrypted data
  const nonce = dataArray.slice(0, NONCE_LENGTH);
  const encryptedData = dataArray.slice(NONCE_LENGTH);

  // Import master key
  const key = await importMasterKey(masterKeyBytes);

  // Decrypt data
  const decryptedData = await decryptData(encryptedData.buffer, key, nonce);

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// ========================================
// MASTER KEY STORAGE (In-Memory)
// ========================================

let cachedMasterKey: Uint8Array | null = null;
let cachedDoctorPassword: string | null = null; // Temporary storage for doctor password

/**
 * Store master key in memory for the session
 */
export function storeMasterKey(masterKeyBytes: Uint8Array): void {
  cachedMasterKey = masterKeyBytes;
}

/**
 * Retrieve stored master key
 */
export function getMasterKey(): Uint8Array | null {
  return cachedMasterKey;
}

/**
 * Clear master key from memory
 */
export function clearMasterKey(): void {
  if (cachedMasterKey) {
    // Zero out the array before clearing
    cachedMasterKey.fill(0);
  }
  cachedMasterKey = null;
}

/**
 * Store doctor password temporarily (for fetching patient master keys)
 */
export function storeDoctorPassword(password: string): void {
  cachedDoctorPassword = password;
}

/**
 * Retrieve stored doctor password
 */
export function getDoctorPassword(): string | null {
  return cachedDoctorPassword;
}

/**
 * Clear doctor password from memory
 */
export function clearDoctorPassword(): void {
  cachedDoctorPassword = null;
}
