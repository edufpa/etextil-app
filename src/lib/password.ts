import { createHash } from "crypto";

export function hashPassword(password: string) {
  const pepper = process.env.PASSWORD_PEPPER || "etextil-pepper";
  return createHash("sha256").update(`${password}:${pepper}`).digest("hex");
}

export function verifyPassword(password: string, storedHash: string) {
  return hashPassword(password) === storedHash;
}
