# ONW — Open Network Wars

A strategic network conquest game playable in your browser. Capture nodes, chain attacks, and eliminate rival factions across a procedurally generated network.

## How to Play

1. **Visit the link** — works on any device with a modern browser
2. **Add to Home Screen** — for a native app experience (offline support included)
3. **Conquer the network** — tap your nodes to attack adjacent enemies

### Rules

- **5 factions** compete on a network of 30 nodes — you control Red, the rest are AI
- **Tap a node** you own (strength 2+) then tap an adjacent enemy to attack
- **Combat** is per-unit: each round has a 52% chance the attacker wins. Losing side loses 1 unit per round until one side is eliminated
- **Reinforcements** arrive at the end of each turn — your largest connected cluster feeds troops to frontline nodes
- **Win** by controlling 24+ nodes. Lose if Red is eliminated

### Strategy Tips

- Large connected clusters generate more reinforcements
- Attack weaker neighbors to expand efficiently
- Protect your chain — a split cluster weakens your reinforcements

## Install as App

This is a **Progressive Web App**. On mobile or desktop:

- **iOS Safari**: Share > Add to Home Screen
- **Android Chrome**: Menu > Add to Home Screen (or accept the install prompt)
- **Desktop Chrome/Edge**: Click the install icon in the address bar

Once installed it works fully offline.

## Tech

Single `index.html` containing all game logic, rendering, and UI. Canvas-based renderer with a Nothing OS-inspired monochrome design system. Deterministic seeded RNG ensures every game number produces the same starting layout.

Minimal file footprint:
```
index.html        — entire game
sw.js             — service worker (offline caching)
manifest.json     — PWA manifest
icons/            — app icons
```

## Credits

This is a PWA port of **ONW (Open Network Wars)**, originally built with Godot 4 / GDScript. The core game rules, combat system, and AI algorithm are preserved from the original.

## License

MIT
