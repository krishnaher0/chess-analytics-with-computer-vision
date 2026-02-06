# Real-Time Chess Analytics System - Implementation Plan

## Project Overview

**Thesis Title:** Real-Time Chess Analytics Prototype: Integrating Digital Game Technology and Stockfish Metrics for Personalized Performance Feedback in Local Nepali Clubs

**Primary Aim:** Design and develop a prototype system for real-time chess analysis in Nepali chess clubs, leveraging digital game technology and engine-based evaluation to improve player performance and training.

---

## Current Status Assessment

### ✅ Completed Components

1. **ML Models (YOLO-based)**
   - Board detection model: `boards.pt` (trained, validated)
   - Piece detection model: `pieces.pt` (trained, 12 classes validated)
   - Training notebooks completed (Google Colab T4)
   - Models stored in: `python-ml-service/models/`

2. **Python ML Service (FastAPI)**
   - Board detection endpoint: `/detect/board`
   - Piece detection endpoint: `/detect/pieces`
   - Full pipeline endpoint: `/detect/full`
   - URL-based detection: `/detect/from_url` (IP Webcam support)
   - FEN generation from detected positions
   - Health check endpoint

3. **Backend (Node.js/Express)**
   - MongoDB integration (Mongoose)
   - User authentication (JWT-based)
   - WebSocket server for real-time communication
   - Basic game routes
   - Tournament routes (partial)
   - Profile routes
   - Detection routes (ML service integration)
   - Stockfish utilities (partial)

4. **Frontend (React)**
   - Basic routing structure
   - Authentication context
   - Game context
   - React Chessboard integration
   - Chart.js setup for analytics

5. **Infrastructure**
   - Docker Compose setup
   - MongoDB, Node Backend, Python ML Service, React Frontend
   - GPU support for ML service

---

## Implementation Roadmap

### Phase 1: Core Vision Integration & FEN Processing

#### 1.1 Chess Position Detection Enhancement
**Status:** Partially Implemented
**Tasks:**
- [ ] Add static image upload endpoint to backend
  - Create multer configuration for image uploads
  - Route: `POST /api/detection/upload-image`
  - Store upload temporarily, call ML service, return FEN + visualization

- [ ] Add video upload processing
  - Route: `POST /api/detection/upload-video`
  - Extract frames at configurable intervals (1fps, 2fps, etc.)
  - Process each frame through ML pipeline
  - Return array of FEN positions with timestamps
  - Generate PGN from move sequence if valid

- [ ] Enhance IPWebcam live feed integration
  - Route: `POST /api/detection/live-stream`
  - Support continuous polling mode
  - WebSocket endpoint for streaming FEN updates: `/ws/detection/live`
  - Frontend component for live camera feed preview
  - Auto-detect move changes and notify

- [ ] Board orientation detection
  - Add logic to detect if board is from white/black perspective
  - Allow manual override in UI
  - Store preference per user/session

**Dependencies:** ML Service (completed), Multer, FFmpeg (for video)

---

#### 1.2 Frontend Vision Integration Components
**Status:** Not Started
**Tasks:**
- [ ] Create `ImageUploadAnalyzer` component
  - Drag-and-drop image upload
  - Display detected board visualization
  - Show FEN string and chessboard representation
  - Option to "Save to Analysis History"

- [ ] Create `VideoUploadAnalyzer` component
  - Video file upload with progress bar
  - Frame extraction preview
  - Timeline slider to view positions at different timestamps
  - Generate game from detected moves
  - Export to PGN

- [ ] Create `LiveCameraAnalyzer` component
  - Input field for IP Webcam URL
  - Live camera feed preview
  - Real-time FEN updates
  - "Capture Position" button to freeze and analyze
  - "Start Game from Position" feature

- [ ] Create shared `BoardVisualization` component
  - Display detected board with confidence scores
  - Highlight detected pieces with bounding boxes
  - Show piece classification labels
  - Toggle between detected image and clean board view

**Dependencies:** Backend detection routes, react-chessboard

---

### Phase 2: Game Playing & Real-Time Analysis

#### 2.1 Enhanced Game Playing System
**Status:** Partially Implemented
**Tasks:**
- [ ] Implement comprehensive game state management
  - Create `GameController` class in backend
  - Handle move validation using chess.js
  - Store game state in MongoDB (moves, clocks, positions)
  - Support multiple game modes: casual, rated, tournament

