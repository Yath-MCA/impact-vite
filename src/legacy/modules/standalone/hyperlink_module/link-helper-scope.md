# Link Helper Scope

This note documents the helper flow used to identify link type from text or an existing reference leaf and build the matching attributes.

## Reference Resolver

Reference workflows use the higher-level resolver:

```js
hyperLinkDialog.resolveReferenceLink({
  value,
  element,
  expectedType,
  mode,
  isUpdate,
  isJournal,
  dtd
})
```

It returns one client-aware descriptor for fetch, preview, insert, edit, and reopen:

```js
{
  valid: true,
  semanticType: "doi", // doi | url | pmid
  type: "pub-id",      // doi | uri | pub-id | pmid
  token: "doi",        // doi | ext-link | object-id
  value: "10.1234/test",
  displayValue: "10.1234/test",
  href: "",
  attributes: {}
}
```

The resolver delegates text classification to `getLinkTypeFromText()` and client/DTD output selection to the existing link rules. For existing DOM, explicit `pub-id-type` / `ext-link-type` / `object-id` semantics are retained. Active text is preferred; `xlink:href` or `href` is used when a leaf contains only tracked deletion text. Numeric text is treated as PMID only when `expectedType` or the existing element identifies the PMID slot.

## Main Helper

```js
hyperLinkDialog.getLinkTypeFromText(text, context, options)
```

### Parameters

| Parameter | Type | Example | Purpose |
|---|---|---|---|
| `text` | `string` | `"https://example.com"` | URL, DOI, or email text to classify. |
| `context` | `"body"` / `"reference"` / `boolean` | `"reference"` | Area where the link is used. `true` is treated like reference. |
| `options` | `Object` | `{ isUpdate: true }` | Extra options passed into `buildLinkAttributes()`. |

### Return

```js
{
  type: "body-url",
  attributes: {}
}
```

`type` can be:

| Type | Meaning |
|---|---|
| `body-url` | Normal URL used in article body. |
| `reference-url` | Normal URL used inside reference. |
| `doi-full` | Full DOI URL inside reference, like `https://doi.org/...`. |
| `doi-partial` | DOI value without URL prefix, like `10.1234/test`. |
| `email` | Email address. |

## Input And Output Examples

### Body URL

```js
hyperLinkDialog.getLinkTypeFromText("https://example.com/article", "body");
```

Output:

```js
{
  type: "body-url",
  attributes: {
    "data-name": "ext-link",
    class: "ext-link",
    "ext-link-type": "uri",
    "xlink:href": "https://example.com/article",
    "data-link": "new",
    "data-track-code": "link-01"
  }
}
```

### Reference URL

```js
hyperLinkDialog.getLinkTypeFromText("https://example.com/article", "reference");
```

Output:

```js
{
  type: "reference-url",
  attributes: {
    "data-name": "ext-link",
    class: "ext-link",
    "ext-link-type": "uri",
    "xlink:href": "https://example.com/article",
    "data-link": "new",
    "data-track-code": "link-01"
  }
}
```

### Full DOI In Body

```js
hyperLinkDialog.getLinkTypeFromText("https://doi.org/10.1234/test", "body");
```

Output:

```js
{
  type: "body-url",
  attributes: {
    "data-name": "ext-link",
    class: "ext-link",
    "ext-link-type": "uri",
    "xlink:href": "https://doi.org/10.1234/test",
    "data-link": "new",
    "data-track-code": "link-01"
  }
}
```

### Full DOI In Reference

```js
hyperLinkDialog.getLinkTypeFromText("https://doi.org/10.1234/test", "reference");
```

Output:

```js
{
  type: "doi-full",
  attributes: {
    "data-name": "ext-link",
    class: "ext-link",
    "ext-link-type": "uri",
    "xlink:href": "https://doi.org/10.1234/test",
    "data-link": "new",
    "data-track-code": "link-01"
  }
}
```

### Partial DOI

```js
hyperLinkDialog.getLinkTypeFromText("10.1234/test", "reference");
```

Output:

```js
{
  type: "doi-partial",
  attributes: {
    "data-name": "pub-id",
    class: "pub-id",
    "pub-id-type": "doi",
    "data-link": "new",
    "data-track-code": "link-01"
  }
}
```

Note: `doi-partial` does not add `xlink:href`.

### Email

```js
hyperLinkDialog.getLinkTypeFromText("user@example.com", "body");
```

Output:

```js
{
  type: "email",
  attributes: {
    "data-name": "email",
    class: "email",
    "xlink:href": "user@example.com",
    "data-link": "new",
    "data-track-code": "link-01"
  }
}
```

### Update Mode

```js
hyperLinkDialog.getLinkTypeFromText("https://example.com/article", "reference", {
  isUpdate: true
});
```

Output:

```js
{
  type: "reference-url",
  attributes: {
    "data-name": "ext-link",
    class: "ext-link",
    "ext-link-type": "uri",
    "xlink:href": "https://example.com/article",
    "data-link": "edit",
    "data-track-code": "link-02"
  }
}
```

In update mode, `buildLinkAttributes()` skips `dt`, `drn`, and `du`. It keeps only `wsc_i_e` from `commonMethods.Default.getAttributes()`.

## Related Functions

### `buildLinkAttributes(linkData, options)`

Builds the final attributes object.

Scope:

- Gets the client code.
- Resolves the semantic link type.
- Reads client-specific attrs from `REFERENCE_ELEMENTS`.
- Adds `xlink:href` except for `doi-partial`.
- Adds `data-link` as `new` or `edit`.
- Adds `data-track-code` as `link-01` or `link-02`.
- Adds default tracking attrs from `commonMethods.Default.getAttributes()`.

### `getRefElemConfig(type, client)`

Returns the configured attrs for a semantic type and client.

Example:

```js
HyperlinkDialogModule.getRefElemConfig("doi-partial", "DEFAULT");
```

Output:

```js
{
  "data-name": "pub-id",
  class: "pub-id",
  "pub-id-type": "doi"
}
```

### `REFERENCE_ELEMENTS`

Single source for client-specific link rules.

Each type can contain:

```js
{
  attrs: {},
  builder: value => ""
}
```

- `attrs` is used by `buildLinkAttributes()`.
- `builder` is used by `createReferenceElement()`.

## Ref Form Usage

Reference code must use the shared adapter in `reference/link_adapter.js`; it must not classify DOI, URL, `pub-id`, or PMID again.

```js
const descriptor = resolveReferenceLinkField({
  value: TAR_VAL,
  expectedType: "doi",
  mode: "preview",
  isUpdate: !is_new_item,
  isJournal: true
}, {
  hyperlinkDialog: hyperLinkDialog
});
```

`ref_bridge` builds the leaf strictly from `descriptor.displayValue`, `descriptor.href`, and `descriptor.attributes`. Style order, tracking, delimiters, and orphan placement remain reference responsibilities.

