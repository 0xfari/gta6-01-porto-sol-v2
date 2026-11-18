// Porto Sol 2 — keyboard and mouse. Held keys steer; one-shot presses (steal,
// punch, shoot, pause, radio) queue as edge flags the loop takes exactly once.
export const ACT_ENTER = 1;    // E — steal / exit car or boat
export const ACT_PUNCH = 2;    // F — punch
export const ACT_PAUSE = 4;    // Esc / P
export const ACT_CONFIRM = 8;  // Space / Enter — menus
export const ACT_RADIO = 16;   // R — next radio station
export const ACT_SHOOT = 32;   // mouse click (taken from pointer state instead)

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false };
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  window.addEventListener('keydown', (event) => {
    const dir = MOVE_KEYS[event.code];
    if (dir) {
      held[dir] = true;
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (event.code === 'KeyE') actions |= ACT_ENTER;
    else if (event.code === 'KeyF') actions |= ACT_PUNCH;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACT_PAUSE;
    else if (event.code === 'Space' || event.code === 'Enter') actions |= ACT_CONFIRM;
    else if (event.code === 'KeyR') actions |= ACT_RADIO;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const dir = MOVE_KEYS[event.code];
    if (dir) held[dir] = false;
  });
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = false;
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    mouseClicked = true;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  return {
    held,
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    /** -1/0/1 per axis, from WASD or arrows. */
    axes() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const c = mouseClicked;
      mouseClicked = false;
      return c;
    },
    /** Test hook: pretend a key is held (used by the autopilot in shot scenes). */
    setHeld(dir, value) { held[dir] = value; },
  };
}
