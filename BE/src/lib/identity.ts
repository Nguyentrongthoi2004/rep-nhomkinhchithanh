export function normalizeLoginFromEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (e.endsWith("@minierp.local")) return e.replace(/@minierp\.local$/, "");
  return e;
}

export function toAuthEmail(login: string): string {
  const normalized = login.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  return `${normalized}@minierp.local`;
}

export function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
