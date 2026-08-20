// Lightweight particle system with a hard cap (oldest evicted first).
const TAU = Math.PI * 2;

export class Particles {
  constructor(max = 500) {
    this.items = [];
    this.max = max;
  }

  spawn(x, y, o = {}) {
    if (this.items.length >= this.max) this.items.shift();
    this.items.push({
      x, y,
      vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.5, t: 0,
      size: o.size || 2,
      color: o.color || '#8fe8ff',
      glow: !!o.glow,
      drag: o.drag != null ? o.drag : 0.92,
    });
  }

  burst(x, y, n, o = {}) {
    const speed = o.speed || 60;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.spawn(x, y, { ...o, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
  }

  update(dt) {
    const it = this.items;
    for (let i = it.length - 1; i >= 0; i--) {
      const p = it[i];
      p.t += dt;
      if (p.t >= p.life) { it.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.grav) p.vy += p.grav * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      const a = Math.max(0, 1 - p.t / p.life);
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
