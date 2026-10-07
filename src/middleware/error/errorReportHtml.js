/**
 * Error report HTML / CSV (impactweb ErrorReportRenderer parity).
 */

const STYLES = {
  table: 'width:100%; border-collapse: collapse;',
  header: 'background-color: #f2f2f2;',
  cell: 'border: 1px solid #ddd; padding: 4px;',
  errorText: 'color: red;',
  blueText: 'color: blue;',
  centered: 'text-align: center;'
};

function createCell(content, additionalStyles = '') {
  const style = `${STYLES.cell}${additionalStyles ? `; ${additionalStyles}` : ''}`;
  return `<td style="${style}">${content}</td>`;
}

function createHeaderCell(content) {
  return `<th style="${STYLES.cell}">${content}</th>`;
}

function createRow(cells) {
  return `<tr>${cells.join('')}</tr>`;
}

function buildTable(headerCells, rowsHtml) {
  return `
            <table class="error-report-table" style="${STYLES.table}">
                <thead>
                    <tr style="${STYLES.header}">
                        ${headerCells.map((cell) => createHeaderCell(cell)).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `.trim();
}

/** Same two intro paragraphs as mail HTML (GET_MAIL_TABLE_FORMAT). */
export const ERROR_REPORT_INTRO_HTML = [
  '<p>Dear Team,</p>',
  '<p>Sorry for the trouble. The file automatically sent to the Newgen Technical team for investigating the error. They will get back to you soon.</p>'
].join('');

/**
 * @param {{
 *   project?: string,
 *   docid?: string,
 *   userId?: string,
 *   userRole?: string
 * }} projectInfo
 * @param {{ version?: string, domain?: string }} meta
 */
export function renderProjectInfoTable(projectInfo = {}, meta = {}) {
  const headerCells = ['Project', 'User', 'Role', 'Version', 'Domain'];
  const rowCells = [
    createCell(`${projectInfo.project || ''}<br>${projectInfo.docid || ''}`),
    createCell(projectInfo.userId || ''),
    createCell(projectInfo.userRole || ''),
    createCell(meta.version || '', STYLES.blueText),
    createCell(meta.domain || '', STYLES.errorText)
  ];
  return buildTable(headerCells, createRow(rowCells));
}

/**
 * @param {Array<{
 *   moduleName: string,
 *   functionName: string,
 *   message: string,
 *   track?: string,
 *   repeatCount?: number,
 *   timestamp?: string
 * }>} errors
 */
export function renderErrorTable(errors = []) {
  const headerCells = [
    'Module',
    'Function',
    'Message',
    'Trace Order',
    'Repeat Count',
    'Timestamp'
  ];
  const rows = errors
    .map((error) =>
      createRow([
        createCell(error.moduleName),
        createCell(error.functionName),
        createCell(error.message, STYLES.errorText),
        createCell(error.track || '', STYLES.blueText),
        createCell(error.repeatCount ?? 1, STYLES.centered),
        createCell(error.timestamp || '')
      ])
    )
    .join('');
  return buildTable(headerCells, rows);
}

/**
 * Full report HTML, or false when there are no errors.
 * @returns {string|false}
 */
export function renderErrorReportTable(options = {}) {
  const {
    errors = [],
    projectInfo = {},
    version = '',
    domain = ''
  } = options;

  if (!errors.length) return false;

  const projectInfoTable = renderProjectInfoTable(projectInfo, { version, domain });
  const errorTable = renderErrorTable(errors);

  return `
            ${ERROR_REPORT_INTRO_HTML}
            ${projectInfoTable}
            <br>
            ${errorTable}
        `.trim();
}

const CSV_HEADERS = [
  'Timestamp',
  'Module',
  'Function',
  'Message',
  'Repeat Count',
  'Context',
  'Browser',
  'User ID'
];

/**
 * @param {Array<object>} errors
 * @returns {string}
 */
export function exportErrorReportCsv(errors = []) {
  const csvRows = errors.map((error) => [
    error.timestamp,
    error.moduleName,
    error.functionName,
    String(error.message || '').replace(/"/g, '""'),
    error.repeatCount,
    JSON.stringify(error.context || {}).replace(/"/g, '""'),
    JSON.stringify(error.browserInfo || {}).replace(/"/g, '""'),
    error.userId || ''
  ]);

  return [
    CSV_HEADERS.map((h) => `"${h}"`).join(','),
    ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(','))
  ].join('\n');
}
