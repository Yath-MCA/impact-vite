import { applyDocumentHead } from '../../src/shared/documentHead.js';
import { applyPageBranding } from '../../src/shared/pageBranding.js';

const config = {
  id: 'harness',
  title: 'Harness Title',
  description: 'Harness desc',
  keywords: 'harness',
  favicon: '/favicon.svg',
  appleTouchIcon: '/favicon.svg',
  productName: 'IMPACT',
  logos: { header: '/favicon.svg' },
};

applyDocumentHead(config);
applyPageBranding(document.getElementById('root'), config);
