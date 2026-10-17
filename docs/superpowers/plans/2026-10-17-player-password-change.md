# Player Self-Service Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authenticated players and GameMasters to change their own account password from the top navigation bar with current password verification.

**Architecture:** A dedicated authenticated backend endpoint (`PUT /api/auth/password`) verifies the user's current password via bcrypt and updates the password hash in SQLite. The frontend exposes this through a Pinia store action (`auth.changePassword`), a sci-fi modal component (`ChangePasswordModal.vue`), and a navigation bar action (`NavBar.vue`).

**Tech Stack:** Node.js, Express, SQLite (`better-sqlite3`), bcrypt, Vue 3, Pinia, Vitest.

## Global Constraints

- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Server tests: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Client tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"`
- Client build: `docker exec sf-vtt-dev bash -c "cd client && npm run build"`
- Endpoint `PUT /api/auth/password` requires an active session (`req.session.userId`), returning `401 { error: 'Not authenticated' }` if missing.
- Input validation: `currentPassword` and `newPassword` required (400), `newPassword.length >= 6` required (400).
- Incorrect `currentPassword` returns `401 { error: 'Current password is incorrect' }`.
- Administrative GM endpoint `PUT /api/auth/users/:id/password` remains unchanged for administrative resets.

---

### Task 1: Backend `PUT /api/auth/password` Endpoint & Comprehensive Tests

**Files:**
- Modify: `server/src/auth.js:145-170`
- Test: `server/test/auth.test.js`

**Interfaces:**
- Produces:
  - `PUT /api/auth/password`: `{ currentPassword: string, newPassword: string }` -> `200 { ok: true, message: 'Password updated successfully' }`

- [ ] **Step 1: Write failing unit tests in `server/test/auth.test.js`**

Add tests to `server/test/auth.test.js` under a new or existing describe block:
1. `PUT /api/auth/password` returns 401 when unauthenticated.
2. `PUT /api/auth/password` returns 400 when missing `currentPassword` or `newPassword`.
3. `PUT /api/auth/password` returns 400 when `newPassword` is shorter than 6 characters.
4. `PUT /api/auth/password` returns 401 when `currentPassword` is incorrect.
5. `PUT /api/auth/password` returns 200 on valid credentials for a Player, and verifies subsequent login succeeds with the new password and fails with the old password.
6. `PUT /api/auth/password` returns 200 on valid credentials for a GameMaster.

- [ ] **Step 2: Run test to verify failure**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/auth.test.js"`
Expected: FAIL (route `/api/auth/password` not found or 404).

- [ ] **Step 3: Implement `PUT /api/auth/password` in `server/src/auth.js`**

Implement route before `return router;`:
```javascript
router.put('/password', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.session.userId);
    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/auth.test.js"`
Expected: PASS.

- [ ] **Step 5: Run full server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (all 145+ tests pass).

- [ ] **Step 6: Commit**

```bash
git add server/src/auth.js server/test/auth.test.js
git commit -m "feat(auth): add PUT /api/auth/password self-service endpoint with current password verification"
```

---

### Task 2: Frontend Auth Store, `ChangePasswordModal.vue`, & `NavBar.vue` Integration

**Files:**
- Modify: `client/src/stores/auth.js`
- Create: `client/src/components/ChangePasswordModal.vue`
- Modify: `client/src/components/NavBar.vue`
- Create: `client/test/ChangePasswordModal.test.js`
- Modify: `client/test/NavBar.test.js`

**Interfaces:**
- Consumes:
  - `PUT /api/auth/password`
- Produces:
  - `authStore.changePassword(currentPassword, newPassword): Promise<Object>`
  - `<ChangePasswordModal @close="..." />`

- [ ] **Step 1: Write failing unit tests in `client/test/ChangePasswordModal.test.js` and update `client/test/NavBar.test.js`**

Create `client/test/ChangePasswordModal.test.js`:
1. Renders dialog with fields: Current Password, New Password, Confirm New Password, Submit button, Cancel button.
2. Validates client-side minimum length (< 6 characters shows error without calling API).
3. Validates client-side confirmation mismatch (shows error without calling API).
4. Submits valid payload to `authStore.changePassword` and emits `close` on success.
5. Displays API error message when `authStore.changePassword` rejects.

Update `client/test/NavBar.test.js`:
1. Renders `🔑 Password` button when user is authenticated.
2. Clicking `🔑 Password` opens `ChangePasswordModal`.

- [ ] **Step 2: Run test to verify failure**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ChangePasswordModal.test.js"`
Expected: FAIL (`ChangePasswordModal.vue` does not exist).

- [ ] **Step 3: Update `client/src/stores/auth.js`**

Add `changePassword` action:
```javascript
async function changePassword(currentPassword, newPassword) {
  const res = await fetch('/api/auth/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update password');
  }
  return data;
}
```
Expose `changePassword` in returned store object.

- [ ] **Step 4: Create `client/src/components/ChangePasswordModal.vue`**

Implement modal dialog:
- `<div class="modal-backdrop" @click.self="$emit('close')">`
- Accessible dialog attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="change-password-title"`.
- Keyboard listener for `Escape` to emit `close`.
- Form inputs: `currentPassword`, `newPassword`, `confirmPassword`.
- Client validations before submit:
  - Both passwords required.
  - `newPassword.length >= 6`.
  - `newPassword === confirmPassword`.
- Reactive alerts: error banner (red) and success banner (green).
- Submitting state: `:disabled="submitting"` on inputs and buttons.
- On success: show success banner, wait 1200ms, emit `close`.
- Styling: dark sci-fi theme consistent with existing modals.

- [ ] **Step 5: Integrate modal into `client/src/components/NavBar.vue`**

- Import `ref` and `ChangePasswordModal`.
- State: `const showPasswordModal = ref(false)`.
- In `.navbar-user`:
  ```html
  <button
    v-if="auth.isAuthenticated"
    class="change-password-btn"
    title="Change your password"
    @click="showPasswordModal = true"
  >
    🔑 Password
  </button>
  ```
- Mount `<ChangePasswordModal v-if="showPasswordModal" @close="showPasswordModal = false" />`.
- Style `.change-password-btn` to match navbar aesthetic (clean teal border, dark background, hover glow).

- [ ] **Step 6: Run tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ChangePasswordModal.test.js test/NavBar.test.js"`
Expected: PASS.

- [ ] **Step 7: Run full client suite and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (all tests green, production build succeeds).

- [ ] **Step 8: Commit**

```bash
git add client/src/stores/auth.js client/src/components/ChangePasswordModal.vue client/src/components/NavBar.vue client/test/ChangePasswordModal.test.js client/test/NavBar.test.js
git commit -m "feat(auth): add ChangePasswordModal and navbar integration for self-service password change"
```
