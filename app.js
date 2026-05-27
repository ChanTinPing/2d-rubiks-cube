const COLORS = {
  U: "#f7d843",
  D: "#fffdf6",
  F: "#26b95f",
  B: "#2867dc",
  R: "#e73838",
  L: "#ff8a24",
};

const FACE_INFO = {
  U: { axis: "y", sign: 1, label: "U" },
  D: { axis: "y", sign: -1, label: "D" },
  F: { axis: "z", sign: 1, label: "F" },
  B: { axis: "z", sign: -1, label: "B" },
  R: { axis: "x", sign: 1, label: "R" },
  L: { axis: "x", sign: -1, label: "L" },
};

const FACE_LAYOUT = {
  U: { x: 410, y: 70 },
  L: { x: 190, y: 290 },
  F: { x: 410, y: 290 },
  R: { x: 630, y: 290 },
  B: { x: 850, y: 290 },
  D: { x: 410, y: 510 },
};

const FACE_ORDER = ["U", "L", "F", "R", "B", "D"];
const SIZE = 174;
const GAP = SIZE / 3;
const CENTER_OFFSET = GAP / 2;
const MOVE_KEYS = new Set(["U", "D", "L", "R", "F", "B"]);

const cube2d = document.querySelector("#cube2d");
const cube3d = document.querySelector("#cube3d");
const statusText = document.querySelector("#statusText");
const moveCount = document.querySelector("#moveCount");
const historyList = document.querySelector("#historyList");
const scrambleButton = document.querySelector("#scrambleButton");
const resetButton = document.querySelector("#resetButton");
const undoButton = document.querySelector("#undoButton");
const scrambleRange = document.querySelector("#scrambleRange");
const scrambleValue = document.querySelector("#scrambleValue");
const animationToggle = document.querySelector("#animationToggle");

let stickers = createSolvedCube();
let selectedTurn = 1;
let history = [];
let undoStack = [];
let isAnimating = false;

function createSolvedCube() {
  const result = [];
  const coords = [-1, 0, 1];

  coords.forEach((x) => {
    coords.forEach((z) => {
      result.push({ color: "U", pos: { x, y: 1, z }, normal: { x: 0, y: 1, z: 0 } });
      result.push({ color: "D", pos: { x, y: -1, z }, normal: { x: 0, y: -1, z: 0 } });
    });
  });

  coords.forEach((x) => {
    coords.forEach((y) => {
      result.push({ color: "F", pos: { x, y, z: 1 }, normal: { x: 0, y: 0, z: 1 } });
      result.push({ color: "B", pos: { x, y, z: -1 }, normal: { x: 0, y: 0, z: -1 } });
    });
  });

  coords.forEach((z) => {
    coords.forEach((y) => {
      result.push({ color: "R", pos: { x: 1, y, z }, normal: { x: 1, y: 0, z: 0 } });
      result.push({ color: "L", pos: { x: -1, y, z }, normal: { x: -1, y: 0, z: 0 } });
    });
  });

  return result;
}

function cloneSticker(sticker) {
  return {
    color: sticker.color,
    pos: { ...sticker.pos },
    normal: { ...sticker.normal },
  };
}

function rotateVector(vector, axis, turns) {
  const normalized = ((turns % 4) + 4) % 4;
  let { x, y, z } = vector;

  for (let i = 0; i < normalized; i += 1) {
    if (axis === "x") {
      [y, z] = [-z, y];
    } else if (axis === "y") {
      [x, z] = [z, -x];
    } else {
      [x, y] = [-y, x];
    }
  }

  return { x, y, z };
}

function applyMove(face, amount = 1, options = {}) {
  if (isAnimating && !options.force) return;

  const info = FACE_INFO[face];
  const positiveAxisTurns = -amount * info.sign;
  undoStack.push(stickers.map(cloneSticker));

  stickers = stickers.map((sticker) => {
    if (sticker.pos[info.axis] !== info.sign) return sticker;
    return {
      color: sticker.color,
      pos: rotateVector(sticker.pos, info.axis, positiveAxisTurns),
      normal: rotateVector(sticker.normal, info.axis, positiveAxisTurns),
    };
  });

  if (!options.silent) {
    history.push(formatMove(face, amount));
  }

  render(options.animate !== false && animationToggle.checked);
}

function formatMove(face, amount) {
  if (amount === -1) return `${face}'`;
  if (Math.abs(amount) === 2) return `${face}2`;
  return face;
}

