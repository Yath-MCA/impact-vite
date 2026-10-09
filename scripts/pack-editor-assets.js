import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readEditorVersionFromRepo } from './resolveEditorVersion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyRoot = path.join(root, 'src/legacy');

async function main() {
  const { E6_COMMON_PATHS, E6_MAIN_PATHS, EDITOR_CSS_PATHS } = await import(
    pathToFileURL(path.join(root, 'src/pages/editor/manifest.js')).href
  );
  const version = readEditorVersionFromRepo(root);
  const outBase = path.join(root, 'public', 'assets', version);
  const jsDir = path.join(outBase, 'js');
  const cssDir = path.join(outBase, 'css');
  const configDir = path.join(outBase, 'config');
  fs.mkdirSync(jsDir, { recursive: true });
  fs.mkdirSync(cssDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });

  function concat(relPaths, outFile) {
    const parts = [];
    for (const rel of relPaths) {
      const abs = path.join(legacyRoot, rel);
      if (!fs.existsSync(abs)) {
        console.error(`[pack-editor-assets] missing ${abs}`);
        process.exit(1);
      }
      parts.push(`\n;/* === ${rel} === */\n` + fs.readFileSync(abs, 'utf8'));
    }
    fs.writeFileSync(outFile, parts.join('\n'), 'utf8');
    console.log(`[pack-editor-assets] wrote ${path.relative(root, outFile)}`);
  }

  concat(E6_COMMON_PATHS, path.join(jsDir, 'e6_common.min.js'));
  concat(E6_MAIN_PATHS, path.join(jsDir, 'e6_main.min.js'));

  for (const rel of EDITOR_CSS_PATHS) {
    const abs = path.join(legacyRoot, rel);
    if (!fs.existsSync(abs)) {
      console.error(`[pack-editor-assets] missing ${abs}`);
      process.exit(1);
    }
    const name = path.basename(rel);
    fs.copyFileSync(abs, path.join(cssDir, name));
    console.log(`[pack-editor-assets] wrote ${path.relative(root, path.join(cssDir, name))}`);
  }

  fs.writeFileSync(
    path.join(configDir, 'README.txt'),
    'Stub config dir for LoadingConfig FOLDER_PATH. Populate in a later phase.\n',
    'utf8'
  );
  console.log(`[pack-editor-assets] VERSION=${version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
