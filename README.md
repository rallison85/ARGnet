# ARG OS - Alternate Reality Game Collaboration Platform

ARG OS is a comprehensive full-stack application designed for creating and managing Alternate Reality Games (ARGs). Built for teams of writers, artists, programmers, and designers to collaborate on immersive narrative experiences.

## Features

### Project Management
- Create and manage multiple ARG projects
- Team collaboration with role-based permissions (Owner, Admin, Lead, Contributor, Viewer)
- Project status tracking (Planning, Development, Testing, Live, Concluded)

### Narrative Design
- **Story Beats**: Hierarchical story structure with acts, chapters, scenes, and moments
- **Characters**: Complete character management with relationships, backstories, and voice notes
- **Lore Entries**: World-building encyclopedia organized by category
- **In-Universe Timeline**: Chronological events in the ARG's fictional world

### Puzzle & Trail Design
- **Puzzle Designer**: Create puzzles with types, difficulty levels, hints, and solutions
- **Clue Management**: Track how clues are delivered and discovered
- **Trail Map**: Visual node-based editor for designing the player's discovery path
- **Rabbit Hole Planning**: Map entry points, waypoints, branches, and endings

### Production Tools
- **Live Events**: Plan and coordinate real-world performances and installations
- **Staff Management**: Assign team members to events with role tracking
- **Locations**: Manage physical and virtual locations for the ARG
- **Digital Properties**: Track in-game websites, social media accounts, and other digital assets

### Asset Management
- Upload and organize images, videos, audio, and documents
- Version control for assets
- Categorization and tagging

### Task Management
- Kanban-style task board
- Priority levels and assignment
- Department and task type categorization

### Collaboration Features
- Real-time updates via WebSocket
- Activity logging and audit trail
- Comment threads on any entity
- Team notifications

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **SQLite** with **better-sqlite3** for data persistence
- **JWT** authentication
- **Socket.IO** for real-time features
- **Multer** for file uploads

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query** for data fetching
- **React Flow** for visual trail mapping
- **Zustand** for state management
- **Socket.IO Client** for real-time updates

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ARG OS
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
cp server/.env.example server/.env
# Edit server/.env with your settings
```

4. Initialize the database:
```bash
npm run db:migrate
npm run db:seed  # Optional: adds demo data
```

5. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Demo Accounts

If you ran the seed script, these accounts are available:
- `admin@argos.io` / `demo123` - Admin user
- `writer@argos.io` / `demo123` - Writer role
- `artist@argos.io` / `demo123` - Artist role
- `dev@argos.io` / `demo123` - Developer role

## Project Structure

```
ARG OS/
├── client/                 # React frontend
│   ├── src/
│   │   ├── layouts/       # Page layouts
│   │   ├── lib/           # API client & utilities
│   │   ├── pages/         # Page components
│   │   │   ├── auth/      # Login/Register
│   │   │   └── project/   # Project-specific pages
│   │   └── stores/        # Zustand stores
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── db/            # Database schema & migrations
│   │   ├── middleware/    # Auth & error handling
│   │   ├── routes/        # API endpoints
│   │   └── utils/         # Helper functions
│   └── ...
└── package.json           # Root package with scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Project Resources
All project resources follow the pattern `/api/projects/:projectId/<resource>`:
- `/stories` - Story beats and narrative structure
- `/characters` - Characters and relationships
- `/puzzles` - Puzzles and clues
- `/trails` - Trail nodes and connections
- `/events` - Live events and staff
- `/assets` - Media and file uploads
- `/tasks` - Task management
- `/lore` - World-building entries
- `/timeline` - In-universe chronology
- `/locations` - Physical and virtual locations
- `/digital-properties` - Websites, social media, etc.
- `/comments` - Discussion threads
- `/activity` - Activity log

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

Inspired by the immersive experiences created by groups like The Fourcast Labs in Chicago and other pioneering ARG creators worldwide.
