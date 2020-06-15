/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/

import path from 'path';
import url from 'url';

import {
  getOptions,
  stringifyRequest,
  getCurrentRequest,
  getRemainingRequest,
} from 'loader-utils';

import { SourceNode, SourceMapConsumer } from 'source-map';

import validateOptions from 'schema-utils';

import schema from './options.json';

import getExposes from './utils';

export default function loader(content, sourceMap) {
  const options = getOptions(this);

  validateOptions(schema, options, {
    name: 'Expose Loader',
    baseDataPath: 'options',
  });

  // Change the request from an /abolute/path.js to a relative ./path.js
  // This prevents [chunkhash] values from changing when running webpack
  // builds in different directories.
  const remainingRequest = getRemainingRequest(this).split('!');

  const remainingRequests =
    typeof remainingRequest === 'string'
      ? [remainingRequest]
      : remainingRequest;

  const newRequestPath = remainingRequests
    .map(
      (currentUrl) =>
        `./${path
          .relative(this.context, url.parse(currentUrl).pathname)
          .split(path.sep)
          .join('/')}`
    )
    .join('!');

  /*
   * Workaround until module.libIdent() in webpack/webpack handles this correctly.
   *
   * fixes:
   * - https://github.com/webpack-contrib/expose-loader/issues/55
   * - https://github.com/webpack-contrib/expose-loader/issues/49
   */
  this._module.userRequest = `${this._module.userRequest}-exposed`;

  const callback = this.async();

  let exposes;

  try {
    exposes = getExposes(options.exposes);
  } catch (error) {
    callback(error);

    return;
  }

  let code = `var ___EXPOSE_LOADER_IMPORT___ = require(${JSON.stringify(
    `-!${newRequestPath}`
  )});\n`;
  code += `var ___EXPOSE_LOADER_GET_GLOBAL_THIS___ = require(${stringifyRequest(
    this,
    require.resolve('./runtime/getGlobalThis.js')
  )});\n`;
  code += `var ___EXPOSE_LOADER_GLOBAL_THIS___ = ___EXPOSE_LOADER_GET_GLOBAL_THIS___();\n`;

  for (const expose of exposes) {
    const { globalName, packageName } = expose;
    const { length } = globalName;

    if (typeof packageName !== 'undefined') {
      code += `var ___EXPOSE_LOADER_IMPORT_NAMED___ = ___EXPOSE_LOADER_IMPORT___.${packageName}\n`;
    }

    let propertyString = '___EXPOSE_LOADER_GLOBAL_THIS___';

    for (let i = 0; i < length; i++) {
      if (i > 0) {
        code += `if (!${propertyString}) ${propertyString} = {};\n`;
      }

      propertyString += `[${JSON.stringify(globalName[i])}]`;
    }

    code +=
      typeof packageName !== 'undefined'
        ? `${propertyString} = ___EXPOSE_LOADER_IMPORT_NAMED___;\n`
        : `${propertyString} = ___EXPOSE_LOADER_IMPORT___;\n`;
  }

  if (this.sourceMap && sourceMap) {
    const node = SourceNode.fromStringWithSourceMap(
      content,
      new SourceMapConsumer(sourceMap)
    );
    node.add(`\n${code}`);
    const result = node.toStringWithSourceMap({
      file: getCurrentRequest(this),
    });
    this.callback(null, result.code, result.map.toJSON());

    return;
  }

  callback(null, `${content}\n${code}`, sourceMap);
}
