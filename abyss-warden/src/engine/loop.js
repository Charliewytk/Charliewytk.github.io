// Fixed-timestep game loop (accumulator pattern). Update runs at exactly 60Hz,
// render runs once per animation frame.
export function createLoop(update, render) {
  const DT = 1 / 60;
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    let steps = 0;
    while (acc >= DT && steps < 8) {
      update(DT);
      acc -= DT;
      steps++;
    }
    if (steps === 8) acc = 0; // spiral-of-death guard
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
