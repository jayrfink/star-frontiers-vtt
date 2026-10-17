<template>
  <div class="modal-backdrop" @click.self="handleClose">
    <div
      class="modal-card change-password-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div class="modal-header">
        <h3 id="change-password-title" class="modal-title">Change Password</h3>
        <button
          type="button"
          class="btn-close"
          title="Close dialog"
          :disabled="submitting"
          @click="handleClose"
        >
          ✕
        </button>
      </div>

      <form class="modal-body" @submit.prevent="handleSubmit">
        <div v-if="error" class="error-banner" role="alert">
          {{ error }}
        </div>
        <div v-if="success" class="success-banner" role="alert">
          {{ success }}
        </div>

        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            placeholder="Enter current password"
            required
            :disabled="submitting"
          />
        </div>

        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input
            id="newPassword"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="At least 6 characters"
            required
            minlength="6"
            :disabled="submitting"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Re-enter new password"
            required
            :disabled="submitting"
          />
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-cancel"
            :disabled="submitting"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn-submit"
            :disabled="submitting"
          >
            {{ submitting ? 'Updating...' : 'Change Password' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'ChangePasswordModal',
  props: {
    initialError: {
      type: String,
      default: '',
    },
    initialSuccess: {
      type: String,
      default: '',
    },
  },
  emits: ['close'],
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      submitting: false,
      error: this.initialError || '',
      success: this.initialSuccess || '',
      successTimer: null,
    };
  },
  mounted() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeydown);
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeydown);
    }
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }
  },
  methods: {
    handleKeydown(e) {
      if (e.key === 'Escape' && !this.submitting) {
        this.handleClose();
      }
    },
    handleClose() {
      if (this.submitting) return;
      this.$emit('close');
    },
    validate() {
      if (!this.currentPassword) {
        this.error = 'Current password is required.';
        return false;
      }
      if (!this.newPassword) {
        this.error = 'New password is required.';
        return false;
      }
      if (this.newPassword.length < 6) {
        this.error = 'New password must be at least 6 characters long.';
        return false;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.error = 'New passwords do not match.';
        return false;
      }
      this.error = '';
      return true;
    },
    async handleSubmit() {
      if (!this.validate()) {
        return;
      }
      this.error = '';
      this.success = '';
      this.submitting = true;
      try {
        const auth = useAuthStore();
        const res = await auth.changePassword(this.currentPassword, this.newPassword);
        this.success = res?.message || 'Password updated successfully';
        this.successTimer = setTimeout(() => {
          this.$emit('close');
        }, 1200);
      } catch (err) {
        this.error = err.message || 'Failed to update password';
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  background: #0d1520;
  border: 1px solid teal;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 128, 128, 0.35);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: rgba(0, 128, 128, 0.15);
  border-bottom: 1px solid rgba(0, 128, 128, 0.3);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #00ffff;
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.btn-close {
  background: none;
  border: none;
  color: #8fa0b5;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 2px 6px;
  transition: color 0.15s;
}

.btn-close:hover:not(:disabled) {
  color: #00ffff;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.form-group input {
  background: #050b14;
  border: 1px solid #1e293b;
  border-radius: 4px;
  color: #f1f5f9;
  font-size: 14px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-group input:focus {
  border-color: teal;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.5);
}

.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #fca5a5;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 4px;
}

.success-banner {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
  color: #6ee7b7;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover:not(:disabled) {
  border-color: #64748b;
  color: #f1f5f9;
}

.btn-submit {
  background: #000000;
  border: 1px solid teal;
  color: #00ffff;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-submit:hover:not(:disabled) {
  background: #051414;
  border-color: #00a8a8;
  box-shadow: 0 0 10px rgba(0, 128, 128, 0.5);
}

.btn-submit:disabled,
.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
