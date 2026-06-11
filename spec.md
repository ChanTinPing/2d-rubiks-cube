# 2D Rubik's Cube Game Spec

## 1. Project Goal

Build a polished 2D Rubik's Cube game inspired by the reference image. The game should translate a standard 3x3x3 cube into a readable 2D board made of colored circular nodes and curved orbit tracks.

The important requirement is that the game must not be a loose color-shifting puzzle. Every player action on the 2D board must correspond to a legal move of a real 3x3x3 Rubik's Cube.

## 2. Product Direction

The first screen is the playable game. There should be no landing page or marketing-style introduction.

The experience should feel like a clean puzzle instrument:

- The board is the visual focus.
- The player can see which orbit will move before committing a move.
- The game gives immediate animation feedback.
- The rules can be inferred from the interface without long visible instructions.
- Optional help can be shown in a compact overlay, not as permanent explanatory text.

## 3. Core Gameplay

### 3.1 Internal Cube Model

The internal state uses a standard 54-sticker cube model.

Faces:

- `U`: Up
- `D`: Down
- `F`: Front
- `B`: Back
- `L`: Left
- `R`: Right

Each face has nine stickers:

```text
0 1 2
3 4 5
6 7 8
```

The center sticker of each face is fixed for solved-color identity. Non-center stickers move through legal cube permutations.

The solved state:

- All `U` stickers use the up color.
- All `D` stickers use the down color.
- All `F` stickers use the front color.
- All `B` stickers use the back color.
- All `L` stickers use the left color.
- All `R` stickers use the right color.

### 3.2 Legal Moves

The base move set is:

```text
U, D, F, B, L, R
```

Each move supports:

- Clockwise quarter turn: `U`
- Counter-clockwise quarter turn: `U'`
- Half turn: `U2`

All scrambling, undo, redo, win checks, and animations must use these same legal move definitions.

### 3.3 2D Action Meaning

The player manipulates orbit tracks on the 2D board.

An orbit track is a visual representation of one cube move. For example:

- The `U` orbit corresponds to turning the upper layer.
- The `F` orbit corresponds to turning the front layer.
- The `R` orbit corresponds to turning the right layer.

When the player drags or clicks an orbit:

1. The UI determines the intended direction.
2. The matching cube move is applied to the internal 54-sticker state.
3. The affected nodes animate along the highlighted orbit.
4. The board settles into the new state.

No node may move independently outside a legal cube move.

## 4. 2D Board Design

### 4.1 Visual Concept

The board should resemble a precise geometric version of the left side of the reference image:

- Colored circular nodes represent cube stickers.
- Thin curved tracks show possible movement paths.
- Tracks overlap in a controlled flower/knot structure.
- The design should be clearer and more polished than the rough reference image.

The board is not a flat cube net. It is a symbolic control surface for a cube.

### 4.2 Layout Structure

Use a fixed SVG coordinate system, for example:

```text
viewBox: 0 0 900 900
center: 450, 450
```

The board is arranged around six move regions:

- `U` orbit: upper arc system
- `D` orbit: lower arc system
- `F` orbit: central/front loop
- `B` orbit: outer/back loop
- `L` orbit: left loop
- `R` orbit: right loop

Each face's nine stickers receive stable 2D positions. The exact coordinates should be defined in a single data file/module, not scattered through rendering code.

Recommended node count:

- Display all 54 stickers.
- Face centers remain visible and fixed.
- Moving stickers animate between predefined positions.

### 4.3 Orbit Geometry

Each legal move has two visual pieces:

1. A face ring: the eight non-center stickers on the turning face.
2. A side belt: the twelve adjacent stickers affected by that face turn.

The combined highlighted set therefore contains up to 20 moving stickers for a quarter turn.

In SVG, each orbit should have:

- A visible thin stroke.
- A wider invisible hit target stroke for pointer input.
- Optional arrow markers when hovered or active.
- Stable node anchor points on or near the curve.

