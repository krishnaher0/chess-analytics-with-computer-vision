# 🚀 Quick Start Guide - Chess Analytics System

**Current Status:** ✅ System Ready to Run!

---

## ✅ Prerequisites Check

Your system has:
- ✅ MongoDB (v8.0.12) installed
- ✅ Stockfish installed at `/opt/homebrew/bin/stockfish`
- ✅ ML models trained (`boards.pt` and `pieces.pt`)
- ✅ Backend configured
- ✅ Frontend ready
- ✅ Python ML service ready

---

## 🎮 What You Can Do Right Now

### 1. **Detect Chess Boards** (Phase 1 ✅)
- Upload chess board images
- Use live camera to detect positions
- Get FEN positions from photos

### 2. **Play Games with Real-Time Analysis** (Phase 2 ✅)
- Play against another player
- Enable Stockfish engine during game
- See best move arrows
- Get move quality analysis (best/good/mistake/blunder)
- View evaluation bar

### 3. **Upload & Analyze PGN Games** (Phase 3 🟡)
- Upload chess games in PGN format
- View analysis history
- See stored analyses

### 4. **Create & Join Tournaments** (Phase 4 ✅)
- Create tournaments (Swiss, Round-Robin, Knockout)
- Join tournaments
- View standings and brackets
- Play tournament games

---

## 🚀 Starting the System

### Option 1: Use the Start Script (Recommended)

```bash
cd /Users/krishna613460gmail.com/ThesisBookProject
./start-all.sh
```

This will start:
- MongoDB
- Python ML Service (port 8000)
- Node.js Backend (port 5000)
- React Frontend (port 3000)

**Wait 30-60 seconds** for all services to start, then open: **http://localhost:3000**

---

### Option 2: Start Services Manually

#### Terminal 1: Start MongoDB
```bash
# MongoDB should start automatically, but if needed:
brew services start mongodb-community
# Or:
mongod --dbpath ~/data/db
```

#### Terminal 2: Start Python ML Service
```bash
cd python-ml-service
python3 -m uvicorn app.main:app --reload --port 8000
```

#### Terminal 3: Start Node.js Backend
```bash
cd backend
npm install  # First time only
npm run dev
```

#### Terminal 4: Start React Frontend
```bash
cd frontend
npm install  # First time only
npm start
```

---

## 🎯 Testing the Features

### 1. Test Board Detection

1. Open browser: http://localhost:3000
2. Register a new account (or login)
3. Click **"Detect"** → **"Upload Image"** in navbar
4. Drag and drop a chess board image
5. Click **"Analyze Board"**
6. View detected position on chessboard

**Test Images:** You can use images from:
- `chess_boards/test/images/`
- `chess_pieces/test/images/`
- Or take a photo of your own chess board!

---

### 2. Test Live Camera Detection

1. Install **IP Webcam** on your Android phone (or similar app)
2. Connect phone and computer to same WiFi
3. Start server in app, note the URL (e.g., `http://192.168.1.100:8080/shot.jpg`)
4. In browser, go to **"Detect"** → **"Live Camera"**
5. Paste URL and click **"Test Connection"**
6. Position camera over chess board
7. Click **"Capture Position"**

---

### 3. Test Game Playing with Engine

1. Click **"Play"** in navbar
2. Create a new game or join existing
3. Once in game, click **"Engine Off"** to enable it
4. You'll see:
   - **Evaluation bar** on left (white/black advantage)
   - **Best move arrow** on board (orange arrow)
   - **Engine panel** on right (top moves)
5. Make moves and watch analysis update in real-time
6. Check **move history** for quality badges:
   - 🟢 `!!` = Best move
   - 🔵 `!` = Excellent
   - 🟡 `?!` = Inaccuracy
   - 🟠 `?` = Mistake
   - 🔴 `??` = Blunder

---

### 4. Test Tournament Creation

1. Click **"Tournaments"** in navbar
2. Click **"Create Tournament"**
3. Fill in details:
   - Name: "Test Tournament"
   - Format: Swiss System
   - Time Control: 10+0 (Rapid)
   - Max Players: 8
