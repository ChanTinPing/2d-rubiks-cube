const SVG_NS = "http://www.w3.org/2000/svg";
const FACES = ["U", "D", "F", "B", "L", "R"];
const FACE_COLORS = {
  U: "#f8fafc",
  D: "#ffd83d",
  F: "#ff4d5a",
  B: "#ff8a2a",
  R: "#2563ff",
  L: "#22c55e",
};

const MOVE_META = {
  U: { axis: "y", layer: 1, dir: 1 },
  D: { axis: "y", layer: -1, dir: -1 },
  F: { axis: "z", layer: 1, dir: -1 },
  B: { axis: "z", layer: -1, dir: 1 },
  R: { axis: "x", layer: 1, dir: -1 },
  L: { axis: "x", layer: -1, dir: 1 },
};

const DIFFICULTY_RANGES = {
  easy: [5, 8],
  standard: [16, 22],
  hard: [30, 45],
};

const ORBITS = {
  U: {
    center: { x: 450, y: 288 },
    label: { x: 450, y: 96 },
    path: ellipsePath(450, 288, 285, 154),
    arrows: [
      { dir: 1, x: 720, y: 288, glyph: "\u21bb" },
      { dir: -1, x: 180, y: 288, glyph: "\u21ba" },
    ],
  },
  D: {
    center: { x: 450, y: 616 },
    label: { x: 450, y: 833 },
    path: ellipsePath(450, 616, 286, 154),
    arrows: [
      { dir: 1, x: 720, y: 616, glyph: "\u21bb" },
      { dir: -1, x: 180, y: 616, glyph: "\u21ba" },
    ],
  },
  F: {
    center: { x: 450, y: 392 },
    label: { x: 450, y: 392 },
    path: ellipsePath(450, 392, 190, 128),
    arrows: [
      { dir: 1, x: 640, y: 392, glyph: "\u21bb" },
      { dir: -1, x: 260, y: 392, glyph: "\u21ba" },
    ],
  },
  B: {
    center: { x: 450, y: 456 },
    label: { x: 450, y: 456 },
    path: ellipsePath(450, 456, 354, 340),
    arrows: [
      { dir: 1, x: 804, y: 456, glyph: "\u21bb" },
      { dir: -1, x: 96, y: 456, glyph: "\u21ba" },
    ],
  },
  L: {
    center: { x: 312, y: 450 },
    label: { x: 154, y: 450 },
    path: ellipsePath(312, 450, 178, 292),
    arrows: [
      { dir: 1, x: 312, y: 730, glyph: "\u21bb" },
      { dir: -1, x: 312, y: 170, glyph: "\u21ba" },
    ],
  },
  R: {
    center: { x: 588, y: 450 },
    label: { x: 746, y: 450 },
    path: ellipsePath(588, 450, 178, 292),
    arrows: [
      { dir: 1, x: 588, y: 730, glyph: "\u21bb" },
      { dir: -1, x: 588, y: 170, glyph: "\u21ba" },
    ],
  },
};

const board = document.querySelector("#cubeBoard");
const trackLayer = document.querySelector("#trackLayer");
const nodeLayer = document.querySelector("#nodeLayer");
const controlLayer = document.querySelector("#controlLayer");
const moveCountEl = document.querySelector("#moveCount");
const timerEl = document.querySelector("#timer");
const difficultySelect = document.querySelector("#difficultySelect");
const moveHistoryEl = document.querySelector("#moveHistory");
const statusText = document.querySelector("#statusText");
const victoryToast = document.querySelector("#victoryToast");
const helpDialog = document.querySelector("#helpDialog");

const positions = createPositions();
const positionKeys = Object.keys(positions);
const positionByCubie = new Map(
  positionKeys.map((key) => [cubeAddress(positions[key].coord, positions[key].normal), key]),
);
const baseAffected = Object.fromEntries(
  Object.keys(MOVE_META).map((move) => [move, getAffectedPositions(move)]),
);
const nodeElements = new Map();

let state = createSolvedState();
let history = [];
let redoStack = [];
let isAnimating = false;
let hotMove = null;
let activeMove = null;
let dragState = null;
let startTime = null;
let elapsedBeforeStart = 0;
let timerId = null;

renderTracks();
renderNodes();
bindControls();
updateUi();

