# ONW PWA Development Plan

## Executive Summary

  Port **ONW (Open Network Wars)** from Godot 4/GDScript to a **Progressive Web App** with a **Nothing OS-inspired monochrome design**. Use **Gun.js** for user identity, stats
  persistence, and settings sync. Player faction colors remain vivid against the monochrome UI.

  ---

## Single-File PWA Feasibility: VERDICT

  **A true single `index.html` file PWA is NOT possible.** Research confirms:

  1. **Service workers cannot be registered from blob URLs** - hard browser security restriction (W3C spec, all browsers)
  2. **PWA manifest as data URI enables XSS** - W3C explicitly warns against this
  3. **PWA install requires**: separate `manifest.json`, separate `sw.js`, and PNG icon files (192x192, 512x512)

  **Chosen approach: Minimal-file PWA** - ALL game logic, CSS, and HTML live in `index.html`. Only `sw.js`, `manifest.json`, and icon files are separate. This is as close to
  single-file as technically possible while being a real, installable PWA.

### File Structure

  ```
  onw-pwa/
    index.html          # ALL game code, CSS, UI (single file contains everything)
    sw.js               # Service worker (~50 lines, caches index.html + Gun.js CDN)
    manifest.json       # PWA manifest (name, icons, theme)
    icons/
      icon-192.png      # Required for PWA install
      icon-512.png      # Required for PWA install
      icon-maskable.png # For adaptive icons
  ```

  ---

## Nothing OS Design Language

### Design Tokens (CSS Custom Properties)

  ```
  Backgrounds:    #000000 (primary), #0A0A0A (surface), #1A1A1A (card), #2A2A2A (elevated)
  Text:           #FFFFFF (primary), #B3B3B3 (secondary), #666666 (muted)
  Accent:         #D71921 (Nothing Red - used sparingly for alerts/active states)
  Borders:        #333333 (subtle), #444444 (hover)
  ```

### Typography