- [ ] Real-time move synchronization
  - Enhance WebSocket to broadcast moves immediately
  - Implement move acknowledgment system
  - Handle disconnection/reconnection gracefully
  - Store incomplete games for resume

- [ ] Time controls implementation
  - Support classical, rapid, blitz, bullet time controls
  - Increment/delay support (Fischer, Bronstein)
  - Backend timer management
  - WebSocket clock synchronization
  - Auto-flag on time expiration

- [ ] Game result handling
  - Checkmate detection (chess.js)
  - Stalemate, draw by repetition, 50-move rule
  - Resignation, timeout, abandonment
  - Store final result in database

**Dependencies:** chess.js, WebSocket (completed), MongoDB models

---

#### 2.2 Stockfish Integration & Real-Time Analysis
**Status:** Partially Implemented
**Tasks:**
- [ ] Complete Stockfish service wrapper
  - Create `StockfishEngine` class in `backend/src/utils/stockfish.js`
  - Support multiple concurrent analysis sessions
  - Configurable depth and time limits
  - UCI protocol implementation

- [ ] Real-time engine analysis during games
  - Route: `POST /api/analysis/position`
  - Input: FEN, depth, multi-pv
  - Output: evaluation, best moves, principal variations

- [ ] Engine toggle system
  - Backend: Track engine-enabled state per game
  - Frontend: "Engine On/Off" toggle button
  - WebSocket: Stream engine analysis in real-time
  - Display best move arrow overlay on board
  - Show evaluation bar

- [ ] Move quality classification
  - Analyze each move after played
  - Classify: Best (!), Excellent, Good, Inaccuracy (?!), Mistake (?), Blunder (??)
  - Store move annotations in game record
  - Display badges in move history

- [ ] Opening book integration
  - Detect opening name from ECO database
  - Display opening name during game
  - Store opening played in game metadata

**Dependencies:** Stockfish binary (in Docker), chess.js, UCI parser

---

#### 2.3 Frontend Game Interface
**Status:** Partially Implemented
**Tasks:**
- [ ] Enhanced `PlayGame` component
  - Chessboard with drag-and-drop moves
  - Move history panel with annotations
  - Player information and clocks display
  - Chat/communication panel
  - Evaluation bar (when engine enabled)
  - Best move arrow overlay

- [ ] Game controls
  - Resign button
  - Offer draw button
  - Request takeback (casual games)
  - Engine toggle (for training games)

- [ ] Post-game immediate review
  - Show critical moments automatically
  - Display move quality distribution graph
  - Highlight blunders and missed wins
  - "Analyze Full Game" button

**Dependencies:** react-chessboard, WebSocket client, Chart.js

---

### Phase 3: Game Analysis System

#### 3.1 PGN Analysis Engine
**Status:** Partially Implemented
**Tasks:**
- [ ] PGN import and parsing
  - Route: `POST /api/analysis/pgn/import`
  - Parse PGN using chess.js
  - Validate game format
  - Extract metadata (players, event, date, result)

- [ ] Comprehensive game analysis
  - Route: `POST /api/analysis/pgn/analyze`
  - Analyze every position with Stockfish
  - Calculate accuracy percentages per player
  - Identify tactical opportunities (tactics found/missed)
  - Detect game phases: opening, middlegame, endgame
  - Compute centipawn loss per move

- [ ] Critical moments detection
  - Find positions where evaluation swung significantly
  - Mark brilliant moves, blunders, missed wins
  - Identify turning points in the game

- [ ] Analysis report generation
  - Generate structured analysis report
  - Include move-by-move breakdown
  - Player comparison statistics
  - Key positions with diagrams
  - Recommendations for improvement

**Dependencies:** Stockfish, chess.js, PGN parser

---

#### 3.2 Analysis History & Storage
**Status:** Not Started
**Tasks:**
- [ ] Create `Analysis` database model
  - Store analyzed games (PGN, analysis data, report)
  - Link to user who requested analysis
  - Timestamp, game metadata
  - Share status (private/public)

- [ ] Analysis history routes
  - `GET /api/analysis/history` - list user's analyzed games
  - `GET /api/analysis/:id` - retrieve specific analysis
  - `DELETE /api/analysis/:id` - delete analysis
  - `POST /api/analysis/:id/share` - generate shareable link