function createPositions() {
  const cube = {};

  addFace("U", [0, 1, 0], (row, col) => [col - 1, 1, row - 1]);
  addFace("D", [0, -1, 0], (row, col) => [col - 1, -1, 1 - row]);
  addFace("F", [0, 0, 1], (row, col) => [col - 1, 1 - row, 1]);
  addFace("B", [0, 0, -1], (row, col) => [1 - col, 1 - row, -1]);
  addFace("R", [1, 0, 0], (row, col) => [1, 1 - row, 1 - col]);
  addFace("L", [-1, 0, 0], (row, col) => [-1, 1 - row, col - 1]);

  const visual = createVisualPositions();
  for (const key of Object.keys(cube)) {
    cube[key] = { ...cube[key], ...visual[key] };
  }
  return cube;

  function addFace(face, normal, coordFor) {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const key = `${face}${row * 3 + col}`;
        cube[key] = { key, face, row, col, normal, coord: coordFor(row, col) };
      }
    }
  }
}

function createVisualPositions() {
  const configs = {
    U: { cx: 450, cy: 168, gap: 45, rotation: 0 },
    L: { cx: 252, cy: 346, gap: 45, rotation: -10 },
    R: { cx: 648, cy: 346, gap: 45, rotation: 10 },
    F: { cx: 450, cy: 392, gap: 46, rotation: 0 },
    B: { cx: 450, cy: 542, gap: 45, rotation: 0 },
    D: { cx: 450, cy: 734, gap: 45, rotation: 0 },
  };
  const visual = {};
  for (const face of FACES) {
    const config = configs[face];
    const angle = (config.rotation * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const dx = (col - 1) * config.gap;
        const dy = (row - 1) * config.gap;
        visual[`${face}${row * 3 + col}`] = {
          x: config.cx + dx * cos - dy * sin,
          y: config.cy + dx * sin + dy * cos,
        };
      }
    }
  }
  return visual;
}

function createSolvedState() {
  return Object.fromEntries(
    positionKeys.map((key) => [key, { id: key, homeFace: key[0], color: FACE_COLORS[key[0]] }]),
  );
}

function renderTracks() {
  trackLayer.replaceChildren();
  controlLayer.replaceChildren();
  for (const move of Object.keys(ORBITS)) {
    const orbit = ORBITS[move];
    const guide = svgEl("path", { d: orbit.path, class: "track", "data-move": move });
    const hit = svgEl("path", { d: orbit.path, class: "track-hit", "data-move": move });
    hit.addEventListener("pointerenter", () => setHotMove(move));
    hit.addEventListener("pointerleave", () => {
      if (!dragState) setHotMove(null);
    });
    hit.addEventListener("pointerdown", (event) => startOrbitDrag(event, move));
    trackLayer.append(guide, hit);

    const label = svgEl("text", {
      x: orbit.label.x,
      y: orbit.label.y,
      class: "orbit-label",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "data-move": move,
    });
    label.textContent = move;
    controlLayer.append(label);

    for (const arrow of orbit.arrows) {
      const group = svgEl("g", {
        class: "orbit-arrow",
        "data-move": move,
        "data-dir": arrow.dir,
        transform: `translate(${arrow.x} ${arrow.y})`,
        tabindex: "0",
        role: "button",
        "aria-label": `${move} ${arrow.dir > 0 ? "clockwise" : "counter-clockwise"}`,
      });
      group.append(
        svgEl("circle", { r: 22 }),
        svgText(arrow.glyph, {
          x: 0,
          y: 1,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
        }),
      );
      group.addEventListener("pointerenter", () => setHotMove(move));
      group.addEventListener("pointerleave", () => setHotMove(null));
      group.addEventListener("click", () => commitMove(move, arrow.dir));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          commitMove(move, arrow.dir);
        }
      });
      controlLayer.append(group);
    }
  }
}

function renderNodes() {
  nodeLayer.replaceChildren();
  nodeElements.clear();
  const stickerPositions = getStickerPositions(state);
  for (const sticker of Object.values(createSolvedState())) {
    const group = svgEl("g", { class: "node", "data-sticker": sticker.id });
    group.append(
      svgEl("circle", { class: "node-base", r: 17, fill: sticker.color }),
      svgEl("circle", { class: "node-shine", r: 17 }),
    );
    nodeElements.set(sticker.id, group);
    nodeLayer.append(group);
  }
  placeNodes(stickerPositions);
}

