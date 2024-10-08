export type Serialization<T extends Record<string, any>> = {
  [K in Extract<keyof T, string>]: {
    serialize?: (value: T[K]) => string;
    deserialize?: (value: string) => T[K];
  };
};

export type EventStream<T extends Record<string, any>> = {
  [K in Extract<keyof T, string>]: T[K] | null;
};
