import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

buildImportMap();

export function buildImportMap() {
  const angularPackagesPath = path.join(process.cwd(), 'packages');
  const angularModules = fs.readdirSync(angularPackagesPath);

  angularModules.forEach(module => {
    if (!fs.lstatSync(path.join(angularPackagesPath, module)).isDirectory() ||
    module === 'docs' || module === 'examples')  {
      return;
    }
    const mapPath = path.join(angularPackagesPath, module, 'imports.json');
    fs.writeFileSync(mapPath, '{}');

    iterateFiles(path.join(angularPackagesPath, module, 'src'), mapPath);
  });
}

function iterateFiles(folder: string, mapPath: string): void {
  const files = fs.readdirSync(folder);
  for (let i = 0; i < files.length; i++) {
    let filePath = path.join(folder, files[i]);
    if (fs.lstatSync(filePath).isDirectory()) {
      iterateFiles(filePath, mapPath);
    } else {
      checkFile(filePath, mapPath);
    }
  }
}

function checkFile(filePath: string, mapPath: string): void {
  console.log(`processing ${filePath}`);
  const program = ts.createProgram([filePath], {});
  const rootNode = (program as any).getSourceFile(filePath);
  const importMap = JSON.parse(fs.readFileSync(mapPath).toString());

  ts.forEachChild(rootNode, iterateNodes);

  function iterateNodes(node: any) {
    if (isDeclarationNode(node)) {
      const endPath = filePath.split(/packages[\/\\]+/)[1].replace('.ts', '');
      importMap[node.name.text] = path.join('@angular', endPath);
      // return to avoid mapping declarations inside declarations, like local vars
      return;
    }
    return ts.forEachChild(node, iterateNodes);
  }
  fs.writeFileSync(mapPath, JSON.stringify(importMap));
}

function isDeclarationNode(node: ts.Node): boolean {
  // TODO: see if can be limited to just exported statements
  return node.kind === ts.SyntaxKind.VariableDeclaration ||
      node.kind === ts.SyntaxKind.FunctionDeclaration ||
      node.kind === ts.SyntaxKind.ClassDeclaration ||
      node.kind === ts.SyntaxKind.EnumDeclaration ||
      node.kind === ts.SyntaxKind.TypeAliasDeclaration ||
      node.kind === ts.SyntaxKind.InterfaceDeclaration;
}