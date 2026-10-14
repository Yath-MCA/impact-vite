import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readEditorVersionFromRepo } from './resolveEditorVersion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editorRoot = path.join(root, 'src/pages/editor');
const commonRoot = path.join(root, 'src/pages/common');
const configRoot = path.join(root, 'src/config');
const assetsRoot = path.join(root, 'src/assets');

/**
 * Resolve a manifest-relative path:
 * - common/… → src/pages/common/
 * - lib/… → src/assets/
 * - else → src/pages/editor/
 */
export function resolveEditorSource(relPosix) {
  const rel = String(relPosix).replace(/\\/g, '/');
  if (rel.startsWith('common/')) {
    return path.join(commonRoot, ...rel.slice('common/'.length).split('/'));
  }
  if (rel.startsWith('lib/')) {
    return path.join(assetsRoot, ...rel.split('/'));
  }
  return path.join(editorRoot, ...rel.split('/'));
}

// Skip gulp-excluded clientconfig paths: temp/ and any extra/ segment
function shouldSkipConfigRel(relPosix) {
  const parts = relPosix.split('/');
  if (parts.includes('temp')) return true;
  if (parts.includes('extra')) return true;
  return false;
}

function copyClientconfigTree(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`[pack-editor-assets] missing config ${srcDir}`);
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

/** Merge-copy without deleting unrelated siblings in destDir. */
function copyDirMerge(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`[pack-editor-assets] missing ${srcDir}`);
    process.exit(1);
  }
  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = path.relative(srcDir, abs).split(path.sep).join('/');
      const out = path.join(destDir, ...rel.split('/'));
      if (entry.isDirectory()) {
        fs.mkdirSync(out, { recursive: true });
        walk(abs);
        continue;
      }
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(abs, out);
      copied += 1;
    }
  }
  walk(srcDir);
  return copied;
}

/** Make @font-face urls work from /assets/{VERSION}/css/*.css */
function rewriteCssAssetUrls(cssText) {
  return cssText
    .replace(/url\(\s*(['"]?)(?:\.\.\/)+assets\/images\//g, 'url($1/assets/images/')
    .replace(/url\(\s*(['"]?)\.\.\/\.\.\/assets\/images\//g, 'url($1/assets/images/');
}

async function main() {
  const {
    E6_COMMON_PATHS,
    E6_MAIN_PATHS,
    EDITOR_CSS_PATHS,
    EDITOR_VENDOR_JS_PATHS = [],
    EDITOR_VENDOR_CSS_PATHS = [],
  } = await import(pathToFileURL(path.join(editorRoot, 'manifest.js')).href);

  const version = readEditorVersionFromRepo(root);
  const outBase = path.join(root, 'public', 'assets', version);
  const jsDir = path.join(outBase, 'js');
  const cssDir = path.join(outBase, 'css');
  const vendorDir = path.join(outBase, 'vendor');
  const configDir = path.join(outBase, 'config');
  fs.mkdirSync(jsDir, { recursive: true });
  fs.mkdirSync(cssDir, { recursive: true });
  fs.mkdirSync(vendorDir, { recursive: true });
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
      const abs = resolveEditorSource(rel);
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

  for (const rel of EDITOR_VENDOR_JS_PATHS) {
    const abs = resolveEditorSource(rel);
    if (!fs.existsSync(abs)) {
      console.error(`[pack-editor-assets] missing vendor ${abs}`);
      process.exit(1);
    }
    const name = path.basename(rel);
    fs.copyFileSync(abs, path.join(vendorDir, name));
    console.log(
      `[pack-editor-assets] wrote ${path.relative(root, path.join(vendorDir, name))}`
    );
  }

  for (const rel of EDITOR_VENDOR_CSS_PATHS) {
    const abs = resolveEditorSource(rel);
    if (!fs.existsSync(abs)) {
      console.error(`[pack-editor-assets] missing vendor css ${abs}`);
      process.exit(1);
    }
    const name = path.basename(rel);
    fs.copyFileSync(abs, path.join(vendorDir, name));
    console.log(
      `[pack-editor-assets] wrote ${path.relative(root, path.join(vendorDir, name))}`
    );
  }

  for (const rel of EDITOR_CSS_PATHS) {
    if (EDITOR_VENDOR_CSS_PATHS.includes(rel)) continue;
    const abs = resolveEditorSource(rel);
    if (!fs.existsSync(abs)) {
      console.error(`[pack-editor-assets] missing ${abs}`);
      process.exit(1);
    }
    const name = path.basename(rel);
    let text = fs.readFileSync(abs, 'utf8');
    text = rewriteCssAssetUrls(text);
    fs.writeFileSync(path.join(cssDir, name), text, 'utf8');
    console.log(
      `[pack-editor-assets] wrote ${path.relative(root, path.join(cssDir, name))}`
    );
  }

  const booksSrc = path.join(configRoot, 'books');
  const journalsSrc = path.join(configRoot, 'journals');
  const booksOut = path.join(configDir, 'books');
  const journalsOut = path.join(configDir, 'journals');
  if (fs.existsSync(booksOut)) fs.rmSync(booksOut, { recursive: true, force: true });
  if (fs.existsSync(journalsOut)) {
    fs.rmSync(journalsOut, { recursive: true, force: true });
  }
  const booksCount = copyClientconfigTree(booksSrc, booksOut);
  const journalsCount = copyClientconfigTree(journalsSrc, journalsOut);
  console.log(
    `[pack-editor-assets] config books=${booksCount} journals=${journalsCount} → ${path.relative(root, configDir)}`
  );

  const langSrc = path.join(editorRoot, 'js', 'lang');
  const langOut = path.join(configDir, 'lang');
  const langCount = copyDirAllFiles(langSrc, langOut);
  console.log(
    `[pack-editor-assets] lang=${langCount} → ${path.relative(root, langOut)}`
  );

  const imagesSrc = path.join(assetsRoot, 'images');
  const imagesOut = path.join(root, 'public', 'assets', 'images');
  const imagesCount = copyDirMerge(imagesSrc, imagesOut);
  console.log(
    `[pack-editor-assets] images=${imagesCount} → ${path.relative(root, imagesOut)}`
  );
  if (imagesCount === 0) {
    console.warn(
      '[pack-editor-assets] WARNING: src/assets/images has no files — editor shell icons will 404 until binaries are restored'
    );
  }

  const fontsSrc = path.join(assetsRoot, 'fonts');
  const fontsOut = path.join(root, 'public', 'assets', 'images', 'fonts');
  const fontsCount = copyDirAllFiles(fontsSrc, fontsOut);
  console.log(
    `[pack-editor-assets] fonts=${fontsCount} → ${path.relative(root, fontsOut)}`
  );
  if (fontsCount === 0) {
    console.warn(
      '[pack-editor-assets] WARNING: src/assets/fonts has no files — @font-face URLs under /assets/images/fonts will 404 until binaries are restored'
    );
  }

  console.log(`[pack-editor-assets] VERSION=${version}`);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
