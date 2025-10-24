/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/

import schema from "./options.json";

import {
  contextify,
  getExposes,
  getNewUserRequest,
  interpolateName,
  stringifyRequest,
} from "./utils";

export default function loader() {
  const options = this.getOptions(schema);
  const callback = this.async();

  let exposes;

  try {
    exposes = getExposes(options.exposes);
  } catch (error) {
    callback(error);

    return;
  }

  /*
   * Workaround until module.libIdent() in webpack/webpack handles this correctly.
   *
   * Fixes:
   * - https://github.com/webpack/expose-loader/issues/55
   * - https://github.com/webpack/expose-loader/issues/49
   */
  this._module.userRequest = getNewUserRequest(this._module.userRequest);

  /*
   * Adding side effects
   *
   * Fixes:
   * - https://github.com/webpack/expose-loader/issues/120
   */
  if (this._module.factoryMeta) {
    this._module.factoryMeta.sideEffectFree = false;
  }

  // Change the request from an /absolute/path.js to a relative ./path.js.
  // This prevents `[chunkhash]` values from changing when running webpack builds in different directories.
  const newRequest = contextify(this, this.context, this.remainingRequest);
  const stringifiedNewRequest = stringifyRequest(this, `-!${newRequest}`);

  let code = `var ___EXPOSE_LOADER_IMPORT___ = require(${stringifiedNewRequest});\n`;

  const getGlobalThis =
    options.globalObject ||
    `require(${stringifyRequest(
      this,
      require.resolve("./runtime/getGlobalThis.js"),
    )})`;

  code += `var ___EXPOSE_LOADER_GET_GLOBAL_THIS___ = ${getGlobalThis};\n`;
  code +=
    "var ___EXPOSE_LOADER_GLOBAL_THIS___ = ___EXPOSE_LOADER_GET_GLOBAL_THIS___;\n";

  for (const expose of exposes) {
    const { globalName, moduleLocalName, override } = expose;
    const globalNameInterpolated = globalName.map((item) =>
      interpolateName(this, item, {}),
    );

    if (typeof moduleLocalName !== "undefined") {
      code += `var ___EXPOSE_LOADER_IMPORT_MODULE_LOCAL_NAME___ = ___EXPOSE_LOADER_IMPORT___.${moduleLocalName}\n`;
    }

    let propertyString = "___EXPOSE_LOADER_GLOBAL_THIS___";

    for (let i = 0; i < globalName.length; i++) {
      if (i > 0) {
        code += `if (typeof ${propertyString} === 'undefined') ${propertyString} = {};\n`;
      }

      propertyString += `[${JSON.stringify(globalNameInterpolated[i])}]`;
    }

    if (!override) {
      code += `if (typeof ${propertyString} === 'undefined') `;
    }

    code +=
      typeof moduleLocalName !== "undefined"
        ? `${propertyString} = ___EXPOSE_LOADER_IMPORT_MODULE_LOCAL_NAME___;\n`
        : `${propertyString} = ___EXPOSE_LOADER_IMPORT___;\n`;

    if (!override && this.mode === "development") {
      code += `else throw new Error('[expose-loader] The "${globalName.join(
        ".",
      )}" value exists in the global scope, it may not be safe to overwrite it, use the "override" option')\n`;
    }
  }

  code += "module.exports = ___EXPOSE_LOADER_IMPORT___;\n";

  callback(null, code);
}
