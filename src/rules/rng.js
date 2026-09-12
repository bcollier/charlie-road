// mulberry32: a tiny seeded PRNG. Same seed → same world, every time.
// Pure: no three.js, no DOM.

export function createRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const rng = {
    seed,
    /** Uniform float in [0, 1). */
    next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Uniform float in [lo, hi). */
    range(lo, hi) { return lo + (hi - lo) * rng.next(); },
    /** Uniform integer in [lo, hi] inclusive. */
    int(lo, hi) { return lo + Math.floor(rng.next() * (hi - lo + 1)); },
    /** True with probability p. */
    chance(p) { return rng.next() < p; },
    /** Pick one element. */
    pick(arr) { return arr[Math.floor(rng.next() * arr.length)]; },
    /** Weighted pick from { key: weight }. */
    weighted(weights) {
      let total = 0;
      for (const k in weights) total += weights[k];
      let r = rng.next() * total;
      for (const k in weights) { r -= weights[k]; if (r < 0) return k; }
      return Object.keys(weights).pop();
    },
  };
  return rng;
}
