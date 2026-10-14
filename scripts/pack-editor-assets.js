import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readEditorVersionFromRepo } from './resolveEditorVersion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyRoot = path.join(root, 'src/legacy');
const clientconfigRoot = path.join(legacyRoot, 'clientconfig');

// Skip gulp-excluded clientconfig paths: temp/ and any extra/ segment
function shouldSkipConfigRel(relPosix) {
  const parts = relPosix.split('/');
  if (parts.includes('temp')) return true;
  if (parts.includes('extra')) return true;
  return false;
}

function copyClientconfigTree(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`[pack-editor-assets] missing clientconfig ${srcDir}`);
    process.exit(1);
  }
  let copied = 0;
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = path.relative(srcDir, abs).split(path.sep).join('/');
      if (shouldSkipConfigRel(rel)) continue;
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.xml' && ext !== '.json') continue;
      const out = path.join(destDir, ...rel.split('/'));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(abs, out);
      copied += 1;
    }
  }
  walk(srcDir);
  return copied;
}

/** Copy all files under srcDir into destDir (replace dest if present). */
function copyDirAllFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`[pack-editor-assets] missing ${srcDir}`);
    process.exit(1);
  }
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
  let copied = 0;
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = path.relative(srcDir, abs).split(path.sep).join('/');
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      const out = path.join(destDir, ...rel.split('/'));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(abs, out);
      copied += 1;
    }
  }
  walk(srcDir);
  return copied;
}

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

  function assertNoGulpPlaceholders(text, outFile) {
    if (/\$\{\{/.test(text)) {
      console.error(
        `[pack-editor-assets] leftover \${{…}}$ placeholders in ${path.relative(root, outFile)}`
      );
      process.exit(1);
    }
  }

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
    const text = parts.join('\n');
    assertNoGulpPlaceholders(text, outFile);
    fs.writeFileSync(outFile, text, 'utf8');
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

  const booksSrc = path.join(clientconfigRoot, 'books');
  const journalsSrc = path.join(clientconfigRoot, 'journals');
  const booksOut = path.join(configDir, 'books');
  const journalsOut = path.join(configDir, 'journals');
  if (fs.existsSync(booksOut)) fs.rmSync(booksOut, { recursive: true, force: true });
  if (fs.existsSync(journalsOut)) fs.rmSync(journalsOut, { recursive: true, force: true });
  const booksCount = copyClientconfigTree(booksSrc, booksOut);
  const journalsCount = copyClientconfigTree(journalsSrc, journalsOut);
  console.log(
    `[pack-editor-assets] config books=${booksCount} journals=${journalsCount} → ${path.relative(root, configDir)}`
  );

  const langSrc = path.join(legacyRoot, 'js', 'lang');
  const langOut = path.join(configDir, 'lang');
  const langCount = copyDirAllFiles(langSrc, langOut);
  console.log(
    `[pack-editor-assets] lang=${langCount} → ${path.relative(root, langOut)}`
  );

  const logoSrc = path.join(legacyRoot, 'static', 'images', 'client_logo');
  const logoOut = path.join(root, 'public', 'assets', 'images', 'client_logo');
  const logoCount = copyDirAllFiles(logoSrc, logoOut);
  console.log(
    `[pack-editor-assets] logos=${logoCount} → ${path.relative(root, logoOut)}`
  );

  console.log(`[pack-editor-assets] VERSION=${version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
