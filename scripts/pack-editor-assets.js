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

function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

/** Convert a simple glob (*, **, ?) to a RegExp matched against posix paths. */
function globToRegExp(globPosix) {
  const g = toPosix(globPosix);
  let re = '^';
  for (let i = 0; i < g.length; i += 1) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      re += '.*';
      i += 1;
      if (g[i + 1] === '/') i += 1;
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (/[.+^${}()|[\]\\]/.test(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  re += '$';
  return new RegExp(re);
}

function walkFiles(absDir, out = []) {
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, out);
    else out.push(abs);
  }
  return out;
}

/**
 * Expand manifest globs relative to editor root into sorted posix rel paths
 * (still under src/pages/editor/, e.g. modules/shared/foo/context.js).
 */
export function expandEditorGlobs(patterns, { baseAbs = editorRoot } = {}) {
  const include = [];
  const excludeRes = [];
  for (const raw of patterns || []) {
    const p = toPosix(raw);
    if (p.startsWith('!')) {
      excludeRes.push(globToRegExp(p.slice(1)));
      continue;
    }
    include.push(p);
  }

  const allFiles = walkFiles(baseAbs).map((abs) =>
    toPosix(path.relative(baseAbs, abs))
  );

  const matched = new Set();
  for (const pattern of include) {
    if (!/[*?]/.test(pattern)) {
      matched.add(pattern);
      continue;
    }
    const re = globToRegExp(pattern);
    for (const rel of allFiles) {
      if (re.test(rel)) matched.add(rel);
    }
  }

  return [...matched]
    .filter((rel) => !excludeRes.some((re) => re.test(rel)))
    .filter((rel) => {
      const abs = path.join(baseAbs, ...rel.split('/'));
      return fs.existsSync(abs) && fs.statSync(abs).isFile();
    })
    .sort((a, b) => a.localeCompare(b));
}

