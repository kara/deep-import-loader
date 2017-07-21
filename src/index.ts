import * as fs from 'fs';
import * as tmp from 'tmp';
import {deepImportLoader} from './deepImportLoader';
import {buildImportMap} from './buildImportMap';

module.exports = function(content: string) {
  const tmpFile = (tmp as any).fileSync({postfix: '.js'}).name;
  console.log(`processing imports for ${this.request}`);
  fs.writeFileSync(tmpFile, content);
  return deepImportLoader(tmpFile);
};