The visual orbit does not need to mathematically match a real 3D projection, but its sticker order must match the move permutation.

### 4.4 Color Palette

Use six strong cube colors, tuned for a premium UI:

```text
White:  #f8fafc
Yellow: #ffd83d
Red:    #ff4d5a
Orange: #ff8a2a
Blue:   #2563ff
Green:  #22c55e
```

Use a dark neutral background:

```text
Background: #10141f
Panel:      #171d2a
Track:      #5c667a
Track hot:  #d5deff
Text:       #edf2ff
Muted text: #9aa6bd
```

Avoid making the whole UI a single blue/purple theme. The cube colors should carry the energy.

### 4.5 Node Rendering

Each sticker node is a circle with:

- Fixed radius, responsive only through SVG scaling.
- Subtle outer shadow.
- Inner highlight.
- Dark rim or low-opacity stroke for separation.
- Smooth transform animation during moves.

Suggested default:

```text
node radius: 15-18 px in SVG coordinates
active radius: +2 px or brighter rim
selected shadow: stronger glow
```

The node should read as a polished game piece, not a flat debug dot.

### 4.6 Track Rendering

Tracks should be visually secondary:

- Thin neutral lines at rest.
- Brighter line on hover.
- Stronger glow while active.
- Direction arrows appear only when useful.

Do not let tracks overpower the colored nodes.

## 5. Interaction Design

### 5.1 Input Methods

Support mouse and touch through pointer events.

Primary interactions:

- Hover an orbit: highlight the affected stickers.
- Click an orbit arrow: rotate that orbit one quarter turn.
- Drag along an orbit: rotate in the drag direction.
- Keyboard shortcuts can be added later, but are not required for the first playable version.

### 5.2 Drag Rules

When drag starts:

1. Capture the nearest orbit or active node group.
2. Highlight the affected stickers.
3. Store the pointer start angle relative to the orbit's control center.

When drag ends:

1. Compare start/end angle or projected movement along the orbit.
2. If movement exceeds a threshold, apply one quarter turn.
3. If movement is small, cancel and snap back.

Suggested threshold:

```text
minimum angle delta: 18 degrees
minimum pointer travel: 18 px
```

### 5.3 Animation Rules

Moves must animate, but the game should not feel slow.

Suggested timings:

```text
quarter turn: 180-240 ms
half turn:    260-320 ms
scramble:     apply instantly or animate only the final preview
```

During an active move:

- Disable new move input until the animation finishes.
- Store the move in history after it commits.
- Update step count once per committed move.

### 5.4 Controls

The main controls:

- Scramble
- Undo
- Redo
- Reset
- New game
- Difficulty selector
- Optional help toggle

Difficulty affects scramble length:

```text
Easy:     5-8 moves
Standard: 16-22 moves
Hard:     30-45 moves
```

Scramble generation should avoid immediate inverse pairs such as `R R'`.

## 6. Screen Layout

### 6.1 Desktop

Use a two-column game layout:

```text
left / center: large SVG board
right: compact control and status panel
```

The board should use most of the viewport height without clipping.

The side panel contains:

- Move count
- Timer
- Current difficulty
- Control buttons
- Small recent-move history
- Optional compact 3D/reference preview area

### 6.2 Mobile

Use a vertical layout:

```text
top: board
bottom: compact toolbar/status strip
```

The board should remain square and centered.

Controls must not overlap the board. Text inside buttons must fit at small widths.

## 7. Technical Plan

### 7.1 Recommended Stack for This Repository

The current repository appears to be a simple static web project. For the first rebuilt version, use:

- `index.html`
- `styles.css`
- `app.js`
- SVG for the board
- Plain JavaScript modules if the project is converted to `type="module"`

This keeps the project lightweight and easy to run by opening `index.html` or serving the folder locally.

If the project grows later, migrate to:

- Vite
- TypeScript
- React

Do not introduce that build stack unless the implementation needs it.

### 7.2 Suggested Code Organization

For the static implementation:

