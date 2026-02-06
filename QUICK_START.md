# Quick Start Guide

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- MongoDB
- Docker & Docker Compose (optional but recommended)

---

## Option 1: Docker Compose (Recommended)

### 1. Start all services

```bash
chmod +x start-all.sh
./start-all.sh
```

This will start:
- MongoDB on port 27017
- Python ML Service on port 8000
- Node Backend on port 5000
- React Frontend on port 3000

### 2. Access the application

Open your browser and navigate to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **ML Service:** http://localhost:8000/docs (FastAPI Swagger)

---

## Option 2: Manual Setup

### 1. Start MongoDB

```bash
docker-compose up mongodb -d
```

Or use local MongoDB installation:
```bash
mongod --dbpath /path/to/data
```

### 2. Start Python ML Service

```bash
cd python-ml-service

# Create virtual environment (first time only)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start service
uvicorn app.main:app --reload --port 8000
```

### 3. Start Node Backend

```bash
cd backend

# Install dependencies (first time only)
npm install

# Create .env file
cp ../.env.example .env

# Edit .env with your settings:
# MONGO_URI=mongodb://localhost:27017/chess_analytics
# JWT_SECRET=your_secret_key
# ML_SERVICE_URL=http://localhost:8000
# STOCKFISH_PATH=/usr/bin/stockfish  # or path to your stockfish binary

# Start development server
npm run dev
```

### 4. Start React Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Create .env file
cp .env.example .env

# Edit .env if needed (defaults should work):
# REACT_APP_API_URL=http://localhost:5000/api
# REACT_APP_WS_URL=ws://localhost:5000

# Start development server
npm start
```

---

## First-Time Setup

### 1. Register an Account

1. Navigate to http://localhost:3000/register
2. Create a new account with username, email, and password
3. Login with your credentials

### 2. Test Vision Features

#### Image Upload Test

1. Go to **Detect → Upload Image** from the navbar
2. Drag and drop a chess board image (or click to browse)
3. Click "Analyze Board"
4. View the detected position

**Test images available in:**
- `chess_boards/test/images/`
- `chess_pieces/test/images/`

#### Live Camera Test

1. Install IP Webcam app on your Android phone (or DroidCam, etc.)
2. Connect phone and computer to the same WiFi
3. Start the server in the app
4. Go to **Detect → Live Camera**
5. Enter the camera URL (displayed in app, e.g., `http://192.168.1.100:8080/shot.jpg`)
6. Click "Test Connection"
7. Position camera over a chess board
8. Click "Capture Position" or enable auto-refresh

---

## Environment Variables

### Backend (.env)

```env
# Database
MONGO_URI=mongodb://localhost:27017/chess_analytics

# JWT Secret (change this!)
JWT_SECRET=your_super_secret_jwt_key_change_this

# ML Service
ML_SERVICE_URL=http://localhost:8000

# Stockfish Path
STOCKFISH_PATH=/usr/bin/stockfish

# Server Port
PORT=5000
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
```

---

## Troubleshooting

### ML Service Won't Start

**Issue:** Models not found

```bash
cd python-ml-service
ls -la models/

# Should see:
# boards.pt
# pieces.pt
```

**Solution:** Make sure you've trained the models or downloaded them. Check `train_board_detector.ipynb` and `train_piece_detector.ipynb`.

---

### Backend Connection Errors

**Issue:** `ECONNREFUSED` to MongoDB

**Solution:**
1. Check if MongoDB is running: `docker ps` or `ps aux | grep mongod`
2. Verify `MONGO_URI` in backend `.env`
3. Try connecting with MongoDB Compass to test

**Issue:** Cannot connect to ML service

**Solution:**
1. Check if ML service is running on port 8000
2. Visit http://localhost:8000/health
3. Verify `ML_SERVICE_URL` in backend `.env`

---

### Frontend Issues

**Issue:** API calls failing (CORS errors)

**Solution:**
1. Check backend is running on port 5000
2. Verify `REACT_APP_API_URL` in frontend `.env`
3. Backend has CORS configured for `*` in development

**Issue:** Components not loading

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

---

### Camera Connection Issues

