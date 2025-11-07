<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]
[![discussion][discussion]][discussion-url]
[![size][size]][size-url]

# expose-loader

The `expose-loader` loader allows to expose a module (either in whole or in part) to global object (`self`, `window` and `global`).

For compatibility tips and examples, check out [Shimming](https://webpack.js.org/guides/shimming/) guide in the official documentation.

## Getting Started

To begin, you'll need to install `expose-loader`:

```console
npm install expose-loader --save-dev
```

or

```console
yarn add -D expose-loader
```

or

```console
pnpm add -D expose-loader
```

(If you're using webpack 4, install `expose-loader@1` and follow the [corresponding instructions](https://v4.webpack.js.org/loaders/expose-loader/) instead.)

Then you can use the `expose-loader` using two approaches.

## Inline

The `|` or `%20` (space) allow to separate the `globalName`, `moduleLocalName` and `override` of expose.

The documentation and syntax examples can be read [here](#syntax).

> [!WARNING]
>
> `%20` represents a `space` in a query string because spaces are not allowed in URLs.

```js
import $ from "expose-loader?exposes=$,jQuery!jquery";
//
// Adds the `jquery` to the global object under the names `$` and `jQuery`
```

```js
import { concat } from "expose-loader?exposes=_.concat!lodash/concat";
//
// Adds the `lodash/concat` to the global object under the name `_.concat`
```

```js
import {
  map,
  reduce,
} from "expose-loader?exposes=_.map|map,_.reduce|reduce!underscore";
//
// Adds the `map` and `reduce` method from `underscore` to the global object under the name `_.map` and `_.reduce`
```

## Using Configuration

**src/index.js**

```js
import $ from "jquery";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: require.resolve("jquery"),
        loader: "expose-loader",
        options: {
          exposes: ["$", "jQuery"],
        },
      },
      {
        test: require.resolve("underscore"),
        loader: "expose-loader",
        options: {
          exposes: [
            "_.map|map",
            {
              globalName: "_.reduce",
              moduleLocalName: "reduce",
            },
            {
              globalName: ["_", "filter"],
              moduleLocalName: "filter",
            },
          ],
        },
      },
    ],
  },
};
```

The [`require.resolve`](https://nodejs.org/api/modules.html#modules_require_resolve_request_options) call is a Node.js function (unrelated to `require.resolve` in webpack processing).

`require.resolve` that returns the absolute path of the module (`"/.../app/node_modules/jquery/dist/jquery.js"`).

So the expose only applies to the `jquery` module and it's only exposed when used in the bundle.

Finally, run `webpack` using the method you normally use (e.g., via CLI or an npm script).

## Options

|                Name                 |                   Type                    |   Default   | Description                    |
| :---------------------------------: | :---------------------------------------: | :---------: | :----------------------------- |
|      **[`exposes`](#exposes)**      | `{String\|Object\|Array<String\|Object>}` | `undefined` | List of exposes                |
| **[`globalObject`](#globalObject)** |                 `String`                  | `undefined` | Object used for global context |

### `exposes`

Type:

```ts
type exposes =
  | string
  | {
      globalName: string | string[];
      moduleLocalName?: string;
      override?: boolean;
    }
  | (
      | string
      | {
          globalName: string | string[];
          moduleLocalName?: string;
          override?: boolean;
        }
    )[];
```

Default: `undefined`

List of exposes.

#### `string`

Allows to use a `string` to describe an expose.

##### `syntax`

The `|` or `%20` (space) allow to separate the `globalName`, `moduleLocalName` and `override` of expose.

String syntax - `[[globalName] [moduleLocalName] [override]]` or `[[globalName]|[moduleLocalName]|[override]]`, where:

- `globalName` - The name on the global object, for example `window.$` for a browser environment (**required**)
- `moduleLocalName` - The name of method/variable etc of the module (the module must export it) (**may be omitted**)
- `override` - Allows to override existing value in the global object (**may be omitted**)

If `moduleLocalName` is not specified, it exposes the entire module to the global object, otherwise it exposes only the value of `moduleLocalName`.

**src/index.js**

```js
import $ from "jquery";
import _ from "underscore";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: require.resolve("jquery"),
        loader: "expose-loader",
        options: {
          // For `underscore` library, it can be `_.map map` or `_.map|map`
          exposes: "$",
          // To access please use `window.$` or `globalThis.$`
        },
      },
      {
        // test: require.resolve("jquery"),
        test: /node_modules[/\\]underscore[/\\]modules[/\\]index-all\.js$/,
        loader: "expose-loader",
        type: "javascript/auto",
        options: {
          // For `underscore` library, it can be `_.map map` or `_.map|map`
          exposes: "_",
          // To access please use `window._` or `globalThis._`
        },
      },
    ],
  },
};
```

#### `object`

Allows to use an object to describe an expose.

##### `globalName`

Type:

```ts
type globalName = string | string[];
```

Default: `undefined`

The name in the global object. (**required**).

**src/index.js**

```js
import _ from "underscore";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /node_modules[/\\]underscore[/\\]modules[/\\]index-all\.js$/,
        loader: "expose-loader",
        type: "javascript/auto",
        options: {
          exposes: {
            // Can be `['_', 'filter']`
            globalName: "_.filter",
            moduleLocalName: "filter",
          },
        },
      },
    ],
  },
};
```

##### `moduleLocalName`

Type:

```ts
type moduleLocalName = string;
```

Default: `undefined`

The name of method/variable etc of the module (the module must export it).

If `moduleLocalName` is specified, it exposes only the value of `moduleLocalName`.

**src/index.js**

```js
import _ from "underscore";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /node_modules[/\\]underscore[/\\]modules[/\\]index-all\.js$/,
        loader: "expose-loader",
        type: "javascript/auto",
        options: {
          exposes: {
            globalName: "_.filter",
            moduleLocalName: "filter",
          },
        },
      },
    ],
  },
};
```

##### `override`

Type:

```ts
type override = boolean;
```

Default: `false`

By default, loader does not override the existing value in the global object, because it is unsafe.

In `development` mode, we throw an error if the value already present in the global object.

But you can configure loader to override the existing value in the global object using this option.

To force override the value that is already present in the global object you can set the `override` option to the `true` value.

**src/index.js**

```js
import $ from "jquery";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: require.resolve("jquery"),
        loader: "expose-loader",
        options: {
          exposes: {
            globalName: "$",
            override: true,
          },
        },
      },
    ],
  },
};
```

#### `array`

**src/index.js**

```js
import _ from "underscore";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /node_modules[/\\]underscore[/\\]modules[/\\]index-all\.js$/,
        loader: "expose-loader",
        type: "javascript/auto",
        options: {
          exposes: [
            "_.map map",
            {
              globalName: "_.filter",
              moduleLocalName: "filter",
            },
            {
              globalName: ["_", "find"],
              moduleLocalName: "myNameForFind",
            },
          ],
        },
      },
    ],
  },
};
```

It will expose **only** `map`, `filter` and `find` (under `myNameForFind` name) methods to the global object.

In browsers, these methods will be available under `windows._.map(..args)`, `windows._.filter(...args)` and `windows._.myNameForFind(...args)` methods.

### `globalObject`

```ts
type globalObject = string;
```

Default: `undefined`

Object used for global context

```js
import _ from "underscore";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /node_modules[/\\]underscore[/\\]modules[/\\]index-all\.js$/,
        loader: "expose-loader",
        type: "javascript/auto",
        options: {
          exposes: [
            {
              globalName: "_",
            },
          ],
          globalObject: "this",
        },
      },
    ],
  },
};
```

## Examples

### Expose a local module

**index.js**

```js
import { method1 } from "./my-module.js";
```

**my-module.js**

```js
function method1() {
  console.log("method1");
}

function method2() {
  console.log("method1");
}

export { method1, method2 };
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /my-module\.js$/,
        loader: "expose-loader",
        options: {
          exposes: "mod",
          // // To access please use `window.mod` or `globalThis.mod`
        },
      },
    ],
  },
};
```

## Contributing

We welcome all contributions!

If you're new here, please take a moment to review our contributing guidelines before submitting issues or pull requests.

[CONTRIBUTING](https://github.com/webpack/expose-loader?tab=contributing-ov-file#contributing)

## License

[MIT](./LICENSE)

[npm]: https://img.shields.io/npm/v/expose-loader.svg
[npm-url]: https://npmjs.com/package/expose-loader
[node]: https://img.shields.io/node/v/expose-loader.svg
[node-url]: https://nodejs.org
[tests]: https://github.com/webpack/expose-loader/workflows/expose-loader/badge.svg
[tests-url]: https://github.com/webpack/expose-loader/actions
[cover]: https://codecov.io/gh/webpack/expose-loader/branch/main/graph/badge.svg
[cover-url]: https://codecov.io/gh/webpack/expose-loader
[discussion]: https://img.shields.io/github/discussions/webpack/webpack
[discussion-url]: https://github.com/webpack/webpack/discussions
[size]: https://packagephobia.now.sh/badge?p=expose-loader
[size-url]: https://packagephobia.now.sh/result?p=expose-loader
