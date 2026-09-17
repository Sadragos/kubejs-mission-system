# KubeJS Daily Mission System

A dynamic mission and event system for Minecraft servers that generates random, scalable quests on-the-fly. Players receive mission scrolls that produce unique tasks, while spontaneous quick events keep the whole server engaged. Built entirely with KubeJS — originally inspired by FTB Quests but now a standalone framework.

---

## From the Player's Perspective

### What Are Mission Scrolls?

Mission Scrolls are personal quest items. Right-click a scroll to randomly generate a mission tailored to your progress. The generated mission becomes a physical item with detailed lore describing your task. Every player gets a fixed amount of Blank Mission scrolls, wheny they log in for the first time of the day. They can also be obtained through other means like Quick Events.

**Mission Types:**
- **Sende (Send)** – Gather items and right-click the mission item to turn them in (`type: item`)
- **Töte (Kill)** – Keep the mission item in your inventory while you kill the required mobs; progress tracks automatically (`type: kill`)
- **Reise (Journey)** – Travel to a distant location; the mission item creates a waypoint and tracks your distance (`type: journey`)
- **Helfe bei (Help With)** – Participate in a certain number of Quick Events of a specific type (`type: missions`)

**Cursed Scrolls:** There's a 5% chance that pulling a mission generates a cursed scroll instead, which immediately starts a hunt event with a penalty debuff if the event fails.

Mission characteristics:
- **Scaled difficulty** – amounts adjust based on your individual pack progress
- **Egg chances** – kill missions have a chance to drop spawn eggs as bonus rewards
- **Tradeable** – missions are items, so players can trade them with each other (swap unwanted missions with friends)
- **Swap option** – right-click with coins in your offhand slot (2 coin fee) to reject the mission and receive a fresh scroll
- **Server announcements** – completing a mission announces it to all players

### What Are Quick Events?

Quick Events are spontaneous, server-wide events announced in chat. They appear periodically and fall into two categories:

**Cooperative Events** – All players work together toward a shared goal:
- **Treibjagd (Driven Hunt)** – The server collectively must kill a certain number of specific mobs within the time limit. Everyone who participates shares the rewards.
- **Bestellung (Order)** – The guild has ordered a bulk shipment of items. Players contribute what they can via wooden bowl, and all contributors are rewarded.
- **Gemätzel (Slaughter)** – Multiplayer hunt against all monster types (wild hunt variant).

**Competitive Events** – Players race against each other:
- **Wilde Jagd (Wild Hunt)** – First player to kill the target number of any monster wins.
- **Kopfgeldjagd (Bounty Hunt)** – First player to kill the target number of a specific monster wins.

**Special Events:**
- **Gilden-Dieb (Guild Thief)** – An armed, armored mob spawns near players with stolen guild scrolls. Players must track it down and defeat it to recover the loot. The thief spawns with randomized armor and weapons, and has speed/strength/resistance buffs.
- **Frachtverlust (Cargo Loss)** – Airdrop-style event where a supply crate (Create cardboard package) appears at a marked location containing random items or mission scrolls.
- **Geschenkt (Gift)** – Every player receives a free blank mission scroll.

Quick Events have:
- **Dynamic scaling** – target amounts scale with both the average player progress across the server AND the number of players online (more players = higher targets)
- **Time limits** with countdown notifications (more frequent warnings as time runs out)
- **Scoreboards** showing progress (total for cooperative, individual for competitive)
- **Time bonuses** – finishing faster multiplies your rewards (up to 100% extra)
- **Penalties** – if a cursed event (triggered by a player rolling a cursed scroll) fails, everyone receives a debuff


### How Missions Work

**Quick Events:**
- Spawn automatically based on player count and time
- Announced with detailed info: target, amount, time limit, rewards
- Participate by completing the task (killing mobs, contributing items)
- Scoreboard tracks progress in real-time
- Rewards distributed automatically on completion
- Some events spawn elite mobs or airdrop supply crates at marked locations

**Daily Login:** Players receive 4 mission scrolls on their first login day, 6 if they've scipped a day, with a personalized greeting message.

**Mission Scrolls:**
- Right-click an empty scroll → generates a random mission item
- Right-click mission item with required items in inventory → turn in (item missions)
- Kill mobs with mission item in inventory → auto-progress (kill missions)
- Right-click mission item near destination → complete (journey missions)
- Right-click with coins in offhand → swap to a different mission

**Rewards:**
- **Coins** – 4-8 per player for successful events (primary currency)
- **Mission scrolls** – 10% chance as event reward
- **Spawn eggs** – rare drops from kill missions and successful events
- **Status effects** – 13 different buffs available (Speed, Strength, Vitality, Haste, Resistance, Regeneration, Luck, Health Boost, Flying, Knowledge, Nourishment, Dark Ward, etc.)
- **Time bonuses** – up to 100% extra for fast event completions

**Position Markers:** Thief and airdrop events display marked positions in chat with coordinates.

### Tips

- **Check frequently** – New missions spawn throughout the day based on player count.
- **Prioritize high-value missions** – Some missions offer better coin-to-effort ratios.
- **Track your progress** – The mission item shows your current progress and time remaining.
- **Swap missions** – If you're stuck, you can pay a small fee to swap to a new mission.

### Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/missions abort` | Abort the current quick event | 2 (OP) |
| `/missions start <type>` | Manually start a quick event by type (`hunt`, `thief`, `airdrop`, `present`, `request`) | 2 (OP) |
| `/missions stats` | View your own mission and event statistics | 0 |
| `/missions stats <player>` | View another player's mission and event statistics | 2 (OP) |

---

