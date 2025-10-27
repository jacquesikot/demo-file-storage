# Deployment Guide

This guide covers deploying the Claude Workflow Manager with independent frontend and backend services.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Troubleshooting](#troubleshooting)

## Local Development

### Quick Start

```bash
# 1. Setup environment
make setup
# Edit .env and add your ANTHROPIC_API_KEY

# 2. Start backend (Terminal 1)
make dev-backend

# 3. Start frontend (Terminal 2)
make dev-frontend
```

The services will be available at:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:8000

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY=your_key_here
export MAX_CONCURRENT_JOBS=3

# Run
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install

# Create .env.local for development
echo "VITE_API_URL=http://localhost:8000/api" > .env.local

# Run
npm run dev
```

## Docker Deployment

### Building Images

```bash
# Build both services
make build

# Or build individually
make build-backend
make build-frontend
```

### Running Containers

**Simple deployment (both services):**
```bash
# Start backend
ANTHROPIC_API_KEY=your_key make run-backend

# Start frontend
make run-frontend
```

**Manual deployment:**

**Backend:**
```bash
docker run -d \
  --name claude-workflow-manager-backend \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  -e MAX_CONCURRENT_JOBS=3 \
  -v $(pwd)/backend/brand-data:/app/brand-data \
  -v $(pwd)/backend/brief-outputs:/app/brief-outputs \
  -v $(pwd)/backend/draft-outputs:/app/draft-outputs \
  -v $(pwd)/backend/logs:/app/logs \
  -v $(pwd)/backend/instructions:/app/instructions:ro \
  -v $(pwd)/backend/data:/app/data:ro \
  --restart unless-stopped \
  claude-workflow-manager-backend:latest
```

**Frontend:**
```bash
# Build with your backend URL
docker build \
  --build-arg VITE_API_URL=http://localhost:8000/api \
  -t claude-workflow-manager-frontend:latest \
  -f frontend/Dockerfile ./frontend

# Run
docker run -d \
  --name claude-workflow-manager-frontend \
  -p 3000:80 \
  --restart unless-stopped \
  claude-workflow-manager-frontend:latest
```

### Using Docker Networks

For better isolation:

```bash
# Create network
docker network create claude-network

# Run backend
docker run -d \
  --name backend \
  --network claude-network \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  -v $(pwd)/backend/brand-data:/app/brand-data \
  -v $(pwd)/backend/brief-outputs:/app/brief-outputs \
  -v $(pwd)/backend/draft-outputs:/app/draft-outputs \
  -v $(pwd)/backend/logs:/app/logs \
  --restart unless-stopped \
  claude-workflow-manager-backend:latest

# Run frontend
docker run -d \
  --name frontend \
  --network claude-network \
  -p 80:80 \
  --restart unless-stopped \
  claude-workflow-manager-frontend:latest
```

## Cloud Deployment

### AWS ECS

**Backend Task Definition:**
```json
{
  "family": "claude-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-registry/backend:latest",
      "portMappings": [{"containerPort": 8000, "protocol": "tcp"}],
      "environment": [
        {"name": "MAX_CONCURRENT_JOBS", "value": "3"}
      ],
      "secrets": [
        {"name": "ANTHROPIC_API_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "mountPoints": [
        {
          "sourceVolume": "data",
          "containerPath": "/app/brand-data"
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxx"
      }
    }
  ]
}
```

**Frontend Task Definition:**
```json
{
  "family": "claude-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "your-registry/frontend:latest",
      "portMappings": [{"containerPort": 80, "protocol": "tcp"}]
    }
  ]
}
```

### Google Cloud Run

**Backend:**
```bash
# Build and push
docker build -t gcr.io/PROJECT_ID/backend:latest -f backend/Dockerfile ./backend
docker push gcr.io/PROJECT_ID/backend:latest

# Deploy
gcloud run deploy backend \
  --image gcr.io/PROJECT_ID/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MAX_CONCURRENT_JOBS=3 \
  --set-secrets ANTHROPIC_API_KEY=projects/PROJECT_ID/secrets/anthropic-api-key:latest \
  --memory 4Gi \
  --cpu 2 \
  --port 8000
```

**Frontend:**
```bash
# Build with backend URL
docker build \
  --build-arg VITE_API_URL=https://backend-xxx-uc.a.run.app/api \
  -t gcr.io/PROJECT_ID/frontend:latest \
  -f frontend/Dockerfile ./frontend

# Push
docker push gcr.io/PROJECT_ID/frontend:latest

# Deploy
gcloud run deploy frontend \
  --image gcr.io/PROJECT_ID/frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
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
  --environment-variables \
    MAX_CONCURRENT_JOBS=3 \
  --secure-environment-variables \
    ANTHROPIC_API_KEY=your_key \
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
  --memory 0.5 \
  --restart-policy Always
```

### DigitalOcean App Platform

Create `app.yaml`:
```yaml
name: claude-workflow-manager

