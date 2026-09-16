# KubeJS Daily Mission System

A dynamic mission and event system for Minecraft servers that generates random, scalable quests on-the-fly. Players receive mission scrolls that produce unique tasks, while spontaneous quick events keep the whole server engaged. Built entirely with KubeJS — originally inspired by FTB Quests but now a standalone framework.

---

## From the Player's Perspective

### What Are Quick Events?

Quick Events are spontaneous, server-wide events announced in chat. They appear periodically and fall into two categories:

**Cooperative Events** – All players work together toward a shared goal:
- **Treibjagd (Driven Hunt)** – The server collectively must kill a certain number of specific mobs within the time limit. Everyone who participates shares the rewards.
- **Bestellung (Order)** – The guild has ordered a bulk shipment of items. Players contribute what they can via wooden bowl, and all contributors are rewarded.

**Competitive Events** – Players race against each other:
- **Wilde Jagd (Wild Hunt)** – First player to kill the target number of any monster wins.
- **Kopfgeldjagd (Bounty Hunt)** – First player to kill the target number of a specific monster wins.

Quick Events have:
- **Dynamic scaling** – target amounts scale with both the average player progress across the server AND the number of players online (more players = higher targets)
- **Time limits** with countdown notifications (more frequent warnings as time runs out)
- **Scoreboards** showing progress (total for cooperative, individual for competitive)
- **Time bonuses** – finishing faster multiplies your rewards (up to 100% extra)
- **Penalties** – if a cursed event (triggered by a player rolling a cursed scroll) fails, everyone receives a debuff

### What Are Mission Scrolls?

Mission Scrolls are personal quest items. Right-click a scroll to randomly generate a mission tailored to your progress. The generated mission becomes a physical item with detailed lore describing your task.

**Mission Types:**
- **Sende (Send)** – Gather items and right-click the mission item to turn them in
- **Töte (Kill)** – Keep the mission item in your inventory while you kill the required mobs; progress tracks automatically
- **Reise (Journey)** – Travel to a distant location; the mission item creates a waypoint and tracks your distance
- **Helfe bei (Help With)** – Participate in a certain number of Quick Events of a specific type

Mission characteristics:
- **Scaled difficulty** – amounts adjust based on your individual pack progress
- **Egg chances** – kill missions have a chance to drop spawn eggs as bonus rewards
- **Tradeable** – missions are items, so players can trade them with each other (swap unwanted missions with friends)
- **Swap option** – right-click with coins in your offhand slot (2 coin fee) to reject the mission and receive a fresh scroll
- **Server announcements** – completing a mission announces it to all players

### How Missions Work

**Quick Events:**
- Spawn automatically based on player count and time
- Announced with detailed info: target, amount, time limit, rewards
- Participate by completing the task (killing mobs, contributing items)
- Scoreboard tracks progress in real-time
- Rewards distributed automatically on completion
- Some events spawn elite mobs or airdrop supply crates at marked locations

**Mission Scrolls:**
- Right-click an empty scroll → generates a random mission item
- Right-click mission item with required items in inventory → turn in (item missions)
- Kill mobs with mission item in inventory → auto-progress (kill missions)
- Right-click mission item near destination → complete (journey missions)
- Right-click with coins in offhand → swap to a different mission

**Rewards:**
- **Coins** – the primary currency, awarded for all completions
- **Spawn eggs** – rare drops from kill missions and successful events
- **Status effects** – events may grant buffs (Speed, Strength, Vitality, Haste, etc.)
- **Time bonuses** – up to 100% extra for fast event completions

### Tips

- **Check frequently** – New missions spawn throughout the day based on player count.
- **Prioritize high-value missions** – Some missions offer better coin-to-effort ratios.
- **Track your progress** – The mission item shows your current progress and time remaining.
- **Swap missions** – If you're stuck, you can pay a small fee to swap to a new mission.

---

## From the Modpack Developer's Perspective

### Architecture

```
missions/          # CSV mission definitions (one file per category)
kubejs/            # KubeJS scripts (game logic)
out/               # Generated output (deploy to server)
index.js           # Build script
```