4. Click **"Create Tournament"**
5. Invite friends or join with another account
6. Once enough players joined, click **"Start Tournament"**
7. View **Bracket** and **Standings** tabs

---

### 5. Test PGN Analysis

1. Click **"Analysis"** → **"Analyze PGN"** in navbar
2. Paste a PGN game (or upload file)
3. Click **"Analyze"**
4. View the analysis in **"Analysis"** → **"View History"**

**Sample PGN:**
```
[Event "Test Game"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5
7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4 Qc7 1-0
```

---

## 🔍 Service URLs

Once started, access:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:5000/api | REST API |
| ML Service | http://localhost:8000 | Board/piece detection |
| ML Docs | http://localhost:8000/docs | API documentation |

---

## 🛑 Stopping the System

### If using start-all.sh:
Press `Ctrl+C` in the terminal where you ran the script

### If started manually:
Press `Ctrl+C` in each terminal window

### Stop MongoDB:
```bash
brew services stop mongodb-community
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Error:** `Port 3000 already in use`

**Solution:**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different ports:
PORT=3001 npm start  # Frontend
```

### MongoDB Connection Error

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**
```bash
# Start MongoDB
brew services start mongodb-community

# Or check if it's running:
brew services list | grep mongodb
```

### Stockfish Not Found

**Error:** `Stockfish not found`

**Solution:**
- Already fixed! Path updated to `/opt/homebrew/bin/stockfish`
- Verify: `stockfish` (should open Stockfish in terminal)

### ML Service Not Working

**Error:** Module not found or model loading errors

**Solution:**
```bash
cd python-ml-service
pip3 install -r requirements.txt

# Check models exist:
ls -la models/
# Should see: boards.pt and pieces.pt
```

### Frontend Build Errors

**Error:** Module resolution errors

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                         │
│              http://localhost:3000                      │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              React Frontend (Port 3000)                 │
│  • Authentication • Games • Detection • Tournaments     │
└───────────┬─────────────────────┬───────────────────────┘
            │                     │
            │ REST API            │ WebSocket
            ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│          Node.js Backend (Port 5000)                    │
│  • JWT Auth • Game Logic • Stockfish • WebSocket        │
└───────────┬─────────────────────┬───────────────────────┘
            │                     │
            │ HTTP                │ MongoDB
            ▼                     ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Python ML Service   │   │  MongoDB Database    │
│    (Port 8000)       │   │   (Port 27017)       │
│  • Board Detection   │   │  • Users • Games     │
│  • Piece Detection   │   │  • Tournaments       │
│  • FEN Generation    │   │  • Analyses          │
└──────────────────────┘   └──────────────────────┘
```

---

## 🎓 Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| User Registration/Login | ✅ | JWT authentication |
| Board Detection (Image) | ✅ | Upload photos, get FEN |
| Board Detection (Live) | ✅ | IP Webcam streaming |
| Game Playing | ✅ | Real-time multiplayer |
| Stockfish Engine | ✅ | Real-time analysis |
| Move Quality | ✅ | Best/Good/Mistake/Blunder |
| Evaluation Bar | ✅ | Visual position assessment |
| Best Move Arrow | ✅ | Hint overlay |
| PGN Upload | ✅ | Import games |
| Analysis History | ✅ | View past analyses |
| Tournament Creation | ✅ | 4 formats supported |
| Tournament Brackets | ✅ | Visual pairings |
| Tournament Standings | ✅ | With tie-breaks |
| Leaderboards | ✅ | Global rankings |

---

## 📝 Next Steps

After testing the system:

1. **Complete Phase 3** - Full game analysis with Stockfish
2. **Implement Phase 5** - Personalized feedback (thesis core!)
3. **Add Testing** - Ensure everything works reliably
4. **Deploy** - Make it accessible to Nepali chess clubs

---

## 🎉 You're Ready to Go!

Run this command to start:

```bash
cd /Users/krishna613460gmail.com/ThesisBookProject
./start-all.sh
```

Then open: **http://localhost:3000**

**First Time Users:**
1. Register an account
2. Try board detection
3. Play a game with engine enabled
4. Create a tournament
5. Have fun! ♟️

---

**Happy Chess Analyzing! 🚀♟️**
