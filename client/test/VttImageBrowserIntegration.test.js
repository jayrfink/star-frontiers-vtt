import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('VTT Views - ImageBrowserModal Template & Script Integration', () => {
  const spaceVttPath = resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgVttPath = resolve(__dirname, '../src/views/RpgVttView.vue');
  const spaceContent = readFileSync(spaceVttPath, 'utf-8');
  const rpgContent = readFileSync(rpgVttPath, 'utf-8');

  describe('SpaceVttView.vue', () => {
    it('imports ImageBrowserModal', () => {
      expect(spaceContent).toMatch(/import\s+ImageBrowserModal\s+from\s+['"]\.\.\/components\/ImageBrowserModal\.vue['"]/);
    });

    it('declares showImageBrowser reactive state', () => {
      expect(spaceContent).toMatch(/const\s+showImageBrowser\s*=\s*ref\(false\)/);
    });

    it('includes Browse Uploads button in Add Token modal', () => {
      expect(spaceContent).toContain('Browse Uploads');
      expect(spaceContent).toMatch(/@click=["']showImageBrowser\s*=\s*true["']/);
    });

    it('embeds ImageBrowserModal component with correct props and handlers', () => {
      expect(spaceContent).toMatch(/<ImageBrowserModal[\s\S]*?v-model="showImageBrowser"[\s\S]*?title="Select Token Image"[\s\S]*?:current-image="newTokenForm\.avatar_url"[\s\S]*?@select="onImageSelected"/);
    });

    it('defines onImageSelected handler setting newTokenForm.avatar_url', () => {
      expect(spaceContent).toMatch(/function\s+onImageSelected\s*\(\s*url\s*\)\s*\{[\s\S]*?newTokenForm\.avatar_url\s*=\s*url;?[\s\S]*?\}/);
    });
  });

  describe('RpgVttView.vue', () => {
    it('imports ImageBrowserModal', () => {
      expect(rpgContent).toMatch(/import\s+ImageBrowserModal\s+from\s+['"]\.\.\/components\/ImageBrowserModal\.vue['"]/);
    });

    it('declares showImageBrowser reactive state', () => {
      expect(rpgContent).toMatch(/const\s+showImageBrowser\s*=\s*ref\(false\)/);
    });

    it('includes Browse Uploads button in Add Token modal', () => {
      expect(rpgContent).toContain('Browse Uploads');
      expect(rpgContent).toMatch(/@click=["']showImageBrowser\s*=\s*true["']/);
    });

    it('embeds ImageBrowserModal component with correct props and handlers', () => {
      expect(rpgContent).toMatch(/<ImageBrowserModal[\s\S]*?v-model="showImageBrowser"[\s\S]*?title="Select Token Image"[\s\S]*?:current-image="newTokenForm\.avatar_url"[\s\S]*?@select="onImageSelected"/);
    });

    it('defines onImageSelected handler setting newTokenForm.avatar_url', () => {
      expect(rpgContent).toMatch(/function\s+onImageSelected\s*\(\s*url\s*\)\s*\{[\s\S]*?newTokenForm\.avatar_url\s*=\s*url;?[\s\S]*?\}/);
    });
  });
});
