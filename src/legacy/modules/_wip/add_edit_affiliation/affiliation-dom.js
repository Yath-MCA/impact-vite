const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const VOID_ELEMENTS = new Set([
    'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
    'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'
]);

function isAffiliationElement(element) {
    return Boolean(element && element.nodeType === ELEMENT_NODE && (
        element.classList.contains('aff') || element.getAttribute('data-name') === 'aff'
    ));
}

function isProtectedElement(element) {
    if (!element || element.nodeType !== ELEMENT_NODE) return false;

    const dataClass = element.getAttribute('data-class') || '';
    const dataName = element.getAttribute('data-name') || '';
    const dataRole = element.getAttribute('data-role') || '';

    return element.getAttribute('contenteditable') === 'false' ||
        element.hasAttribute('data-pi') ||
        element.hasAttribute('data-remove') ||
        element.hasAttribute('data-delete') ||
        /ckcomments/i.test(dataClass) ||
        /^(AQ|query)$/i.test(dataName) ||
        /query|comment/i.test(dataRole);
}

function toDisplayLabel(value) {
    const normalized = String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) return 'Text';
    return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getElementLabel(element) {
    if (!element || element.nodeType !== ELEMENT_NODE) return 'Text';

    const className = Array.from(element.classList || [])
        .find((name) => name && name !== 'aff');
    return toDisplayLabel(
        element.getAttribute('data-name') || className || element.tagName
    );
}

function isAffiliationRoot(element, root) {
    return element === root && isAffiliationElement(root);
}

function getNodeAtPath(root, path) {
    if (!root || !Array.isArray(path)) return null;
    return path.reduce((node, childIndex) => {
        if (!node || !node.childNodes || !node.childNodes[childIndex]) return null;
        return node.childNodes[childIndex];
    }, root);
}

function replaceMeaningfulText(textNode, value) {
    const current = textNode.nodeValue || '';
    const leadingMatch = current.match(/^\s*/);
    const trailingMatch = current.match(/\s*$/);
    const leading = leadingMatch ? leadingMatch[0] : '';
    const trailing = trailingMatch ? trailingMatch[0] : '';
    textNode.nodeValue = `${leading}${value}${trailing}`;
}

export function discoverAffiliationFields(affElement) {
    if (!isAffiliationElement(affElement) || isProtectedElement(affElement)) return [];

    const fields = [];

    function visit(node, path, nearestElement) {
        if (node.nodeType === TEXT_NODE) {
            const value = (node.nodeValue || '').trim();
            if (value) {
                fields.push({
                    path,
                    label: isAffiliationRoot(nearestElement, affElement) ?
                        'Free Text' : getElementLabel(nearestElement),
                    value,
                    nodeKind: 'text'
                });
            }
            return;
        }

        if (node.nodeType !== ELEMENT_NODE || isProtectedElement(node)) return;

        const children = Array.from(node.childNodes);
        if (node !== affElement && children.length === 0 && !VOID_ELEMENTS.has(node.tagName)) {
            fields.push({
                path,
                label: getElementLabel(node),
                value: '',
                nodeKind: 'element'
            });
            return;
        }

        children.forEach((child, index) => {
            visit(child, path.concat(index), node);
        });
    }

    Array.from(affElement.childNodes).forEach((child, index) => {
        visit(child, [index], affElement);
    });

    return fields;
}

export function applyAffiliationFieldValue(root, fieldPath, value) {
    const target = getNodeAtPath(root, fieldPath);
    if (!target || (target.nodeType === ELEMENT_NODE && isProtectedElement(target))) return false;

    if (target.nodeType === TEXT_NODE) {
        replaceMeaningfulText(target, String(value === null || value === undefined ? '' : value));
        return true;
    }

    if (target.nodeType === ELEMENT_NODE && target.childNodes.length === 0 && !VOID_ELEMENTS.has(target.tagName)) {
        target.textContent = String(value === null || value === undefined ? '' : value);
        return true;
    }

    return false;
}

export function isEditableAffiliation(affElement) {
    return discoverAffiliationFields(affElement).length > 0;
}

export function resolveAffiliationNode(affElement, fieldPath) {
    return getNodeAtPath(affElement, fieldPath);
}

export function parsePastedAffiliation(html, ownerDocument = document) {
    const template = ownerDocument.createElement('template');
    template.innerHTML = String(html || '').trim();

    const meaningfulNodes = Array.from(template.content.childNodes).filter((node) => {
        return node.nodeType === ELEMENT_NODE ||
            (node.nodeType === TEXT_NODE && Boolean((node.nodeValue || '').trim()));
    });
    if (meaningfulNodes.length !== 1 || meaningfulNodes[0].nodeType !== ELEMENT_NODE ||
        !isAffiliationElement(meaningfulNodes[0])) {
        return { ok: false, error: 'Paste exactly one affiliation element.' };
    }

    const affiliation = meaningfulNodes[0];
    affiliation.removeAttribute('id');
    affiliation.querySelectorAll('script, iframe, object, embed, link, meta, base').forEach((node) => {
        node.remove();
    });

    const scriptProtocol = ['java', 'script:'].join('');
    [affiliation].concat(Array.from(affiliation.querySelectorAll('*'))).forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (name.indexOf('on') === 0 ||
                (['href', 'src', 'xlink:href'].includes(name) && value.indexOf(scriptProtocol) === 0)) {
                element.removeAttribute(attribute.name);
            }
        });
    });

    return { ok: true, affiliation };
}

export function getNextAffiliationId(root = document) {
    let maxNumber = 0;
    let width = 4;
    Array.from(root.querySelectorAll('.aff[id], [data-name="aff"][id]')).forEach((element) => {
        const match = (element.id || '').match(/^AF(\d+)$/i);
        if (!match) return;
        maxNumber = Math.max(maxNumber, Number(match[1]));
        width = Math.max(width, match[1].length);
    });
    return `AF${String(maxNumber + 1).padStart(width, '0')}`;
}
