# Deployment Guide

This guide covers deploying the Claude Workflow Manager with **independently deployable** frontend and backend services.

## Deployment Architecture

The application uses **independent Docker containers** for frontend and backend:
- **No Docker Compose required**
- Each service has its own Dockerfile
- Services communicate via HTTP API
- Can be deployed to different platforms or hosts

## Quick Start - Local Docker Deployment

### Prerequisites
- Docker installed
- Anthropic API key

### Deploy Both Services

```bash
# 1. Clone repository
git clone <repo-url>
cd claude-workflow-manager

# 2. Set up environment
make setup
# Edit .env and add ANTHROPIC_API_KEY

# 3. Build and run
make build
ANTHROPIC_API_KEY=your_key make run
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Independent Service Deployment

### Backend Service

**Build:**
```bash
docker build -t backend:latest -f backend/Dockerfile ./backend
```

**Run:**
```bash
docker run -d \
  --name backend \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  -e MAX_CONCURRENT_JOBS=3 \
  -v $(pwd)/backend/brand-data:/app/brand-data \
  -v $(pwd)/backend/brief-outputs:/app/brief-outputs \
  -v $(pwd)/backend/draft-outputs:/app/draft-outputs \
  -v $(pwd)/backend/logs:/app/logs \
  --restart unless-stopped \
  backend:latest
```

**Environment Variables:**
- `ANTHROPIC_API_KEY` (required) - Your Anthropic API key
- `MAX_CONCURRENT_JOBS` (optional, default: 3) - Max concurrent jobs

**Volumes:**
- `/app/brand-data` - Generated brand data
- `/app/brief-outputs` - Generated briefs
- `/app/draft-outputs` - Generated drafts
- `/app/logs` - Execution logs

### Frontend Service

**Build:**
```bash
# With environment variable
docker build \
  --build-arg VITE_API_URL=http://your-backend:8000/api \
  -t frontend:latest \
  -f frontend/Dockerfile ./frontend
```

**Run:**
```bash
docker run -d \
  --name frontend \
  -p 3000:80 \
  --restart unless-stopped \
  frontend:latest
```

**Important:** `VITE_API_URL` must be set at **build time** with `--build-arg`. It cannot be changed after the image is built.

## Cloud Platform Deployments

### AWS ECS/Fargate

**Backend Task Definition:**
```json
{
  "family": "claude-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [{
    "name": "backend",
    "image": "your-registry/backend:latest",
    "portMappings": [{"containerPort": 8000}],
    "environment": [
      {"name": "MAX_CONCURRENT_JOBS", "value": "3"}
    ],
    "secrets": [
      {"name": "ANTHROPIC_API_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
    ],
    "mountPoints": [{
      "sourceVolume": "data",
      "containerPath": "/app/brand-data"
    }]
  }],
  "volumes": [{
    "name": "data",
    "efsVolumeConfiguration": {"fileSystemId": "fs-xxxxx"}
  }]
}
```

**Frontend:**
- Build with `VITE_API_URL` pointing to backend ALB
- Deploy to ECS or host on S3 + CloudFront

### Google Cloud Run

**Backend:**
```bash
# Build and push
docker build -t gcr.io/PROJECT/backend:latest -f backend/Dockerfile ./backend
docker push gcr.io/PROJECT/backend:latest

# Deploy
gcloud run deploy backend \
  --image gcr.io/PROJECT/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets ANTHROPIC_API_KEY=projects/PROJECT/secrets/anthropic:latest \
  --memory 4Gi \
  --cpu 2 \
  --port 8000
```

**Frontend:**
```bash
# Build with backend URL
docker build \
  --build-arg VITE_API_URL=https://backend-xxx.run.app/api \
  -t gcr.io/PROJECT/frontend:latest \
  -f frontend/Dockerfile ./frontend

# Push and deploy
docker push gcr.io/PROJECT/frontend:latest
gcloud run deploy frontend \
  --image gcr.io/PROJECT/frontend:latest \
  --platform managed \
  --port 80
```

### Azure Container Instances

**Backend:**
```bash
az container create \
  --resource-group myResourceGroup \
  --name backend \
  --image your-registry/backend:latest \
  --ports 8000 \
  --environment-variables MAX_CONCURRENT_JOBS=3 \
  --secure-environment-variables ANTHROPIC_API_KEY=your_key \
  --cpu 2 \
  --memory 4 \
  --restart-policy Always
```

**Frontend:**
```bash
az container create \
  --resource-group myResourceGroup \
  --name frontend \
  --image your-registry/frontend:latest \
  --ports 80 \
  --cpu 0.5 \
  --memory 0.5
```

### DigitalOcean App Platform

Create `app.yaml`:
```yaml
name: claude-workflow-manager

services:
  - name: backend
    github:
      repo: your-username/repo
      branch: main
    dockerfile_path: backend/Dockerfile
    source_dir: backend
    envs:
      - key: ANTHROPIC_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: MAX_CONCURRENT_JOBS
        value: "3"
    instance_size_slug: professional-s
    http_port: 8000

  - name: frontend
    github:
      repo: your-username/repo
      branch: main
    dockerfile_path: frontend/Dockerfile
    source_dir: frontend
    build_command: |
      docker build --build-arg VITE_API_URL=${backend.PUBLIC_URL}/api .
    instance_size_slug: basic-xxs
    http_port: 80
