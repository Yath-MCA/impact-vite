import errorTrackerStore from './errorTrackerStore.js';

function ErrorPanel({ moduleName, limit = 50 } = {}) {
  const html = errorTrackerStore.renderErrorReportTable({ moduleName, limit });
  if (!html) return null;

  return <div className="error-report-table" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default ErrorPanel;