services:
  - name: backend
    github:
      repo: your-username/claude-workflow-manager
      branch: main
      deploy_on_push: true
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
    routes:
      - path: /api
    health_check:
      http_path: /

  - name: frontend
    github:
      repo: your-username/claude-workflow-manager
      branch: main
      deploy_on_push: true
    dockerfile_path: frontend/Dockerfile
    source_dir: frontend
    build_command: |
      docker build --build-arg VITE_API_URL=${backend.PUBLIC_URL}/api .
    instance_size_slug: basic-xxs
    http_port: 80
    routes:
      - path: /
```

Deploy:
```bash
doctl apps create --spec app.yaml
```

### Koyeb

**Backend:**
```bash
# Koyeb builds from the repository root
# The Dockerfile is configured to work with root build context
# In Koyeb dashboard:
# 1. Create a new Web Service
# 2. Connect your GitHub repository
# 3. Configure:
#    - Dockerfile: backend/Dockerfile
#    - Build context: / (repository root)
#    - Port: 8000
# 4. Add environment variables:
#    - ANTHROPIC_API_KEY (secret)
#    - MAX_CONCURRENT_JOBS=3
# 5. Instance type: Medium or Large (for Claude Code workloads)
# 6. Deploy
```

**Frontend:**
```bash
# In Koyeb dashboard:
# 1. Create a new Web Service
# 2. Connect your GitHub repository
# 3. Configure:
#    - Dockerfile: frontend/Dockerfile
#    - Build context: / (repository root)
#    - Build args: VITE_API_URL=https://your-backend.koyeb.app/api
#    - Port: 80
# 4. Instance type: Small
# 5. Deploy
```

**Important Notes:**
- The backend Dockerfile is configured to work with the repository root as build context
- It uses `COPY backend/requirements.txt .` and `COPY backend/ .` to copy files from the backend directory
- Make sure to set the ANTHROPIC_API_KEY as a secret environment variable
- The health check is configured with a 5s start period, suitable for most deployments

## Environment Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Your Anthropic API key |
| `MAX_CONCURRENT_JOBS` | No | 3 | Max concurrent Claude jobs |
| `PYTHONUNBUFFERED` | No | 1 | Python buffering |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes (build-time) | http://localhost:8000/api | Backend API URL |

**Important:** `VITE_API_URL` is a build-time variable. You must set it when building the Docker image:

```bash
docker build \
  --build-arg VITE_API_URL=https://your-backend.com/api \
  -t frontend:latest \
  -f frontend/Dockerfile ./frontend
```

## Troubleshooting

### Frontend can't connect to backend

1. **Check VITE_API_URL**: Ensure it was set correctly during build
   ```bash
   # Inspect the built image
   docker run --rm frontend:latest cat /usr/share/nginx/html/index.html | grep VITE_API_URL
   ```

2. **Check CORS**: Ensure backend allows requests from frontend origin

3. **Network connectivity**: Test from frontend container
   ```bash
   docker exec frontend curl http://backend-url/api/health
   ```

### Backend API key errors

1. **Verify key is set**:
   ```bash
   docker exec backend printenv | grep ANTHROPIC_API_KEY
   ```

2. **Check key validity**: Visit https://console.anthropic.com/

3. **Check secrets manager**: If using cloud secrets, verify permissions

### Container startup issues

1. **Check logs**:
   ```bash
   make logs-backend
   make logs-frontend
   # Or
   docker logs backend
   docker logs frontend
   ```

2. **Verify port availability**:
   ```bash
   lsof -i :8000  # Backend
   lsof -i :3000  # Frontend
   ```

3. **Check resources**:
   ```bash
   docker stats
   ```

### Data persistence issues

1. **Verify volumes are mounted**:
   ```bash
   docker inspect backend | grep Mounts -A 20
   ```

2. **Check permissions**:
   ```bash
   ls -la backend/brand-data
   # Backend runs as uid 1000, ensure ownership matches
   ```

### Health check failures

1. **Test health endpoints**:
   ```bash
   curl http://localhost:8000/
   curl http://localhost:3000/
   ```

2. **Check container health**:
   ```bash
   docker ps
   # Look for "healthy" or "unhealthy" status
   ```

## Best Practices

### Security

1. **Never commit secrets**: Use environment variables or secrets managers
2. **Use least privilege**: Run containers as non-root (already configured)
3. **Network isolation**: Use Docker networks or VPCs
4. **HTTPS**: Use reverse proxy (nginx/traefik) with SSL certificates
5. **API authentication**: Consider adding auth layer for production

### Monitoring

1. **Set up health checks**: Already configured in Dockerfiles
2. **Log aggregation**: Use CloudWatch, Stackdriver, or ELK stack
3. **Metrics**: Monitor CPU, memory, and request rates
4. **Alerts**: Set up alerts for failures

### Scaling

1. **Horizontal scaling**: Run multiple backend instances behind load balancer
2. **Vertical scaling**: Increase CPU/memory per container
3. **Database**: Consider adding PostgreSQL for job persistence
4. **Queue system**: Add Redis/RabbitMQ for job queue

### Backup

```bash
# Backup data
make backup

# Restore data
make restore FILE=backup-20240127-120000.tar.gz
```

## Support

For issues:
- Check logs: `make logs-backend` or `make logs-frontend`
- Run health check: `make health`
- Review README.md for additional troubleshooting