**Issue:** Cannot connect to IP Webcam

**Checklist:**
- [ ] Phone and computer on same WiFi
- [ ] Server started in IP Webcam app
- [ ] URL includes `/shot.jpg` at the end
- [ ] Try accessing URL in browser first
- [ ] Check firewall settings

**Common URL formats:**
- IP Webcam: `http://192.168.1.X:8080/shot.jpg`
- DroidCam: `http://192.168.1.X:4747/video`
- EpocCam: `http://192.168.1.X:8080/video`

---

## Development Workflow

### Making Changes

**Backend:**
- Nodemon auto-restarts on file changes
- Check terminal for errors

**Frontend:**
- React hot-reloads automatically
- Check browser console for errors

**ML Service:**
- Uvicorn auto-reloads with `--reload` flag
- Visit http://localhost:8000/docs to test endpoints

### Testing Endpoints

**Using Postman/Insomnia:**

1. **Register:**
   ```
   POST http://localhost:5000/api/auth/register
   Body: {
     "username": "testuser",
     "email": "test@example.com",
     "password": "password123"
   }
   ```

2. **Login:**
   ```
   POST http://localhost:5000/api/auth/login
   Body: {
     "email": "test@example.com",
     "password": "password123"
   }

   Response: { "token": "eyJhbG..." }
   ```

3. **Upload Image:**
   ```
   POST http://localhost:5000/api/detection/upload-image
   Headers: {
     "Authorization": "Bearer YOUR_TOKEN"
   }
   Body: form-data
     - image: [select file]
   ```

---

## Project Structure

```
ThesisBookProject/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── models/         # MongoDB models
│   │   ├── middleware/     # Auth, validation
│   │   └── utils/          # Helpers (Stockfish, PGN)
│   └── package.json
│
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   └── Detection/ # Vision features
│   │   ├── pages/         # Route pages
│   │   ├── context/       # Auth, Game context
│   │   └── App.js
│   └── package.json
│
├── python-ml-service/     # FastAPI ML service
│   ├── app/
│   │   ├── main.py        # FastAPI app
│   │   ├── detector.py    # YOLO detection
│   │   └── fen_generator.py
│   ├── models/
│   │   ├── boards.pt      # Board detection model
│   │   └── pieces.pt      # Piece detection model
│   └── requirements.txt
│
├── chess_boards/          # Board detection dataset
├── chess_pieces/          # Piece detection dataset
├── docker-compose.yml     # Docker orchestration
├── IMPLEMENTATION_PLAN.md # Full roadmap
└── QUICK_START.md        # This file
```

---

## Common Commands

### Docker

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild after changes
docker-compose up --build
```

### Development

```bash
# Backend
cd backend
npm run dev           # Start with nodemon
npm start            # Start without nodemon

# Frontend
cd frontend
npm start            # Development server
npm run build        # Production build

# ML Service
cd python-ml-service
uvicorn app.main:app --reload  # Development
uvicorn app.main:app          # Production
```

### Database

```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/chess_analytics"

# Show collections
show collections

# Find users
db.users.find()

# Find games
db.games.find()
```

---

## Next Steps

1. ✅ Complete Phase 1 (Vision Integration) - DONE
2. ⏳ Start Phase 2 (Game Playing & Stockfish)
3. ⏳ Implement PGN Analysis
4. ⏳ Build Tournament System
5. ⏳ Create Personalized Feedback

See **IMPLEMENTATION_PLAN.md** for full roadmap.

---

## Getting Help

- Check **IMPLEMENTATION_PLAN.md** for detailed architecture
- Check **PHASE_1_COMPLETE.md** for Phase 1 status
- Review API documentation at http://localhost:8000/docs (ML Service)
- Backend routes are in `backend/src/routes/`
- Frontend components are in `frontend/src/components/`

---

## Tips

1. **Keep terminals open** to see real-time logs
2. **Use browser DevTools** (F12) to debug frontend issues
3. **Test ML service independently** at http://localhost:8000/docs
4. **Use MongoDB Compass** for database visualization
5. **Check Docker logs** if containers fail: `docker-compose logs`

---

Happy coding! 🚀♟️