- [ ] Frontend analysis history page
  - List of analyzed games (sortable, filterable)
  - Preview cards with key stats
  - Search by player name, date, opening
  - Pagination

**Dependencies:** MongoDB, backend routes

---

#### 3.3 Frontend Analysis Viewer
**Status:** Not Started
**Tasks:**
- [ ] Create `AnalysisViewer` component
  - Interactive chessboard showing game
  - Move list with evaluations and annotations
  - Engine lines panel (show principal variations)
  - Evaluation graph (full game)
  - Navigate moves with keyboard arrows

- [ ] Tactical opportunities panel
  - List "Best Moves Missed" with positions
  - Show correct continuation vs. what was played
  - Interactive training: "What would you play here?"

- [ ] Game summary dashboard
  - Accuracy percentages (visual gauge)
  - Move quality pie chart
  - Opening, middlegame, endgame performance breakdown
  - Centipawn loss graph per phase
  - Time usage analysis

- [ ] Export analyzed game
  - Export as annotated PGN
  - Export as PDF report
  - Share link generation

**Dependencies:** react-chessboard, Chart.js, recharts or similar

---

### Phase 4: Tournament System

#### 4.1 Tournament Management Backend
**Status:** Partially Implemented
**Tasks:**
- [ ] Enhanced `Tournament` model
  - Tournament types: round-robin, Swiss, knockout
  - Time controls, rated/unrated
  - Registration dates, start date
  - Max participants
  - Entry fee (optional, for future payment integration)
  - Status: upcoming, ongoing, completed

- [ ] Tournament routes
  - `POST /api/tournaments/create` - create tournament
  - `GET /api/tournaments` - list all tournaments (filter by status)
  - `GET /api/tournaments/:id` - tournament details
  - `POST /api/tournaments/:id/register` - register for tournament
  - `POST /api/tournaments/:id/start` - start tournament (generate pairings)
  - `POST /api/tournaments/:id/withdraw` - withdraw from tournament

- [ ] Pairing generation
  - Round-robin: all-vs-all
  - Swiss: implement Swiss pairing algorithm
  - Knockout: bracket generation
  - Avoid rematches when possible
  - Handle byes for odd participants

- [ ] Tournament progress tracking
  - Auto-advance rounds when all games complete
  - Update standings after each game
  - Calculate tie-breaks (Buchholz, Sonneborn-Berger)
  - Notify participants of pairings via WebSocket/email

**Dependencies:** MongoDB, chess pairing algorithms

---

#### 4.2 Tournament Frontend
**Status:** Partially Implemented
**Tasks:**
- [ ] `TournamentList` page
  - Display upcoming, ongoing, completed tournaments
  - Filter and search
  - Registration status indicator
  - Join/register button

- [ ] `TournamentDetail` page
  - Tournament information (format, time control, dates)
  - Participants list
  - Standings table (live updated)
  - Pairings for each round
  - Games in progress (live board previews)

- [ ] `CreateTournament` page (admin/organizer)
  - Form for tournament creation
  - Select format, time control, dates
  - Invite-only or public registration

- [ ] Tournament game interface
  - Same as regular game interface
  - Display tournament context (round, opponent)
  - No takebacks allowed
  - Auto-report result to tournament

**Dependencies:** Backend tournament routes, WebSocket

---

#### 4.3 Leaderboards
**Status:** Not Started
**Tasks:**
- [ ] Overall leaderboard
  - Route: `GET /api/leaderboards/overall`
  - Ranked by rating (Elo or similar)
  - Filter by time control (blitz, rapid, classical)

- [ ] Tournament-specific leaderboards
  - Route: `GET /api/leaderboards/tournament/:id`
  - Show standings with tie-breaks
  - Update live during tournament

- [ ] Frontend leaderboard page
  - Display top players
  - Show player stats (games played, win rate, rating)
  - Highlight current user's position
  - Pagination for large lists

**Dependencies:** Rating calculation system, backend routes

---

### Phase 5: Personalized Feedback & Improvement Suggestions

#### 5.1 User Game History Analysis
**Status:** Not Started
**Tasks:**
- [ ] Game history aggregation service
  - Route: `POST /api/profile/analyze-history`
  - Fetch all user's completed games
  - Run batch analysis with Stockfish (if not already analyzed)
  - Aggregate statistics across all games

