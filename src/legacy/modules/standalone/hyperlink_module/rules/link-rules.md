# Link rules (generated)

Generated from link-rules.json — do not edit.

## DEFAULT

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

## DEFAULT_JOURNAL (overlay when isJournal)

  - doi-partial: pubId

## Clients

### INTELLECT

- dtd: JATS

#### Effective on JATS

  - body-url: uri
  - reference-url: uri
  - doi-full: extDoi
  - doi-partial: doiPartialExtDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### Effective on BITS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### House-style examples

- **body-url:** `<uri xlink:href="https://www.rai.tv">www.rai.tv</uri>`
- **reference-url:** `<uri xlink:href="https://nachdemfilm.de/issues/text/green-media">https://nachdemfilm.de/issues/text/green-media</uri>`
- **doi-full:** `<ext-link ext-link-type="doi" xlink:href="https://doi.org/10.6092/issn.2421-454X/10499">https://doi.org/10.6092/issn.2421-454X/10499</ext-link>`

### LSE

- dtd: BITS

#### Effective on JATS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### Effective on BITS

  - body-url: uri
  - reference-url: uri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

### LWW

- dtd: JATS

#### Effective on JATS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extUri
  - doi-partial: pubId
  - email: email
  - special-case: {"builder":"specialCase","journals":["GOX","PRS","XCS"]}

#### Effective on BITS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### House-style examples

- **body-url:** `<ext-link ext-link-type="uri" xlink:href="www.swissnoso.ch">www.swissnoso.ch</ext-link>`
- **reference-url:** `<ext-link ext-link-type="uri" xlink:href="https://wwwwhoint/news-room/fact-sheets/detail/burns">https://wwwwhoint/news-room/fact-sheets/detail/burns</ext-link>`
- **doi-full:** `<ext-link ext-link-type="uri" xlink:href="https://doi.org/10.1016/j.celrep.2023.112269">https://doi.org/10.1016/j.celrep.2023.112269</ext-link>`
- **doi-partial:** `<pub-id pub-id-type="doi">10.1152/physrev.00043.2008</pub-id>`
- **special-case:** `<?pub-id-doi xlink:href="10.1016/j.celrep.2023.112269"?> (journals GOX, PRS, XCS)`

### MEDKNOW

- dtd: JATS

#### Effective on JATS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extUri
  - doi-partial: pubId
  - email: email
  - special-case: {"builder":"specialCase"}

#### Effective on BITS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### House-style examples

- **body-url:** `<ext-link ext-link-type="uri" xlink:href="https://www.ncbi.nlm.nih.gov/books/NBK544242/">https://www.ncbi.nlm.nih.gov/books/NBK544242/</ext-link>`
- **reference-url:** `<ext-link ext-link-type="uri" xlink:href="https://www.ncbi.nlm.nih.gov/books/NBK544242/">https://www.ncbi.nlm.nih.gov/books/NBK544242/</ext-link>`
- **doi-full:** `<ext-link ext-link-type="uri" xlink:href="https://doi.org/10.1007/978-3-030-53868-2_10">https://doi.org/10.1007/978-3-030-53868-2_10</ext-link>`
- **doi-partial:** `<pub-id pub-id-type="doi">10.47070/ijapr.v11i2.2680</pub-id>`

### OHO

- dtd: BITS

#### Effective on JATS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### Effective on BITS

  - body-url: uri
  - reference-url: uri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

### OSO

- dtd: BITS

#### Effective on JATS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### Effective on BITS

  - body-url: uri
  - reference-url: uri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

### OXMEDO

- dtd: BITS

#### Effective on JATS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### Effective on BITS

  - body-url: uri
  - reference-url: uri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

### TNF

- dtd: BITS

#### Effective on JATS

  - body-url: extUri
  - reference-url: extUri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

#### Effective on BITS

  - body-url: uri
  - reference-url: uri
  - doi-full: extDoi
  - doi-partial: extDoi
  - email: email
  - special-case: {"builder":"specialCase"}

