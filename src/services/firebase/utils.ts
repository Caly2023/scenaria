import { Timestamp } from "firebase/firestore";

/**
 * Recursively converts Firestore Timestamps to plain numbers (milliseconds).
 * Ensures Redux state remains serializable.
 */
export function serializeData<T>(data: unknown): T {
  if (data === null || data === undefined) return data as unknown as T;

  if (data instanceof Timestamp) {
    return data.toMillis() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map(serializeData) as unknown as T;
  }

  if (typeof data === "object") {
    const serialized: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeData(obj[key]);
      }
    }
    return serialized as unknown as T;
  }

  return data as unknown as T;
}
