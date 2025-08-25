# Larry Heard Scraping Guide 🎵

## 🚀 Available Scraping Commands

### **1. Basic Multi-Query Scraper**
```bash
yarn scrape-and-convert
```
- **Searches**: 12 Larry Heard related queries
- **Focus**: Basic searches with common terms
- **Output**: ~125 videos
- **Best for**: Quick collection building

### **2. Enhanced Playlist Discovery**
```bash
yarn enhanced-full
```
- **Searches**: "Larry Heard" + playlist discovery
- **Focus**: Finding and scraping playlists
- **Output**: ~55 videos (focused quality)
- **Best for**: Curated playlist content

### **3. Album & Collection Explorer**
```bash
yarn albums-full
```
- **Searches**: Album/discography focused queries
- **Focus**: Complete collections and albums
- **Output**: TBD (targets albums specifically)
- **Best for**: Complete discography coverage

### **4. Master Collection**
```bash
yarn master-full
```
- **Searches**: Combines all previous data + comprehensive search
- **Focus**: Ultimate collection with everything
- **Output**: Maximum coverage with deduplication
- **Best for**: Complete Larry Heard collection

### **5. 🆕 COMPREHENSIVE Alias & Band Collection**
```bash
yarn comprehensive-full
```
- **Searches**: ALL aliases and group participations
- **Coverage**: 
  - **Aliases**: Larry Heard, Mr. Fingers, 2nd Avenew, Ace "Smokin" Amy, Blakk Society, Disco-D, Gherkin Jerks, Loosefingers, The Housefactors, Trio Zero
  - **Groups**: Fingers Inc., Nightshift, The It, The Ram Project, Fingers N Flowers
- **Focus**: Most comprehensive possible collection
- **Output**: Maximum possible unique videos
- **Best for**: THE definitive Larry Heard collection

## 📊 Collection Hierarchy

1. **Basic** (125 videos) → **Enhanced** (adds playlists) → **Albums** (adds discographies) → **Master** (combines all) → **🆕 COMPREHENSIVE** (adds all aliases & bands)

## 🎯 Recommendation

For the most complete Larry Heard collection including all his work under different aliases and with different groups:

```bash
yarn comprehensive-full
```

This will give you:
- ✅ All existing scraped data
- ✅ Larry Heard main searches
- ✅ All known aliases (10 different names)
- ✅ All group participations (5 different bands)
- ✅ Playlist discovery from all searches
- ✅ Complete deduplication
- ✅ Automatic Vue app update

## 🔧 Individual Commands

```bash
# Run scraper only (no Vue update)
yarn comprehensive

# Convert existing data to Vue format
yarn convert

# Build TypeScript
yarn build
```

## 📁 Output Files

- `larry-heard-videos.csv` - Basic collection
- `larry-heard-enhanced.csv` - With playlists
- `larry-heard-albums-playlists.csv` - Album focused
- `larry-heard-master.csv` - Combined collection
- `larry-heard-comprehensive.csv` - 🆕 **THE ULTIMATE COLLECTION**

## 🎵 Aliases & Groups Covered

**Larry Heard Aliases:**
- Larry Heard
- Mr. Fingers / Mr Fingers
- 2nd Avenew
- Ace "Smokin" Amy
- Blakk Society
- Disco-D
- Gherkin Jerks
- Loosefingers
- The Housefactors
- Trio Zero

**Group Participations:**
- Fingers Inc. / Fingers Inc
- Nightshift
- The It
- The Ram Project
- Fingers N Flowers

This ensures you get **every possible Larry Heard track** across his entire career! 🎵✨
