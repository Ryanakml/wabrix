const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const SALT = "wabrix-phase-3-encryption";

function getSecret() {
  const secret = process.env.ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("ENCRYPTION_SECRET is required for encrypted secret storage");
  }

  return secret;
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function getEncryptionKey() {
  const secret = getSecret();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode(SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(value),
  );

  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(payload?: string | null) {
  if (!payload) {
    return null;
  }

  const [ivPart, cipherPart] = payload.split(":");
  if (!ivPart || !cipherPart) {
    throw new Error("Encrypted secret payload is malformed");
  }

  const key = await getEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivPart) },
    key,
    base64ToBytes(cipherPart),
  );

  return textDecoder.decode(decrypted);
}

export async function hashSecret(value: string) {
  const secret = getSecret();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(`${SALT}:${secret}:${value}`),
  );

  return bytesToBase64(new Uint8Array(digest));
}

export function redactSecret(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.length <= 8) {
    return "••••";
  }

  return `${value.slice(0, 4)}••••${value.slice(-2)}`;
}
