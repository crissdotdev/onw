/* ================================================================
   ONW - OPEN NETWORK WARS
   Pure game logic (extracted from index.html for testability)
   ================================================================ */

/* ========================================
   CONSTANTS
   ======================================== */
const C = Object.freeze({
  VERSION: '1.4.0',
  GRID_COLS: 6,
  GRID_ROWS: 7,
  TOTAL_NODES: 30,
  NODES_PER_FACTION: 6,
  STRENGTH_PER_FACTION: 20,
  FACTION_COUNT: 5,
  VICTORY_THRESHOLD: 24,
  ATTACKER_WIN_CHANCE: 0.52,
  MIN_ATTACK_STRENGTH: 2,
  UNITS_LEFT_BEHIND: 1,
  SECRET_BASE_SEED: 'ONW_PWA_SEED_v1'
});

const STRENGTH_DISTRIBUTIONS = [
  [8, 8, 1, 1, 1, 1],   // Two strongholds
  [4, 8, 4, 2, 1, 1],   // One major, two medium
  [8, 6, 1, 1, 1, 3],   // Heavy + medium spread
];

/* ========================================
   FACTION
   ======================================== */
const Faction = Object.freeze({
  RED: 0, BLUE: 1, GREEN: 2, YELLOW: 3, PURPLE: 4, UNOWNED: 5,
  NAMES: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Unowned'],
  COLORS: ['#E53935', '#1E88E5', '#43A047', '#FDD835', '#8E24AA', '#404040'],
  CB_COLORS: ['#D55E00', '#0072B2', '#009E73', '#F0E442', '#CC79A7', '#404040'],
  PLAYER: 0,
  TURN_ORDER: [0, 1, 2, 3, 4]
});

/* ========================================
   SEEDED PRNG (mulberry32)
   ======================================== */
