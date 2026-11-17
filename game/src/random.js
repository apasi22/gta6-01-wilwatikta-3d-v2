// Seeded RNG (mulberry32): every generated thing in Wilwatikta is deterministic.
export function RNG(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(this.next() * n); },
    range(a, b) { return a + this.next() * (b - a); },
    pick(arr) { return arr[this.int(arr.length)]; },
    chance(p) { return this.next() < p; },
  };
}
