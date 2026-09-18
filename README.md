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

**Cursed Scrolls:** There's a small chance that pulling a mission generates a cursed scroll instead, which immediately starts a hunt event with a penalty debuff if the event fails.

Mission characteristics:
- **Scaled difficulty** – amounts and rewards adjust based on your individual pack progress
- **Grouped kill targets** – kill missions can target a named group of mobs (e.g. "any undead") instead of a single mob type
- **Tag-based item targets** – item missions can accept any item from a tag (e.g. "any log") instead of one exact item
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
- **Wettrennen (Race)** – A random destination is picked at a distance from world spawn; first player to reach it wins.

**Special Events:**
- **Gilden-Dieb (Guild Thief)** – An armed, armored mob spawns near players with stolen guild scrolls. Players must track it down and defeat it to recover the loot. The thief spawns with randomized armor and weapons, and has speed/strength/resistance buffs.
- **Frachtverlust (Cargo Loss)** – Airdrop-style event where a supply crate (Create cardboard package) appears at a marked location containing random items or mission scrolls.
- **Geschenkt (Gift)** – Every player receives a free blank mission scroll.

Quick Events have:
- **Dynamic scaling** – target amounts scale with both the average player progress across the server AND the number of players online (more players = higher targets)
- **Live progress display** – each participant's contribution shows up next to their name in the tab list (player list), and a boss bar continuously shows the event's name/target, a real-time countdown, and — for Hunt/Order — the remaining amount still needed
- **Time bonuses** – finishing faster multiplies your rewards (up to 100% extra)
- **Penalties** – if a cursed event (triggered by a player rolling a cursed scroll) fails, everyone receives a debuff

### How Missions Work

**Quick Events:**
- Spawn automatically based on player count and time
- Announced with detailed info: target, amount, time limit, rewards (use `/missions info` to see it again later)
- Participate by completing the task (killing mobs, contributing items, reaching the target)
- Tab list and boss bar track progress in real-time
- Rewards distributed automatically on completion
- Some events spawn elite mobs or airdrop supply crates at marked locations

**Daily Login:** Players receive 4 mission scrolls on their first login day, 6 if they've scipped a day, with a personalized greeting message.

**Mission Scrolls:**
- Right-click an empty scroll → generates a random mission item, with an icon that shows its type (send/kill/journey/help-with) at a glance
- Right-click mission item with required items in inventory → turn in (item missions)
- Kill mobs with mission item in inventory → auto-progress (kill missions)
- Right-click mission item near destination → complete (journey missions)
- Right-click with coins in offhand → swap to a different mission

**Rewards:**
- **Coins** – the primary currency, tradeable for goods at the coin shop and craftable into higher-value coin stacks/pouches
- **Worldborder increase**, **bonus XP**, a **bonus item**, a one-off **command reward** (e.g. a free diamond), and one of 8 temporary **status-effect buffs** (Speed, Haste, Strength, Resistance, Regeneration, Luck, Health Boost, Nourishment) can all additionally drop, each with its own independent chance
- **Time bonuses** – up to 100% extra for fast Quick Event completions

**Coin Shop:** Crafting a coin-priced item (see the recipe book) accepts any combination of coins/coin stacks/coin pouches adding up to its price. Several items sharing the same price show up as alternative choices in the crafting UI.

**Position Markers:** Thief, airdrop, and race events display marked positions in chat with coordinates, plus particle effects and a temporary JourneyMap waypoint (if installed).

### Tips

- **Check frequently** – New missions spawn throughout the day based on player count.
- **Prioritize high-value missions** – Some missions offer better coin-to-effort ratios.
- **Track your progress** – The mission item shows your current progress and time remaining.
- **Swap missions** – If you're stuck, you can pay a small fee to swap to a new mission.
- **Missed the announcement?** – Run `/missions info` to see the currently active Quick Event's details again.

### Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/missions abort` | Abort the current quick event | 2 (OP) |
| `/missions start <type>` | Manually start a quick event by type (`hunt`, `thief`, `airdrop`, `present`, `request`, `race`) | 2 (OP) |
| `/missions info` | Show details about the currently active quick event | 0 |
| `/missions stats` | View your own mission and event statistics | 0 |
| `/missions stats <player>` | View another player's mission and event statistics | 2 (OP) |
| `/missions stats <player> reset` | Reset all of a player's mission/event statistics to 0 | 2 (OP) |
| `/missions stats <player> set <stat> <value>` | Set a single statistic to a specific value (stat name is tab-completed) | 2 (OP) |

