# Admin UI Implementation Plan

## Task 1: Backend Auth Updates
1. **Remove the backdoor:** Remove `PUT /api/auth/role` from `server/src/auth.js` entirely. This removes the ability for users to arbitrarily change their roles.
2. **Setup Status:** Add `GET /api/auth/setup` returning `{ requiresSetup: userCount === 0 }`.
3. **Restrict Registration:** Update `POST /api/auth/register`. If `userCount === 0`, allow anyone to register (as a `GameMaster`). If `userCount > 0`, require the requester to be an authenticated `GameMaster` (use `requireGM(db)` middleware or logic) and allow specifying the `role` (defaulting to `Player`).
4. **User Management Endpoints:**
   - Add `GET /api/auth/users` (requires GM) returning a list of all users (`id`, `username`, `role`).
   - Add `DELETE /api/auth/users/:id` (requires GM) to delete a user.
   - Add `PUT /api/auth/users/:id/password` (requires GM) to update a user's password.

## Task 2: Frontend Login & NavBar Updates
1. **Login View (`client/src/views/LoginView.vue`):**
   - On mount, fetch `/api/auth/setup`.
   - If `requiresSetup` is true, force `isRegister = true` and hide the "Already have an account?" toggle.
   - If `requiresSetup` is false, force `isRegister = false` and hide the "Don't have an account?" toggle so new users cannot self-register.
2. **NavBar (`client/src/components/NavBar.vue`):**
   - Remove the `@click="toggleRole"` event and the `switchRole` logic. The role badge should just be a static indicator.
3. **Auth Store (`client/src/stores/auth.js`):**
   - Remove `switchRole` action.

## Task 3: Admin View
1. **Create `client/src/views/AdminView.vue`:**
   - Add a form to create new users (Username, Password, Role).
   - Display a table of existing users (Username, Role) with a "Delete" button (don't allow deleting the last GM).
2. **Routing & Navigation:**
   - Add `/dashboard/admin` to `client/src/router.js`.
   - In `client/src/views/DashboardView.vue`, add an "Admin" tab (e.g. `icon: '⚙️'`) that only renders if `auth.user?.role === 'GameMaster'`.
