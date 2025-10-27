# Troubleshooting Guide

## Common Issues and Solutions

### Deployment Issues

#### Container Fails to Start

**Symptoms**: Container exits immediately or shows unhealthy status

**Solutions**:
```bash
# Check container logs
docker logs backend
docker logs frontend

# Check if required environment variables are set (backend)
docker inspect backend | grep -A 20 Env

# Verify Anthropic API key is set
docker exec backend env | grep ANTHROPIC

# Check container status
docker ps -a
```

**Common causes**:
- Missing `ANTHROPIC_API_KEY` for backend
- Port conflicts (ports 8000 or 3000 already in use)
- Insufficient permissions on mounted volumes
- Invalid environment variable values

#### Port Conflicts

**Symptoms**: Error: "port is already allocated"

**Solutions**:
```bash
# Check what's using the ports
lsof -i :8000
lsof -i :3000

# Stop conflicting service
sudo kill -9 <PID>

# Or use different ports when running containers
docker run -p 8001:8000 backend
docker run -p 3001:80 frontend
```

#### Build Failures

**Symptoms**: Docker build fails

**Solutions**:

**Backend build issues**:
```bash
# Build locally to see full error
docker build -t backend-test -f backend/Dockerfile ./backend

# Common issues:
# - requirements.txt dependencies failed: Check Python version compatibility
# - Claude Code install failed: Ensure npm is available in container
# - COPY paths don't exist: Verify file paths in Dockerfile
```

**Frontend build issues**:
```bash
# Build with API URL
docker build \
  --build-arg VITE_API_URL=http://localhost:8000/api \
  -t frontend-test \
  -f frontend/Dockerfile ./frontend

# Common issues:
# - npm install failed: Check package.json and package-lock.json
# - Vite build failed: Check for TypeScript errors
# - VITE_API_URL not set: Must use --build-arg during build
```

**Fix build cache issues**:
```bash
# Clean and rebuild
make clean-images
make build

# Or force rebuild without cache
docker build --no-cache -t backend -f backend/Dockerfile ./backend
```

### Frontend Issues

#### Frontend Can't Connect to Backend

**Symptoms**: API calls fail, CORS errors, network errors in browser console

**Solutions**:

1. **Verify VITE_API_URL was set correctly during build**:
   ```bash
   # Frontend must be built with correct API URL
   docker build \
     --build-arg VITE_API_URL=http://your-backend:8000/api \
     -t frontend -f frontend/Dockerfile ./frontend
   ```
   **Important**: This is a **build-time** variable. Changing it requires rebuilding the image.

2. **Check backend accessibility**:
   ```bash
   # From your host machine
   curl http://localhost:8000/

   # Should return: {"status":"healthy",...}
   ```

3. **Check CORS configuration**:
   - Backend allows all origins by default
   - For production, update `backend/app.py` CORS settings to allow your frontend domain

4. **Browser console errors**:
   ```javascript
   // Open browser console (F12) and check for:
   // - "Failed to fetch" (backend not reachable)
   // - CORS errors (CORS misconfiguration)
   // - 404 errors (wrong API URL)
   ```

#### Frontend Shows Blank Page

**Solutions**:

1. **Check browser console** (F12 → Console):
   - Look for JavaScript errors
   - Check for failed API calls
   - Verify asset loading errors

2. **Verify frontend is running**:
   ```bash
   # Check container status
   docker ps | grep frontend

   # Check nginx logs
   docker logs frontend

   # Access health check
   curl -I http://localhost:3000/
   # Should return: HTTP/1.1 200 OK
   ```

3. **Rebuild frontend**:
   ```bash
   make clean
   make build-frontend
   make run-frontend
   ```

#### shadcn/ui Component Issues

**Symptoms**: Components not styled correctly, import errors, TypeScript errors

**Solutions**:

1. **Import errors** (`Cannot find module '@/components/ui/...'`):
   ```bash
   # Verify path alias is configured
   # Check vite.config.ts has:
   #   resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
   # Check tsconfig.json has:
   #   "baseUrl": ".", "paths": { "@/*": ["./src/*"] }

   # Restart dev server
   cd frontend
   npm run dev
   ```

