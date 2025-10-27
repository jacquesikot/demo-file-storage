# Migration Guide: Docker Compose to Independent Services

This document explains the changes made to remove Docker Compose and enable independent service deployment.

## What Changed

### Removed Files
- ❌ `docker-compose.yml` - No longer needed
- ❌ `docker-compose.coolify.yml` - Removed
- ❌ `docker-compose.koyeb.yml` - Removed
- ❌ `Dockerfile.backend` - Moved to `backend/Dockerfile`
- ❌ `Dockerfile.frontend` - Moved to `frontend/Dockerfile`
- ❌ `Dockerfile.koyeb` - No longer needed
- ❌ `nginx.conf` - Embedded in frontend Dockerfile
- ❌ `start-*.sh` scripts - Replaced by Makefile commands

### New/Modified Files

#### Backend
- ✅ `backend/Dockerfile` - Standalone backend Docker configuration
- ✅ `backend/.dockerignore` - Optimized build context
- ✅ `backend/brand-data/.gitkeep` - Directory placeholder
- ✅ `backend/brief-outputs/.gitkeep` - Directory placeholder
- ✅ `backend/draft-outputs/.gitkeep` - Directory placeholder

#### Frontend
- ✅ `frontend/Dockerfile` - Standalone frontend Docker configuration
- ✅ `frontend/.dockerignore` - Optimized build context
- ✅ `frontend/src/api.ts` - Now uses environment variable for API URL

#### Configuration
- ✅ `.env.example` - Updated with new variables
- ✅ `.gitignore` - Enhanced to ignore Docker artifacts and data
- ✅ `Makefile` - Completely rewritten for independent services

#### Documentation
- ✅ `README.md` - Comprehensive guide updated
- ✅ `DEPLOYMENT.md` - New deployment guide
- ✅ `QUICKSTART.md` - New quick start guide
- ✅ `MIGRATION.md` - This file

## Key Architecture Changes

### Before (Docker Compose)
```
docker-compose.yml
├── Frontend service (depends on backend)
│   └── nginx reverse proxy to backend
└── Backend service
    └── Shared network

Frontend -> nginx proxy -> Backend
```

### After (Independent Services)
```
backend/Dockerfile       frontend/Dockerfile
├── FastAPI app          ├── React build
└── Port 8000            └── nginx (SPA only)
                             └── Port 80

Frontend (VITE_API_URL) -> Backend API
```

## Migration Steps

If you're migrating from the old setup:

### 1. Update Environment Variables

**Old `.env`:**
```bash
ANTHROPIC_API_KEY=your_key
MAX_CONCURRENT_JOBS=3
```

**New `.env`:**
```bash
ANTHROPIC_API_KEY=your_key
MAX_CONCURRENT_JOBS=3
VITE_API_URL=http://localhost:8000/api  # Only for reference
```

### 2. Stop Old Services

```bash
# If using old docker-compose
docker-compose down -v
docker-compose -f docker-compose.coolify.yml down -v
docker-compose -f docker-compose.koyeb.yml down -v
```

### 3. Clean Up Old Images

```bash
# Remove old images
docker rmi claude-workflow-manager_backend
docker rmi claude-workflow-manager_frontend
docker rmi $(docker images -f "dangling=true" -q)
```

### 4. Build New Images

```bash
# Build new standalone images
make build

# Or build individually
make build-backend
make build-frontend
```

### 5. Run New Services

**Local Development:**
```bash
make dev-backend  # Terminal 1
make dev-frontend # Terminal 2
```

**Docker Deployment:**
```bash
ANTHROPIC_API_KEY=your_key make run-backend
make run-frontend
```

## Breaking Changes

### 1. No More Shared Network (Docker Compose)

**Before:** Services communicated via Docker Compose network names
```yaml
# docker-compose.yml
location /api/ {
    proxy_pass http://backend:8000/api/;  # DNS via compose
}
```

