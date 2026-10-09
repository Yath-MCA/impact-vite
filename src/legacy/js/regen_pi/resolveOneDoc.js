/**
 * Resolve one JATS document from meta.json + documents.json
 * for a client + project-shortcode (optional explicit docid).
 * @module resolveOneDoc
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, isAbsolute, join, basename, extname } from "node:path";

/**
 * @param {object} opts
 * @param {string} opts.root project folder with meta.json / documents.json
 * @param {string} opts.client
 * @param {string} opts.projectCode project-shortcode
 * @param {string} [opts.docid] explicit docid
 * @param {boolean} [opts.oneDoc=true] when docid omitted, pick first sorted match
 * @returns {{
 *   docid: string,
 *   fileId: string,
 *   folder: string,
 *   folderAbs: string,
 *   originalHtml: string|null,
 *   originalHtmlAbs: string|null,
 *   contribPreviewAbs: string|null,
 *   contribCleanXmlAbs: string|null
 * }}
 */
export function resolveOneDoc(opts) {
  const root = opts && opts.root;
  const client = opts && opts.client;
  const projectCode = opts && opts.projectCode;
  if (!root || !client || !projectCode) {
    throw new Error("resolveOneDoc requires root, client, and projectCode");
  }

  const metaPath = join(root, "meta.json");
  const docsPath = join(root, "documents.json");
  if (!existsSync(metaPath) || !existsSync(docsPath)) {
    throw new Error(`Missing meta.json or documents.json under ${root}`);
  }

  const metas = JSON.parse(readFileSync(metaPath, "utf8"));
  const docs = JSON.parse(readFileSync(docsPath, "utf8"));

  const matches = Object.keys(metas)
    .filter((docid) => {
      const m = metas[docid] || {};
      if (String(m.dtd || "").toUpperCase() !== "JATS") return false;
      if (String(m.client || "") !== client) return false;
      if (String(m["project-shortcode"] || "") !== projectCode) return false;
      return !!docs[docid];
    })
    .sort();

  if (!matches.length) {
    throw new Error(`No JATS docs for ${client}/${projectCode}`);
  }

  let docid = opts.docid;
  if (docid) {
    if (!matches.includes(docid)) {
      throw new Error(
        `docid ${docid} is not under ${client}/${projectCode} (JATS)`
      );
    }
  } else if (opts.oneDoc !== false) {
    docid = matches[0];
  } else {
    throw new Error("docid required when oneDoc is false");
  }

  const meta = metas[docid] || {};
  const entry = docs[docid] || {};
  const folderRel = entry.folder || `JATS/${docid}`;
  const folderAbs = isAbsolute(folderRel) ? folderRel : join(root, folderRel);

  const files = entry.files || {};
  const originalHtmlRel = files.original_html || null;
  const originalHtmlAbs = originalHtmlRel
    ? isAbsolute(originalHtmlRel)
      ? originalHtmlRel
      : join(root, originalHtmlRel)
    : null;

  const contribPreviewAbs = join(folderAbs, "contrib_preview.html");
  const contribCleanXmlAbs = join(folderAbs, "contrib_group_original_clean.xml");

  return {
    docid,
    fileId: meta["file-id"] || "",
    folder: folderRel,
    folderAbs,
    originalHtml: originalHtmlRel,
    originalHtmlAbs,
    contribPreviewAbs: existsSync(contribPreviewAbs) ? contribPreviewAbs : null,
    contribCleanXmlAbs: existsSync(contribCleanXmlAbs)
      ? contribCleanXmlAbs
      : null,
  };
}

/**
 * Derive strip output path beside a source HTML file.
 * foo.html -> foo_strip_pi.html; contrib_preview.html -> contrib_preview_strip_pi.html
 * @param {string} sourceAbs
 * @returns {string}
 */
export function stripOutputPath(sourceAbs) {
  const dir = dirname(sourceAbs);
  const base = basename(sourceAbs, extname(sourceAbs));
  return join(dir, `${base}_strip_pi.html`);
}
