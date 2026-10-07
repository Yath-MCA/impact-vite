import { devLog } from '../../shared/utils/devLogger';

export function isJournalDocument(docData) {
  const dtd = String(docData?.dtd || '').toLowerCase();
  const type = String(docData?.type || '').toLowerCase();

  if (dtd.includes('jats') || type.includes('journal')) return true;
  if (dtd.includes('book') || type.includes('book')) return false;

  return Boolean(docData?.journaltitle && !docData?.booktitle);
}

export function getPublicationTitleLabel(docData) {
  return isJournalDocument(docData) ? 'Journal Title' : 'Book Title';
}

export function buildCoverImageUrl(coverName, clientName, bucketUrl) {
  devLog.log(coverName, clientName, bucketUrl);
  if (!coverName || !clientName) return null;
  return `${bucketUrl}_SUPPORT_FILES/${clientName.toUpperCase()}/cover/${coverName}.png`;
}
