# Claude Workflow Manager

A modern, scalable workflow management system powered by Claude AI for brand data generation, content brief creation, and draft generation. Features independently deployable frontend and backend services with clean architecture.

## Features

- **Brand Data Generation**: Automatically research and generate comprehensive brand data from URLs
- **Brief Generation**: Create SEO-optimized content briefs with competitor analysis
- **Draft Generation**: Generate full content drafts based on briefs and brand data
- **Real-time Monitoring**: Watch job progress with live log streaming
- **File Management**: Upload, view, download, and delete files through the UI
- **Independent Deployment**: Deploy frontend and backend separately for maximum flexibility

## Architecture

- **Frontend**: React + TypeScript + Vite + shadcn/ui, served via Nginx
- **Backend**: FastAPI + Python with Claude Code CLI integration
- **Deployment**: Independent Docker containers for easy scaling
- **UI Components**: shadcn/ui with Radix UI primitives and Tailwind CSS

## Quick Start

### Prerequisites

- Docker (for containerized deployment)
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)
- Anthropic API Key ([get one here](https://console.anthropic.com/))

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd claude-workflow-manager

# 2. Set up environment variables
make setup

# 3. Edit .env and add your ANTHROPIC_API_KEY
nano .env

# 4. Build Docker images
make build
```

## Usage

### Docker Deployment (Recommended)

#### Run Both Services

```bash
# Build images
make build

# Run backend (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=your_key_here make run-backend

# Run frontend
make run-frontend
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

#### Deploy Services Independently

**Backend Only:**
```bash
# Build backend image
make build-backend

# Run with your API key
ANTHROPIC_API_KEY=your_key_here make run-backend

# Or manually with custom configuration
docker run -d \
  --name claude-workflow-manager-backend \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  -v $(pwd)/backend/brand-data:/app/brand-data \
  -v $(pwd)/backend/brief-outputs:/app/brief-outputs \
  -v $(pwd)/backend/draft-outputs:/app/draft-outputs \
  -v $(pwd)/backend/logs:/app/logs \
  claude-workflow-manager-backend:latest
```

**Frontend Only:**
```bash
# Build frontend with custom backend URL
docker build \
  --build-arg VITE_API_URL=https://your-backend.com/api \
  -t claude-workflow-manager-frontend:latest \
  -f frontend/Dockerfile ./frontend

# Run frontend
docker run -d \
  --name claude-workflow-manager-frontend \
  -p 3000:80 \
  claude-workflow-manager-frontend:latest
```

### Local Development

Run services locally without Docker for faster development:

```bash
# Terminal 1 - Backend
make dev-backend

# Terminal 2 - Frontend
make dev-frontend
```

For local development, create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8000/api
```

## Makefile Commands

### Build Commands
- `make build` - Build both frontend and backend images
- `make build-frontend` - Build frontend image only
- `make build-backend` - Build backend image only

### Run Commands
- `make run` - Run both services in Docker
- `make run-frontend` - Run frontend container
- `make run-backend` - Run backend container (requires ANTHROPIC_API_KEY)

### Development Commands
- `make dev` - Instructions for local development
- `make dev-frontend` - Run frontend locally
- `make dev-backend` - Run backend locally

### Management Commands
- `make stop` - Stop all containers
- `make stop-frontend` - Stop frontend container
- `make stop-backend` - Stop backend container
- `make logs-frontend` - Show frontend logs
- `make logs-backend` - Show backend logs

### Maintenance Commands
- `make clean` - Stop and remove containers
- `make clean-images` - Remove Docker images
- `make clean-logs` - Clean log files
- `make prune` - Remove unused Docker resources

### Utility Commands
- `make health` - Check service health
- `make test` - Run backend tests
- `make backup` - Backup generated files
- `make restore FILE=backup.tar.gz` - Restore from backup

## Deployment Examples

### Deploy to Cloud (AWS, GCP, Azure, etc.)

**Backend:**
```bash
# Build and push to registry
docker build -t your-registry/backend:latest -f backend/Dockerfile ./backend
docker push your-registry/backend:latest

# Deploy with environment variables
docker run -d \
  --name backend \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e MAX_CONCURRENT_JOBS=3 \
  -v /data/brand-data:/app/brand-data \
  -v /data/brief-outputs:/app/brief-outputs \
  -v /data/draft-outputs:/app/draft-outputs \
  -v /data/logs:/app/logs \
  --restart unless-stopped \
  your-registry/backend:latest
```

**Frontend:**
```bash
# Build with production backend URL
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com/api \
  -t your-registry/frontend:latest \
  -f frontend/Dockerfile ./frontend

# Push to registry
docker push your-registry/frontend:latest

# Deploy
docker run -d \
  --name frontend \
  -p 80:80 \
  --restart unless-stopped \
  your-registry/frontend:latest
```

### Platform-Specific Deployment

See detailed deployment guides in `docs/DEPLOYMENT.md` for:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Railway / Render

## Environment Variables

### Backend
- `ANTHROPIC_API_KEY` (required) - Your Anthropic API key
- `MAX_CONCURRENT_JOBS` (optional, default: 3) - Maximum concurrent Claude jobs

### Frontend
- `VITE_API_URL` (build-time) - Backend API URL
  - Development: `http://localhost:8000/api`
  - Production: Set during Docker build with `--build-arg`

## Project Structure

```
claude-workflow-manager/
├── backend/
│   ├── Dockerfile              # Backend Docker configuration
│   ├── .dockerignore           # Docker ignore patterns
│   ├── app.py                  # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── brand-data/             # Generated brand data
│   ├── brief-outputs/          # Generated briefs
│   ├── draft-outputs/          # Generated drafts
│   ├── logs/                   # Application logs
│   ├── instructions/           # Prompt instructions
│   └── data/                   # Reference data
├── frontend/
│   ├── Dockerfile              # Frontend Docker configuration
│   ├── .dockerignore           # Docker ignore patterns
│   ├── src/
│   │   ├── api.ts              # API client with env config
│   │   ├── components/         # React components
│   │   ├── App.tsx             # Main application
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.js
├── Makefile                    # Automation scripts
├── .env.example                # Environment template
└── README.md                   # This file
```

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
- `GET /` or `GET /health` - Service health check

## Best Practices

### Security
- Never commit `.env` files with secrets
- Use environment variables for sensitive data
- Run containers as non-root users (handled in Dockerfiles)
- Keep dependencies updated
- Review Claude Code permissions in production

### Development
- Use `make dev-*` commands for local development
- Test changes locally before building Docker images
- Run `make health` to verify services are running
- Use `make logs-*` to debug issues

### Deployment
- Build frontend with correct `VITE_API_URL` for your environment
- Use persistent volumes for backend data directories
- Set up health checks and monitoring
- Use `--restart unless-stopped` for production containers
- Consider using a reverse proxy (nginx/traefik) for SSL/TLS

### Resource Limits

**Backend Container**:
- CPU: 2-4 cores recommended
- Memory: 2-4GB recommended
- Max concurrent jobs: 3 (configurable)

**Frontend Container**:
- CPU: 0.5 cores
- Memory: 256-512MB

## Troubleshooting

### Frontend can't connect to backend
- Verify `VITE_API_URL` was set correctly during build
- Check CORS settings in backend
- Ensure backend is accessible from frontend container
- Use `make health` to verify services are running

### Backend API key errors
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check the key is valid at https://console.anthropic.com/
- Ensure environment variable is passed to container

### Container won't start
- Check logs: `make logs-backend` or `make logs-frontend`
- Verify port availability: `lsof -i :8000` or `lsof -i :3000`
- Check disk space and Docker resources
- Review Docker logs for errors

### Permission errors
- Ensure volumes have correct permissions
- Backend runs as user `appuser` (uid 1000)
- Check file ownership in mounted volumes

### Quick health checks
```bash
# Check backend health
curl http://localhost:8000/

# Check frontend
curl http://localhost:3000

# View container status
docker ps

# View logs
make logs-backend
make logs-frontend
```

## Security Notes

This application uses Claude Code CLI with auto-approved permissions. This means:
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
- Public-facing deployments without authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `make dev-*`
5. Build and test Docker images with `make build && make run`
6. Submit a pull request

## Documentation

- **Architecture**: See `docs/ARCHITECTURE.md` for system design
- **Frontend**: See `frontend/README.md` for frontend development guide
- **Deployment**: See `docs/DEPLOYMENT.md` for detailed deployment guides
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md` for common issues

## Support

For issues and questions:
- GitHub Issues: [Your repo issues URL]
- Documentation: See `docs/` directory
- Email: [Your support email]

## License

[Your License Here]

---

Built with ❤️ using Claude AI, FastAPI, and React