---

## From the Modpack Developer's Perspective

### Architecture

```
missions/                # CSV mission definitions (one file per category)
kubejs/
  01_*.js … 99_*.js       # Numbered game-logic scripts, combined in load order into one server script
  assets/                 # Textures, models, lang files — copied as-is
  server_scripts/         # Plain KubeJS server scripts (coin recipes, coin shop) — copied as-is
  startup_scripts/        # Item registration (coin, mission contract, mission scroll) — copied as-is
  client_scripts/         # Client-only logic (currency tooltips) — copied as-is
out/                     # Generated output: a ready-to-deploy kubejs/ folder
index.js                 # Build script
```

The build process:
1. Reads all CSV files from `missions/`
2. Combines all numbered KubeJS scripts from `kubejs/` (in numerical order) into one
   `missions.js`, followed by one generated `addMission(...)` call per CSV row
3. Copies `kubejs/server_scripts/`, `kubejs/assets/`, `kubejs/startup_scripts/`, and
   `kubejs/client_scripts/` into `out/kubejs/`, placing the generated `missions.js` in
   `out/kubejs/server_scripts/` alongside the other server scripts

### CSV Mission Format

Each CSV file defines a pool of mission templates. Header row:

```csv
type;item;name;minAmount;maxAmount;minCoins;maxCoins;weight;egg;eggChance;minProgress;groups
```

(`egg`, `eggChance`, and `groups` only apply to `kill` rows; other mission types simply omit those columns.)

**Fields:**

