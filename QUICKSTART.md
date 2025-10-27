# Quick Start Guide

Get up and running with Claude Workflow Manager in minutes.

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Anthropic API Key ([Get one here](https://console.anthropic.com/))

## 30-Second Setup

```bash
# 1. Setup environment
make setup

# 2. Edit .env and add your API key
nano .env
# Set: ANTHROPIC_API_KEY=sk-ant-...

# 3. Build and run
make build
ANTHROPIC_API_KEY=your_key make run
```

That's it! Access your application at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Local Development (No Docker)

```bash
# Terminal 1 - Backend
make dev-backend

# Terminal 2 - Frontend
make dev-frontend
```

Access at:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## Common Commands

```bash
# View logs
make logs-backend
make logs-frontend

# Check health
make health

# Stop services
make stop

# Clean up
make clean
```

## Deploy Services Separately

### Backend Only

```bash
# Build
make build-backend

# Run (locally)
ANTHROPIC_API_KEY=your_key make run-backend

# Or deploy to cloud
docker build -t your-registry/backend:latest -f backend/Dockerfile ./backend
docker push your-registry/backend:latest
```

### Frontend Only

```bash
# Build with your backend URL
docker build \
  --build-arg VITE_API_URL=https://your-backend.com/api \
  -t your-registry/frontend:latest \
  -f frontend/Dockerfile ./frontend

# Push and deploy
docker push your-registry/frontend:latest
```

## Troubleshooting

**Can't connect to backend?**
```bash
# Check if services are running
make health

# View logs
make logs-backend
```

**Port already in use?**
```bash
# Find what's using the port
lsof -i :8000  # Backend
lsof -i :3000  # Frontend

# Change ports in Makefile if needed
```

**Need help?**
- Full docs: `README.md`
- Deployment guide: `DEPLOYMENT.md`
- Run `make help` for all commands

## Next Steps

1. Generate brand data: Navigate to "Brand Data" tab
2. Create content briefs: Use "Brief Generation" tab
3. Generate drafts: Use "Draft Generation" tab
4. Monitor jobs: View real-time logs and progress

## Production Deployment

See `DEPLOYMENT.md` for:
- AWS, GCP, Azure deployment
- Kubernetes configurations
- Load balancing and scaling
- Security best practices

---

Need more help? Check out the full [README.md](README.md) or [DEPLOYMENT.md](DEPLOYMENT.md)
