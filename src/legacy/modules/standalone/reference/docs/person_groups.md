# Person groups — author / editor / translator

## CEG sources

From active style in `iREF_SCOPE.DOC` (e.g. CMS-18, ANNWEH):

```xml
<group name="author" first="‡ref_auSurname,‡ref_auGivenName,…" rest="…"/>
<trim name="author" count="4" after="1" insert="et al." style="‡ref_etal" delim=", "/>
<group name="editor" first="‡ref_edSurname,‡ref_edGivenName" …/>
```

| Group name | `person-group-type` | Payload key |
|------------|---------------------|-------------|
| author | `author` | `author[]` |
| editor | `editor` | `editor[]` |
| translator | `translator` | `translator[]` (when style defines group) |

## Trim / etal (MultiRef-compatible)

`getContributorTrim(refType, groupName)` → `{ count, after, insert, style, delim }`

`applyContributorTrim(people, trim, { forceEtal })`:

- If `people.length >= count` (or `forceEtal`): keep first `after` names, set `etalText = insert` (same as MultiRef `shouldUseEtal`)
- Et al span lives **inside** `person-group` (not as a sibling mixed leaf)

ANNWEH journal example: `count=6 after=1`. CMS-18: typically `count=4 after=1`.

## Bridge DOM

```
span.person-group[person-group-type=author|editor|translator]
  span.string-name > surname + given-names
  …
  span.etal   // when trimmed or forced
```

## UI

- Authors repeater always
- Collab (institution) text in author section when style order includes collab
- Editors when `refType === 'ed-book'` (or style has editor group)
- Translators: payload/`ref_bridge` ready when style has `group[name=translator]`; WIP repeater in phase 4
- Hint badge from trim: e.g. “Limit 4; showing 1 + et al.”

## Order-slot behavior

| Token in CEG order | When authors present |
|--------------------|----------------------|
| author (expanded) | One `person-group[author]` |
| etal | Delimiter placeholder if etal already inside group; else standalone leaf if value |
| collab | `.collab` leaf when value set |
