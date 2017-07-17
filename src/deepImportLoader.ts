import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export function deepImportLoader(file: string): string {
  let contents = fs.readFileSync(file).toString();
  const options: ts.CompilerOptions = {
    allowJs: true,
  };

  const program = ts.createProgram([file], options);
  const source = (program as any).getSourceFile(file);

  const importPaths = findAngularImports(source, contents);
  return replaceAngularImports(importPaths, contents);
}

function findAngularImports(node: ts.Node, contents: string): any[] {
  const newImportPaths = [];
  ts.forEachChild(node, cb);

  function cb(node: any) {
    // TODO(kara): remove hardcoded material ref, replace with just angular
    if (isNamedImport(node) && /^@angular\/material/gi.test(node.moduleSpecifier.text)) {
      const importIdentifiers = (node.importClause.namedBindings as ts.NamedImports).elements;
      let newImportPath = '';
      Array.prototype.forEach.call(importIdentifiers, importId => {
        newImportPath += buildNewImportString(importId, node.moduleSpecifier.text);
      });
      newImportPaths.push({pos: node.pos, end: node.end, path: newImportPath});
    }
    return ts.forEachChild(node, cb);
  }

  return newImportPaths;
}

function replaceAngularImports(importPaths: any[], contents: string): string {
  for(let i = importPaths.length - 1; i >= 0; i--) {
    let currPath = importPaths[i];
    contents =
        contents.substring(0, currPath.pos) + currPath.path + contents.substring(currPath.end);
  }
  console.log(importPaths.length + ' imports replaced');
  return contents;
}

function buildNewImportString(
    importId: ts.ImportSpecifier, shortPath: string): string {

  // if using an import alias, symbol is stored as propertyName, otherwise stored as name
  const symbol = importId.propertyName ? importId.propertyName.text : importId.name.text;
  const deepImportPath = findDeepImportPath(symbol, shortPath);

  const importIdString =
      importId.propertyName ? `${symbol} as ${importId.name.text}` : symbol;
  return `\nimport { ${importIdString} } from '${deepImportPath}';\n`;
}

function findDeepImportPath(symbol: string, shortcut: string): string {
  const moduleDir = path.resolve(process.cwd(), 'node_modules');
  const importMap =
      JSON.parse(fs.readFileSync(path.resolve(moduleDir, shortcut, 'imports.json')).toString());
  return shortcut + '/' + importMap[symbol];
}

function isNamedImport(node: any): boolean {
  // We cannot add deep import paths for import declarations that do not have an import
  // clause (e.g. import 'rxjs/add/operator/map') or that use wildcard namespace imports
  // (e.g. import * as fs from 'fs')
  return node.kind === ts.SyntaxKind.ImportDeclaration
      && node.importClause
      && node.importClause.namedBindings
      && node.importClause.namedBindings.kind === ts.SyntaxKind.NamedImports;
}