**After:** Frontend uses configurable backend URL
```typescript
// frontend/src/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

### 2. Frontend Build-Time Configuration

**Before:** nginx proxied requests to backend automatically

**After:** Backend URL must be set at build time
```bash
docker build \
  --build-arg VITE_API_URL=https://your-backend.com/api \
  -f frontend/Dockerfile ./frontend
```

### 3. Volume Mounts

**Before:** Defined in docker-compose.yml
```yaml
volumes:
  - ./backend/brand-data:/app/backend/brand-data
```

**After:** Specified per container run
```bash
docker run -v $(pwd)/backend/brand-data:/app/brand-data ...
```

## Advantages of New Architecture

### 1. Independent Deployment
- Deploy frontend and backend separately
- Scale services independently
- Different deployment targets (e.g., frontend on CDN, backend on compute)

### 2. Simplified CI/CD
```bash
# Build and deploy backend only
docker build -t backend:v1.2.0 -f backend/Dockerfile ./backend
docker push backend:v1.2.0

# Build and deploy frontend only
docker build --build-arg VITE_API_URL=$API_URL -f frontend/Dockerfile ./frontend
docker push frontend:v1.2.0
```

### 3. Better for Cloud Platforms
- Works with AWS ECS, GCP Cloud Run, Azure Container Instances
- No need for Docker Compose support
- Easier to integrate with Kubernetes
- Compatible with serverless platforms

### 4. Cleaner Development
- Run only what you need
- Easier debugging (separate logs)
- No Docker Compose quirks
- Standard Docker commands

### 5. Portable
- Standard Dockerfiles work everywhere
- No vendor lock-in
- Easy to understand and modify

## Backwards Compatibility

### If You Need Docker Compose

While not recommended, you can create a simple `docker-compose.yml` for local development:

```yaml
version: "3.8"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - MAX_CONCURRENT_JOBS=3
    volumes:
      - ./backend/brand-data:/app/brand-data
      - ./backend/brief-outputs:/app/brief-outputs
      - ./backend/draft-outputs:/app/draft-outputs
      - ./backend/logs:/app/logs

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:8000/api
    ports:
      - "3000:80"
    depends_on:
      - backend
```

However, we recommend using the new Makefile commands instead.

## Troubleshooting

### Issue: Frontend can't connect to backend

**Cause:** `VITE_API_URL` not set correctly during build

**Solution:**
```bash
# Rebuild with correct URL
docker build \
  --build-arg VITE_API_URL=http://your-backend:8000/api \
  -t frontend:latest \
  -f frontend/Dockerfile ./frontend
```

### Issue: Backend data not persisting

**Cause:** Volumes not mounted correctly

**Solution:**
```bash
# Ensure volumes are mounted
docker run -v $(pwd)/backend/brand-data:/app/brand-data ...
# Or use Makefile
ANTHROPIC_API_KEY=key make run-backend
```

### Issue: Port conflicts

**Cause:** Old containers still running

**Solution:**
```bash
# Stop old containers
docker ps -a | grep claude
docker stop <container_id>
docker rm <container_id>

# Or clean up everything
make clean
```

### Issue: Image not found

**Cause:** Images not built with new names

**Solution:**
```bash
# Build new images
make build
```

## Rollback Plan

If you need to rollback to the old setup:

1. Restore old files from git:
```bash
git checkout origin/main -- docker-compose.yml
git checkout origin/main -- Dockerfile.backend
git checkout origin/main -- Dockerfile.frontend
git checkout origin/main -- nginx.conf
```

2. Build and run with old setup:
```bash
docker-compose build
docker-compose up -d
```

## Support

If you encounter issues:
1. Check `QUICKSTART.md` for quick fixes
2. Review `DEPLOYMENT.md` for detailed guides
3. Run `make help` for available commands
4. Check logs with `make logs-backend` or `make logs-frontend`

## Next Steps

1. ✅ Build new images: `make build`
2. ✅ Test locally: `make dev-backend` and `make dev-frontend`
3. ✅ Deploy to cloud: See `DEPLOYMENT.md`
4. ✅ Set up CI/CD pipelines
5. ✅ Configure monitoring and alerts

---

**Questions?** Open an issue or check the documentation.
