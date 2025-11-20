// AES-256-GCM encryption utilities for sensitive data
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('ENCRYPTION_KEY');
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  // Ensure the key is exactly 32 bytes for AES-256-GCM
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyString);
  
  // Pad or truncate to exactly 32 bytes
  const keyData = new Uint8Array(32);
  if (keyBytes.length >= 32) {
    keyData.set(keyBytes.slice(0, 32));
  } else {
    keyData.set(keyBytes);
    // Fill remaining bytes with zeros
    keyData.fill(0, keyBytes.length);
  }
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: AUTH_TAG_LENGTH * 8,
    },
    key,
    encodedText
  );

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: AUTH_TAG_LENGTH * 8,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
