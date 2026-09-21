import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import RulebooksView from '../src/views/RulebooksView.vue';

describe('RulebooksView.vue', () => {
  const mockDocs = [
    {
      id: 'ad-basic-p1',
      bookId: 'ad-basic',
      bookTitle: 'Alpha Dawn Basic Game Rules',
      system: 'Alpha Dawn',
      page: 1,
      section: 'Page 1',
      content: 'Jason Fink (Order #53019877)\nSTAR FRONTIERS Science Fiction Game'
    },
    {
      id: 'ad-basic-p2',
      bookId: 'ad-basic',
      bookTitle: 'Alpha Dawn Basic Game Rules',
      system: 'Alpha Dawn',
      page: 2,
      section: 'Page 2',
      content: 'HISTORY\nThe Humans made contact with an inventive race of insect-like creatures called Vrusk.'
    },
    {
      id: 'kh-basic-p1',
      bookId: 'kh-basic',
      bookTitle: 'Knight Hawks Basic Rules',
      system: 'Knight Hawks',
      page: 1,
      section: 'Page 1',
      content: 'Knight Hawks space combat introduces tactical spaceship movement.'
    }
  ];

  async function renderView(props = {}) {
    const app = createSSRApp(RulebooksView, props);
    const html = await renderToString(app);
    return html;
  }

  describe('Default Tab (Quick Reference Tables)', () => {
    it('renders Quick Reference Tables view by default', async () => {
      const html = await renderView();

      // Top nav bar buttons
      expect(html).toContain('Quick Reference Tables');
      expect(html).toContain('PDF Rulebooks');

      // Quick reference tab is active
      expect(html).toMatch(/class="[^"]*(active\s+mode-btn|mode-btn\s+active)[^"]*"[^>]*>\s*Quick Reference Tables/);

      // Renders QuickReferenceTables component content
      expect(html).toContain('Ship-to-Ship Combat');
      expect(html).toContain('Ranged Weapon Combat');
      expect(html).toContain('Melee Combat');

      // Old raw text reader markup is completely removed
      expect(html).not.toContain('empty-reader');
      expect(html).not.toContain('reader-pane');
      expect(html).not.toContain('Text Reader');
    });
  });

  describe('PDF Rulebooks Tab', () => {
    it('renders sidebar filters, search box, and PDF iframe toolbar', async () => {
      const html = await renderView({ initialViewMode: 'pdf' });

      // Active button is PDF Rulebooks
      expect(html).toMatch(/class="[^"]*(active\s+mode-btn|mode-btn\s+active)[^"]*"[^>]*>\s*PDF Rulebooks/);

      // Sidebar filters
      expect(html).toContain('System:');
      expect(html).toContain('Book:');
      expect(html).toContain('All Systems');
      expect(html).toContain('Alpha Dawn');
      expect(html).toContain('Knight Hawks');

      // Search box placeholder
      expect(html).toContain('Search PDF rulebooks (e.g. Vrusk, Gyrojet, ADF)...');

      // PDF toolbar in right panel
      expect(html).toContain('Open in New Tab ↗');
      expect(html).toContain('← Prev');
      expect(html).toContain('Next →');

      // Default iframe points to ad-basic page 1
      expect(html).toContain('src="/api/rulebooks/pdf/ad-basic#page=1"');
    });

    it('renders iframe with custom initial book and page', async () => {
      const html = await renderView({
        initialViewMode: 'pdf',
        initialPdfBook: 'kh-basic',
        initialPdfPage: 12
      });

      expect(html).toContain('src="/api/rulebooks/pdf/kh-basic#page=12"');
      expect(html).toContain('href="/api/rulebooks/pdf/kh-basic#page=12"');
    });

    it('renders table of contents / page index when no search query is active', async () => {
      const html = await renderView({
        initialViewMode: 'pdf',
        initialDocs: mockDocs
      });

      expect(html).toContain('Alpha Dawn Basic Game Rules');
      expect(html).toContain('Knight Hawks Basic Rules');
      expect(html).toContain('Page 1');
      expect(html).toContain('Page 2');
      expect(html).toContain('HISTORY');
    });

    it('displays search results with highlighted terms when search query is entered', async () => {
      const html = await renderView({
        initialViewMode: 'pdf',
        initialDocs: mockDocs,
        initialSearch: 'Vrusk'
      });

      expect(html).toContain('Alpha Dawn Basic Game Rules');
      expect(html).toContain('p. 2');
      expect(html).toContain('<mark>Vrusk</mark>');
    });

    it('safely highlights multi-term searches without corrupting mark tags', async () => {
      const html = await renderView({
        initialViewMode: 'pdf',
        initialDocs: mockDocs,
        initialSearch: 'Humans mark'
      });

      expect(html).toContain('<mark>Humans</mark>');
      expect(html).not.toContain('<<mark>');
      expect(html).not.toContain('</mark></mark>');
    });

    it('displays no matching sections message when search yields nothing', async () => {
      const html = await renderView({
        initialViewMode: 'pdf',
        initialDocs: mockDocs,
        initialSearch: 'NonExistentQueryXYZ'
      });

      expect(html).toContain('No matching rulebook sections found.');
    });

    it('filters table of contents when a specific system is selected', async () => {
      const html = await renderView({
        initialViewMode: 'pdf',
        initialDocs: mockDocs,
        initialSystem: 'Knight Hawks'
      });

      expect(html).toContain('Knight Hawks Basic Rules');
      expect(html).not.toContain('Alpha Dawn Basic Game Rules');
    });

    it('filters table of contents when a specific book is selected', async () => {
      const html = await renderView({
        initialViewMode: 'pdf',
        initialDocs: mockDocs,
        initialBook: 'ad-basic'
      });

      expect(html).toContain('Page 1');
      expect(html).toContain('Page 2');
      expect(html).not.toContain('Knight Hawks space combat');
    });
  });
});
