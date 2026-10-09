import { resolveReferenceLinkFallback } from '../hyperlink_module/reference_link.js';

function resolveDialog(options = {}) {
    if (options.hyperlinkDialog) return options.hyperlinkDialog;
    const root = options.globalObject || (typeof window !== 'undefined' ? window : globalThis);
    return root && root.hyperLinkDialog ? root.hyperLinkDialog : null;
}

export function resolveReferenceLinkField(input = {}, options = {}) {
    const dialog = resolveDialog(options);
    if (!dialog) return resolveReferenceLinkFallback(input);
    if (typeof dialog.resolveReferenceLink === 'function') {
        return dialog.resolveReferenceLink(input);
    }
    if (typeof dialog.getLinkTypeFromText !== 'function') return resolveReferenceLinkFallback(input);

    const element = input.element && input.element.$ ? input.element.$ : input.element;
    const clone = element && typeof element.cloneNode === 'function' ? element.cloneNode(true) : null;
    if (clone && clone.querySelectorAll) clone.querySelectorAll('del').forEach((node) => node.remove());
    const activeText = clone ? String(clone.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const href = element && element.getAttribute ?
        String(element.getAttribute('xlink:href') || element.getAttribute('href') || '').trim() : '';
    const value = String(input.value != null ? input.value : (activeText || href)).trim();
    const linkData = dialog.getLinkTypeFromText(value, 'reference', {
        isUpdate: !!input.isUpdate,
        isJournal: input.isJournal
    });
    const attributes = { ...((linkData && linkData.attributes) || {}) };
    const semanticType = String(linkData && linkData.type || '').indexOf('doi-') === 0 ? 'doi' :
        (input.expectedType === 'object-id' ? 'pmid' : 'url');
    const name = String(attributes['data-name'] || attributes.class || '').toLowerCase();
    const type = name === 'pub-id' ? 'pub-id' :
        (name === 'object-id' ? 'pmid' : (name === 'uri' || attributes['ext-link-type'] === 'uri' ? 'uri' : 'doi'));
    const resolvedHref = String(attributes['xlink:href'] || attributes.href || href || '').trim();
    return {
        valid: !!value,
        semanticType,
        type,
        token: semanticType === 'doi' ? 'doi' : (semanticType === 'pmid' ? 'object-id' : 'ext-link'),
        value,
        displayValue: semanticType === 'doi' && type !== 'pub-id' && resolvedHref ? resolvedHref : value,
        href: resolvedHref,
        attributes,
        linkDataType: linkData && linkData.type
    };
}

export function findReferenceLinkLeaf(root, token, options = {}) {
    if (!root || !root.querySelectorAll) return null;
    const expected = token === 'pub-id' ? 'doi' : (token === 'uri' ? 'ext-link' : token);
    const nodes = root.querySelectorAll(
        '.doi, .pub-id, .ext-link, .uri, .object-id, [data-name="doi"], [data-name="pub-id"], [data-name="ext-link"], [data-name="uri"], [data-name="object-id"]'
    );
    return Array.from(nodes).find((element) => (
        resolveReferenceLinkField({ element, expectedType: expected }, options).token === expected
    )) || null;
}
