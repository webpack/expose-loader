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

> [!WARNING]
>
> **This loader is deprecated.** Assigning a module to the global object needs no
> loader — see the [migration guide](#deprecation) below. The loader still works,
> but it will not get new features.

The `expose-loader` loader allows to expose a module (either in whole or in part) to global object (`self`, `window` and `global`).

For compatibility tips and examples, check out [Shimming](https://webpack.js.org/guides/shimming/) guide in the official documentation.

## Deprecation

Where the file that needs the global is yours, the assignment is one line and
nothing else is involved:

```js
import { jQuery as $ } from "jquery";

globalThis.$ = globalThis.jQuery = $;
```

Where it is not — a dependency you cannot edit — webpack appends that same line
for you before it parses the file, through `NormalModule`'s `processResult`
hook. The plugin that does it is small enough to keep in the configuration, and
webpack's
[expose-global example](https://github.com/webpack/webpack/tree/main/examples/expose-global)
is a working copy of it:

**webpack.config.js**

```js
const { NormalModule } = require("webpack");

class ExposeGlobalPlugin {
  constructor(exposes) {
    this.exposes = exposes;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap("ExposeGlobalPlugin", (compilation) => {
      NormalModule.getCompilationHooks(compilation).processResult.tap(
        "ExposeGlobalPlugin",
        (result, module) => {
          const [source, sourceMap] = result;
          for (const [test, code] of this.exposes) {
            test.lastIndex = 0;
            if (!module.resource || !test.test(module.resource)) continue;
            return [`${source}\n${code}`, sourceMap, undefined];
          }
          return result;
        },
      );
    });
  }
}

module.exports = {
  plugins: [
    new ExposeGlobalPlugin([
      // a script: the exports object is what a global consumer reaches for
      [
        /jquery[\\/]dist[\\/]jquery\.js$/,
        "globalThis.$ = globalThis.jQuery = module.exports;",
      ],
      // an ES module: the export is a binding in scope, and stays analyzable
      [
        /jquery[\\/]dist[\\/]jquery\.module\.js$/,
        "globalThis.$ = globalThis.jQuery = jQuery;",
      ],
    ]),
  ],
};
```

|                  Loader                   |                    Instead                    |
| :---------------------------------------: | :-------------------------------------------: |
|            `test` of the rule             |   the pattern the appended code is keyed by   |
|                 `exposes`                 |           the assignment you append           |
|              `globalObject`               | whatever the appended line names, i.e. `self` |
| inline (`expose-loader?exposes=$!jquery`) |    no equivalent, assign in your own code     |

Neither form wraps the module in a second one, which is what the loader has to
do — and what these are about:

- [#25](https://github.com/webpack/expose-loader/issues/25) — a module coming
  from `DllPlugin` is exposed by appending to it in the build that owns it.
- [#227](https://github.com/webpack/expose-loader/issues/227) — an ES module's
  exports are in scope as bindings, so any of them can be assigned as it is.
- [#256](https://github.com/webpack/expose-loader/issues/256) — nothing changes
  what the module exports, so `import $ from "jquery"` still gives the default
  export.

Two things to keep in mind, whichever form you use: the assignment runs when the
module is evaluated, so something has to import it; and where the file sits in a
package marked `"sideEffects": false`, add `{ test: /…/, sideEffects: true }` to
`module.rules`, or the import is dropped before it can assign.

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
