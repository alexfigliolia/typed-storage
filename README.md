# Typed Storage
A type-safe wrapper around the browser's `LocalStorage` and `SessionStorage` API's. The motivation behind this package is two fold:
1. When working with large teams, ensuring that key-names are consistent and follow certain conventions can be combersome
2. Ensuring that only values of a certain type are stored for each key can require can be difficult because the API's require string-values when storing data

The `TypedStorage` API allows you define a schema for your data and restricts storing data to only that which matches your key's corresponding value type.

## Installation
```bash
npm i @figliolia/typed-storage
# or 
yarn add @figliolia/typed-storage
```

## Basic Usage

### Defining Your API
```typescript
import { TypedStorage } from "@figliolia/typed-storage";

export interface Schema {
  JWT: string;
  userId: number;
  shoppingCart: { item: string, price: number }[];
}

const LocalStorage = new TypedStorage<Schema>(localStorage);
// or 
const SessionStorage = new TypedStorage<Schema>(sessionStorage);
```

### Using Your API
When using your `TypedStorage` instances, your data-type is preserved when setting and getting:

```typescript
import { LocalStorage } from "./path/to/myLocalStorage";

LocalStorage.setItem("shoppingCart", [
  {item: "Bananas", price: 3.00 },
  {item: "Apples", price: 2.50 },
  // Stringified under the hood
]);

const cart = LocalStorage.getItem("shoppingCart"); // parsed under the hood
// { item: string, price: number }[] | null


const cart = LocalStorage.getItem("cart"); // mispelled key
// Fails typescript validation!
```

### Supported Data Types
The `TypedStorage` API supports storing any data-type that is JSON-valid. For keys with values of type `object` or `array`, `JSON.parse()` will be used to deserialize your data upon retreival. 

For keys with values of type `string` or `number`, best effort parsing is used to determine the correct type on retrieval. For example if the value being retrieved can be safely converted to an integer, float, or `BigInt`, it will be. Otherwise the value will be returned as a string. 

For instances where your key-value pair requires a customized serialization or deserialization technique, you can instantiate your `TypedStorage` along with your deserializer mapped to your key:

```typescript
import { TypedStorage } from "@figliolia/typed-storage";

interface Schema {
  meyKey: Map<string, number>; // (invalid JSON)
}

const MyStorage = new TypedStorage<Schema>(localStorage, {
  meyKey: {
    // Convert map to object and stringify it for storage
    serialize: (map) => {
      const obj: Record<string, number> = {};
      for(const [key, value] of map) {
        obj[key] = value;
      }
      return JSON.stringify(map);
    },
    // Convert stored object back into a Map for runtime usage
    deserialize: (map) => {
      const obj = JSON.parse(map);
      const result = new Map();
      for(const key in obj) {
        result.set(key, obj[key]);
      }
      return result;
    } 
  }
});
```

Serializers can also be used in instances where you wish to handle numeric values as strings
```typescript
import { TypedStorage } from "@figliolia/typed-storage";

interface Schema {
  floatValue: string; // Handle float as strings
}

const MyStorage = new TypedStorage<Schema>(localStorage, {
  floatValue: {
    // Prevent float-like string from being returned as a number
    deserialize: (floatValue) => floatValue;
  }
})
```
Because `TypedStorage` parses using a best-effort interpretation of the value, if your string contains only numeric characters, it'll be parsed as a number regardless of your schema definition.

If you run into a case such as this and you wish to preserve string-types for numeric values, provide a `serialize` method for that key that simply returns the value as is.

## Advanced Usage
This library also provides an enhancement to the `TypedStorage` API called `LiveStorage`. It works identically to `TypedStorage` with the exception that `LiveStorage` allows you to synchronize your application logic with the data you store:

```typescript
import { LiveStorage } from "@figliolia/typed-storage";

export interface Schema {
  JWT: string;
  userId: number;
  shoppingCart: { item: string, price: number }[];
}

const LocalStorage = new TypedStorage<Schema>(localStorage);
// or 
const SessionStorage = new TypedStorage<Schema>(sessionStorage);

// Let's update our UI whenever our `shoppingCart` changes

const currency = new Intl.NumberFormat('en-us', {
  style: 'currency',
  currency: 'USD'
});

const checkoutUI = document.getElementById("checkout");

LocalStorage.on("shoppingCart", cart => {
  if(cart === null) {
    // the key was deleted
    checkoutUI.textContent = currency.format(0.00);
    return;
  }

  // Update your checkout UI's total cost $
  const newPrice = cart.reduce((acc, next) => {
    acc += next.price;
    return acc;
  }, 0);
  checkoutUI.textContent = currency.format(newPrice);
});
```
In the example above, we'll update our `checkout UI` whenever the user's shopping cart is updated.

### When is LiveStorage the better idea?
Use `LiveStorage` in areas where your business logic depends heavily on reads/writes to storage. If your application is performing read/writes in logic that spans multiple features or modules, you may find the that `LiveStorage` API allows you to write more centralized logic in otherwise complex scenarios.