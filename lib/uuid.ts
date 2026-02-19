// Lightweight UUID v4 generator (non-crypto). Good enough for a stable device identifier.
export function uuidv4(): string {
  // RFC4122 version 4 UUID
  // eslint-disable-next-line no-bitwise
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function stringify(arr: Uint8Array | number[]): string {
  const bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ensureUuidString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (val instanceof Uint8Array || Array.isArray(val)) {
    try {
      return stringify(val as Uint8Array);
    } catch (_) {
      return undefined;
    }
  }
  return undefined;
}

export function parse(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const buffer = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    buffer[i] = parseInt(hex.substring(i * 2, (i * 2) + 2), 16);
  }
  return buffer;
}
