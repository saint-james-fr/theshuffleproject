# Larry Heard Ultimate Collection Scraper 🎵

## 🚀 Single Command - Complete Collection

```bash
yarn scrape
```

That's it! This single command does **everything**:

## ✨ What It Does

1. **Loads ALL existing data** from any previous scrapes
2. **Searches 50+ comprehensive terms** including:
   - All Larry Heard aliases (10 names)
   - All group participations (5 bands)
   - Album/discography searches
   - Style-specific searches
   - Live/remix/collaboration searches
3. **Discovers playlists** from all searches
4. **Scrapes ALL discovered playlists**
5. **Removes ALL duplicates** across everything
6. **Updates Vue app** automatically

## 🎯 Coverage

**Larry Heard Aliases:**
- Larry Heard, Mr. Fingers, 2nd Avenew, Ace "Smokin" Amy, Blakk Society, Disco-D, Gherkin Jerks, Loosefingers, The Housefactors, Trio Zero

**Groups:**
- Fingers Inc., Nightshift, The It, The Ram Project, Fingers N Flowers

**Search Types:**
- Basic name searches
- Album/discography searches
- Style-specific (house, deep house, Chicago house, etc.)
- Performance (live, DJ sets, mixes)
- Collaboration (remixes, features, productions)
- Playlist-specific searches

## 📊 Expected Results

The ultimate scraper will give you **the most complete Larry Heard collection possible** - likely 300+ unique videos covering his entire career and all collaborations.

## 🔧 Manual Options

```bash
# Build TypeScript (if needed)
yarn build

# Run ultimate scraper only (no Vue update)
ts-node src/ultimate-scraper.ts

# Convert existing data to Vue format
ts-node src/convert-to-vue.ts
```

## 📁 Output

- **Single CSV File**: `data/larry-heard-collection.csv`
- **Vue App**: `../src/data/videos.ts` (auto-updated)

Everything goes into one comprehensive CSV file for simplicity!

## ✅ Duplicate Prevention

The scraper **guarantees no duplicates** by using YouTube video IDs as unique keys. Even if the same video appears under different aliases or in multiple playlists, it's only counted once.

---

**One command. Complete collection. Perfect for the Larry Heard Generator!** 🎵✨