- [ ] Performance metrics calculation
  - Overall accuracy per phase (opening, middlegame, endgame)
  - Move quality distribution (brilliant/good/inaccuracy/mistake/blunder counts)
  - Time management (average time per move, time pressure moments)
  - Opening repertoire (most played openings, win rates)
  - Endgame performance

- [ ] Weakness identification
  - Identify phase with lowest accuracy
  - Detect tactical blindness patterns
  - Find recurring opening mistakes
  - Flag time management issues

- [ ] Improvement recommendations
  - Generate specific advice based on weaknesses
  - Suggest training focus areas
  - Recommend puzzle types (tactics, endgames, openings)
  - Provide resource links (opening theory, endgame tutorials)

**Dependencies:** Stockfish, game history, analysis engine

---

#### 5.2 Personalized Feedback Engine
**Status:** Partially Implemented
**Tasks:**
- [ ] Complete `feedbackEngine.js` implementation
  - Input: user game history stats
  - Output: structured feedback report
  - Natural language generation for advice
  - Categorize feedback: tactical, positional, time management, opening, endgame

- [ ] Progress tracking
  - Store historical performance snapshots
  - Compare current vs. past performance
  - Show improvement trends over time
  - Celebrate milestones (rating gains, accuracy improvements)

- [ ] Frontend feedback dashboard
  - Route: `/profile/feedback`
  - Display personalized recommendations
  - Show performance trends (charts)
  - Phase-wise accuracy radar chart
  - Recent improvement areas

**Dependencies:** Game history analysis, Chart.js, backend feedback routes

---

### Phase 6: Authentication & Authorization

#### 6.1 Enhanced Authentication
**Status:** Partially Implemented
**Tasks:**
- [ ] Complete registration flow
  - Email verification (optional but recommended)
  - Password strength requirements
  - CAPTCHA to prevent bots

- [ ] Login enhancements
  - Remember me functionality
  - JWT refresh tokens
  - Session management (logout from all devices)

- [ ] Password recovery
  - Forgot password flow
  - Email with reset link
  - Secure token generation and validation

- [ ] OAuth integration (optional, future)
  - Google Sign-In
  - Facebook Login

**Dependencies:** Nodemailer or email service, bcrypt (already used)

---

#### 6.2 Authorization & Roles
**Status:** Partially Implemented
**Tasks:**
- [ ] User roles system
  - Roles: player, coach, admin, tournament_organizer
  - Store roles in User model

- [ ] Role-based access control (RBAC)
  - Middleware to check roles
  - Restrict tournament creation to organizers
  - Admin panel routes (user management, content moderation)

- [ ] Coach features
  - Coaches can view assigned students' games
  - Provide personalized feedback to students
  - Track student progress

**Dependencies:** JWT middleware, User model enhancement

---

### Phase 7: Integration & Testing

#### 7.1 End-to-End Integration
**Status:** Not Started
**Tasks:**
- [ ] Integrate vision system with game creation
  - Upload image/video → detect position → "Start game from this position"
  - Live camera → detect move → auto-play in ongoing game

- [ ] Integrate analysis with tournaments
  - Auto-analyze all tournament games post-completion
  - Tournament report with player performance

- [ ] Integrate feedback system with game playing
  - After each game, suggest review if performance dipped
  - Prompt user to analyze game in history

**Dependencies:** All previous phases

---

#### 7.2 Testing Strategy
**Status:** Not Started
**Tasks:**
- [ ] Unit tests
  - Backend: test routes, models, utilities
  - Frontend: test components with Jest/React Testing Library
  - ML Service: test detection accuracy

- [ ] Integration tests
  - Test full workflows: register → play game → analyze → get feedback
  - Test tournament flows
  - Test vision detection → game creation

- [ ] Load testing
  - WebSocket performance with multiple concurrent games
  - Stockfish analysis under load
  - ML service throughput

- [ ] User acceptance testing (UAT)
  - Deploy to staging environment
  - Test with real Nepali chess club members
  - Gather feedback on usability and accuracy

**Dependencies:** Testing frameworks (Jest, Pytest, Locust)

---

### Phase 8: Deployment & Documentation

#### 8.1 Production Deployment
**Status:** Not Started
**Tasks:**
- [ ] Environment configuration
  - Production .env files (secrets management)
  - Use environment variables for all config

