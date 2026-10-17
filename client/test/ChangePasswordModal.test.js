import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import ChangePasswordModal from '../src/components/ChangePasswordModal.vue';
import { useAuthStore } from '../src/stores/auth.js';

describe('ChangePasswordModal.vue', () => {
  let pinia;
  let authStore;

  beforeEach(() => {
    vi.useFakeTimers();
    pinia = createPinia();
    setActivePinia(pinia);
    authStore = useAuthStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function renderModal(props = {}) {
    const app = createSSRApp(ChangePasswordModal, props);
    app.use(pinia);
    return await renderToString(app);
  }

  describe('UI Rendering & Accessibility', () => {
    it('renders accessible dialog with inputs and action buttons', async () => {
      const html = await renderModal();

      // Accessible dialog attributes
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="change-password-title"');

      // Title
      expect(html).toContain('id="change-password-title"');
      expect(html).toContain('Change Password');

      // Inputs: Current Password, New Password, Confirm New Password
      expect(html).toContain('id="currentPassword"');
      expect(html).toContain('autocomplete="current-password"');

      expect(html).toContain('id="newPassword"');
      expect(html).toContain('minlength="6"');
      expect(html).toContain('autocomplete="new-password"');

      expect(html).toContain('id="confirmPassword"');

      // Action buttons
      expect(html).toContain('btn-submit');
      expect(html).toContain('Change Password');
      expect(html).toContain('btn-cancel');
      expect(html).toContain('Cancel');
      expect(html).toContain('btn-close');
    });

    it('renders error and success banners when props/state are provided', async () => {
      const htmlError = await renderModal({ initialError: 'Invalid current credentials' });
      expect(htmlError).toContain('error-banner');
      expect(htmlError).toContain('Invalid current credentials');

      const htmlSuccess = await renderModal({ initialSuccess: 'Password updated successfully' });
      expect(htmlSuccess).toContain('success-banner');
      expect(htmlSuccess).toContain('Password updated successfully');
    });

    it('disables inputs, submit button, and cancel button when success is active', async () => {
      const html = await renderModal({ initialSuccess: 'Password updated successfully' });
      expect(html).toContain('success-banner');
      // Inputs should have disabled attribute
      expect(html).toMatch(/<input[^>]+id="currentPassword"[^>]*disabled/);
      expect(html).toMatch(/<input[^>]+id="newPassword"[^>]*disabled/);
      expect(html).toMatch(/<input[^>]+id="confirmPassword"[^>]*disabled/);
      // Action buttons should have disabled attribute
      expect(html).toMatch(/<button[^>]+class="btn-submit"[^>]*disabled/);
      expect(html).toMatch(/<button[^>]+class="btn-cancel"[^>]*disabled/);
      expect(html).toMatch(/<button[^>]+class="btn-close"[^>]*disabled/);
    });
  });

  describe('Client-side Validation & Submission Logic', () => {
    it('prevents submission if already submitting or if success is active', async () => {
      authStore.changePassword = vi.fn();

      const vm = {
        currentPassword: 'currentPass1',
        newPassword: 'validPassword123',
        confirmPassword: 'validPassword123',
        submitting: true,
        success: '',
        validate: vi.fn(),
        handleSubmit: ChangePasswordModal.methods.handleSubmit,
      };

      await vm.handleSubmit();
      expect(authStore.changePassword).not.toHaveBeenCalled();
      expect(vm.validate).not.toHaveBeenCalled();

      vm.submitting = false;
      vm.success = 'Password updated successfully';
      await vm.handleSubmit();
      expect(authStore.changePassword).not.toHaveBeenCalled();
      expect(vm.validate).not.toHaveBeenCalled();
    });

    it('validates client-side minimum length (< 6 characters shows error without calling API)', async () => {
      authStore.changePassword = vi.fn();

      const vm = {
        currentPassword: 'currentPass1',
        newPassword: '12345',
        confirmPassword: '12345',
        submitting: false,
        error: '',
        success: '',
        validate: ChangePasswordModal.methods.validate,
        handleSubmit: ChangePasswordModal.methods.handleSubmit,
        $emit: vi.fn(),
      };

      await vm.handleSubmit();

      expect(authStore.changePassword).not.toHaveBeenCalled();
      expect(vm.error).toMatch(/at least 6 characters/i);
    });

    it('validates client-side confirmation mismatch (shows error without calling API)', async () => {
      authStore.changePassword = vi.fn();

      const vm = {
        currentPassword: 'currentPass1',
        newPassword: 'validPassword123',
        confirmPassword: 'differentPassword456',
        submitting: false,
        error: '',
        success: '',
        validate: ChangePasswordModal.methods.validate,
        handleSubmit: ChangePasswordModal.methods.handleSubmit,
        $emit: vi.fn(),
      };

      await vm.handleSubmit();

      expect(authStore.changePassword).not.toHaveBeenCalled();
      expect(vm.error).toMatch(/passwords do not match/i);
    });

    it('validates that current password is required', async () => {
      authStore.changePassword = vi.fn();

      const vm = {
        currentPassword: '',
        newPassword: 'validPassword123',
        confirmPassword: 'validPassword123',
        submitting: false,
        error: '',
        success: '',
        validate: ChangePasswordModal.methods.validate,
        handleSubmit: ChangePasswordModal.methods.handleSubmit,
        $emit: vi.fn(),
      };

      await vm.handleSubmit();

      expect(authStore.changePassword).not.toHaveBeenCalled();
      expect(vm.error).toMatch(/current password is required/i);
    });

    it('submits valid payload to authStore.changePassword and emits close on success', async () => {
      authStore.changePassword = vi.fn().mockResolvedValue({
        success: true,
        message: 'Password updated successfully',
      });

      const emitSpy = vi.fn();
      const vm = {
        currentPassword: 'currentPass1',
        newPassword: 'newSecret456',
        confirmPassword: 'newSecret456',
        submitting: false,
        error: '',
        success: '',
        successTimer: null,
        validate: ChangePasswordModal.methods.validate,
        handleSubmit: ChangePasswordModal.methods.handleSubmit,
        $emit: emitSpy,
      };

      await vm.handleSubmit();

      expect(authStore.changePassword).toHaveBeenCalledWith('currentPass1', 'newSecret456');
      expect(vm.success).toMatch(/password updated successfully/i);
      expect(vm.error).toBe('');

      // Modal has not closed immediately
      expect(emitSpy).not.toHaveBeenCalled();

      // Fast forward 1200ms
      vi.advanceTimersByTime(1200);

      expect(emitSpy).toHaveBeenCalledWith('close');
    });

    it('displays API error message when authStore.changePassword rejects', async () => {
      authStore.changePassword = vi.fn().mockRejectedValue(
        new Error('Current password does not match')
      );

      const emitSpy = vi.fn();
      const vm = {
        currentPassword: 'wrongCurrent',
        newPassword: 'newSecret456',
        confirmPassword: 'newSecret456',
        submitting: false,
        error: '',
        success: '',
        successTimer: null,
        validate: ChangePasswordModal.methods.validate,
        handleSubmit: ChangePasswordModal.methods.handleSubmit,
        $emit: emitSpy,
      };

      await vm.handleSubmit();

      expect(authStore.changePassword).toHaveBeenCalledWith('wrongCurrent', 'newSecret456');
      expect(vm.error).toBe('Current password does not match');
      expect(vm.submitting).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('emits close on handleClose unless submitting', () => {
      const emitSpy = vi.fn();
      const vm = {
        submitting: false,
        $emit: emitSpy,
        handleClose: ChangePasswordModal.methods.handleClose,
      };

      vm.handleClose();
      expect(emitSpy).toHaveBeenCalledWith('close');

      emitSpy.mockClear();
      vm.submitting = true;
      vm.handleClose();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('emits close on Escape keydown unless submitting', () => {
      const emitSpy = vi.fn();
      const vm = {
        submitting: false,
        handleClose: vi.fn(),
        handleKeydown: ChangePasswordModal.methods.handleKeydown,
      };

      vm.handleKeydown({ key: 'Escape' });
      expect(vm.handleClose).toHaveBeenCalled();

      vm.handleClose.mockClear();
      vm.handleKeydown({ key: 'Enter' });
      expect(vm.handleClose).not.toHaveBeenCalled();

      vm.submitting = true;
      vm.handleKeydown({ key: 'Escape' });
      expect(vm.handleClose).not.toHaveBeenCalled();
    });
  });
});
