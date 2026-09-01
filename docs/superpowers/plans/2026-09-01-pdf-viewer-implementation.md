# PDF Rulebook Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/rulebooks/pdf/:bookId` endpoint to stream PDF rulebooks and implement an embedded PDF viewer in `RulebooksView.vue`.

**Architecture:** Express route in `server/src/rulebooks.js` serves PDFs from `assets/rulebooks/`. Vue 3 `RulebooksView.vue` adds a mode toggle ([Text Reader] | [PDF Viewer]), iframe embedding with `#page=X` jump support, and direct new-tab PDF links.

**Tech Stack:** Node.js 20, Express, Vue 3, Vitest, Supertest

---

### Task 1: Server PDF Endpoint & Client PDF Viewer

**Files:**
- Modify: `server/src/rulebooks.js`
- Modify: `server/test/rulebooks.test.js`
- Modify: `client/src/views/RulebooksView.vue`

**Interfaces:**
- Produces: `GET /api/rulebooks/pdf/:bookId` returning `application/pdf`
- Modifies: `RulebooksView.vue` adding PDF viewer iframe, mode toggle, and jump to PDF page button.

- [ ] **Step 1: Add failing test for GET /api/rulebooks/pdf/:bookId**

Modify `server/test/rulebooks.test.js`:
```js
  it('serves PDF file inline when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

    const res = await agent.get('/api/rulebooks/pdf/ad-basic');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('returns 404 for invalid bookId', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

    const res = await agent.get('/api/rulebooks/pdf/invalid-book');
    expect(res.status).toBe(404);
  });
```

- [ ] **Step 2: Implement GET /api/rulebooks/pdf/:bookId in server/src/rulebooks.js**

```js
const BOOK_FILES = {
  'ad-basic': 'SF7007-AlphaDawn-Basic_Game_Rules.pdf',
  'ad-expanded': 'SF7007-AlphaDawn-Expanded_Game_Rules.pdf',
  'ad-volturnus': 'SF7007-AlphaDawn-Crash_on_Volturnus.pdf',
  'kh-basic': 'Star_Frontiers-7011-Knight_Hawks-Basic_Rules.pdf',
  'kh-expansion': 'Star_Frontiers-7011-Knight_Hawks-Expansion_Rules.pdf',
  'kh-mission': 'Star_Frontiers-7011-Knight_Hawks-Mission_Brief.pdf',
};

// Inside createRulebooksRouter:
router.get('/pdf/:bookId', requireAuth, (req, res) => {
  const fileName = BOOK_FILES[req.params.bookId];
  if (!fileName) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const filePath = path.join(__dirname, '../../assets/rulebooks', fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'PDF file missing' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  fs.createReadStream(filePath).pipe(res);
});
```

- [ ] **Step 3: Run server tests to verify they pass**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```

- [ ] **Step 4: Update RulebooksView.vue with PDF Viewer mode toggle and iframe**

Update `client/src/views/RulebooksView.vue` to add:
- View Mode Toggle (`viewMode = 'reader' | 'pdf'`)
- "View Original PDF" button in reader pane header
- In PDF mode: `<iframe>` pointing to `/api/rulebooks/pdf/:pdfBookId#page=:pdfPage`
- "Open in New Tab" link

- [ ] **Step 5: Verify client build**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm run build"
```

- [ ] **Step 6: Commit**

```bash
git add server/ client/
git commit -m "feat: add PDF rulebook streaming endpoint and embedded PDF viewer UI"
```