function bindControls() {
  document.querySelector("#scrambleBtn").addEventListener("click", scrambleCurrentDifficulty);
  document.querySelector("#newGameBtn").addEventListener("click", scrambleCurrentDifficulty);
  document.querySelector("#resetBtn").addEventListener("click", resetGame);
  document.querySelector("#undoBtn").addEventListener("click", undoMove);
  document.querySelector("#redoBtn").addEventListener("click", redoMove);
  document.querySelector("#helpBtn").addEventListener("click", () => helpDialog.showModal());
}

async function commitMove(move, dir = 1) {
  if (isAnimating) return;
  const notation = dir > 0 ? move : `${move}'`;
  await applyMove(notation, { animate: true, record: true, userMove: true });
}

async function applyMove(notation, options = {}) {
  const { animate = true, record = false, userMove = false } = options;
  if (isAnimating) return false;
  const oldState = state;
  const newState = computeMoveState(state, notation);
  const oldStickerPositions = getStickerPositions(oldState);
  const newStickerPositions = getStickerPositions(newState);
  const base = notation[0];
  const affected = changedStickerIds(oldStickerPositions, newStickerPositions);

  if (userMove) startTimer();
  isAnimating = animate;
  activeMove = animate ? base : null;
  updateHotClasses();
  updateUi();

  if (animate) {
    await animateStickers(oldStickerPositions, newStickerPositions, affected, notation);
  } else {
    placeNodes(newStickerPositions);
  }

  state = newState;
  placeNodes(newStickerPositions);
  activeMove = null;
  isAnimating = false;

  if (record) {
    history.push(notation);
    redoStack = [];
  }

  if (isSolved() && history.length > 0) {
    stopTimer();
    flashVictory();
  }
  updateHotClasses();
  updateUi();
  return true;
}

function computeMoveState(sourceState, notation) {
  const base = notation[0];
  const turns = notation.endsWith("2") ? 2 : 1;
  const direction = notation.endsWith("'") ? -1 : 1;
  let next = sourceState;
  for (let i = 0; i < turns; i += 1) {
    next = applyQuarterTurn(next, base, direction);
  }
  return next;
}

function applyQuarterTurn(sourceState, move, direction) {
  const meta = MOVE_META[move];
  const next = { ...sourceState };
  for (const key of positionKeys) {
    const pos = positions[key];
    if (axisValue(pos.coord, meta.axis) !== meta.layer) continue;
    const coord = rotateVector(pos.coord, meta.axis, meta.dir * direction);
    const normal = rotateVector(pos.normal, meta.axis, meta.dir * direction);
    const targetKey = positionByCubie.get(cubeAddress(coord, normal));
    next[targetKey] = sourceState[key];
  }
  return next;
}

function getAffectedPositions(move) {
  const solved = createSolvedState();
  const moved = applyQuarterTurn(solved, move, 1);
  return new Set(positionKeys.filter((key) => moved[key].id !== solved[key].id));
}

function getStickerPositions(cubeState) {
  const result = {};
  for (const [positionKey, sticker] of Object.entries(cubeState)) {
    result[sticker.id] = positionKey;
  }
  return result;
}

function changedStickerIds(oldStickerPositions, newStickerPositions) {
  return new Set(
    Object.keys(oldStickerPositions).filter(
      (stickerId) => oldStickerPositions[stickerId] !== newStickerPositions[stickerId],
    ),
  );
}

function placeNodes(stickerPositions) {
  for (const [stickerId, positionKey] of Object.entries(stickerPositions)) {
    const point = positions[positionKey];
    nodeElements.get(stickerId).setAttribute("transform", `translate(${point.x} ${point.y})`);
  }
}

