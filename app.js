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
    [{ x: 410, y: 150 }, { x: 500, y: 128 }, { x: 590, y: 150 }],
    [{ x: 400, y: 235 }, { x: 500, y: 218 }, { x: 600, y: 235 }],
    [{ x: 430, y: 315 }, { x: 500, y: 300 }, { x: 570, y: 315 }],
  ],
  L: [
    [{ x: 185, y: 245 }, { x: 265, y: 205 }, { x: 335, y: 250 }],
    [{ x: 130, y: 335 }, { x: 245, y: 335 }, { x: 345, y: 360 }],
    [{ x: 185, y: 425 }, { x: 275, y: 500 }, { x: 360, y: 455 }],
  ],
  F: [
    [{ x: 300, y: 285 }, { x: 375, y: 270 }, { x: 460, y: 275 }],
    [{ x: 285, y: 392 }, { x: 390, y: 395 }, { x: 470, y: 382 }],
    [{ x: 330, y: 505 }, { x: 410, y: 545 }, { x: 475, y: 490 }],
  ],
  R: [
    [{ x: 665, y: 250 }, { x: 735, y: 205 }, { x: 815, y: 245 }],
    [{ x: 655, y: 360 }, { x: 755, y: 335 }, { x: 870, y: 335 }],
    [{ x: 640, y: 455 }, { x: 725, y: 500 }, { x: 815, y: 425 }],
  ],
  B: [
    [{ x: 540, y: 275 }, { x: 625, y: 270 }, { x: 700, y: 285 }],
    [{ x: 530, y: 382 }, { x: 610, y: 395 }, { x: 715, y: 392 }],
    [{ x: 525, y: 490 }, { x: 590, y: 545 }, { x: 670, y: 505 }],
  ],
  D: [
    [{ x: 380, y: 585 }, { x: 500, y: 565 }, { x: 620, y: 585 }],
    [{ x: 405, y: 650 }, { x: 500, y: 680 }, { x: 595, y: 650 }],
    [{ x: 430, y: 725 }, { x: 500, y: 735 }, { x: 570, y: 725 }],
  ],
};

const SVG_CONTROLS = {
  U: { x: 445, y: 56 },
  L: { x: 45, y: 552 },
  F: { x: 235, y: 625 },
  B: { x: 828, y: 495 },
  R: { x: 828, y: 592 },
  D: { x: 688, y: 704 },
};

const CONTROL_TURNS = [
  { amount: -1, label: "↺" },
  { amount: 2, label: "2" },
  { amount: 1, label: "↻" },
];

const cube2d = document.querySelector("#cube2d");
const cube3d = document.querySelector("#cube3d");
const boardStage = document.querySelector(".board-stage");
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
  FACE_ORDER.forEach((face) => drawFaceStickers(face, facelets[face]));
  drawMoveControls();

  if (animate) {
    isAnimating = true;
    cube2d.classList.add("is-animating");
    window.setTimeout(() => {
      cube2d.classList.remove("is-animating");
      isAnimating = false;
    }, 180);
  }
}

function drawMoveControls() {
  Object.entries(SVG_CONTROLS).forEach(([face, origin]) => {
    const group = svgEl("g", { class: "svg-face-control" });
    group.append(
      svgEl("rect", {
        class: "svg-control-pill",
        x: origin.x - 24,
        y: origin.y - 23,
        width: 160,
        height: 46,
        rx: 23,
      }),
    );
    group.append(
      svgEl("circle", {
        class: "svg-face-badge",
        cx: origin.x,
        cy: origin.y,
        r: 18,
        fill: COLORS[face],
      }),
    );
    const badgeText = svgEl("text", {
      class: `svg-badge-text ${face === "U" || face === "F" ? "" : "light"}`.trim(),
      x: origin.x,
      y: origin.y + 1,
    });
    badgeText.textContent = face;
    group.append(badgeText);

    CONTROL_TURNS.forEach((turn, index) => {
      const cx = origin.x + 42 + index * 38;
      const action = svgEl("g", {
        "data-move": face,
        "data-turn": turn.amount,
        "aria-label": `${face} ${turn.label}`,
      });
      action.append(svgEl("circle", { class: "svg-control-hit", cx, cy: origin.y, r: 17 }));
      const text = svgEl("text", { class: "svg-control-text", x: cx, y: origin.y + 1 });
      text.textContent = turn.label;
      action.append(text);
      group.append(action);
    });

    cube2d.append(group);
  });
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

cube2d.addEventListener("click", (event) => {
  const action = event.target.closest("[data-move][data-turn]");
  if (action) {
    applyMove(action.dataset.move, Number(action.dataset.turn));
    return;
  }

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
window.setTimeout(() => {
  if (boardStage.scrollWidth > boardStage.clientWidth) {
    boardStage.scrollLeft = (boardStage.scrollWidth - boardStage.clientWidth) / 2;
  }
}, 0);