| Field | Required | Description |
|-------|----------|--------------|
| `type` | Yes | Mission type: `item` (gather), `kill` (defeat mob), `journey`, `missions` (help with quick events) |
| `item` | Yes | Item ID or mob ID (e.g., `minecraft:iron_ingot`, `twilight:twilight_wolf`). For `item` rows, an item **tag** can be used instead of a single ID by prefixing it with `#` (e.g., `#minecraft:logs`) — accepts any item in that tag as a valid turn-in, and shows the first item in the tag as the contract's display name. For `kill` rows, `§:groupname` matches any mob assigned to that group via the `groups` column (see below) — e.g. a hunt that can target "any undead". |
| `name` | No | Fallback display text. Ignored for `item`/`kill` rows that use a single, concrete, namespaced ID — those always show the real, translated in-game item/mob name instead (see [Localization](#localization)). Only used for `journey` destinations, `missions` (quick event) rows, and filter-style `item`/`kill` rows (bare words, `*` wildcards, comma-lists, tags, groups) that don't map to one real object. |
| `minAmount` | No | Minimum quantity required |
| `maxAmount` | No | Maximum quantity required |
| `minCoins` | No | Minimum coin reward |
| `maxCoins` | No | Maximum coin reward |
| `weight` | Yes | Weight for random selection (higher = more frequent) |
| `egg` | No | Bonus spawn-egg item ID associated with this kill target (kill missions only) |
| `eggChance` | No | Base probability (0-1) associated with the bonus egg (kill missions only) |
| `minProgress` | No | Minimum player progress (0-1) required for this mission to appear |
| `groups` | No | Comma-separated list of named groups this kill mission belongs to (kill missions only). Referenced from another kill mission's `item` column as `§:groupname` (e.g. `§:undead`). |

**Example CSV row:**
```csv
item;minecraft:iron_ingot;Iron Ingot;64;256;10;20;300;;;
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

**Caveat:** The tab-list scoreboard title and the Quick Event boss bar's name are each a
single shared string, resolved once on the server rather than per client — a limitation of
those two specific Minecraft UI surfaces, not of the translation system in general. Chat
messages, mission items, and tooltips are unaffected.

To add a third language, drop another `<lang_code>.json` file next to `en_us.json` — no
code changes needed. To add or change custom text, edit the lang JSON files directly (or
via `ClientEvents.lang(...)` in a client script); item/mob names never need translating
here.

### KubeJS Script Structure

Scripts in `kubejs/` are numbered for load order. Key scripts:

- `01_config.js` – All configuration constants (items, event timing, difficulty scaling, weighted pools, the central reward pool, curse effects, thief loot tables)
- `02_id_utils.js` – Item/mob ID formatting and filter-string matching
- `03_text_utils.js` – Text/Component helpers: real-name resolution, colored values, joining Components, Roman numerals
- `04_math_utils.js` – Weighted random picks, progress-scaled random ranges
- `05_time_utils.js` – Tick/time formatting and date helpers
- `06_fx_utils.js` – Particle and sound helpers
- `07_item_utils.js` – Summoning items, inventory search/removal, item filter matching (incl. tags)
- `08_player_utils.js` – Player progress tracking and reward payout (`rewardPlayer`)
- `09_kill_utils.js` – Kill validation, `§:group` resolution, moblist building
- `10_mission_entries.js` – Mission registration and fallback-value completion (`addMission`, `correctAllMissions`)
- `11_position_utils.js` – Position formatting, random position generation, waypoints
- `12_scoreboard_utils.js` – Tab-list scoreboard objective helpers
- `13_bossbar_utils.js` – Boss bar helpers for live Quick Event progress
- `20_quick_events.js` – Quick Event system (spawn logic, all six event types, live progress display, rewards)
- `40_missions.js` – Mission scroll system (random generation, item/kill/journey/help-with logic, completion, daily login)
- `80_commands.js` – Custom player/OP commands (`/missions ...`)
- `99_general.js` – Server-lifecycle cleanup (clears any leftover scoreboard/boss bar on reload)

Outside the numbered/combined scripts: `kubejs/server_scripts/coins.js` (coin crafting
recipes) and `shop.js` (coin shop recipes), `kubejs/startup_scripts/main.js` (item
registration), and `kubejs/client_scripts/currency_tooltips.js` (client-side coin value
tooltips) are plain KubeJS scripts copied through as-is.

### Configuration

All tuning parameters are in `kubejs/01_config.js`:

```javascript
const AVG_MISSIONS_PER_HOUR = 0.7;        // Base Quick Event spawn rate
const AVG_MISSION_PER_HOUR_PLAYER = 0.2;  // Additional spawn rate per player online
const MISSION_MIN_TIME = 20 * 60 * 10;    // Minimum event duration (ticks)
const MISSION_MAX_TIME = ...;             // Maximum event duration
const MISSION_TARGET_PLAYER_MULT = 0.35;  // Event target scaling per player
const MISSION_TYPE_GOALS = { item: 100, kill: 80, journey: 25, missions: 20 }; // Missions per type counted as "100% progress"
const MISSION_TYPE_WEIGHTS = { item: 13, kill: 8, journey: 2, missions: 1 };   // Mission type roll weights
const QUICK_EVENT_WEIGHTS = { thief: 2, airdrop: 2, present: 1, hunt: 4, request: 2, race: 2 }; // Event type roll weights
const MISSION_SWAP_FEE = 2;               // Coins to swap/reject a mission
```

All reward types (coins, worldborder, XP, a bonus item, a one-off command, buffs) are
defined in one place, `MISSION_REWARDS`, used by both missions and Quick Events. Each
entry has its own trigger `chance`, a scaling rule (`multiplier`, or its own `min`/`max`
range), and a display `color` — see the comment above the array in `01_config.js` for the
full field reference.

**Scaling Mechanics:**
- **Mission scrolls** scale with the individual player's pack progress (`getPlayerProgress`; combined across all mission types by default, or per-type if `DIFFICULTY_BY_TYPE` is enabled)
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
    shop.js             # copied from kubejs/server_scripts/
    missions.js         # generated (CSVs + kubejs/*.js scripts combined)
  startup_scripts/
    main.js             # copied from kubejs/startup_scripts/
  client_scripts/
    currency_tooltips.js # copied from kubejs/client_scripts/
```

The build never deletes a whole directory. It only ever writes/overwrites the specific files
it manages (tracked in `.build-manifest.json` next to the output), and only removes a
previously-generated file once it's no longer part of the build (e.g. a texture you deleted
from `kubejs/assets/`). Everything else already present in the output directory — including
if you point it directly at a live instance's `kubejs` folder — is left alone.

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
- **Shop catalog** – Add/remove entries in `SHOP_ITEMS` (`kubejs/server_scripts/shop.js`) to change what coins can buy

### Event Sound Effects

Different goat horn sounds are played for different event types, and particle effects are shown at kill locations, marked positions, and during cursed scroll activation.

### Inactive Missions

Missions in `missions/inactive/` (with `.disabled` extension) are not loaded into the mission pool. Move CSV files there to temporarily disable them.

### Dependencies

- Node.js
- `minimist` – CLI argument parsing
- `seedrandom` – Seeded random number generation
