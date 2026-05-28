const COLORS = {
  U: "#ffe43a",
  D: "#ff21d8",
  F: "#22d8e9",
  B: "#2134e8",
  R: "#f02828",
  L: "#18c64e",
};

const FACE_INFO = {
  U: { axis: "y", sign: 1 },
  D: { axis: "y", sign: -1 },
  F: { axis: "z", sign: 1 },
  B: { axis: "z", sign: -1 },
  R: { axis: "x", sign: 1 },
  L: { axis: "x", sign: -1 },
};

const FACE_ORDER = ["U", "L", "F", "R", "B", "D"];
const MOVE_KEYS = new Set(["U", "D", "L", "R", "F", "B"]);

const DIAGRAM_POINTS = {
  U: [
    [{ x: 400, y: 172 }, { x: 500, y: 135 }, { x: 600, y: 172 }],
    [{ x: 370, y: 250 }, { x: 500, y: 224 }, { x: 630, y: 250 }],
    [{ x: 420, y: 330 }, { x: 500, y: 315 }, { x: 580, y: 330 }],
  ],
  L: [
    [{ x: 160, y: 246 }, { x: 238, y: 210 }, { x: 318, y: 234 }],
    [{ x: 132, y: 338 }, { x: 228, y: 332 }, { x: 324, y: 344 }],
    [{ x: 170, y: 426 }, { x: 252, y: 468 }, { x: 342, y: 438 }],
  ],
  F: [
    [{ x: 354, y: 294 }, { x: 426, y: 276 }, { x: 494, y: 286 }],
    [{ x: 338, y: 386 }, { x: 420, y: 372 }, { x: 498, y: 366 }],
    [{ x: 376, y: 474 }, { x: 448, y: 512 }, { x: 526, y: 500 }],
  ],
  R: [
    [{ x: 682, y: 234 }, { x: 762, y: 210 }, { x: 840, y: 246 }],
    [{ x: 676, y: 344 }, { x: 772, y: 332 }, { x: 868, y: 338 }],
    [{ x: 658, y: 438 }, { x: 748, y: 468 }, { x: 830, y: 426 }],
  ],
  B: [
    [{ x: 506, y: 286 }, { x: 574, y: 276 }, { x: 646, y: 294 }],
    [{ x: 502, y: 366 }, { x: 580, y: 372 }, { x: 662, y: 386 }],
    [{ x: 474, y: 500 }, { x: 552, y: 512 }, { x: 624, y: 474 }],
  ],
  D: [
    [{ x: 420, y: 452 }, { x: 500, y: 438 }, { x: 580, y: 452 }],
    [{ x: 370, y: 530 }, { x: 500, y: 545 }, { x: 630, y: 530 }],
    [{ x: 400, y: 608 }, { x: 500, y: 648 }, { x: 600, y: 608 }],
  ],
};

const FACE_LABELS = {
  U: { x: 500, y: 82 },
  L: { x: 80, y: 345 },
  F: { x: 420, y: 250 },
  R: { x: 920, y: 345 },
  B: { x: 584, y: 250 },
  D: { x: 500, y: 704 },
};

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
  drawOrbitLines();
  drawFaceLabels();
  FACE_ORDER.forEach((face) => drawFaceStickers(face, facelets[face]));

  if (animate) {
    isAnimating = true;
    cube2d.classList.add("is-animating");
    window.setTimeout(() => {
      cube2d.classList.remove("is-animating");
      isAnimating = false;
    }, 180);
  }
}

function drawOrbitLines() {
  const paths = [
    ["major", "M178 470 C70 260 238 55 500 58 C762 55 930 260 822 470"],
    ["major", "M122 324 C178 72 575 83 664 324 C720 500 558 657 390 616 C210 572 62 470 122 324"],
    ["major", "M878 324 C822 72 425 83 336 324 C280 500 442 657 610 616 C790 572 938 470 878 324"],
    ["major", "M178 460 C250 704 750 704 822 460"],
    ["inner", "M265 420 C205 264 320 128 500 122 C680 128 795 264 735 420"],
    ["inner", "M225 352 C270 180 555 178 620 352 C654 450 560 548 455 520"],
    ["inner", "M775 352 C730 180 445 178 380 352 C346 450 440 548 545 520"],
    ["", "M140 338 C300 318 392 340 500 366 C608 340 700 318 860 338"],
    ["", "M170 430 C320 455 396 488 500 545 C604 488 680 455 830 430"],
    ["", "M318 234 C425 266 575 266 682 234"],
    ["", "M342 438 C436 386 564 386 658 438"],
    ["inner", "M500 122 C438 230 438 460 500 648"],
    ["inner", "M500 122 C562 230 562 460 500 648"],
  ];

  paths.forEach(([kind, d]) => {
    cube2d.append(svgEl("path", { class: `orbit-line ${kind}`.trim(), d }));
  });
}

function drawFaceLabels() {
  Object.entries(FACE_LABELS).forEach(([face, point]) => {
    const label = svgEl("text", {
      class: "face-label",
      x: point.x,
      y: point.y,
    });
    label.textContent = face;
    cube2d.append(label);
  });
}

function drawFaceStickers(face, grid) {
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const point = DIAGRAM_POINTS[face][row][col];
      cube2d.append(
        svgEl("circle", {
          class: "sticker-shadow",
          cx: point.x + 3,
          cy: point.y + 4,
          r: 17.5,
        }),
      );
      cube2d.append(
        svgEl("circle", {
          class: "sticker",
          cx: point.x,
          cy: point.y,
          r: 17,
          fill: COLORS[grid[row][col]],
          "data-face": face,
        }),
      );
    }
  }
}

function render3D(facelets) {
  cube3d.innerHTML = "";
  const polygons = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      polygons.push({ points: cell3D("U", row, col), color: facelets.U[row][col] });
      polygons.push({ points: cell3D("F", row, col), color: facelets.F[row][col] });
      polygons.push({ points: cell3D("R", row, col), color: facelets.R[row][col] });
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
  history.slice(-36).forEach((move) => {
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

document.querySelectorAll("[data-move][data-turn]").forEach((button) => {
  button.addEventListener("click", () => {
    applyMove(button.dataset.move, Number(button.dataset.turn));
  });
});

cube2d.addEventListener("click", (event) => {
  const face = event.target.dataset.face;
  if (face) applyMove(face, 1);
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toUpperCase();
  if (!MOVE_KEYS.has(key)) return;
  event.preventDefault();
  applyMove(key, event.shiftKey ? -1 : 1);
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
