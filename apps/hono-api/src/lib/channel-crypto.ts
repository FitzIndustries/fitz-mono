import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "~/env";

function getSecretBuffer() {
  return Buffer.from(env.ENCRYPTION_KEY, "hex");
}

export function encryptChannelSecret(value: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getSecretBuffer(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return Buffer.concat([iv, encrypted]).toString("base64");
}

export function decryptChannelSecret(encrypted: string) {
  const buffer = Buffer.from(encrypted, "base64");
  const iv = buffer.subarray(0, 16);
  const data = buffer.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", getSecretBuffer(), iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

  return decrypted.toString("utf8");
}