function stickerSlot(sticker) {
  const { pos, normal } = sticker;

  if (normal.y === 1) return { face: "U", row: pos.z + 1, col: pos.x + 1 };
  if (normal.y === -1) return { face: "D", row: 1 - pos.z, col: pos.x + 1 };
  if (normal.z === 1) return { face: "F", row: 1 - pos.y, col: pos.x + 1 };
  if (normal.z === -1) return { face: "B", row: 1 - pos.y, col: 1 - pos.x };
  if (normal.x === 1) return { face: "R", row: 1 - pos.y, col: 1 - pos.z };
  return { face: "L", row: 1 - pos.y, col: pos.z + 1 };
}

function currentFacelets() {
  const facelets = {};
  FACE_ORDER.forEach((face) => {
    facelets[face] = Array.from({ length: 3 }, () => Array(3).fill(face));
  });

  stickers.forEach((sticker) => {
    const slot = stickerSlot(sticker);
    facelets[slot.face][slot.row][slot.col] = sticker.color;
  });

  return facelets;
}

function isSolved(facelets) {
  return FACE_ORDER.every((face) => {
    const center = facelets[face][1][1];
    return facelets[face].every((row) => row.every((color) => color === center));
  });
}

function svgEl(tag, attributes = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function render(animate = false) {
  const facelets = currentFacelets();
  render2D(facelets, animate);
  render3D(facelets);
  renderStatus(facelets);
  renderHistory();
}

function render2D(facelets, animate) {
  cube2d.innerHTML = "";

  drawNetLines();
  FACE_ORDER.forEach((face) => drawFace(face, facelets[face]));

  if (animate) {
    isAnimating = true;
    cube2d.classList.add("is-animating");
    window.setTimeout(() => {
      cube2d.classList.remove("is-animating");
      isAnimating = false;
    }, 170);
  }
}

function drawNetLines() {
  const paths = [
    "M497 244 C498 202 498 176 497 158",
    "M410 377 C360 376 310 376 278 377",
    "M584 377 C621 377 659 377 718 377",
    "M805 377 C845 377 884 377 938 377",
    "M497 464 C498 503 498 533 497 596",
    "M278 377 C332 213 659 211 718 377",
    "M278 377 C334 545 660 542 718 377",
    "M410 377 C446 219 767 223 938 377",
    "M410 377 C448 534 768 530 938 377",
  ];

  paths.forEach((d) => cube2d.append(svgEl("path", { class: "net-line", d })));
}

function drawFace(face, grid) {
  const origin = FACE_LAYOUT[face];

  cube2d.append(
    svgEl("rect", {
      class: "face-plate",
      x: origin.x - 15,
      y: origin.y - 15,
      width: SIZE + 30,
      height: SIZE + 30,
      rx: 8,
    }),
  );

  const labelY = face === "D" ? origin.y + SIZE + 34 : origin.y - 38;
  const title = svgEl("text", {
    class: "face-title",
    x: origin.x + SIZE / 2,
    y: labelY,
  });
  title.textContent = face;
  cube2d.append(title);

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const cx = origin.x + col * GAP + CENTER_OFFSET;
      const cy = origin.y + row * GAP + CENTER_OFFSET;
      cube2d.append(
        svgEl("circle", {
          class: "sticker",
          cx,
          cy,
          r: 23,
          fill: COLORS[grid[row][col]],
          "data-face": face,
        }),
      );
    }
  }

  for (let i = 1; i < 3; i += 1) {
    cube2d.append(
      svgEl("line", {
        class: "cell-line",
        x1: origin.x + i * GAP,
        y1: origin.y,
        x2: origin.x + i * GAP,
        y2: origin.y + SIZE,
      }),
    );
    cube2d.append(
      svgEl("line", {
        class: "cell-line",
        x1: origin.x,
        y1: origin.y + i * GAP,
        x2: origin.x + SIZE,
        y2: origin.y + i * GAP,
      }),
    );
  }

  cube2d.append(
    svgEl("rect", {
      class: "face-hotspot",
      x: origin.x - 15,
      y: origin.y - 15,
      width: SIZE + 30,
      height: SIZE + 30,
      rx: 8,
      "data-face": face,
    }),
  );
}

