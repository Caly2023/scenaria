import { Timestamp } from "firebase/firestore";

/**
 * Recursively converts Firestore Timestamps to plain numbers (milliseconds).
 * Ensures Redux state remains serializable.
 */
export function serializeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (data instanceof Timestamp) {
    return data.toMillis();
  }

  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  if (typeof data === "object") {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeData(data[key]);
      }
    }
    return serialized;
  }

  return data;
}
