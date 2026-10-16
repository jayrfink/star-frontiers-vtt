import { useAuthStore } from '../stores/auth.js';

const STORAGE_PREFIX = 'sf_vtt_user_state_';
const memoryFallback = new Map();

function readRaw(key) {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
    return localStorage.getItem(key);
  }
  return memoryFallback.get(key) || null;
}

function writeRaw(key, value) {
  if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
    localStorage.setItem(key, value);
  } else {
    memoryFallback.set(key, value);
  }
}

export function clearUserStateMemory() {
  memoryFallback.clear();
}

export function getStorageKey(userId) {
  const id = userId !== undefined && userId !== null && userId !== '' ? userId : 'guest';
  return `${STORAGE_PREFIX}${id}`;
}

export function getSafeUserId() {
  try {
    const auth = useAuthStore();
    return auth?.user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
}

export function getUserState(userId, section, defaults = {}) {
  try {
    const raw = readRaw(getStorageKey(userId));
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...defaults };
    const sectionData = parsed[section];
    if (!sectionData || typeof sectionData !== 'object' || Array.isArray(sectionData)) return { ...defaults };
    return { ...defaults, ...sectionData };
  } catch (err) {
    console.error(`Failed to load user state for section "${section}":`, err);
    return { ...defaults };
  }
}

export function saveUserState(userId, section, partialState) {
  try {
    const key = getStorageKey(userId);
    const raw = readRaw(key);
    const parsed = raw ? JSON.parse(raw) : {};
    const root = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    const sectionData = root[section];
    const currentSection = sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData) ? sectionData : {};
    root[section] = { ...currentSection, ...partialState };
    writeRaw(key, JSON.stringify(root));
  } catch (err) {
    console.error(`Failed to save user state for section "${section}":`, err);
  }
}
