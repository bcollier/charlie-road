// localStorage with an in-memory fallback. Some private-browsing modes throw
// on access rather than returning null, so every call is guarded and a run
// in such a window simply doesn't persist. See SPEC.md §5.9.

const PREFIX = 'charlie.';
const memory = new Map();

function store() {
  try {
    const s = window.localStorage;
    const probe = PREFIX + '__probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export const storage = {
  available: !!store(),

  get(key, fallback) {
    const k = PREFIX + key;
    try {
      const s = store();
      const raw = s ? s.getItem(k) : memory.get(k);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    const k = PREFIX + key;
    const raw = JSON.stringify(value);
    try {
      const s = store();
      if (s) s.setItem(k, raw); else memory.set(k, raw);
    } catch {
      memory.set(k, raw);
    }
  },
};