- [ ] Cloud deployment
  - Deploy backend (AWS, Heroku, or DigitalOcean)
  - Deploy frontend (Vercel, Netlify)
  - Deploy ML service (GPU instance - AWS EC2 with GPU, Google Cloud)
  - MongoDB Atlas for production database

- [ ] CI/CD pipeline
  - GitHub Actions for automated testing
  - Auto-deploy on merge to main branch

- [ ] Monitoring and logging
  - Application logs (Winston, Pino)
  - Error tracking (Sentry)
  - Performance monitoring (New Relic, Datadog)

**Dependencies:** Cloud accounts, CI/CD setup

---

#### 8.2 Documentation
**Status:** Not Started
**Tasks:**
- [ ] API documentation
  - Use Swagger/OpenAPI for REST API docs
  - Document WebSocket message formats

- [ ] User guide
  - How to create account
  - How to play games
  - How to analyze games
  - How to participate in tournaments
  - How to use vision detection (upload image, camera)

- [ ] Developer documentation
  - Architecture overview
  - Setup instructions (local development)
  - Database schema
  - Deployment guide

- [ ] Thesis documentation
  - System design chapter
  - Implementation details
  - Testing and validation results
  - Screenshots and diagrams
  - Conclusions and future work

**Dependencies:** Swagger, markdown, thesis template

---

## Technology Stack Summary

### Backend
- **Framework:** Node.js with Express
- **Database:** MongoDB with Mongoose
- **Real-time:** WebSocket (ws package)
- **Authentication:** JWT (jsonwebtoken, bcryptjs)
- **Chess Logic:** chess.js
- **Engine:** Stockfish (UCI protocol)

### Frontend
- **Framework:** React 18
- **Routing:** react-router-dom
- **State:** Context API (AuthContext, GameContext)
- **UI:** Tailwind CSS
- **Chessboard:** react-chessboard
- **Charts:** Chart.js, react-chartjs-2
- **HTTP Client:** axios

### ML Service
- **Framework:** FastAPI
- **Server:** Uvicorn
- **Vision Models:** Ultralytics YOLOv8s
- **Image Processing:** OpenCV, Pillow
- **Deep Learning:** PyTorch
- **Chess Utils:** python-chess

### Infrastructure
- **Containerization:** Docker, Docker Compose
- **Database:** MongoDB 7.0
- **GPU:** CUDA support for ML service

---

## Database Schema Overview

