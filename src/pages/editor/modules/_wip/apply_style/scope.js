/**
 * Resolve offscreen HTML + write-back mode for Apply Style.
 * Books must not default to full-document get/set.
 * @param {{
 *   isJournal: boolean,
 *   cursorNode: Element|null,
 *   editorGetData: function(): string,
 *   curChapter: {id: string}|null,
 *   curChapterData: string|null
 * }} options
 * @returns {{ mode: string, html?: string, replaceDiv?: boolean, replaceDivId?: string|null, rootNode?: *, reason?: string }}
 */
export function resolveApplyStyleScopeRoot(options) {
    const isJournal = options.isJournal;
    const cursorNode = options.cursorNode;
    const editorGetData = options.editorGetData;
    const curChapter = options.curChapter;
    const curChapterData = options.curChapterData;

    if (isJournal) {
        return {
            mode: 'full',
            html: typeof editorGetData === 'function' ? editorGetData() : '',
            replaceDiv: false,
            replaceDivId: null,
            rootNode: null
        };
    }

    if (curChapter && curChapter.id && curChapterData) {
        return {
            mode: 'chapter',
            html: curChapterData,
            replaceDiv: true,
            replaceDivId: curChapter.id,
            rootNode: curChapter
        };
    }

    let root = null;
    if (cursorNode && typeof cursorNode.closest === 'function') {
        root = cursorNode.closest('.book-part') || cursorNode.closest('.named-book-part-body');
    }
    if (root && root.id) {
        return {
            mode: 'part',
            html: root.outerHTML,
            replaceDiv: true,
            replaceDivId: root.id,
            rootNode: root
        };
    }

    return { mode: 'refuse', reason: 'missing-book-scope' };
}
