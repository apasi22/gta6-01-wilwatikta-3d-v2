// Keyboard + mouse. `pressed` holds edge-triggered codes, consumed once per
// frame by the main loop.
export function makeInput() {
  const input = { keys: {}, pressed: {}, mouseDown: false, mouseClicked: false, mx: 0, my: 0 };
  const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];
  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!input.keys[e.code]) input.pressed[e.code] = true;
    input.keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { input.keys[e.code] = false; });
  window.addEventListener('blur', () => { input.keys = {}; input.mouseDown = false; });
  window.addEventListener('mousedown', (e) => {
    if (e.target && e.target.tagName === 'BUTTON') return;
    input.mouseDown = true; input.mouseClicked = true; input.mx = e.clientX; input.my = e.clientY;
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  window.addEventListener('mousemove', (e) => { input.mx = e.clientX; input.my = e.clientY; });
  window.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  input.postUpdate = () => { input.pressed = {}; input.mouseClicked = false; };
  input.axis = () => {
    const k = input.keys;
    const x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const y = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    return [x, y];
  };
  input.was = (code) => !!input.pressed[code];
  input.isDown = (code) => !!input.keys[code];
  return input;
}