The build process:
1. Reads all CSV files from `missions/`
2. Combines all KubeJS scripts from `kubejs/` (in numerical order)
3. Generates a single `out/missions.js` file ready for deployment

### CSV Mission Format

Each CSV file defines a pool of mission templates. Header row:

```csv
type;item;name;minAmount;maxAmount;minCoins;maxCoins;weight;egg;eggChance;minProgress
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Mission type: `item` (gather), `kill` (defeat mob), `journey`, `missions` |
| `item` | Yes | Item ID or mob ID (e.g., `minecraft:iron_ingot`, `twilight:twilight_wolf`) |
| `name` | No | Display name (defaults to item name) |
| `minAmount` | No | Minimum quantity required |
| `maxAmount` | No | Maximum quantity required |
| `minCoins` | No | Minimum coin reward |
| `maxCoins` | No | Maximum coin reward |
| `weight` | Yes | Weight for random selection (higher = more frequent) |
| `egg` | No | Bonus egg item ID to potentially grant |
| `eggChance` | No | Probability (0-1) of granting the bonus egg |
| `minProgress` | No | Minimum player progress (0-1) required for this mission to appear |

**Example CSV row:**
```csv
item;minecraft:iron_ingot;Iron Ingot;64;256;10;20;300;
```

### KubeJS Script Structure

Scripts in `kubejs/` are numbered for load order. Key scripts:

- `01_config.js` – All configuration constants (items, intervals, rewards, difficulty)
- `05_time_utils.js` – Time formatting and duration utilities
- `08_player_utils.js` – Player state, progress tracking
- `09_kill_utils.js` – Kill tracking for mob-based missions
- `10_mission_entries.js` – Mission item generation and progress tracking
- `20_quick_events.js` – Quick Event system (spawn logic, cooperative/competitive events, scoreboards, rewards)
- `40_missions.js` – Mission scroll system (random generation, item-based missions, kill tracking, completion)
- `80_commands.js` – Custom player commands
- `99_general.js` – General utilities

### Configuration

All tuning parameters are in `kubejs/01_config.js`:

```javascript
const AVG_MISSIONS_PER_HOUR = 0.7;        // Base Quick Event spawn rate
const AVG_MISSION_PER_HOUR_PLAYER = 0.2;  // Additional spawn rate per player
const MISSION_MIN_TIME = 20 * 60 * 10;    // Minimum event duration (ticks)
const MISSION_MAX_TIME = ...;             // Maximum event duration
const MISSION_TARGET_PLAYER_MULT = 0.35;  // Event target scaling per player (higher = more scaling)
const REWARD_ITEM = 'kubejs:mission_scroll'; // Mission scroll item ID
const MISSION_SWAP_FEE = 2;               // Coins to swap/reject a mission
const BONUS_REWARD_CHANCE = 0.3;          // Chance for bonus rewards
const FALLBACK_EGG_CHANCE = 0.25;         // Default spawn egg probability for kill missions
```

**Scaling Mechanics:**
- **Mission scrolls** scale with the individual player's pack progress
- **Quick Events** scale with the average player progress across the server AND multiply by player count (via `MISSION_TARGET_PLAYER_MULT`)

### Building & Deploying

```bash
# Build (generates out/missions.js)
node index.js

# Deploy
# Copy out/missions.js to your KubeJS scripts directory
# Restart/reload the server
```

The build script accepts an optional output path argument:
```bash
node index.js /path/to/custom/output.js
```

### Adding New Missions

1. Create or edit a CSV file in `missions/`
2. Add rows following the CSV format
3. Run `node index.js`
4. Deploy the new `out/missions.js`

### Adding New KubeJS Logic

1. Create a new script in `kubejs/` with appropriate numbering
2. Follow existing patterns for event handlers and utilities
3. Rebuild and deploy

### Customization Ideas

- **Mod-specific missions** – Create CSV files for each major mod in your pack
- **Progression gating** – Use `minProgress` to unlock advanced missions
- **Event missions** – Time-limited missions for server events
- **Multiplayer scaling** – Tune `AVG_MISSION_PER_HOUR_PLAYER` for your player count

### Dependencies

- Node.js
- `minimist` – CLI argument parsing
- `seedrandom` – Seeded random number generation