```

Deploy:
```bash
doctl apps create --spec app.yaml
```

### Railway / Render

1. Connect your GitHub repository
2. Create two services:
   - Backend: Use `backend/Dockerfile`, add `ANTHROPIC_API_KEY` env var
   - Frontend: Use `frontend/Dockerfile`, set build arg `VITE_API_URL`
3. Deploy

## Using Makefile Commands

The project includes a comprehensive Makefile for common operations:

```bash
# Build
make build                  # Build both services
make build-backend          # Backend only
make build-frontend         # Frontend only

# Run (Docker)
ANTHROPIC_API_KEY=key make run-backend
make run-frontend
make run                    # Both services

# Development (local, no Docker)
make dev-backend            # Requires Python 3.11+
make dev-frontend           # Requires Node.js 20+

# Management
make stop                   # Stop containers
make logs-backend           # View backend logs
make logs-frontend          # View frontend logs
make health                 # Check service health

# Maintenance
make clean                  # Stop and remove containers
make backup                 # Backup data
make restore FILE=backup.tar.gz
```

## Configuration Management

### Backend Configuration

**Via Environment Variables:**
```bash
docker run -e ANTHROPIC_API_KEY=key -e MAX_CONCURRENT_JOBS=5 ...
```

**Via `.env` File (local development):**
```env
ANTHROPIC_API_KEY=your_key
MAX_CONCURRENT_JOBS=3
```

### Frontend Configuration

**Build-time only** via `--build-arg`:

```bash
# Development
docker build --build-arg VITE_API_URL=http://localhost:8000/api ...

# Production
docker build --build-arg VITE_API_URL=https://api.yourdomain.com/api ...
```

**Local development** via `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8000/api
```

## Data Persistence

### Backend Data Volumes

Mount these paths for data persistence:

| Path | Purpose |
|------|---------|
| `/app/brand-data` | Generated brand JSON files |
| `/app/brief-outputs` | Generated brief markdown files |
| `/app/draft-outputs` | Generated draft markdown files |
| `/app/logs` | Job execution logs |

**Example:**
```bash
-v /data/brand-data:/app/brand-data \
-v /data/brief-outputs:/app/brief-outputs \
-v /data/draft-outputs:/app/draft-outputs \
-v /data/logs:/app/logs
```

### Backup and Restore

```bash
# Backup
make backup

# Restore
make restore FILE=backups/backup-20241027-120000.tar.gz
```

## Networking

### Same Host Deployment

If both services are on the same host, use localhost:
```bash
# Backend
docker run -p 8000:8000 backend

# Frontend (build with localhost)
docker build --build-arg VITE_API_URL=http://localhost:8000/api ...
docker run -p 3000:80 frontend
```

### Different Hosts

If services are on different hosts:
```bash
# Host 1: Backend (api.example.com)
docker run -p 8000:8000 backend

# Host 2: Frontend (app.example.com)
docker build --build-arg VITE_API_URL=https://api.example.com/api ...
docker run -p 80:80 frontend
```

### CORS Configuration

The backend allows CORS from all origins by default. For production, update `backend/app.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # Restrict to your frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Security Best Practices

1. **API Keys**: Use secrets managers (AWS Secrets Manager, GCP Secret Manager)
2. **HTTPS**: Always use HTTPS in production
3. **Firewall**: Restrict access to necessary ports
4. **CORS**: Configure specific origins for production
5. **Updates**: Keep Docker images and dependencies updated
6. **Non-root**: Containers run as non-root users (uid 1000)

## Monitoring

### Health Checks

**Backend:**
```bash
curl http://localhost:8000/
# Should return: {"status":"healthy",...}
```

**Frontend:**
```bash
curl -I http://localhost:3000/
# Should return: HTTP/1.1 200 OK
```

### Container Logs

```bash
# Using Makefile
make logs-backend
make logs-frontend

# Using Docker
docker logs backend
docker logs frontend

# Follow logs
docker logs -f backend
```

### Resource Monitoring

```bash
docker stats backend frontend
```

## Scaling

### Horizontal Scaling

**Backend:**
- Run multiple backend instances
- Use load balancer (nginx, ALB, etc.)
- Requires shared storage (NFS, S3) for data
- Consider Redis for job queue

**Frontend:**
- Static assets, easy to scale
- Use CDN (CloudFront, Cloudflare)
- Multiple replicas behind load balancer

### Vertical Scaling

**Backend:**
```bash
docker run --cpus=4 --memory=8g backend
```

**Increase concurrent jobs:**
```bash
docker run -e MAX_CONCURRENT_JOBS=5 backend
```

## Troubleshooting

### Frontend can't connect to backend
- Verify `VITE_API_URL` was set correctly during build
- Check CORS configuration
- Ensure backend is accessible from frontend host

### Backend fails to start
- Check ANTHROPIC_API_KEY is set
- Verify volumes have correct permissions (uid 1000)
- Check logs: `make logs-backend`

### Port conflicts
```bash
# Check what's using the port
lsof -i :8000
lsof -i :3000

# Use different ports
docker run -p 8001:8000 backend
docker run -p 3001:80 frontend
```

### Build errors
```bash
# Clean and rebuild
make clean-images
make build
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more issues and solutions.

## Support

- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Frontend Development**: See [../frontend/README.md](../frontend/README.md)
- **Issues**: GitHub Issues