2. **Styling not applied**:
   ```bash
   # Verify Tailwind is configured
   # Check src/index.css is imported in src/main.tsx
   # Check tailwind.config.ts includes correct content paths

   # Clear Vite cache and rebuild
   cd frontend
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **CSS variables not working**:
   - Verify `src/index.css` contains all CSS variable definitions
   - Check `tailwind.config.ts` references CSS variables correctly
   - Ensure `cssVariables: true` in `components.json`

4. **Component not found after installation**:
   ```bash
   # Reinstall component
   cd frontend
   npx shadcn@latest add button

   # Verify file was created in src/components/ui/
   ls -la src/components/ui/
   ```

### Backend Issues

#### Backend Returns 500 Errors

**Check logs**:
```bash
docker logs backend --tail 100

# Or if running locally
cd backend
tail -f logs/*.log
```

**Common causes**:

1. **Missing API key**:
   ```bash
   # Verify environment variable
   docker exec backend env | grep ANTHROPIC_API_KEY

   # Should return: ANTHROPIC_API_KEY=sk-...
   # If empty, restart with correct env:
   docker run -e ANTHROPIC_API_KEY=your_key backend
   ```

2. **Claude Code not working**:
   ```bash
   # Check Claude CLI is installed
   docker exec backend claude --version

   # If not found, rebuild backend image
   make build-backend
   ```

3. **File permission issues**:
   ```bash
   # Check volume permissions
   docker exec backend ls -la /app/brand-data
   docker exec backend ls -la /app/logs

   # Should be owned by appuser (uid 1000)
   # If not, fix permissions:
   sudo chown -R 1000:1000 backend/brand-data
   sudo chown -R 1000:1000 backend/brief-outputs
   sudo chown -R 1000:1000 backend/draft-outputs
   sudo chown -R 1000:1000 backend/logs
   ```

4. **Invalid brand data or brief files**:
   - Check file format (JSON for brand data, Markdown for briefs)
   - Verify file is not corrupted
   - Look for specific error in backend logs

#### Jobs Stuck in "Running" State

**Symptoms**: Job never completes

**Solutions**:

1. **Check job logs**:
   - View logs in the UI (real-time SSE stream)
   - Look for error messages or where it stopped

2. **Check backend logs**:
   ```bash
   docker logs backend --tail 100 -f
   ```

3. **Check resource usage**:
   ```bash
   docker stats backend
   # If CPU/memory maxed out, increase resources
   ```

4. **Restart backend**:
   ```bash
   make stop-backend
   make run-backend
   ```

5. **Check Claude API status**:
   - Verify API key is valid
   - Check rate limits at https://console.anthropic.com/

### Local Development Issues

#### `make dev-backend` Fails

**Symptoms**: Python errors, uvicorn not found, module import errors

**Solutions**:

1. **Python not installed**:
   ```bash
   # Install Python 3.11+
   python3 --version
   # Should be 3.11 or higher
   ```

2. **Virtual environment issues**:
   ```bash
   # Remove and recreate venv
   rm -rf backend/venv
   make dev-backend
   # Makefile will auto-create venv and install dependencies
   ```

3. **Environment variables not loaded**:
   ```bash
   # Verify .env file exists
   ls -la .env

   # If not, create from template
   make setup
   # Edit .env and add ANTHROPIC_API_KEY
   ```

4. **Module import errors**:
   ```bash
   # Reinstall dependencies
   cd backend
   . venv/bin/activate
   pip install --upgrade -r requirements.txt
   ```

#### `make dev-frontend` Fails

**Symptoms**: npm errors, dependency conflicts, build failures

**Solutions**:

1. **Node.js not installed**:
   ```bash
   # Install Node.js 20+
   node --version
   # Should be v20.x or higher
   ```

2. **Dependency issues**:
   ```bash
   # Clean install
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **TypeScript errors**:
   ```bash
   # Check for errors
   cd frontend
   npm run build

   # Common issues:
   # - Path alias not working: Check tsconfig.json and vite.config.ts
   # - Type errors: Update types in src/types.ts
   ```

4. **Port 5173 already in use**:
   ```bash
   # Kill process using port
   lsof -i :5173
   kill -9 <PID>

   # Or use different port
   npm run dev -- --port 5174
   ```

#### Environment Variables Not Working

**Frontend**:
- `VITE_API_URL` is a **build-time** variable
- Must be set during Docker build with `--build-arg`
- For local development, create `frontend/.env.local`:
  ```env
  VITE_API_URL=http://localhost:8000/api
  ```

**Backend**:
- `ANTHROPIC_API_KEY` is a **runtime** variable
- Set via `-e` flag when running Docker:
  ```bash
  docker run -e ANTHROPIC_API_KEY=your_key backend
  ```
- For local development, loaded from `.env` file in project root

### Connectivity Issues

#### Cannot Access Services from Browser

**Check list**:

1. **Container status**:
   ```bash
   docker ps
   # Verify both containers are running and healthy
   ```

2. **Port listening**:
   ```bash
   # Check if ports are open
   netstat -tlnp | grep -E ":8000|:3000"
   # Should show docker-proxy listening
   ```

3. **Firewall**:
   ```bash
   # Check firewall status
   sudo ufw status

   # If active, allow ports
   sudo ufw allow 3000/tcp
   sudo ufw allow 8000/tcp
   ```

4. **Cloud provider firewall**:
   - AWS: Check Security Groups (allow inbound TCP 3000, 8000)
   - GCP: Check Firewall Rules
   - Azure: Check Network Security Groups
   - DigitalOcean: Check Cloud Firewalls
   - Hetzner: Check Cloud Firewall settings

5. **Test locally first**:
   ```bash
   # From server
   curl http://localhost:8000/
   curl http://localhost:3000/

   # If these work but external access doesn't, it's a firewall issue
   ```

#### Backend Not Reachable from Frontend Container

**Symptoms**: Frontend can't connect to backend when both are in Docker

**Solutions**:

1. **Same host deployment**:
   ```bash
   # Use host.docker.internal on Mac/Windows
   docker build \
     --build-arg VITE_API_URL=http://host.docker.internal:8000/api \
     -t frontend -f frontend/Dockerfile ./frontend

   # Or use localhost if frontend is not in Docker
   ```

2. **Different hosts**:
   ```bash
   # Use public IP or domain
   docker build \
     --build-arg VITE_API_URL=https://api.yourdomain.com/api \
     -t frontend -f frontend/Dockerfile ./frontend
   ```

3. **Check backend is actually running**:
   ```bash
   docker ps | grep backend
   curl http://localhost:8000/
   ```

### Performance Issues

#### Slow Response Times

**Solutions**:

1. **Check resource usage**:
   ```bash
   docker stats
   # Look for high CPU/memory usage
   ```

2. **Increase container resources**:
   ```bash
   # Run with more resources
   docker run --cpus=4 --memory=4g backend
   ```

3. **Reduce concurrent jobs**:
   ```bash
   # Lower concurrency
   docker run -e MAX_CONCURRENT_JOBS=2 backend
   ```

4. **Check Claude API latency**:
   - API calls to Claude can take time
   - Normal for long-running jobs (2-7 minutes)

#### High Memory Usage

**Solutions**:

1. **Check for memory leaks**:
   ```bash
   docker stats backend --no-stream
   ```

2. **Restart container**:
   ```bash
   docker restart backend
   ```

3. **Review job logs**: Look for jobs consuming excessive memory

4. **Increase memory limit**:
   ```bash
   docker run --memory=8g backend
   ```

### Data Persistence Issues

#### Files Not Persisting

**Symptoms**: Generated files disappear after container restart

**Solutions**:

1. **Verify volumes are mounted**:
   ```bash
   docker inspect backend | grep -A 20 Mounts
   # Should show volume mounts for:
   # - /app/brand-data
   # - /app/brief-outputs
   # - /app/draft-outputs
   # - /app/logs
   ```

2. **Ensure volumes are specified when running**:
   ```bash
   docker run \
     -v $(pwd)/backend/brand-data:/app/brand-data \
     -v $(pwd)/backend/brief-outputs:/app/brief-outputs \
     -v $(pwd)/backend/draft-outputs:/app/draft-outputs \
     -v $(pwd)/backend/logs:/app/logs \
     backend

   # Or use Makefile (volumes are included)
   make run-backend
   ```

3. **Check volume permissions**:
   ```bash
   ls -la backend/brand-data
   # Should be writable by uid 1000 (appuser)

   sudo chown -R 1000:1000 backend/brand-data
   ```

#### Cannot Upload Files

**Symptoms**: Upload fails or returns error

**Solutions**:

1. **Check file size**: Max 10MB by default (configurable in `backend/app.py`)

2. **Check permissions**:
   ```bash
   docker exec backend ls -la /app/brand-data
   # Should be owned by appuser (uid 1000)
   ```

3. **Check disk space**:
   ```bash
   df -h
   ```

4. **Check backend logs**:
   ```bash
   docker logs backend --tail 50
   # Look for upload-related errors
   ```

### SSL/HTTPS Issues

#### Using with Reverse Proxy (nginx, Traefik, Caddy)

**Example nginx configuration**:
```nginx
# Backend API
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Frontend
server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

**Build frontend with HTTPS backend URL**:
```bash
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com/api \
  -t frontend -f frontend/Dockerfile ./frontend
```

## Debugging Commands

### Container Inspection

```bash
# Get container ID
docker ps

# View full container config
docker inspect backend

# Check environment variables
docker exec backend env

# Access container shell
docker exec -it backend /bin/sh

# Check running processes in container
docker exec backend ps aux
```

### Network Debugging

```bash
# Test backend from host
curl http://localhost:8000/

# Test frontend from host
curl -I http://localhost:3000/

# Check if backend is reachable from frontend container
docker run --rm curlimages/curl:latest curl http://host.docker.internal:8000/
```

### Log Analysis

```bash
# Follow logs in real-time
docker logs -f backend

# Last 100 lines
docker logs --tail 100 backend

# Logs since specific time
docker logs --since 30m backend

# Search logs for errors
docker logs backend 2>&1 | grep -i error

# View job-specific logs
cat backend/logs/job_<job-id>.log
```

### Health Checks

```bash
# Check backend health
curl http://localhost:8000/
# Expected: {"status":"healthy","timestamp":"...","active_jobs":0,"max_concurrent_jobs":3}

# Check frontend health
curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK

# Use Makefile health check
make health
```

### Resource Monitoring

```bash
# Monitor all containers
docker stats

# Monitor specific container
docker stats backend

# Check disk usage
docker system df

# Check specific volume usage
du -sh backend/brand-data
du -sh backend/brief-outputs
du -sh backend/draft-outputs
du -sh backend/logs
```

## Getting Help

If the issue persists:

1. **Gather information**:
   ```bash
   # Save all relevant logs
   docker logs backend > backend.log
   docker logs frontend > frontend.log
   docker ps -a > containers.log

   # System information
   docker version > docker-version.txt
   docker info > docker-info.txt

   # Create archive
   tar -czf debug-logs.tar.gz *.log *.txt
   ```

2. **Check documentation**:
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
   - [README.md](../README.md) - Project overview
   - [Frontend README](../frontend/README.md) - Frontend development guide

3. **Common resources**:
   - [Docker Documentation](https://docs.docker.com)
   - [FastAPI Documentation](https://fastapi.tiangolo.com)
   - [Vite Documentation](https://vite.dev)
   - [shadcn/ui Documentation](https://ui.shadcn.com)

4. **Open an issue**:
   - Include error logs
   - Describe steps to reproduce
   - Mention environment (OS, Docker version, deployment platform)
   - Include any error messages from browser console

## Quick Reference

### Most Common Fixes

```bash
# 1. Frontend can't connect to backend
# → Rebuild frontend with correct VITE_API_URL
docker build --build-arg VITE_API_URL=http://localhost:8000/api -t frontend -f frontend/Dockerfile ./frontend

# 2. Backend API key missing
# → Set environment variable when running
docker run -e ANTHROPIC_API_KEY=your_key backend

# 3. Containers won't start
# → Check logs and verify environment
docker logs backend
docker logs frontend

# 4. Port conflicts
# → Use different ports
docker run -p 8001:8000 backend
docker run -p 3001:80 frontend

# 5. Files not persisting
# → Mount volumes correctly
docker run -v $(pwd)/backend/brand-data:/app/brand-data backend

# 6. Permission errors
# → Fix volume ownership (backend runs as uid 1000)
sudo chown -R 1000:1000 backend/brand-data backend/brief-outputs backend/draft-outputs backend/logs

# 7. Build cache issues
# → Clean rebuild
make clean-images
make build

# 8. Local dev not working
# → Recreate virtual environment
rm -rf backend/venv
make dev-backend
```