### User
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  rating: Number,
  roles: [String],
  createdAt: Date,
  // Future: elo per time control, profile settings
}
```

### Game
```javascript
{
  _id: ObjectId,
  players: {
    white: ObjectId (User),
    black: ObjectId (User)
  },
  pgn: String,
  result: String,
  timeControl: {
    initial: Number,
    increment: Number
  },
  moves: [{ move: String, fen: String, timestamp: Date }],
  tournamentId: ObjectId (optional),
  analyzed: Boolean,
  analysisId: ObjectId (optional),
  createdAt: Date,
  endedAt: Date
}
```

### Tournament
```javascript
{
  _id: ObjectId,
  name: String,
  format: String, // round-robin, swiss, knockout
  timeControl: Object,
  startDate: Date,
  endDate: Date,
  status: String, // upcoming, ongoing, completed
  participants: [ObjectId (User)],
  rounds: [
    {
      roundNumber: Number,
      pairings: [{ white: ObjectId, black: ObjectId, gameId: ObjectId }]
    }
  ],
  standings: [{ userId: ObjectId, points: Number, tieBreak: Number }],
  createdBy: ObjectId (User)
}
```

### Analysis
```javascript
{
  _id: ObjectId,
  gameId: ObjectId,
  userId: ObjectId (who requested),
  report: {
    accuracy: { white: Number, black: Number },
    moveQuality: {
      brilliant: Number,
      good: Number,
      inaccuracy: Number,
      mistake: Number,
      blunder: Number
    },
    phases: {
      opening: { moves: [String], accuracy: Number },
      middlegame: { moves: [String], accuracy: Number },
      endgame: { moves: [String], accuracy: Number }
    },
    criticalMoments: [
      { fen: String, move: Number, evaluation: Number, comment: String }
    ],
    tacticalOpportunities: [
      { fen: String, move: Number, bestMove: String, playerMove: String }
    ]
  },
  createdAt: Date
}
```

---

## Milestones & Timeline

### Milestone 1: Vision System Complete
**Target:** End of Week 2
**Deliverables:**
- Image upload + analysis working
- Video upload + frame extraction working
- Live camera integration working
- Frontend components for all vision features

### Milestone 2: Game Playing + Real-Time Analysis Complete
**Target:** End of Week 4
**Deliverables:**
- Full game playing with time controls
- Stockfish integration working
- Engine toggle + best move display
- Move annotations in real-time

### Milestone 3: Analysis System Complete
**Target:** End of Week 6
**Deliverables:**
- PGN import and full analysis
- Analysis history and storage
- Analysis viewer with all visualizations
- Tactical opportunities detection

### Milestone 4: Tournament System Complete
**Target:** End of Week 8
**Deliverables:**
- Tournament creation and management
- Pairing algorithms for all formats
- Tournament UI complete
- Leaderboards working

### Milestone 5: Personalized Feedback Complete
**Target:** End of Week 10
**Deliverables:**
- User game history aggregation
- Weakness identification algorithms
- Improvement recommendations
- Feedback dashboard

### Milestone 6: Testing & Deployment
**Target:** End of Week 12
**Deliverables:**
- All unit and integration tests passing
- UAT with real users
- Production deployment
- Documentation complete

---

## Risk Assessment & Mitigation

### Technical Risks

1. **ML Model Accuracy in Real-World Conditions**
   - **Risk:** Models trained on limited data may fail with different lighting, angles, board styles
   - **Mitigation:** Collect more diverse training data from Nepali clubs, implement confidence thresholds, allow manual correction

2. **Stockfish Performance Under Load**
   - **Risk:** Multiple concurrent deep analyses may overload server
   - **Mitigation:** Implement job queue (Bull/Redis), limit concurrent analyses, use depth/time limits

3. **WebSocket Scalability**
   - **Risk:** Many concurrent games may strain WebSocket server
   - **Mitigation:** Use horizontal scaling with sticky sessions, consider Redis pub/sub for multi-instance

4. **Video Processing Memory Usage**
   - **Risk:** Large video uploads may cause OOM errors
   - **Mitigation:** Implement streaming processing, file size limits, temporary file cleanup

### User Experience Risks

1. **Slow Analysis for Long Games**
   - **Risk:** 60-move game analysis takes too long, user abandons
   - **Mitigation:** Show progress bar, allow background analysis with notification

2. **Camera Setup Complexity**
   - **Risk:** Users struggle to set up IP Webcam correctly
   - **Mitigation:** Detailed setup guide with screenshots, test connection button, troubleshooting tips

3. **Learning Curve for Advanced Features**
   - **Risk:** Users overwhelmed by analysis reports and terminology
   - **Mitigation:** Onboarding tutorial, tooltips, simplified view with "Show Details" option

---

## Success Metrics

1. **Technical Performance**
   - ML model accuracy: >90% board detection, >85% piece classification
   - FEN generation accuracy: >95% on clear images
   - Analysis completion time: <30 seconds for 40-move game
   - WebSocket latency: <100ms for move propagation

2. **User Engagement**
   - >50 registered users in first month
   - >100 games played per week
   - >20% of users analyze their games
   - >5 tournaments organized

3. **Educational Impact**
   - Average user rating improvement: +50 points after 20 analyzed games
   - User-reported skill improvement: >70% positive feedback
   - Feature usage: >60% use personalized feedback

---

## Next Steps

1. **Review this plan** with your thesis advisor and gather feedback
2. **Prioritize features** based on thesis requirements and user needs
3. **Set up project tracking** (GitHub Projects, Jira, or Trello)
4. **Begin Phase 1 implementation** starting with vision integration
5. **Schedule regular progress reviews** (weekly or bi-weekly)
6. **Prepare for user testing** by identifying pilot users in Nepali chess clubs

---

## Notes & Assumptions

- Assumes Stockfish binary is available in the Docker container (currently path set to `/usr/bin/stockfish`)
- Assumes sufficient GPU memory for ML models (tested with T4 16GB)
- Assumes users have basic chess knowledge (don't need to teach rules)
- Assumes internet connectivity for cloud-based deployment
- Assumes English as primary language (localization to Nepali could be future work)

---

**Document Version:** 1.0
**Last Updated:** February 6, 2026
**Prepared By:** AI Assistant (Claude)
**Status:** Draft for Review