function animateStickers(oldStickerPositions, newStickerPositions, affected, notation) {
  const duration = notation.endsWith("2") ? 300 : 220;
  const orbit = ORBITS[notation[0]];
  const start = performance.now();
  return new Promise((resolve) => {
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const t = easeInOutCubic(progress);
      for (const stickerId of affected) {
        const from = positions[oldStickerPositions[stickerId]];
        const to = positions[newStickerPositions[stickerId]];
        const point = curvedPoint(from, to, orbit.center, t);
        nodeElements.get(stickerId).setAttribute("transform", `translate(${point.x} ${point.y})`);
      }
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function curvedPoint(from, to, center, t) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  let vx = mid.x - center.x;
  let vy = mid.y - center.y;
  const length = Math.hypot(vx, vy) || 1;
  vx /= length;
  vy /= length;
  const control = {
    x: mid.x + vx * 54,
    y: mid.y + vy * 54,
  };
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return {
    x: a * from.x + b * control.x + c * to.x,
    y: a * from.y + b * control.y + c * to.y,
  };
}

function startOrbitDrag(event, move) {
  if (isAnimating) return;
  event.preventDefault();
  const point = svgPoint(event);
  const orbit = ORBITS[move];
  dragState = {
    move,
    pointerId: event.pointerId,
    startPoint: point,
    startAngle: Math.atan2(point.y - orbit.center.y, point.x - orbit.center.x),
  };
  board.setPointerCapture(event.pointerId);
  setHotMove(move);
  board.addEventListener("pointermove", continueOrbitDrag);
  board.addEventListener("pointerup", finishOrbitDrag);
  board.addEventListener("pointercancel", cancelOrbitDrag);
}

function continueOrbitDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const point = svgPoint(event);
  const orbit = ORBITS[dragState.move];
  const angle = Math.atan2(point.y - orbit.center.y, point.x - orbit.center.x);
  const delta = normalizeAngle(angle - dragState.startAngle);
  statusText.textContent = Math.abs((delta * 180) / Math.PI) > 18 ? "Release" : "Preview";
}

function finishOrbitDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const point = svgPoint(event);
  const orbit = ORBITS[dragState.move];
  const endAngle = Math.atan2(point.y - orbit.center.y, point.x - orbit.center.x);
  const delta = normalizeAngle(endAngle - dragState.startAngle);
  const travel = Math.hypot(point.x - dragState.startPoint.x, point.y - dragState.startPoint.y);
  const move = dragState.move;
  cleanupDrag(event.pointerId);

  if (travel >= 18 && Math.abs((delta * 180) / Math.PI) >= 18) {
    commitMove(move, delta > 0 ? 1 : -1);
  } else {
    statusText.textContent = "Ready";
  }
}

function cancelOrbitDrag(event) {
  cleanupDrag(event.pointerId);
  updateUi();
}

function cleanupDrag(pointerId) {
  if (board.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId);
  board.removeEventListener("pointermove", continueOrbitDrag);
  board.removeEventListener("pointerup", finishOrbitDrag);
  board.removeEventListener("pointercancel", cancelOrbitDrag);
  dragState = null;
  setHotMove(null);
}

function scrambleCurrentDifficulty() {
  if (isAnimating) return;
  const moves = generateScramble(difficultySelect.value);
  for (const move of moves) {
    state = computeMoveState(state, move);
  }
  history = [];
  redoStack = [];
  elapsedBeforeStart = 0;
  startTime = null;
  stopTimer();
  placeNodes(getStickerPositions(state));
  statusText.textContent = "Scrambled";
  victoryToast.hidden = true;
  updateUi();
}

function generateScramble(difficulty) {
  const [min, max] = DIFFICULTY_RANGES[difficulty] ?? DIFFICULTY_RANGES.standard;
  const count = randomInt(min, max);
  const bases = Object.keys(MOVE_META);
  const suffixes = ["", "'", "2"];
  const moves = [];
  while (moves.length < count) {
    const base = bases[randomInt(0, bases.length - 1)];
    const lastBase = moves.at(-1)?.[0];
    if (base === lastBase) continue;
    const move = `${base}${suffixes[randomInt(0, suffixes.length - 1)]}`;
    if (moves.at(-1) && isImmediateInverse(moves.at(-1), move)) continue;
    moves.push(move);
  }
  return moves;
}

async function undoMove() {
  if (isAnimating || history.length === 0) return;
  const move = history.pop();
  redoStack.push(move);
  await applyMove(inverseMove(move), { animate: true, record: false, userMove: false });
}

async function redoMove() {
  if (isAnimating || redoStack.length === 0) return;
  const move = redoStack.pop();
  await applyMove(move, { animate: true, record: true, userMove: false });
}

function resetGame() {
  if (isAnimating) return;
  state = createSolvedState();
  history = [];
  redoStack = [];
  elapsedBeforeStart = 0;
  startTime = null;
  stopTimer();
  placeNodes(getStickerPositions(state));
  statusText.textContent = "Solved";
  victoryToast.hidden = true;
  updateUi();
}