class PRNG {
  constructor(seed) {
    this.state = seed >>> 0;
  }
  next() {
    this.state |= 0;
    this.state = this.state + 0x6D2B79F5 | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

class SeedManager {
  static hashSeed(gameNumber) {
    const str = C.SECRET_BASE_SEED + ':' + gameNumber;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
  }
  static createRNG(gameNumber) {
    return new PRNG(SeedManager.hashSeed(gameNumber));
  }
}

/* ========================================
   NODE DATA
   ======================================== */
class NodeData {
  constructor(id, gridX, gridY) {
    this.id = id;
    this.gridX = gridX;
    this.gridY = gridY;
    this.faction = Faction.UNOWNED;
    this.strength = 0;
    this.connections = [];
  }
  isConnectedTo(otherId) {
    return this.connections.includes(otherId);
  }
}

/* ========================================
   GAME STATE
   ======================================== */
class GameState {
  constructor() {
    this.nodes = new Map();
    this.currentTurn = Faction.RED;
    this.gameNumber = 1;
    this.isGameOver = false;
    this.eliminatedFactions = new Set();
    this.fractions = new Array(C.FACTION_COUNT).fill(0);
  }
  getNodesForFaction(faction) {
    return [...this.nodes.values()].filter(n => n.faction === faction);
  }
  countNodes(faction) {
    let c = 0;
    for (const n of this.nodes.values()) if (n.faction === faction) c++;
    return c;
  }
  totalStrength(faction) {
    let s = 0;
    for (const n of this.nodes.values()) if (n.faction === faction) s += n.strength;
    return s;
  }
}

/* ========================================
   COMBAT RESULT
   ======================================== */
class CombatResult {
  constructor() {
    this.attackerWon = false;
    this.attackerRemaining = 0;
    this.defenderRemaining = 0;
    this.rounds = [];
  }
}

/* ========================================
   NETWORK GENERATOR
   ======================================== */
class NetworkGenerator {
  static generate(rng) {
    const state = new GameState();
    // Place 30 nodes on 6x7 grid
    const allPositions = [];
    for (let y = 0; y < C.GRID_ROWS; y++)
      for (let x = 0; x < C.GRID_COLS; x++)
        allPositions.push({ x, y });

    const shuffled = rng.shuffle(allPositions);
    const chosen = shuffled.slice(0, C.TOTAL_NODES);

    // Create nodes
    for (let i = 0; i < chosen.length; i++) {
      const node = new NodeData(i, chosen[i].x, chosen[i].y);
      state.nodes.set(i, node);
    }

    // Create connections (orthogonal + diagonal)
    const posMap = new Map();
    for (const [id, node] of state.nodes) {
      posMap.set(`${node.gridX},${node.gridY}`, id);
    }
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    for (const [id, node] of state.nodes) {
      for (const [dx, dy] of dirs) {
        const key = `${node.gridX + dx},${node.gridY + dy}`;
        if (posMap.has(key)) {
          const otherId = posMap.get(key);
          if (!node.connections.includes(otherId)) {
            node.connections.push(otherId);
            state.nodes.get(otherId).connections.push(id);
          }
        }
      }
    }

    // Ensure connectivity: nodes with 0 connections get connected to nearest node
    for (const [id, node] of state.nodes) {
      if (node.connections.length === 0) {
        let bestId = -1, bestDist = Infinity;
        for (const [oid, other] of state.nodes) {
          if (oid === id) continue;
          const dist = Math.abs(node.gridX - other.gridX) + Math.abs(node.gridY - other.gridY);
          if (dist < bestDist) { bestDist = dist; bestId = oid; }
        }
        if (bestId >= 0) {
          node.connections.push(bestId);
          state.nodes.get(bestId).connections.push(id);
        }
      }
    }

    // Assign factions
    const nodeIds = rng.shuffle([...state.nodes.keys()]);
    for (let f = 0; f < C.FACTION_COUNT; f++) {
      const start = f * C.NODES_PER_FACTION;
      for (let i = start; i < start + C.NODES_PER_FACTION; i++) {
        state.nodes.get(nodeIds[i]).faction = f;
      }
    }

    // Distribute strength using predefined templates (each faction picks independently)
    for (let f = 0; f < C.FACTION_COUNT; f++) {
      const distTemplate = STRENGTH_DISTRIBUTIONS[rng.nextInt(0, STRENGTH_DISTRIBUTIONS.length - 1)];
      const factionNodes = nodeIds.slice(f * C.NODES_PER_FACTION, (f + 1) * C.NODES_PER_FACTION);
      const shuffledDist = rng.shuffle(distTemplate);
      for (let i = 0; i < factionNodes.length; i++) {
        state.nodes.get(factionNodes[i]).strength = shuffledDist[i];
      }
    }

    return state;
  }
}

/* ========================================
   COMBAT RESOLVER
   ======================================== */
class CombatResolver {
  static resolve(attackerStrength, defenderStrength) {
    const result = new CombatResult();
    let atk = attackerStrength - C.UNITS_LEFT_BEHIND;
    let def = defenderStrength;

    while (atk > 0 && def > 0) {
      const roll = Math.random();
      if (roll < C.ATTACKER_WIN_CHANCE) {
        def--;
        result.rounds.push({ attackerWins: true, atk, def });
      } else {
        atk--;
        result.rounds.push({ attackerWins: false, atk, def });
      }
    }

    result.attackerWon = def === 0;
    result.attackerRemaining = atk;
    result.defenderRemaining = def;
    return result;
  }
}

/* ========================================
   CHAIN CALCULATOR (BFS)
   ======================================== */
class ChainCalculator {
  static findLargestCluster(faction, state) {
    const factionNodeIds = new Set();
    for (const [id, node] of state.nodes) {
      if (node.faction === faction) factionNodeIds.add(id);
    }

    const visited = new Set();
    let largestCluster = [];

    for (const startId of factionNodeIds) {
      if (visited.has(startId)) continue;
      const cluster = [];
      const queue = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const current = queue.shift();
        cluster.push(current);
        const node = state.nodes.get(current);
        for (const conn of node.connections) {
          if (factionNodeIds.has(conn) && !visited.has(conn)) {
            visited.add(conn);
            queue.push(conn);
          }
        }
      }

      if (cluster.length > largestCluster.length) {
        largestCluster = cluster;
      }
    }

    return largestCluster;
  }
}

/* ========================================
   FRONTLINE DETECTOR
   ======================================== */
class FrontlineDetector {
  static getFrontlineNodes(faction, state, clusterIds) {
    const clusterSet = new Set(clusterIds);
    const frontline = [];

    for (const id of clusterIds) {
      const node = state.nodes.get(id);
      for (const conn of node.connections) {
        const neighbor = state.nodes.get(conn);
        if (neighbor.faction !== faction && neighbor.faction !== Faction.UNOWNED) {
          frontline.push(id);
          break;
        }
      }
    }

    return frontline;
  }
}

/* ========================================
   REINFORCEMENT MANAGER
   ======================================== */
class ReinforcementManager {
  static apply(faction, state) {
    const cluster = ChainCalculator.findLargestCluster(faction, state);
    if (cluster.length === 0) return { reinforced: [], total: 0 };

    const frontline = FrontlineDetector.getFrontlineNodes(faction, state, cluster);
    if (frontline.length === 0) return { reinforced: [], total: 0 };

    const rawTotal = cluster.length + state.fractions[faction];
    const perNode = Math.floor(rawTotal / frontline.length);
    const remainder = rawTotal - (perNode * frontline.length);
    state.fractions[faction] = remainder;

    const reinforced = [];
    for (const id of frontline) {
      if (perNode > 0) {
        state.nodes.get(id).strength += perNode;
        reinforced.push({ id, amount: perNode });
      }
    }

    return { reinforced, total: perNode * frontline.length };
  }
}

/* ========================================
   VICTORY CHECKER
   ======================================== */
class VictoryChecker {
  static check(state) {
    for (let f = 0; f < C.FACTION_COUNT; f++) {
      if (state.countNodes(f) >= C.VICTORY_THRESHOLD) {
        return { gameOver: true, winner: f };
      }
    }
    // Check player elimination
    if (state.countNodes(Faction.PLAYER) === 0) {
      return { gameOver: true, winner: -1 }; // -1 = player lost
    }
    return { gameOver: false, winner: null };
  }

