import { describe, expect, it } from 'vitest';
import {
  buildCoverImageUrl,
  getPublicationTitleLabel,
} from '../../src/pages/landing/landingDocumentInfo.js';

describe('landingDocumentInfo', () => {
  it('builds cover url', () => {
    expect(buildCoverImageUrl('c1', 'plos', 'http://bucket/')).toBe(
      'http://bucket/_SUPPORT_FILES/PLOS/cover/c1.png'
    );
  });

  it('labels journal vs book', () => {
    expect(getPublicationTitleLabel({ dtd: 'jats' })).toMatch(/journal/i);
    expect(getPublicationTitleLabel({ dtd: 'book' })).toMatch(/book/i);
  });
});
