# Player Self-Service Password Change Design Specification

## Overview
This specification details the architecture, security mechanics, UI workflow, and testing strategy enabling authenticated users (both Players and GameMasters) to change their own passwords within Star Frontiers VTT.

---

## 1. Backend API & Security (`server/src/auth.js`)

### Endpoint: `PUT /api/auth/password`
- **Access Control**: Session-authenticated users only (`req.session.userId`). If unauthenticated, returns `401 { error: 'Not authenticated' }`.
- **Request Body**:
  ```json
  {
    "currentPassword": "string (required)",
    "newPassword": "string (required, min 6 characters)"
  }
  ```

### Processing Logic
1. **Input Validation**:
   - Check that `currentPassword` and `newPassword` are non-empty strings. If missing, return `400 { error: 'Current password and new password are required' }`.
   - Check that `newPassword.length >= 6`. If too short, return `400 { error: 'Password must be at least 6 characters' }`.
2. **Identity & Credential Verification**:
   - Query user record from SQLite: `SELECT id, password_hash FROM users WHERE id = ?` with `req.session.userId`.
   - If user record not found, return `404 { error: 'User not found' }`.
   - Verify current password using `await bcrypt.compare(currentPassword, user.password_hash)`.
   - If comparison fails, return `401 { error: 'Current password is incorrect' }`.
3. **Password Update**:
   - Hash `newPassword` using `await bcrypt.hash(newPassword, SALT_ROUNDS)`.
   - Update database: `UPDATE users SET password_hash = ? WHERE id = ?`.
   - Return `200 { ok: true, message: 'Password updated successfully' }`.
4. **Error Handling**:
   - Wrap in try/catch block returning `500 { error: 'Failed to update password' }` on unexpected database or hashing exceptions.

### Administrative Isolation
- The existing administrative endpoint `PUT /api/auth/users/:id/password` remains guarded by `requireGM(db)` and continues to serve GameMaster-driven resets without requiring the user's previous password.

---

## 2. Frontend Architecture & UI (`client/src/`)

### Pinia Auth Store (`client/src/stores/auth.js`)
- Expose `async function changePassword(currentPassword, newPassword)`:
  - Dispatches `PUT /api/auth/password` with `credentials: 'include'`.
  - On non-2xx status, extracts and throws `new Error(data.error || 'Failed to update password')`.
  - On success, returns `data`.

### Modal Dialog (`client/src/components/ChangePasswordModal.vue`)
- **Visual Presentation**:
  - Sci-fi themed modal dialog matching `StockAdversaryModal` and `ImageBrowserModal` (cyan borders, translucent backdrop, dark card).
  - Header: `🔑 Change Password`.
- **Form Controls**:
  - `Current Password`: `<input type="password" autocomplete="current-password" required />`
  - `New Password`: `<input type="password" autocomplete="new-password" required />`
  - `Confirm New Password`: `<input type="password" autocomplete="new-password" required />`
- **Validation & State Handling**:
  - Client-side validation: verifies `newPassword.length >= 6` and `newPassword === confirmPassword` before sending request.
  - Submitting state: disables inputs and submit button, displays loading feedback.
  - Inline error notice: displays server or validation error messages in red.
  - Inline success notice: displays green confirmation upon completion.
  - Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="change-password-title"`, Escape key dismiss.
  - Auto-close: waits 1.2s after success, resets input fields, and emits `close`.

### Navigation Bar Integration (`client/src/components/NavBar.vue`)
- In `.navbar-user`:
  - Renders a `🔑 Password` button adjacent to the `Logout` button for all authenticated users.
  - Mounts `<ChangePasswordModal v-if="showPasswordModal" @close="showPasswordModal = false" />`.

---

## 3. Automated Testing Strategy

### Backend Tests (`server/test/auth.test.js`)
1. Rejects unauthenticated requests with `401`.
2. Rejects missing `currentPassword` or `newPassword` with `400`.
3. Rejects `newPassword` with length < 6 with `400`.
4. Rejects incorrect `currentPassword` with `401`.
5. Successfully updates password for both Player and GameMaster roles with `200`.
6. Verifies that login succeeds with the new password and fails with the old password.

### Frontend Tests (`client/test/ChangePasswordModal.test.js` & `client/test/NavBar.test.js`)
1. `ChangePasswordModal.test.js`:
   - Form inputs and submit button rendering.
   - Rejects submission when password is shorter than 6 characters.
   - Rejects submission when confirmation password does not match.
   - Successful submission calls `authStore.changePassword` and emits `close`.
   - Renders error message on API failure.
2. `NavBar.test.js`:
   - Verifies the `🔑 Password` button renders when authenticated.
   - Clicking opens the `ChangePasswordModal`.