## From the Modpack Developer's Perspective

### Architecture

```
missions/          # CSV mission definitions (one file per category)
kubejs/            # KubeJS scripts (game logic), assets, server_scripts, startup_scripts
out/               # Generated output: a ready-to-deploy kubejs/ folder
index.js           # Build script
```

The build process:
1. Reads all CSV files from `missions/`
2. Combines all numbered KubeJS scripts from `kubejs/` (in numerical order) into one
   `missions.js`
3. Copies `kubejs/assets/`, `kubejs/server_scripts/`, and `kubejs/startup_scripts/` into
   `out/kubejs/`, placing the generated `missions.js` in `out/kubejs/server_scripts/`
   alongside the other server scripts

### CSV Mission Format

Each CSV file defines a pool of mission templates. Header row:

```csv
type;item;name;minAmount;maxAmount;minCoins;maxCoins;weight;egg;eggChance;minProgress
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Mission type: `item` (gather), `kill` (defeat mob), `journey`, `missions` (help with quick events) |
| `item` | Yes | Item ID or mob ID (e.g., `minecraft:iron_ingot`, `twilight:twilight_wolf`). For `item` rows, an item **tag** can be used instead of a single ID by prefixing it with `#` (e.g., `#forge:tomatoes`) — accepts any item in that tag as a valid turn-in, and shows the first item in the tag as the contract's display name. This is the preferred replacement for the old bare-word "matches any item containing this text" special cases. |
| `name` | No | Fallback display text. Ignored for `item`/`kill` rows that use a single, concrete, namespaced ID — those always show the real, translated in-game item/mob name instead (see [Localization](#localization)). Only used for `journey` destinations, `missions` (quick event) rows, and filter-style `item`/`kill` rows (bare words, `*` wildcards, comma-lists) that don't map to one real object. |
| `minAmount` | No | Minimum quantity required |
| `maxAmount` | No | Maximum quantity required |
| `minCoins` | No | Minimum coin reward |
| `maxCoins` | No | Maximum coin reward |
| `weight` | Yes | Weight for random selection (higher = more frequent) |
| `egg` | No | Bonus egg item ID to potentially grant |
| `eggChance` | No | Probability (0-1) of granting the bonus egg |
| `min` | No | Minimum player count required for this mission to appear (used by quick event filtering) |
| `minProgress` | No | Minimum player progress (0-1) required for this mission to appear |

**Example CSV row:**
```csv
item;minecraft:iron_ingot;Iron Ingot;64;256;10;20;300;
```

### Localization

The whole mod is bilingual (German/English), with English as the guaranteed fallback for
any other client language — with no per-player language tracking needed at all. This
works because Minecraft's translation system is entirely client-side: the server sends
translation keys (never baked strings), and each connected client resolves them using
its own selected language file, falling back to `en_us` for anything missing.

- **Custom text** (chat messages, mission titles/lore, quick event announcements, daily
  greetings, command output) lives in `kubejs/assets/kubejs/lang/en_us.json` (source of
  truth) and `de_de.json` (translation), under `kubejs.*` keys.
- **Item and mob names** are never hand-translated — they're resolved live from the
  item's/mob's own real in-game name (`Item.of(id).getHoverName()` /
  `EntityType.byString(id).getDescription()`), so they render correctly in whatever
  language the item's own mod supports. This is why the CSV `name` column is ignored for
  concrete item/mob IDs (see the CSV format table above).
- Mission items store their game-logic data (type, target, coins, creator, etc.) in a
  structured `minecraft:custom_data` NBT tag on the item, completely separate from the
  translatable display name/lore. This means the exact same physical item shows correctly
  translated text to every player who inspects it, regardless of their client language.

To add a third language, drop another `<lang_code>.json` file next to `en_us.json` — no
code changes needed. To add or change custom text, edit the lang JSON files directly (or
via `ClientEvents.lang(...)` in a client script); item/mob names never need translating
here.

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
# Build (generates a ready-to-deploy out/kubejs/ folder)
node index.js

# Deploy
# Copy the contents of out/kubejs/ into your instance's kubejs/ folder
# Restart/reload the server
```

`node index.js` produces:
```
out/kubejs/
  assets/...            # copied from kubejs/assets/
  server_scripts/
    coins.js            # copied from kubejs/server_scripts/
    missions.js         # generated (CSVs + kubejs/*.js scripts combined)
  startup_scripts/
    main.js             # copied from kubejs/startup_scripts/
```

The build script accepts an optional output directory argument (default: `out`):
```bash
node index.js /path/to/custom/output/dir
```

### Adding New Missions

1. Create or edit a CSV file in `missions/`
2. Add rows following the CSV format
3. Run `node index.js`
4. Deploy the new `out/kubejs/`

### Adding New KubeJS Logic

1. Create a new script in `kubejs/` with appropriate numbering
2. Follow existing patterns for event handlers and utilities
3. Rebuild and deploy

### Customization Ideas

- **Mod-specific missions** – Create CSV files for each major mod in your pack
- **Progression gating** – Use `minProgress` to unlock advanced missions
- **Event missions** – Time-limited missions for server events
- **Multiplayer scaling** – Tune `AVG_MISSION_PER_HOUR_PLAYER` for your player count

### Event Sound Effects

Different goat horn sounds are played for different event types, and particle effects are shown at kill locations and during cursed scroll activation.

### Inactive Missions

Missions in `missions/inactive/` (with `.disabled` extension) are not loaded into the mission pool. Move CSV files there to temporarily disable them.

### Dependencies

- Node.js
- `minimist` – CLI argument parsing
- `seedrandom` – Seeded random number generation
