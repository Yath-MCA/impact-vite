/**
 * One-shot: add `import BaseModule from '@editor/modules/_runtime/BaseModule.js'`
 * to module index.js files that `extends BaseModule` but lack the import.
 * Also append `export default ClassName` when missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesRoot = path.join(root, 'src/pages/editor/modules');
const importLine =
  "import BaseModule from '@editor/modules/_runtime/BaseModule.js';\n";
const skipDirs = new Set(['query-comment-system']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (skipDirs.has(e.name)) continue;
      walk(abs, out);
    } else if (e.name === 'index.js') {
      out.push(abs);
    }
  }
  return out;
}

const files = [
  ...walk(path.join(modulesRoot, 'standalone')),
  ...walk(path.join(modulesRoot, 'shared')),
  ...walk(path.join(modulesRoot, '_wip')),
];

let patched = 0;
for (const abs of files) {
  let text = fs.readFileSync(abs, 'utf8');
  if (/import\s+.*BaseModule/.test(text)) continue;
  if (!/extends\s+BaseModule/.test(text)) continue;
  if (text.includes('@editor/modules/_runtime/BaseModule.js')) continue;

  if (/^\s*\/\*/.test(text)) {
    const end = text.indexOf('*/');
    if (end !== -1) {
      text =
        text.slice(0, end + 2) +
        '\n' +
        importLine +
        text.slice(end + 2).replace(/^\r?\n/, '\n');
    } else {
      text = importLine + text;
    }
  } else {
    text = importLine + text;
  }

  if (!/export\s+default/.test(text)) {
    const m = text.match(/class\s+([A-Za-z0-9_]+)\s+extends\s+BaseModule/);
    if (m) {
      text = `${text.replace(/\s*$/, '')}\n\nexport default ${m[1]};\n`;
    }
  }

  fs.writeFileSync(abs, text);
  patched += 1;
  console.log(
    'patched',
    path.relative(modulesRoot, abs).split(path.sep).join('/')
  );
}
console.log('total patched', patched);
