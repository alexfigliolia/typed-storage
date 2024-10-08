import type { Serialization } from "./types";

/**
 * Typed Storage
 *
 * A type-safe wrapper around browser `Storage` API's
 *
 * ```typescript
 * interface Schema {
 *  JWT: string;
 *  userId: number;
 *  shoppingCart: { item: string, price: number }[];
 * }
 *
 * const Storage = new TypedStorage<Schema>(localStorage);
 * // or
 * const Storage = new TypedStorage<Schema>(sessionStorage);
 * ```
 */
export class TypedStorage<T extends Record<string, any>> {
  protected storage: Storage;
  private serialization: Partial<Serialization<T>>;
  constructor(storage: Storage, serialization: Partial<Serialization<T>> = {}) {
    this.storage = storage;
    this.serialization = serialization;
  }

  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
   *
   * Throws a "QuotaExceededError" DOMException exception if the new value couldn't be set. (Setting could fail if, e.g., the user has disabled storage for the site, or if the quota has been exceeded.)
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/setItem)
   */
  public setItem<K extends Extract<keyof T, string>>(key: K, value: T[K]) {
    let serialized: string;
    const serializer = this.serialization?.[key]?.serialize;
    if (serializer) {
      serialized = serializer(value);
    } else {
      serialized = this.toStorageString(value);
    }
    return this.storage.setItem(key, serialized);
  }

  /**
   * Returns the current value associated with the given key, or null if the given key does not exist.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/getItem)
   */
  public getItem<K extends Extract<keyof T, string>>(key: K) {
    const value = this.storage.getItem(key);
    if (value === null) {
      return null;
    }
    const deserializer = this.serialization?.[key]?.deserialize;
    if (deserializer) {
      return deserializer(value);
    }
    return this.parse(key, value);
  }

  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists.
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/removeItem)
   */
  public removeItem<K extends Extract<keyof T, string>>(key: K) {
    return this.storage.removeItem(key);
  }

  private parse<K extends Extract<keyof T, string>>(
    _key: K,
    value: string,
  ): T[K] {
    if (value.startsWith("{") || value.startsWith("[")) {
      try {
        return JSON.parse(value) as T[K];
      } catch (error) {
        console.warn(
          `TypedStorage: Attempt to run parse object failed. Returning the value as string`,
        );
        return value as T[K];
      }
    }
    for (const char of value) {
      if (!TypedStorage.numerics.has(char)) {
        return value as T[K];
      }
    }
    const number = Number(value);
    if (number.toString().toString().includes("e")) {
      return BigInt(value) as T[K];
    }
    return number as T[K];
  }

  private toStorageString(value: any) {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    if (typeof value?.toString === "function") {
      return value.toString();
    }
    throw new Error("Unsupported storage type");
  }

  private static numerics = new Set([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    ".",
    "-",
  ]);
}