/** Strip standalone/|shared/|_wip/ prefix for gulp-compatible module dest paths. */
function stripModuleSourceRoot(relPosix) {
  return toPosix(relPosix)
    .replace(/^(?:standalone|shared|_wip)\//, '');
}

/** template.html → ./figures/template.html style path used by template-store. */
function normalizeTemplatePath(absOrRel) {
  let s = toPosix(absOrRel);
  s = s.replace(/^.*?\/modules\//, '');
  s = s.replace(/^(?:standalone|shared|_wip)\//, '');
  return `./${s.replace(/^\.\//, '')}`;
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
    MODULE_MAIN_PATHS = [],
    GLOBAL_CONTEXT_COMMON_PATHS = [],
    GLOBAL_CONTEXT_EDITOR_PATHS = [],
    SINGLE_MODULE_INCLUDE_GLOBS = [],
    SINGLE_MODULE_EXCLUDE_GLOBS = [],
    SINGLE_MODULE_TEMPLATE_GLOBS = [],
  } = await import(pathToFileURL(path.join(editorRoot, 'manifest.js')).href);

  const version = readEditorVersionFromRepo(root);
  const outBase = path.join(root, 'public', 'assets', version);
  const jsDir = path.join(outBase, 'js');
  const cssDir = path.join(outBase, 'css');
  const vendorDir = path.join(outBase, 'vendor');
  const configDir = path.join(outBase, 'config');
  const modulesDir = path.join(outBase, 'modules');
  fs.mkdirSync(jsDir, { recursive: true });
  fs.mkdirSync(cssDir, { recursive: true });
  fs.mkdirSync(vendorDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  if (fs.existsSync(modulesDir)) {
    fs.rmSync(modulesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(modulesDir, { recursive: true });

  function assertNoGulpPlaceholders(text, outFile) {
    if (/\$\{\{/.test(text)) {
      console.error(
        `[pack-editor-assets] leftover \${{…}}$ placeholders in ${path.relative(root, outFile)}`
      );
      process.exit(1);
    }
  }

  /** Expand globs; keep non-glob entries in list order, then sorted glob hits. */
  function resolvePathList(relPaths) {
    const out = [];
    const seen = new Set();
    for (const raw of relPaths) {
      const p = toPosix(raw);
      if (!/[*?]/.test(p)) {
        if (seen.has(p)) continue;
        seen.add(p);
        out.push(p);
        continue;
      }
      for (const hit of expandEditorGlobs([p])) {
        if (seen.has(hit)) continue;
        seen.add(hit);
        out.push(hit);
      }
    }
    return out;
  }

  /**
   * Concat sources (globs allowed), then esbuild-minify with an external .map.
   * Vendors stay as separate pre-minified copies (not passed through here).
   */
  async function concatMinify(relPaths, outFile) {
    const resolved = resolvePathList(relPaths);
    if (resolved.length === 0) {
      console.error(
        `[pack-editor-assets] FAIL: empty concat list for ${path.relative(root, outFile)}`
      );
      process.exit(1);
    }
    const parts = [];
    for (const rel of resolved) {
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
    // Minify only — do not downlevel. Slice A / modules use modern syntax that
    // older esbuild targets cannot rewrite; browsers already run this as-is.
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
      `[pack-editor-assets] wrote ${path.relative(root, outFile)} (+ ${path.basename(mapFile)}) sources=${resolved.length}`
    );
  }

  /** Rewrite Vite @editor/_runtime imports so packed ESM can dynamic-import. */
  function rewriteEsmRuntimeImports(jsText) {
    const runtimeBase = `/assets/${version}/modules/_runtime/`;
    return String(jsText).replace(
      /(['"])@editor\/modules\/_runtime\//g,
      `$1${runtimeBase}`
    );
  }

  /** Copy BaseModule + UnifiedModuleSystem as ESM under modules/_runtime/. */
  function packRuntimeEsm() {
    const runtimeSrc = path.join(editorRoot, 'modules', '_runtime');
    const runtimeOut = path.join(modulesDir, '_runtime');
    fs.mkdirSync(runtimeOut, { recursive: true });
    let n = 0;
    for (const name of ['BaseModule.js', 'UnifiedModuleSystem.js']) {
      const abs = path.join(runtimeSrc, name);
      if (!fs.existsSync(abs)) {
        console.error(`[pack-editor-assets] missing runtime ${abs}`);
        process.exit(1);
      }
      let text = fs.readFileSync(abs, 'utf8');
      text = rewriteEsmRuntimeImports(text);
      fs.writeFileSync(path.join(runtimeOut, name), text, 'utf8');
      n += 1;
    }
    console.log(
      `[pack-editor-assets] runtime ESM=${n} → ${path.relative(root, runtimeOut)}`
    );
  }

  function packSingleModuleTree() {
    const modulesRoot = path.join(editorRoot, 'modules');
    const include = SINGLE_MODULE_INCLUDE_GLOBS.map((g) => toPosix(g));
    const exclude = SINGLE_MODULE_EXCLUDE_GLOBS.map((g) => `!${toPosix(g)}`);
    const files = expandEditorGlobs([...include, ...exclude], {
      baseAbs: modulesRoot,
    });
    let copied = 0;
    for (const rel of files) {
      const abs = path.join(modulesRoot, ...rel.split('/'));
      const destRel = stripModuleSourceRoot(rel);
      if (!destRel) continue;
      const out = path.join(modulesDir, ...destRel.split('/'));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      if (path.extname(abs).toLowerCase() === '.js') {
        let text = fs.readFileSync(abs, 'utf8');
        text = rewriteEsmRuntimeImports(text);
        fs.writeFileSync(out, text, 'utf8');
      } else {
        fs.copyFileSync(abs, out);
      }
      copied += 1;
    }
    console.log(
      `[pack-editor-assets] single_module files=${copied} → ${path.relative(root, modulesDir)}`
    );
    return copied;
  }

  function packTemplatesHtml() {
    const modulesRoot = path.join(editorRoot, 'modules');
    const files = expandEditorGlobs(SINGLE_MODULE_TEMPLATE_GLOBS, {
      baseAbs: modulesRoot,
    });
    let bundle = `<!-- Module Template Bundle - Auto-generated -->\n`;
    bundle += `<!-- Templates: ${files.length} -->\n\n`;
    for (const rel of files) {
      const abs = path.join(modulesRoot, ...rel.split('/'));
      const tplPath = normalizeTemplatePath(abs);
      const content = fs.readFileSync(abs, 'utf8');
      bundle += `<template data-template-path="${tplPath}">\n`;
      bundle += content;
      bundle += `\n</template>\n\n`;
    }
    const out = path.join(modulesDir, 'templates.html');
    fs.writeFileSync(out, bundle, 'utf8');
    console.log(
      `[pack-editor-assets] wrote ${path.relative(root, out)} templates=${files.length}`
    );
  }

  await concatMinify(E6_COMMON_PATHS, path.join(jsDir, 'e6_common.min.js'));
  await concatMinify(E6_MAIN_PATHS, path.join(jsDir, 'e6_main.min.js'));

  await concatMinify(
    MODULE_MAIN_PATHS,
    path.join(modulesDir, 'module_main.min.js')
  );
  await concatMinify(
    GLOBAL_CONTEXT_COMMON_PATHS,
    path.join(modulesDir, 'global_context_common.min.js')
  );
  await concatMinify(
    GLOBAL_CONTEXT_EDITOR_PATHS,
    path.join(modulesDir, 'global_context_editor.min.js')
  );
  packRuntimeEsm();
  packSingleModuleTree();
  packTemplatesHtml();

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

  // Required by src/pages/editor/_CSS_UI/main.css @font-face URLs.
  const requiredFonts = [
    'fonts-open/OpenSans-Regular.ttf',
    'fonts-open/OpenSans-Bold.ttf',
    'fonts-open/OpenSans-Italic.ttf',
    'fonts-open/OpenSans-BoldItalic.ttf',
    'fonts-open/OpenSans-SemiBold.ttf',
    'Inter/Inter-VariableFont_slnt,wght.ttf',
  ];
  const missingRequired = requiredFonts.filter(
    (rel) => !fs.existsSync(path.join(fontsOut, ...rel.split('/')))
  );
  if (missingRequired.length > 0) {
    console.error(
      `[pack-editor-assets] FAIL: required editor fonts missing under ${path.relative(root, fontsOut)}:\n  - ${missingRequired.join('\n  - ')}`
    );
    process.exit(1);
  }

  for (const optionalDir of ['font-lato', 'fontawesome', 'font-awesome']) {
    const abs = path.join(fontsOut, optionalDir);
    const hasFiles =
      fs.existsSync(abs) &&
      walkFiles(abs).length > 0;
    if (!hasFiles) {
      console.warn(
        `[pack-editor-assets] WARNING: optional fonts/${optionalDir} empty — unused by packed main.css today`
      );
    }
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
