import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Global Base Scrollbar Theme (main.css)', () => {
  const cssPath = path.resolve(__dirname, '../src/main.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines standard scrollbar-width and scrollbar-color on *', () => {
    expect(cssContent).toMatch(/scrollbar-width:\s*thin;/);
    expect(cssContent).toMatch(/scrollbar-color:\s*rgba\(0,\s*255,\s*255,\s*0\.3\)\s*#0d1117;/);
  });

  it('defines WebKit scrollbar dimensions', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar\s*\{[^}]*width:\s*8px;[^}]*height:\s*8px;/);
  });

  it('styles WebKit scrollbar track', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar-track\s*\{[^}]*background:\s*#0d1117;[^}]*border-radius:\s*4px;/);
  });

  it('styles WebKit scrollbar thumb with border-radius, background, and hover effects', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*rgba\(0,\s*255,\s*255,\s*0\.25\);/);
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*4px;/);
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb:hover\s*\{[^}]*background:\s*rgba\(0,\s*255,\s*255,\s*0\.5\);/);
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb:hover\s*\{[^}]*border-color:\s*#00ffff;/);
  });

  it('styles WebKit scrollbar corner', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar-corner\s*\{[^}]*background:\s*#0d1117;/);
  });
});

describe('Tactical Roll Log Scrollbars (RpgVttView.vue and SpaceVttView.vue)', () => {
  const views = [
    { name: 'RpgVttView.vue', path: path.resolve(__dirname, '../src/views/RpgVttView.vue') },
    { name: 'SpaceVttView.vue', path: path.resolve(__dirname, '../src/views/SpaceVttView.vue') }
  ];

  views.forEach(({ name, path: viewPath }) => {
    describe(name, () => {
      const content = fs.readFileSync(viewPath, 'utf-8');

      it('defines cyan scrollbar-width and scrollbar-color on .roll-log-body', () => {
        expect(content).toMatch(/\.roll-log-body\s*\{[^}]*scrollbar-width:\s*thin;/);
        expect(content).toMatch(/\.roll-log-body\s*\{[^}]*scrollbar-color:\s*rgba\(0,\s*255,\s*255,\s*0\.45\)\s*rgba\(5,\s*15,\s*20,\s*0\.8\);/);
      });

      it('defines WebKit scrollbar width on .roll-log-body', () => {
        expect(content).toMatch(/\.roll-log-body::-webkit-scrollbar\s*\{[^}]*width:\s*6px;/);
      });

      it('defines WebKit scrollbar track on .roll-log-body', () => {
        expect(content).toMatch(/\.roll-log-body::-webkit-scrollbar-track\s*\{[^}]*background:\s*rgba\(5,\s*15,\s*20,\s*0\.8\);[^}]*border-radius:\s*3px;/);
      });

      it('defines WebKit scrollbar thumb and hover styling on .roll-log-body', () => {
        expect(content).toMatch(/\.roll-log-body::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*rgba\(0,\s*255,\s*255,\s*0\.4\);[^}]*border:\s*1px\s*solid\s*rgba\(0,\s*255,\s*255,\s*0\.6\);[^}]*border-radius:\s*3px;/);
        expect(content).toMatch(/\.roll-log-body::-webkit-scrollbar-thumb:hover\s*\{[^}]*background:\s*#00ffff;[^}]*box-shadow:\s*0\s*0\s*8px\s*rgba\(0,\s*255,\s*255,\s*0\.6\);/);
      });
    });
  });
});

describe('GM Notes Scrollbars (GmNotesView.vue)', () => {
  const viewPath = path.resolve(__dirname, '../src/views/GmNotesView.vue');
  const content = fs.readFileSync(viewPath, 'utf-8');

  it('defines slate scrollbar-width and scrollbar-color for GM notes containers', () => {
    expect(content).toMatch(/\.session-list[\s\S]*?\.notes-workspace[\s\S]*?\.panel-content-textarea\s*\{[^}]*scrollbar-width:\s*thin;/);
    expect(content).toMatch(/\.session-list[\s\S]*?\.notes-workspace[\s\S]*?\.panel-content-textarea\s*\{[^}]*scrollbar-color:\s*#30363d\s*#161b22;/);
  });

  it('defines WebKit scrollbar dimensions for GM notes containers', () => {
    expect(content).toMatch(/\.session-list::-webkit-scrollbar[\s\S]*?\{[^}]*width:\s*8px;[^}]*height:\s*8px;/);
  });

  it('defines WebKit scrollbar track for GM notes containers', () => {
    expect(content).toMatch(/\.session-list::-webkit-scrollbar-track[\s\S]*?\{[^}]*background:\s*#161b22;[^}]*border-radius:\s*4px;/);
  });

  it('defines WebKit scrollbar thumb and hover styling for GM notes containers', () => {
    expect(content).toMatch(/\.session-list::-webkit-scrollbar-thumb[\s\S]*?\{[^}]*background:\s*#30363d;[^}]*border:\s*1px\s*solid\s*#3b434b;[^}]*border-radius:\s*4px;/);
    expect(content).toMatch(/\.session-list::-webkit-scrollbar-thumb:hover[\s\S]*?\{[^}]*background:\s*#484f58;[^}]*border-color:\s*#586069;/);
  });
});

describe('PDF Rulebooks & Quick Reference Scrollbars (RulebooksView.vue)', () => {
  const viewPath = path.resolve(__dirname, '../src/views/RulebooksView.vue');
  const content = fs.readFileSync(viewPath, 'utf-8');

  it('defines catalog scrollbar-width and scrollbar-color for Rulebooks containers', () => {
    expect(content).toMatch(/\.pdf-sidebar[\s\S]*?\.search-results-list[\s\S]*?\.toc-tree-list[\s\S]*?\.quickref-layout[\s\S]*?\{[^}]*scrollbar-width:\s*thin;/);
    expect(content).toMatch(/\.pdf-sidebar[\s\S]*?\.search-results-list[\s\S]*?\.toc-tree-list[\s\S]*?\.quickref-layout[\s\S]*?\{[^}]*scrollbar-color:\s*rgba\(58,\s*133,\s*156,\s*0\.5\)\s*#161b22;/);
  });

  it('defines WebKit scrollbar dimensions for Rulebooks containers', () => {
    expect(content).toMatch(/\.pdf-sidebar::-webkit-scrollbar[\s\S]*?\{[^}]*width:\s*8px;[^}]*height:\s*8px;/);
  });

  it('defines WebKit scrollbar track for Rulebooks containers', () => {
    expect(content).toMatch(/\.pdf-sidebar::-webkit-scrollbar-track[\s\S]*?\{[^}]*background:\s*#161b22;[^}]*border-radius:\s*4px;/);
  });

  it('defines WebKit scrollbar thumb and hover styling for Rulebooks containers', () => {
    expect(content).toMatch(/\.pdf-sidebar::-webkit-scrollbar-thumb[\s\S]*?\{[^}]*background:\s*rgba\(58,\s*133,\s*156,\s*0\.5\);[^}]*border:\s*1px\s*solid\s*rgba\(58,\s*133,\s*156,\s*0\.7\);[^}]*border-radius:\s*4px;/);
    expect(content).toMatch(/\.pdf-sidebar::-webkit-scrollbar-thumb:hover[\s\S]*?\{[^}]*background:\s*rgba\(78,\s*162,\s*187,\s*0\.8\);[^}]*border-color:\s*#4ea2bb;/);
  });
});

