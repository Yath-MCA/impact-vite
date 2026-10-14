import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { readEditorVersionFromRepo } from './resolveEditorVersion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editorRoot = path.join(root, 'src/pages/editor');
const commonRoot = path.join(root, 'src/pages/common');
const configRoot = path.join(root, 'src/config');
const assetsRoot = path.join(root, 'src/assets');

/**
 * Resolve a manifest-relative path:
 * - common/… → src/pages/common/
 * - lib/… or fonts/… → src/assets/
 * - else → src/pages/editor/
 */
export function resolveEditorSource(relPosix) {
  const rel = String(relPosix).replace(/\\/g, '/');
  if (rel.startsWith('common/')) {
    return path.join(commonRoot, ...rel.slice('common/'.length).split('/'));
  }
  if (rel.startsWith('lib/') || rel.startsWith('fonts/')) {
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

/**
 * Collapse insignificant XML whitespace (pretty-data-style).
 * Only strip comments and whitespace *between* tags — never glue multiline
 * text/attribute values by deleting interior newlines.
 */
function minifyXml(text) {
  const cdata = [];
  let out = String(text).replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (block) => {
    cdata.push(block);
    return `\0CDATA${cdata.length - 1}\0`;
  });
  out = out
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();
  out = out.replace(/\0CDATA(\d+)\0/g, (_, i) => cdata[Number(i)]);
  return out;
}

function minifyJsonText(text, label) {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch (err) {
    console.error(`[pack-editor-assets] invalid JSON in ${label}: ${err.message}`);
    process.exit(1);
  }
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
      const raw = fs.readFileSync(abs, 'utf8');
      const body = ext === '.json' ? minifyJsonText(raw, abs) : minifyXml(raw);
      fs.writeFileSync(out, body, 'utf8');
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

async function minifyCssText(cssText, label) {
  const result = await esbuild.transform(cssText, {
    loader: 'css',
    minify: true,
    legalComments: 'none',
  });
  if (typeof result.code !== 'string') {
    console.error(`[pack-editor-assets] FAIL minify CSS ${label}`);
    process.exit(1);
  }
  return result.code;
}

async function minifyJsText(jsText, label) {
  const result = await esbuild.transform(jsText, {
    loader: 'js',
    minify: true,
    target: 'esnext',
    legalComments: 'none',
  });
  if (typeof result.code !== 'string') {
    console.error(`[pack-editor-assets] FAIL minify JS ${label}`);
    process.exit(1);
  }
  return result.code;
}

/** Copy lang dir: .js → esbuild minify, .json → compact, other → copy. */
async function copyLangDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`[pack-editor-assets] missing ${srcDir}`);
    process.exit(1);
  }
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
  let copied = 0;
  async function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = path.relative(srcDir, abs).split(path.sep).join('/');
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      const out = path.join(destDir, ...rel.split('/'));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const ext = path.extname(entry.name).toLowerCase();
      const raw = fs.readFileSync(abs, 'utf8');
      let body = raw;
      if (ext === '.js') {
        body = await minifyJsText(raw, abs);
      } else if (ext === '.json') {
        body = minifyJsonText(raw, abs);
      }
      fs.writeFileSync(out, body, 'utf8');
      copied += 1;
    }
  }
  await walk(srcDir);
  return copied;
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

  /**
   * Concat Slice A sources, then esbuild-minify with an external .map.
   * Vendors stay as separate pre-minified copies (not passed through here).
   */
  async function concatMinify(relPaths, outFile) {
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

    const outBaseName = path.basename(outFile);
    // Minify only — do not downlevel. Slice A uses modern syntax that older
    // esbuild targets cannot rewrite; browsers already run this as-is.
    const result = await esbuild.transform(text, {
      loader: 'js',
      minify: true,
      sourcemap: 'external',
      sourcesContent: true,
      sourcefile: outBaseName.replace(/\.min\.js$/i, '.js'),
      target: 'esnext',
      legalComments: 'none',
    });

    const mapFile = `${outFile}.map`;
    const mapBaseName = path.basename(mapFile);
    let code = result.code || '';
    if (!code.includes('sourceMappingURL')) {
      code = `${code.replace(/\s*$/, '')}\n//# sourceMappingURL=${mapBaseName}\n`;
    }
    fs.writeFileSync(outFile, code, 'utf8');
    fs.writeFileSync(mapFile, result.map || '{}', 'utf8');
    console.log(
      `[pack-editor-assets] wrote ${path.relative(root, outFile)} (+ ${path.basename(mapFile)})`
    );
  }

  await concatMinify(E6_COMMON_PATHS, path.join(jsDir, 'e6_common.min.js'));
  await concatMinify(E6_MAIN_PATHS, path.join(jsDir, 'e6_main.min.js'));

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
    const outFile = path.join(cssDir, name);
    let text = fs.readFileSync(abs, 'utf8');
    text = rewriteCssAssetUrls(text);
    text = await minifyCssText(text, abs);
    fs.writeFileSync(outFile, text, 'utf8');
    console.log(`[pack-editor-assets] wrote ${path.relative(root, outFile)}`);
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
  const langCount = await copyLangDir(langSrc, langOut);
  console.log(
    `[pack-editor-assets] lang=${langCount} → ${path.relative(root, langOut)}`
  );

  const imagesSrc = path.join(assetsRoot, 'images');
  const imagesOut = path.join(root, 'public', 'assets', 'images');
  const imagesCount = copyDirMerge(imagesSrc, imagesOut);
  console.log(
    `[pack-editor-assets] images=${imagesCount} → ${path.relative(root, imagesOut)}`
  );
  const mainPageSrc = path.join(imagesSrc, 'svg', 'mainPage');
  const mainPageFiles = fs.existsSync(mainPageSrc)
    ? fs.readdirSync(mainPageSrc).filter((name) =>
        fs.statSync(path.join(mainPageSrc, name)).isFile()
      ).length
    : 0;
  if (imagesCount === 0 || mainPageFiles === 0) {
    console.error(
      `[pack-editor-assets] FAIL: src/assets/images empty or missing svg/mainPage (images=${imagesCount}, mainPage=${mainPageFiles}) — restore binaries before packing`
    );
    process.exit(1);
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