function updateUi() {
  moveCountEl.textContent = history.length;
  timerEl.textContent = formatTime(currentElapsedMs());
  document.querySelector("#undoBtn").disabled = isAnimating || history.length === 0;
  document.querySelector("#redoBtn").disabled = isAnimating || redoStack.length === 0;
  document.querySelector("#scrambleBtn").disabled = isAnimating;
  document.querySelector("#newGameBtn").disabled = isAnimating;
  document.querySelector("#resetBtn").disabled = isAnimating;
  difficultySelect.disabled = isAnimating;
  if (!dragState && !isAnimating && !statusText.textContent) statusText.textContent = "Ready";
  renderMoveHistory();
}

function renderMoveHistory() {
  const recent = history.slice(-12);
  moveHistoryEl.replaceChildren(
    ...recent.map((move) => {
      const item = document.createElement("li");
      item.textContent = move;
      return item;
    }),
  );
}

function setHotMove(move) {
  hotMove = move;
  updateHotClasses();
  if (move) statusText.textContent = `${move} orbit`;
  else if (!isAnimating) statusText.textContent = isSolved() ? "Solved" : "Ready";
}

function updateHotClasses() {
  const move = activeMove || hotMove;
  const affected = move ? baseAffected[move] : new Set();
  document.querySelectorAll(".track, .orbit-label, .orbit-arrow").forEach((element) => {
    element.classList.toggle("is-hot", element.dataset.move === hotMove);
    element.classList.toggle("is-active", element.dataset.move === activeMove);
  });

  const stickerPositions = getStickerPositions(state);
  for (const [stickerId, element] of nodeElements.entries()) {
    const positionKey = stickerPositions[stickerId];
    element.classList.toggle("is-hot", affected.has(positionKey));
    element.classList.toggle("is-active", activeMove && affected.has(positionKey));
  }
}

function startTimer() {
  if (startTime !== null) return;
  startTime = performance.now();
  timerId = window.setInterval(() => {
    timerEl.textContent = formatTime(currentElapsedMs());
  }, 250);
}

function stopTimer() {
  if (startTime !== null) {
    elapsedBeforeStart = currentElapsedMs();
    startTime = null;
  }
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  timerEl.textContent = formatTime(currentElapsedMs());
}

function currentElapsedMs() {
  if (startTime === null) return elapsedBeforeStart;
  return elapsedBeforeStart + performance.now() - startTime;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function flashVictory() {
  victoryToast.hidden = false;
  statusText.textContent = "Solved";
  window.setTimeout(() => {
    victoryToast.hidden = true;
  }, 3600);
}

function isSolved() {
  return isSolvedState(state);
}

function isSolvedState(cubeState) {
  return positionKeys.every((key) => cubeState[key].homeFace === key[0]);
}

function inverseMove(move) {
  if (move.endsWith("2")) return move;
  if (move.endsWith("'")) return move[0];
  return `${move}'`;
}

function isImmediateInverse(previous, next) {
  return previous[0] === next[0] && inverseMove(previous) === next;
}

function axisValue(vector, axis) {
  return vector[axisIndex(axis)];
}

function axisIndex(axis) {
  return { x: 0, y: 1, z: 2 }[axis];
}

function rotateVector(vector, axis, direction) {
  const [x, y, z] = vector;
  if (axis === "x") return direction > 0 ? [x, -z, y] : [x, z, -y];
  if (axis === "y") return direction > 0 ? [z, y, -x] : [-z, y, x];
  return direction > 0 ? [-y, x, z] : [y, -x, z];
}

function cubeAddress(coord, normal) {
  return `${coord.join(",")}|${normal.join(",")}`;
}

function svgPoint(event) {
  const point = board.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(board.getScreenCTM().inverse());
  return { x: transformed.x, y: transformed.y };
}

function normalizeAngle(angle) {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function ellipsePath(cx, cy, rx, ry) {
  const k = 0.5522847498;
  return [
    `M ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry}`,
    `C ${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function svgEl(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

function svgText(text, attrs = {}) {
  const element = svgEl("text", attrs);
  element.textContent = text;
  return element;
}

export const __testing = {
  createSolvedState,
  computeMoveState,
  inverseMove,
  isSolvedState,
  positionKeys,
};