function render3D(facelets) {
  cube3d.innerHTML = "";
  const polygons = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      polygons.push({ face: "U", row, col, points: cell3D("U", row, col), color: facelets.U[row][col] });
      polygons.push({ face: "F", row, col, points: cell3D("F", row, col), color: facelets.F[row][col] });
      polygons.push({ face: "R", row, col, points: cell3D("R", row, col), color: facelets.R[row][col] });
    }
  }

  polygons
    .sort((a, b) => depthOf(a.points) - depthOf(b.points))
    .forEach((poly) => {
      cube3d.append(
        svgEl("polygon", {
          class: "cube-poly",
          points: poly.points.map((p) => `${p.x},${p.y}`).join(" "),
          fill: COLORS[poly.color],
        }),
      );
    });

  cube3d.append(
    svgEl("path", {
      class: "cube-outline",
      d: "M130 21 L238 67 L238 162 L130 212 L22 162 L22 67 Z M130 21 L130 116 M22 67 L130 116 L238 67 M130 116 L130 212",
    }),
  );
}

function project(point) {
  return {
    x: 130 + point.x * 36 - point.z * 36,
    y: 116 - point.y * 36 + point.x * 15 + point.z * 15,
    z: point.x + point.y + point.z,
  };
}

function cell3D(face, row, col) {
  const low = -1.5;
  const step = 1;
  const x0 = low + col * step;
  const x1 = x0 + step;
  const y1 = 1.5 - row * step;
  const y0 = y1 - step;
  const z0 = 1.5 - col * step;
  const z1 = z0 - step;

  if (face === "U") {
    const zBack = -1.5 + row * step;
    const zFront = zBack + step;
    return [
      project({ x: x0, y: 1.5, z: zBack }),
      project({ x: x1, y: 1.5, z: zBack }),
      project({ x: x1, y: 1.5, z: zFront }),
      project({ x: x0, y: 1.5, z: zFront }),
    ];
  }

  if (face === "F") {
    return [
      project({ x: x0, y: y1, z: 1.5 }),
      project({ x: x1, y: y1, z: 1.5 }),
      project({ x: x1, y: y0, z: 1.5 }),
      project({ x: x0, y: y0, z: 1.5 }),
    ];
  }

  return [
    project({ x: 1.5, y: y1, z: z0 }),
    project({ x: 1.5, y: y1, z: z1 }),
    project({ x: 1.5, y: y0, z: z1 }),
    project({ x: 1.5, y: y0, z: z0 }),
  ];
}

function depthOf(points) {
  return points.reduce((sum, point) => sum + point.z, 0) / points.length;
}

function renderStatus(facelets) {
  const solved = isSolved(facelets);
  statusText.textContent = solved ? "已复原" : "进行中";
  moveCount.textContent = `${history.length} 步`;
  document.body.dataset.solved = solved ? "true" : "false";
}

function renderHistory() {
  historyList.innerHTML = "";
  history.slice(-28).forEach((move) => {
    const item = document.createElement("li");
    item.textContent = move;
    historyList.append(item);
  });
}

function scramble() {
  const count = Number(scrambleRange.value);
  const faces = Object.keys(FACE_INFO);
  let lastFace = null;
  undoStack = [];

  for (let i = 0; i < count; i += 1) {
    let face = faces[Math.floor(Math.random() * faces.length)];
    while (face === lastFace) {
      face = faces[Math.floor(Math.random() * faces.length)];
    }
    const amount = [1, -1, 2][Math.floor(Math.random() * 3)];
    applyMove(face, amount, { silent: false, animate: false, force: true });
    lastFace = face;
  }

  undoStack = [];
  render(false);
}

function reset() {
  stickers = createSolvedCube();
  history = [];
  undoStack = [];
  render(false);
}

function undo() {
  const previous = undoStack.pop();
  if (!previous) return;
  stickers = previous.map(cloneSticker);
  history.pop();
  render(true);
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedTurn = Number(button.dataset.turn);
    document.querySelectorAll(".mode-button").forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
  });
});

document.querySelectorAll("[data-move]").forEach((button) => {
  button.addEventListener("click", () => applyMove(button.dataset.move, selectedTurn));
});

cube2d.addEventListener("click", (event) => {
  const face = event.target.dataset.face;
  if (face) applyMove(face, selectedTurn);
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toUpperCase();
  if (!MOVE_KEYS.has(key)) return;
  event.preventDefault();
  applyMove(key, event.shiftKey ? -1 : selectedTurn);
});

scrambleButton.addEventListener("click", scramble);
resetButton.addEventListener("click", reset);
undoButton.addEventListener("click", undo);
scrambleRange.addEventListener("input", () => {
  scrambleValue.textContent = scrambleRange.value;
});

window.__cubeGame = {
  applyMove,
  currentFacelets,
  isSolved: () => isSolved(currentFacelets()),
  reset,
};

render(false);