- **Display/Headers**: `'Space Mono', monospace` (approximates NType 82 Mono - Nothing's font is proprietary)
- **Body**: `system-ui, -apple-system, sans-serif`
- **Numbers in game**: Monospace, clean, high-contrast white on faction color

### Design Principles

- **Monochrome foundation**: All UI chrome is black/white/grey
- **Faction colors pop**: The 5 player colors are the ONLY color on screen (besides Nothing Red accents)
- **Dot-matrix hints**: Subtle dotted borders, pixel-aligned elements, grid patterns
- **Generous spacing**: 8px base unit, 16/24/32px common spacing
- **Thin borders**: 1px solid #333 for separation
- **Animations**: Subtle, fast (200-300ms), ease-out curves
- **Cards**: `border-radius: 12px`, slight elevation via border lightening

### Faction Colors (Preserved from original)

  ```
  Red (Player):  #E53935    Blue (AI): #1E88E5
  Green (AI):    #43A047    Yellow:    #FDD835
  Purple (AI):   #8E24AA    Unowned:   #404040
  ```

### Colorblind Alternative Palette

  ```
  Red → #D55E00    Blue → #0072B2    Green → #009E73
  Yellow → #F0E442  Purple → #CC79A7
  ```

  ---

## Game Rules Reference (Complete)

  Every rule from the Godot implementation, preserved exactly:

### Board

- 6x7 grid (42 positions), 30 nodes placed randomly (seeded)
- Orthogonal connections only (no diagonals)
- Every node must connect to at least 1 other node

### Factions & Setup

- 5 factions: Red (player), Blue, Green, Yellow, Purple (AI)
- Each starts with 6 nodes, 20 total army strength (min 1 per node)
- Total: 30 nodes, 100 army strength

### Turn Order

  Fixed: Red → Blue → Green → Yellow → Purple (eliminated factions skipped)

### Player Turn

  1. Select owned node with strength >= 2
  2. Attack adjacent enemy node via link
  3. Repeat unlimited times
  4. Press "End Turn"
  5. Receive reinforcements automatically

### Combat Resolution

- Attacker commits (strength - 1) units, 1 always stays behind
- Each round: 52% chance attacker wins (configurable)
- Loser of each round loses 1 unit
- Continue until one side reaches 0
- **Outcomes**: Attacker wins (captures node) or Defender wins (keeps node)
- No mutual destruction in current implementation

### AI Algorithm (Deterministic Chain-Attack)

  ```
  WHILE faction has valid attacks:
    1. Find all owned nodes with strength >= 2
    2. Select STRONGEST node (random tie-break, seeded)
    3. Find adjacent enemies with strength < attacker's strength
    4. Attack WEAKEST valid target (random tie-break, seeded)
    5. Execute attack
    6. If captured, continue attacking from captured node if valid
    7. Repeat from step 1
  ```

### Reinforcement System

  1. Find largest connected cluster of faction's nodes
  2. Identify frontline nodes in that cluster (adjacent to enemy, NOT unowned)
  3. Reinforcements = cluster size + stored fraction
  4. Distribute evenly: floor(total / frontline_count) per node
  5. Store remainder as fraction for next turn

### Victory

- First faction to control >= 24 nodes wins immediately
- Player eliminated (0 nodes) = defeat
- Check after every combat resolution

### Seeded Determinism

- Secret base seed + game number → deterministic hash
- Controls: node placement, connections, faction distribution, strength distribution
- AI tie-breaking and combat outcomes also seeded

### Statistics

- Total wins, losses, win rate
- Current game number (sequential, auto-advance)
- Last 10/20/50/100 game streaks
- History of last 100 results

  ---

## Gun.js Integration

### Purpose

  Replaces localStorage for persistence. Provides:

  1. **User identity** via SEA (Security, Encryption, Authorization)
  2. **Stats sync** across devices/browsers
  3. **Settings persistence**
  4. **Offline-first** with local storage + sync when online

### CDN Loading

  ```html
  <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gun/sea.js"></script>
  ```

### Data Model

  ```javascript
  gun.get('onw').get('users').get(userPub) → {
    stats: { currentGame, wins, losses, history: "1,1,0,1,1..." },
    settings: { animationSpeed, colorBlindMode }
  }
  ```

### Auth Flow

  ```javascript
  const gun = Gun(['https://gun-relay.example.com/gun']);
  const user = gun.user().recall({ sessionStorage: true });

  // Register
  user.create(username, password, ack => { ... });

  // Login
  user.auth(username, password, ack => { ... });

  // Save stats to user's encrypted space
  user.get('stats').put({ wins: 10, losses: 5 });
  ```

### Conflict Resolution

  Gun's HAM algorithm handles merge conflicts automatically. For game stats, last-write-wins is acceptable since stats only change after completed games.

### Relay Server

  A Gun relay server is needed for peer discovery. Options:

- Self-hosted Node.js relay (recommended)
- Community relay: `https://gun-manhattan.herokuapp.com/gun` (for development)

  ---

## Implementation Phases

### Phase 0: Project Scaffold

  **Files created:** `index.html`, `sw.js`, `manifest.json`, `icons/`

- HTML boilerplate with Nothing OS meta tags
- Service worker with cache-first strategy
- Manifest with app name, colors, icons
- Load Gun.js from CDN
- Canvas element for game board + DOM for UI

### Phase 1: Design System & Screen Routing

- CSS custom properties (Nothing OS tokens)
- Typography setup (Space Mono from Google Fonts, cached by SW)
- Component styles: buttons, cards, headers, inputs
- SPA routing via DOM show/hide (no framework needed)
- Screens: splash, menu, game, stats, how-to-play, settings, about, game-over
- Dot-matrix decorative elements

### Phase 2: Core Data Structures & Seeded RNG

  **Port from GDScript:**

- `Faction` → JS object with enum-like constants + color maps
- `NodeData` → JS class `{id, gridPos:{x,y}, faction, strength, connections:[]}`
- `GameState` → JS class `{nodes:Map, currentTurn, gameNumber, isGameOver, winner}`
- `CombatResult` → `{outcome, attackerRemaining, defenderRemaining, log:[]}`
- `ReinforcementResult` → `{faction, chainLength, frontlineCount, perNode, totalDistributed, remainder, nodeReinforcements:{}}`
- **Seeded PRNG**: Implement mulberry32 or xorshift128 (NOT Math.random)
- `SeedManager` → secret base seed + game number → deterministic seed

### Phase 3: Network Generation & Canvas Rendering

  **Port from GDScript:**

- `NetworkGenerator.generate(rng)` → place 30 nodes, connect adjacents, assign factions, distribute strength
- Connectivity validation (ensure all nodes have >= 1 connection)
- `Layout` → responsive grid-to-screen coordinate conversion for Canvas

  **Canvas Rendering Engine:**

- `drawNode(node)` → circle with faction color fill, thin stroke, centered strength text
- `drawLink(nodeA, nodeB)` → thin line between connected nodes
- `drawBoard()` → clear + redraw all links then all nodes
- State overlays: selection ring (white), valid targets (gold ring), attack path (gold line)
- `requestAnimationFrame` loop with dirty-flag optimization

### Phase 4: Input System & Selection

  **Port from GDScript:**

- Canvas click/touch → grid position → node hit testing (radius-based)
- Selection rules: player faction only, strength >= 2
- Valid targets: connected enemy nodes
- Visual feedback: selected node scales 1.15x, targets get gold ring
- Deselection on own-node tap or empty space tap

### Phase 5: Combat System

  **Port from GDScript:**

- `CombatResolver.resolve(attackerStrength, defenderStrength, rng)` → round-by-round resolution
- 52% attacker advantage per round (configurable constant)
- Attacker commits strength-1, leaves 1 behind
- Combat animation: sequential strength decrement on Canvas
- Apply results: faction change on capture, strength updates

### Phase 6: AI Controller

  **Port from GDScript (EXACT logic):**

- `AIController.executeTurn(faction, gameState, rng)` → array of actions
- Chain attack: after capture, evaluate new position for further attacks
- Tie-breaking: seeded random from shuffled arrays
- Target validation: `targetStrength < attackerStrength`
- AI turn visualization with configurable delays between attacks

### Phase 7: Reinforcement System

  **Port from GDScript:**

- `ChainCalculator.findLargestCluster(faction, gameState)` → BFS to find connected components, return largest
- `FrontlineDetector.getFrontlineNodes(faction, gameState)` → nodes adjacent to enemy (not unowned)
- `ReinforcementManager.apply(faction, gameState)` → calculate, distribute evenly, store fraction
- Per-faction fraction storage (persists across turns within a game)
- Reinforcement animation: "+N" floating text on Canvas

### Phase 8: Game State Machine & Victory

  **Port from GDScript:**

- State machine: `SETUP → PLAYER_TURN ↔ AI_TURN → GAME_OVER`
- `ANIMATING` sub-state during combat/reinforcement animations
- Turn cycling: advance through factions, skip eliminated
- Victory check after every combat: any faction >= 24 nodes?
- Player elimination check: 0 nodes = defeat
- End-of-turn button (disabled during AI/animation)

### Phase 9: UI Screens (Nothing OS Style)

  **All screens rendered as DOM overlays above Canvas:**

  1. **Main Menu**: Game title in Space Mono, monochrome buttons, current game# display
  2. **Game Screen**: Canvas board + faction indicators (node counts) + end turn button + pause
  3. **Game Over**: Victory/defeat with final stats, "Next Game" button
  4. **Stats Screen**: Clean monochrome table layout, streak display
  5. **How to Play**: Scrollable text, minimal formatting
  6. **Settings**: Animation speed (4 options), colorblind toggle
  7. **About**: Credits, version, license
  8. **Pause Menu**: Resume, settings shortcut, main menu (with confirm)

### Phase 10: Gun.js Auth & Persistence

- Login/register screen (minimal, monochrome form)
- Guest mode fallback (localStorage only)
- Stats saved to Gun.js user space on game completion
- Settings synced via Gun.js
- Session recall on app load
- Graceful degradation if relay unreachable

### Phase 11: PWA Polish & Offline

- Service worker: cache index.html, Gun.js CDN files, Google Fonts
- Cache versioning for updates
- Offline indicator in UI
- Install prompt handling
- Viewport meta for mobile
- Touch-action: none on Canvas
- Performance: target 60fps, minimize Canvas redraws
- Test on Chrome, Safari, Firefox (mobile + desktop)

  ---

## Game Logic Porting Reference

### GDScript → JavaScript Module Mapping

  | GDScript File | JS Function/Module | Complexity |
  |---|---|---|
  | `scripts/data/faction.gd` | `const FACTION = {...}` | Trivial |
  | `scripts/data/node_data.gd` | `class NodeData` | Trivial |
  | `scripts/data/game_state.gd` | `class GameState` | Low |
  | `scripts/data/combat_result.gd` | `class CombatResult` | Trivial |
  | `scripts/data/reinforcement_result.gd` | `class ReinforcementResult` | Trivial |
  | `scripts/game/layout.gd` | `const Layout = {...}` | Low |
  | `scripts/autoload/seed_manager.gd` | `class SeedManager` | Medium (PRNG impl) |
  | `scripts/game/network_generator.gd` | `class NetworkGenerator` | Medium |
  | `scripts/game/combat_config.gd` | `const COMBAT_CONFIG` | Trivial |
  | `scripts/game/combat_resolver.gd` | `class CombatResolver` | Medium |
  | `scripts/game/chain_calculator.gd` | `class ChainCalculator` | Low (BFS) |
  | `scripts/game/frontline_detector.gd` | `class FrontlineDetector` | Low |
  | `scripts/game/reinforcement_manager.gd` | `class ReinforcementManager` | Medium |
  | `scripts/game/ai_controller.gd` | `class AIController` | High (exact port) |
  | `scripts/game/victory_condition_checker.gd` | `class VictoryChecker` | Low |
  | `scripts/game/input_handler.gd` | Canvas event listeners | Low |
  | `scripts/autoload/game_manager.gd` | `class GameManager` | High (state machine) |
  | `scripts/autoload/stats_manager.gd` | Gun.js + `class StatsManager` | Medium |
  | `scripts/autoload/settings_manager.gd` | Gun.js + `class SettingsManager` | Low |

### Critical Porting Notes

  1. **Seeded RNG**: Use mulberry32 (fast, good distribution). Accept that game sequences will differ from Godot version since this is a new product.
  2. **All randomness** must flow through the seeded PRNG - never `Math.random()` for gameplay.
  3. **AI tie-breaking**: Must shuffle candidates array deterministically with seeded RNG, then pick first. Port the exact shuffle algorithm.
  4. **Combat resolution**: Port the while-loop exactly. Each round: `rng.next() < 0.52` → attacker wins round.
  5. **Reinforcement fractions**: Stored per-faction as floating point, persisted within a game session.
  6. **Canvas coordinate system**: Map 6x7 grid to responsive Canvas size using same margin percentages as Godot Layout class.

  ---

## Verification Plan

### Unit Testing (in-browser)

- Seeded RNG produces consistent sequences
- Network generator creates valid 30-node networks
- Combat resolver outcomes match expected distributions
- AI controller makes correct decisions for known states
- Chain calculator finds correct largest clusters
- Reinforcement distribution is mathematically correct

### Integration Testing

- Full game can be played to victory/defeat
- AI turns execute correctly with animations
- Stats persist across page reloads via Gun.js
- Game number advances after each game
- Same game number produces identical boards (determinism)

### PWA Testing

- `lighthouse` PWA audit passes
- App installs on Chrome (desktop + mobile)
- App installs on Safari (iOS + macOS)
- Offline mode works after first visit
- Gun.js gracefully degrades when offline

### Visual Testing

- Nothing OS aesthetic is consistent across screens
- Faction colors are clearly distinguishable
- Colorblind mode works correctly
- Responsive on mobile (portrait primary), tablet, desktop
- Canvas renders cleanly at various DPIs (retina support via `devicePixelRatio`)

  ---

## Key Constants

  ```
  GRID_COLS = 6
  GRID_ROWS = 7
  TOTAL_NODES = 30
  NODES_PER_FACTION = 6
  STRENGTH_PER_FACTION = 20
  FACTION_COUNT = 5
  VICTORY_THRESHOLD = 24
  ATTACKER_WIN_CHANCE = 0.52
  MIN_ATTACK_STRENGTH = 2
  UNITS_LEFT_BEHIND = 1
  SECRET_BASE_SEED = "ONW_PWA_SEED_v1"
  ```

  If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at:
  /Users/cristianserb/.claude/projects/-Users-cristianserb-criss-ONW/af69ab3c-338f-4c25-bf91-d666dae1bac1.jsonl
