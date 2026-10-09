const DEFAULT_DOI_PATTERN = /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\/\S+$/i;

export function resolveReferenceLinkFallback(input = {}) {
    const element = input.element && input.element.$ ? input.element.$ : input.element;
    const clone = element && typeof element.cloneNode === 'function' ? element.cloneNode(true) : null;
    if (clone && clone.querySelectorAll) clone.querySelectorAll('del').forEach((node) => node.remove());
    const activeText = clone ? String(clone.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const elementHref = element && element.getAttribute ?
        String(element.getAttribute('xlink:href') || element.getAttribute('href') || '').trim() : '';
    const value = String(input.value != null ? input.value : (activeText || elementHref)).trim();
    const expectedType = String(input.expectedType || '').toLowerCase();
    const elementName = element && element.getAttribute ?
        String(element.getAttribute('data-name') || element.className || '').split(/\s+/)[0].toLowerCase() : '';
    const pubIdType = element && element.getAttribute ?
        String(element.getAttribute('pub-id-type') || '').toLowerCase() : '';
    const extLinkType = element && element.getAttribute ?
        String(element.getAttribute('ext-link-type') || '').toLowerCase() : '';
    const existingAttributes = element && element.attributes ? Array.from(element.attributes).reduce((attrs, attribute) => {
        attrs[attribute.name] = attribute.value;
        return attrs;
    }, {}) : null;
    const isPmid = expectedType === 'pmid' || expectedType === 'object-id' ||
        elementName === 'object-id' || pubIdType === 'pmid';
    const hasConfiguredDoiPatterns = Array.isArray(input.doiPatterns) && input.doiPatterns.some(Boolean);
    const configuredDoi = hasConfiguredDoiPatterns && input.doiPatterns.some((pattern) => {
        if (!pattern) return false;
        const expression = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        return new RegExp(expression.source, expression.flags).test(value);
    });
    const textIsDoi = hasConfiguredDoiPatterns ? configuredDoi : DEFAULT_DOI_PATTERN.test(value);
    const isDoi = !isPmid && (elementName === 'pub-id' || pubIdType === 'doi' ||
        extLinkType === 'doi' || textIsDoi);

    if (isPmid) {
        return {
            valid: !!value,
            semanticType: 'pmid',
            type: 'pmid',
            token: 'object-id',
            value,
            displayValue: value,
            href: '',
            attributes: existingAttributes || {
                'data-name': 'object-id',
                class: 'object-id',
                'pub-id-type': 'pmid'
            }
        };
    }

    if (isDoi && !/^https?:\/\//i.test(value)) {
        return {
            valid: true,
            semanticType: 'doi',
            type: 'pub-id',
            token: 'doi',
            value,
            displayValue: value,
            href: '',
            attributes: existingAttributes || {
                'data-name': 'pub-id',
                class: 'pub-id',
                'pub-id-type': 'doi'
            }
        };
    }

    const href = elementHref || (/^www\./i.test(value) ? `https://${value}` : value);
    return {
        valid: !!value,
        semanticType: isDoi ? 'doi' : 'url',
        type: elementName === 'uri' ? 'uri' : (isDoi ? 'doi' : 'uri'),
        token: isDoi ? 'doi' : 'ext-link',
        value,
        displayValue: value,
        href,
        attributes: existingAttributes || {
            'data-name': 'ext-link',
            class: 'ext-link',
            'ext-link-type': isDoi ? 'doi' : 'uri',
            'xlink:href': href
        }
    };
}