  static updateEliminations(state) {
    for (let f = 0; f < C.FACTION_COUNT; f++) {
      if (state.countNodes(f) === 0) {
        state.eliminatedFactions.add(f);
      }
    }
  }
}

/* ========================================
   AI CONTROLLER
   ======================================== */
class AIController {
  static async executeTurn(faction, state, onAttack) {
    const tried = new Set(); // Track nodes that have been fully exhausted

    while (true) {
      // Find all nodes that can still attack
      const ownedNodes = state.getNodesForFaction(faction)
        .filter(n => n.strength >= C.MIN_ATTACK_STRENGTH && !tried.has(n.id));

      if (ownedNodes.length === 0) break;

      // Pick strongest node to attack from (random tie-break)
      ownedNodes.sort((a, b) => b.strength - a.strength);
      const maxStr = ownedNodes[0].strength;
      const candidates = ownedNodes.filter(n => n.strength === maxStr).sort(() => Math.random() - 0.5);
      const attacker = candidates[0];

      let didAttack = false;

      // Chain attack from this node until depleted or no valid targets
      while (attacker.strength >= C.MIN_ATTACK_STRENGTH) {
        // Find valid targets: adjacent enemies weaker than attacker
        const targets = [];
        for (const connId of attacker.connections) {
          const target = state.nodes.get(connId);
          if (target.faction !== faction && target.faction !== Faction.UNOWNED &&
              target.strength < attacker.strength) {
            targets.push(target);
          }
        }
        if (targets.length === 0) break;

        // Attack weakest, random tie-break
        targets.sort((a, b) => a.strength - b.strength);
        const minStr = targets[0].strength;
        const weakest = targets.filter(t => t.strength === minStr).sort(() => Math.random() - 0.5);
        const defender = weakest[0];

        // Execute combat
        const result = CombatResolver.resolve(attacker.strength, defender.strength);

        if (result.attackerWon) {
          attacker.strength = C.UNITS_LEFT_BEHIND;
          defender.faction = faction;
          defender.strength = result.attackerRemaining;
        } else {
          attacker.strength = C.UNITS_LEFT_BEHIND;
          defender.strength = result.defenderRemaining;
        }

        didAttack = true;
        if (onAttack) await onAttack(attacker.id, defender.id, result);

        if (state.isGameOver) return;
        const vc = VictoryChecker.check(state);
        if (vc.gameOver) return;

        VictoryChecker.updateEliminations(state);
      }

      // Mark this node as exhausted so we don't pick it again
      tried.add(attacker.id);

      // If no node managed to attack, no further attacks are possible
      if (!didAttack && tried.size >= ownedNodes.length + tried.size) break;
    }
  }
}

export { C, STRENGTH_DISTRIBUTIONS, Faction, PRNG, SeedManager, NodeData, GameState,
  CombatResult, NetworkGenerator, CombatResolver, ChainCalculator, FrontlineDetector,
  ReinforcementManager, VictoryChecker, AIController };
