// Unified mouse + touch input. `toLogical` converts a point in CSS pixels
// (relative to the canvas) into the game's logical 1067×600 space, which lets
// the canvas fill the whole viewport while the play field stays centred.
export function attachInput(canvas, toLogical, handlers) {
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return toLogical(e.clientX - r.left, e.clientY - r.top);
  }
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const [x, y] = pos(e);
    handlers.down(x, y, e.pointerType);
  });
  canvas.addEventListener('pointermove', e => {
    const [x, y] = pos(e);
    handlers.move(x, y, e.pointerType);
  });
  canvas.addEventListener('pointerup', e => {
    const [x, y] = pos(e);
    handlers.up(x, y);
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}