```text
index.html
styles.css
app.js
spec.md
```

Inside `app.js`, keep the logic separated by clear sections or objects:

```text
Cube state and move permutations
2D projection data
SVG rendering
Pointer interaction
Game history and timer
Scramble and win detection
```

If the file becomes too large, split into:

```text
src/cube.js
src/projection.js
src/board.js
src/game.js
```

### 7.3 Data Structures

Sticker:

```js
{
  id: "U0",
  homeFace: "U",
  color: "white",
  positionKey: "U0"
}
```

Position:

```js
{
  key: "U0",
  x: 450,
  y: 180,
  face: "U"
}
```

Move definition:

```js
{
  name: "U",
  inverse: "U'",
  faceCycle: [...],
  beltCycles: [...]
}
```

History item:

```js
{
  move: "R",
  timestamp: 123456789,
  durationMs: 220
}
```

### 7.4 Move Engine

Represent moves as permutations over sticker positions.

Applying a move:

1. Clone or copy the current sticker-position mapping.
2. Apply the move's cycles.
3. Update the state.
4. Render animated transition from old positions to new positions.

This makes undo easy:

- Undo applies the inverse move.
- Redo reapplies the original move.

### 7.5 Win Check

The solved condition is:

```text
For each face, all nine visible positions contain stickers whose home face equals that face.
```

Equivalent check:

```text
state[positionKey].homeFace === positionKey[0]
```

## 8. Visual Quality Bar

The game should pass these checks before considering the first version acceptable:

- The board looks intentionally designed, not like debug dots.
- All nodes are readable at desktop and mobile sizes.
- Hovering an orbit clearly previews the affected stickers.
- A player can tell which move they are about to make.
- Animations are smooth and do not cause layout shifts.
- Buttons and status text do not overlap or clip.
- The board does not become a single-color UI theme.
- The solved state is visually satisfying and symmetrical.

## 9. Gameplay Quality Bar

The game should pass these checks:

- Every move changes the internal cube state through a legal cube permutation.
- Undo and redo exactly reverse and restore moves.
- Scramble produces reachable cube states.
- Reset returns to solved state.
- Win is detected only when the internal cube is solved.
- Input is ignored during move animation to avoid corrupted state.
- Drag gestures have a clear threshold and do not trigger accidental moves too easily.

## 10. Implementation Milestones

### Milestone 1: Static Board

- Define cube colors.
- Define all 54 sticker positions.
- Render SVG tracks.
- Render all sticker nodes.
- Verify desktop and mobile layout.

### Milestone 2: Legal Move Engine

- Implement 54-sticker state.
- Implement `U D F B L R` permutations.
- Implement inverse and half turns.
- Add solved-state check.

### Milestone 3: Board Interaction

- Add orbit hit targets.
- Add hover previews.
- Add click-to-turn.
- Add drag-to-turn.
- Add move lock during animation.

### Milestone 4: Game Systems

- Add scramble by difficulty.
- Add move counter.
- Add timer.
- Add undo and redo.
- Add reset and new game.

### Milestone 5: Polish

- Improve animation easing.
- Add active glows and selected-node effects.
- Add win animation.
- Tune mobile toolbar.
- Test all controls manually.

## 11. Out of Scope for First Version

Do not include these in the first build unless specifically requested:

- Online leaderboard
- User accounts
- Multiplayer
- Full 3D cube manipulation
- Tutorial campaign
- Sound effects
- Heavy framework migration

## 12. Final Acceptance Criteria

The rebuilt game is acceptable when:

1. Opening the game shows a polished 2D cube board immediately.
2. The player can rotate all six cube faces from the 2D board.
3. The cube state remains mathematically valid after repeated moves.
4. Scramble, undo, redo, reset, timer, and move count work.
5. Solving the cube triggers a clear victory state.
6. The UI works on desktop and mobile without overlapping text or controls.
7. The implementation follows this spec closely enough that future changes can be made without guessing the original design intent.
