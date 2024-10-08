import { EventEmitter } from "@figliolia/event-emitter";
import { TypedStorage } from "./TypedStorage";
import type { EventStream } from "./types";

/**
 * Live Storage
 *
 * An enhanced instance of `TypedStorage` that allows you
 * to subscribe to changes to your key/value pairs
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
 *
 * const listener = Storage.on("shoppingCart", newCart => {
 *  // react to changes to shopping cart!
 * });
 *
 * Storage.off("shoppingCart", listener);
 * ```
 */
export class LiveStorage<
  T extends Record<string, any>,
> extends TypedStorage<T> {
  private Emitter = new EventEmitter<EventStream<T>>();
  private effectedKeys = new Set<Extract<keyof T, string>>();

  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
   *
   * Throws a "QuotaExceededError" DOMException exception if the new value couldn't be set. (Setting could fail if, e.g., the user has disabled storage for the site, or if the quota has been exceeded.)
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/setItem)
   */
  public override setItem<K extends Extract<keyof T, string>>(
    key: K,
    value: T[K],
  ) {
    this.afterCallStack(() => {
      this.Emitter.emit(key, value);
    });
    this.effectedKeys.add(key);
    return super.setItem(key, value);
  }

  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists.
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/removeItem)
   */
  public override removeItem<K extends Extract<keyof T, string>>(key: K) {
    this.afterCallStack(() => {
      this.Emitter.emit(key, null);
    });
    this.effectedKeys.delete(key);
    return super.removeItem(key);
  }

  /**
   * Removes all key/value pairs, if there are any.
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/clear)
   */
  public clear() {
    this.afterCallStack(() => {
      for (const key of this.effectedKeys) {
        this.Emitter.emit(key, null);
      }
    });
    this.effectedKeys.clear();
    return this.storage.clear();
  }

  /**
   * Registers an event listener on the specified key.
   *
   * Executes the provided callback any time that key's value changes
   */
  public on<K extends Extract<keyof T, string>>(
    key: K,
    callback: (value: T[K] | null) => void | Promise<void>,
  ) {
    return this.Emitter.on(key, callback);
  }

  /**
   * Removes an event listener on the specified key.
   */
  public off<K extends Extract<keyof T, string>>(key: K, listener: string) {
    return this.Emitter.off(key, listener);
  }

  private afterCallStack(callback: () => void) {
    void Promise.resolve().then(() => {
      callback();
    });
  }
}
