# Claude Workflow Manager

A web-based application for managing Claude Code workflows including brand data generation, content brief creation, and draft generation.

## Features

- **Brand Data Generation**: Automatically research and generate comprehensive brand data from URLs
- **Brief Generation**: Create SEO-optimized content briefs with competitor analysis
- **Draft Generation**: Generate full content drafts based on briefs and brand data
- **Real-time Monitoring**: Watch job progress with live log streaming
- **File Management**: Upload, view, download, and delete files through the UI

## Architecture

### Backend (Python/FastAPI)
- FastAPI REST API server
- Async job execution with subprocess management
- Server-Sent Events (SSE) for real-time log streaming
- File-based storage for JSON and Markdown files

### Frontend (React/Vite)
- React 18 with Vite build tool
- TailwindCSS for styling
- Lucide React icons
- React Markdown for rendering
- EventSource API for SSE

## Prerequisites

- Python 3.9+
- Node.js 18+
- **Claude Code CLI installed and configured** (required!)
- npm or yarn package manager

### Important: Claude Code Configuration

This application uses the `--dangerously-skip-permissions` flag to allow Claude Code to run non-interactively. This means:
- ✅ Web searches and fetches happen automatically
- ✅ File writes happen without prompts
- ⚠️ All tool usage is auto-approved

This is **safe for local development** but understand that Claude Code will have full access to:
- Web search and fetch capabilities
- File write operations in the project directory
- All other Claude Code tools

See [PERMISSIONS_FIX.md](PERMISSIONS_FIX.md) for detailed security information.

## Quick Start

### Local Development
See installation instructions below.

### Deploy to Coolify (Recommended for Production)
See [COOLIFY_QUICKSTART.md](COOLIFY_QUICKSTART.md) for a streamlined deployment guide.

For detailed deployment information:
- **Quick Start**: [COOLIFY_QUICKSTART.md](COOLIFY_QUICKSTART.md)
- **Full Guide**: [COOLIFY_DEPLOYMENT.md](COOLIFY_DEPLOYMENT.md)
- **Deployment Checklist**: [COOLIFY_CHECKLIST.md](COOLIFY_CHECKLIST.md)

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Start the Backend Server

From the `backend` directory:
```bash
python app.py
```

The backend server will start on `http://localhost:8000`

### Start the Frontend Development Server

From the `frontend` directory:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Usage

### Brand Data Generation

1. Navigate to the "Brand Data" tab
2. Enter one or more brand URLs (space-separated)
3. Click "Generate Brand Data"
4. Monitor the progress in the log viewer
5. View generated files in the list below

### Brief Generation

1. Navigate to the "Brief Generation" tab
2. Fill in the form:
   - Title (required)
   - Primary Keyword (required)
   - Secondary Keywords (comma-separated)
   - Select Brand Data file (required)
3. Click "Generate Brief"
4. View generated briefs in the list

### Draft Generation

1. Navigate to the "Draft Generation" tab
2. Select a brief file from the dropdown
3. Select a brand data file from the dropdown
4. Click "Generate Draft"
5. Drafts over 2500 words will be automatically revised
6. View generated drafts with word count status

## Directory Structure

```
claude-workflow-manager/
├── backend/
│   ├── app.py                    # Main FastAPI application
│   ├── requirements.txt          # Python dependencies
│   ├── brand-data/              # Generated brand JSON files
│   ├── brief-outputs/           # Generated brief markdown files
│   ├── draft-outputs/           # Generated draft markdown files
│   ├── instructions/            # Generation instruction templates
│   │   ├── brief_generation_instructions.md
│   │   └── draft_generation_instructions.md
│   └── logs/                    # Job execution logs
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── BrandDataTab.jsx
│   │   │   ├── BriefTab.jsx
│   │   │   ├── DraftTab.jsx
│   │   │   ├── ActiveJobsPanel.jsx
│   │   │   └── LogViewer.jsx
│   │   ├── api.js              # API client
│   │   ├── App.jsx             # Main application component
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

## API Endpoints

### Brand Data
- `GET /api/brand-data` - List all brand data files
- `GET /api/brand-data/{filename}` - Get specific brand data
- `POST /api/brand-data/upload` - Upload brand data JSON
- `DELETE /api/brand-data/{filename}` - Delete brand data
- `POST /api/brand-data/generate` - Start generation job

### Briefs
- `GET /api/briefs` - List all briefs
- `GET /api/briefs/{filename}` - Get specific brief
- `POST /api/briefs/upload` - Upload brief markdown
- `DELETE /api/briefs/{filename}` - Delete brief
- `POST /api/briefs/generate` - Start generation job

### Drafts
- `GET /api/drafts` - List all drafts
- `GET /api/drafts/{filename}` - Get specific draft
- `POST /api/drafts/upload` - Upload draft markdown
- `DELETE /api/drafts/{filename}` - Delete draft
- `POST /api/drafts/generate` - Start generation job

### Jobs
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/{job_id}` - Get job status
- `GET /api/jobs/{job_id}/logs` - Stream job logs (SSE)

## Limitations

- Maximum 3 concurrent jobs
- Files limited to 10MB
- Job logs retained for execution duration only
- No user authentication (single-user system)

## Troubleshooting

### Backend Issues

**Error: Module not found**
```bash
# Ensure you're in the virtual environment and dependencies are installed
pip install -r requirements.txt
```

**Error: Port 8000 already in use**
```bash
# Change the port in app.py or kill the existing process
lsof -ti:8000 | xargs kill -9
```

### Frontend Issues

**Error: Cannot connect to backend**
- Ensure the backend server is running on port 8000
- Check CORS settings in app.py

**Error: Module not found**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development

### Backend Development
- **Auto-Reload Enabled**: The FastAPI server automatically restarts when you make changes
- Modify `app.py` or any Python file and save - server reloads within 1-2 seconds
- See [AUTO_RELOAD.md](AUTO_RELOAD.md) for detailed information
- For production deployment without auto-reload, use: `./start-backend-production.sh`

### Frontend Development
- **Hot Module Replacement (HMR)**: Vite provides instant updates
- Changes to React components update in the browser without full page reload
- CSS changes apply immediately

## Production Deployment

### Backend
```bash
# Use a production ASGI server
pip install gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend
```bash
# Build for production
npm run build

# Serve the dist folder with a static file server
npm install -g serve
serve -s dist -p 3000
```

## License

This project is part of the content generation workflow system.
