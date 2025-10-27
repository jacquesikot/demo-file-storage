# Claude Workflow Manager

A web-based application for managing Claude Code workflows including brand data generation, content brief creation, and draft generation.

## Features

- **Brand Data Generation**: Automatically research and generate comprehensive brand data from URLs
- **Brief Generation**: Create SEO-optimized content briefs with competitor analysis
- **Draft Generation**: Generate full content drafts based on briefs and brand data
- **Real-time Monitoring**: Watch job progress with live log streaming
- **File Management**: Upload, view, download, and delete files through the UI

## Quick Start

### Local Development

1. **Prerequisites**:
   - Python 3.9+
   - Node.js 18+
   - Claude Code CLI installed and configured

2. **Backend Setup**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```

3. **Frontend Setup** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access**: Open http://localhost:5173

### Deploy to Production

For production deployment to Coolify or other platforms, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

**Quick Coolify Deploy**:
1. Create Docker Compose resource in Coolify
2. Connect your Git repository
3. Set `ANTHROPIC_API_KEY` environment variable
4. Deploy

Access your application at:
- Frontend: `http://YOUR-SERVER-IP:3000`
- Backend API: `http://YOUR-SERVER-IP:8000`

## Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Complete deployment instructions for Coolify and other platforms
- **[Architecture](docs/ARCHITECTURE.md)** - System design, data flow, and technical details
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Usage

### Brand Data Generation

1. Navigate to the "Brand Data" tab
2. Enter brand URLs (space-separated)
3. Click "Generate Brand Data"
4. Monitor progress and view generated files

### Brief Generation

1. Navigate to the "Brief Generation" tab
2. Fill in title, keywords, and select brand data
3. Click "Generate Brief"
4. View and download generated briefs

### Draft Generation

1. Navigate to the "Draft Generation" tab
2. Select brief and brand data files
3. Click "Generate Draft"
4. View generated drafts with word count

## API Endpoints

### Brand Data
- `GET /api/brand-data` - List files
- `POST /api/brand-data/generate` - Start generation
- `POST /api/brand-data/upload` - Upload file
- `DELETE /api/brand-data/{filename}` - Delete file

### Briefs
- `GET /api/briefs` - List files
- `POST /api/briefs/generate` - Start generation
- `POST /api/briefs/upload` - Upload file
- `DELETE /api/briefs/{filename}` - Delete file

### Drafts
- `GET /api/drafts` - List files
- `POST /api/drafts/generate` - Start generation
- `POST /api/drafts/upload` - Upload file
- `DELETE /api/drafts/{filename}` - Delete file

### Jobs
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/{job_id}` - Get job status
- `GET /api/jobs/{job_id}/logs` - Stream logs (SSE)

### Health
- `GET /health` - Service health check

## Technology Stack

**Frontend**:
- React 18 + Vite
- TailwindCSS
- Lucide React Icons
- React Markdown

**Backend**:
- FastAPI (Python)
- Uvicorn (ASGI server)
- AsyncIO for concurrent jobs
- Claude Code CLI integration

**Deployment**:
- Docker + Docker Compose
- Coolify (recommended)
- Direct port mapping

## Project Structure

```
claude-workflow-manager/
├── backend/
│   ├── app.py                 # Main FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── brand-data/           # Generated brand files
│   ├── brief-outputs/        # Generated briefs
│   ├── draft-outputs/        # Generated drafts
│   ├── instructions/         # Instruction templates
│   └── logs/                 # Job logs
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── api.js           # API client
│   │   ├── App.jsx          # Main app
│   │   └── main.jsx         # Entry point
│   ├── package.json
│   └── vite.config.js
├── docs/                     # Documentation
│   ├── DEPLOYMENT.md        # Deployment guide
│   ├── ARCHITECTURE.md      # System architecture
│   └── TROUBLESHOOTING.md   # Problem solving
├── docker-compose.coolify.yml  # Production compose file
├── Dockerfile.backend       # Backend container
├── Dockerfile.frontend      # Frontend container
└── README.md               # This file
```

## Configuration

### Environment Variables

**Backend** (`backend/.env` or Coolify UI):
```bash
ANTHROPIC_API_KEY=your-api-key-here
MAX_CONCURRENT_JOBS=3
```

**Frontend** (configured at build time):
- API URL defaults to `http://localhost:8000` for development
- Production API URL is auto-configured based on deployment

### Resource Limits

**Backend Container**:
- CPU: 2-4 cores recommended
- Memory: 2-4GB recommended
- Max concurrent jobs: 3 (configurable)

**Frontend Container**:
- CPU: 0.5 cores
- Memory: 256-512MB

## Limitations

- Maximum 3 concurrent jobs
- File uploads limited to 10MB
- No user authentication (single-user system)
- Job logs retained during execution only

## Development

### Backend Development
- Auto-reload enabled by default
- Modify `app.py` and save - server reloads automatically
- API documentation at http://localhost:8000/docs

### Frontend Development
- Hot Module Replacement (HMR) via Vite
- Changes reflect immediately in browser
- Build for production: `npm run build`

## Security Notes

This application uses `--dangerously-skip-permissions` flag for Claude Code CLI to enable automation. This means:
- ✅ Web searches and fetches happen automatically
- ✅ File writes happen without prompts
- ⚠️ All tool usage is auto-approved

**Safe for**:
- Local development
- Trusted environments
- Single-user systems

**Not recommended for**:
- Multi-tenant systems
- Untrusted user input
- Public-facing deployments

## Troubleshooting

For common issues and solutions, see **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**.

Quick checks:
```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# View logs
docker logs backend
docker logs frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## Support

- Documentation: [docs/](docs/)
- Issues: GitHub Issues
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## License

This project is part of the content generation workflow system.
