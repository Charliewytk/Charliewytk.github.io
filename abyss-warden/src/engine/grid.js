// Uniform spatial grid for fast circle queries (tower targeting, chain hops).
export class SpatialGrid {
  constructor(cell = 80) {
    this.cell = cell;
    this.map = new Map();
  }

  rebuild(items) {
    this.map.clear();
    const c = this.cell;
    for (const it of items) {
      const k = Math.floor(it.x / c) + ',' + Math.floor(it.y / c);
      let bucket = this.map.get(k);
      if (!bucket) this.map.set(k, bucket = []);
      bucket.push(it);
    }
  }

  // Fills `out` with items within radius r of (x, y). Returns out.
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    const r2 = r * r;
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const bucket = this.map.get(gx + ',' + gy);
        if (!bucket) continue;
        for (const it of bucket) {
          const dx = it.x - x, dy = it.y - y;
          if (dx * dx + dy * dy <= r2) out.push(it);
        }
      }
    }
    return out;
  }
}
