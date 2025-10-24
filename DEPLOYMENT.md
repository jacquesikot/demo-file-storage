# Docker Deployment Guide

> **🚀 Quick Deployment with Coolify**: If you're using a self-hosted Coolify server, see the dedicated [**Coolify Deployment Guide**](COOLIFY_DEPLOYMENT.md) for step-by-step instructions optimized for Coolify's platform. This includes automatic SSL, domain management, and zero-downtime deployments.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Production Deployment](#production-deployment)
4. [Server Requirements](#server-requirements)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring & Scaling](#monitoring--scaling)
7. [Troubleshooting](#troubleshooting)

## Deployment Options

This application can be deployed in several ways:

1. **Coolify (Recommended)** - Self-hosted PaaS with automatic SSL and domain management
   - 📄 [Coolify Deployment Guide](COOLIFY_DEPLOYMENT.md)
   - 📄 [Coolify Deployment Checklist](COOLIFY_CHECKLIST.md)

2. **Standard Docker Compose** - Manual setup on any server (covered in this document)

3. **Docker Hub + Remote Server** - Pre-built images deployed to cloud VPS

4. **Kubernetes** - Enterprise-grade orchestration (advanced users)

---

## Prerequisites

### Required Software
- Docker Engine 24.0+
- Docker Compose 2.0+
- Git

### Required Credentials
- Anthropic API Key (for Claude CLI)

### System Requirements
See [Server Requirements](#server-requirements) section below.

---

## Quick Start

### 1. Clone & Setup

```bash
cd claude-workflow-manager
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
nano .env
```

### 2. Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Stop Services

```bash
docker-compose down

# Stop and remove volumes (WARNING: deletes all generated files)
docker-compose down -v
```

---

## Production Deployment

### Cloud Platform Options

#### AWS EC2 / DigitalOcean / Linode

**Recommended Instance Type:**
- **CPU**: 4-8 vCPUs
- **RAM**: 8-16 GB
- **Storage**: 50-100 GB SSD
- **Network**: 100+ Mbps

**Estimated Cost**: $40-80/month

**Setup Steps:**

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Clone repository
git clone <your-repo-url>
cd claude-workflow-manager

# 5. Configure environment
cp .env.example .env
nano .env  # Add your ANTHROPIC_API_KEY

# 6. Deploy
docker-compose up -d

# 7. Setup reverse proxy (optional but recommended)
# See Nginx section below
```

#### Using Nginx Reverse Proxy (Production)

```nginx
# /etc/nginx/sites-available/claude-workflow
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API with SSE support
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE specific
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/claude-workflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Docker Hub Deployment

```bash
# Build and tag images
docker build -f Dockerfile.backend -t your-username/claude-workflow-backend:latest .
docker build -f Dockerfile.frontend -t your-username/claude-workflow-frontend:latest .

# Push to Docker Hub
docker push your-username/claude-workflow-backend:latest
docker push your-username/claude-workflow-frontend:latest

# Pull and run on server
docker-compose -f docker-compose.prod.yml up -d
```

---

## Server Requirements

### Minimum Requirements (Testing/Development)
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB
- **Concurrent Jobs**: 1-2

### Recommended Requirements (Production)
- **CPU**: 4-8 cores
- **RAM**: 8-16 GB
- **Storage**: 50-100 GB SSD
- **Concurrent Jobs**: 3 (default)

### Heavy Load Requirements
- **CPU**: 8-16 cores
- **RAM**: 16-32 GB
- **Storage**: 100-250 GB SSD
- **Concurrent Jobs**: 5-10 (modify MAX_CONCURRENT_JOBS)

### Resource Breakdown

#### Per Claude Job:
- **CPU**: 0.5-1 core (varies by task complexity)
- **RAM**: 500MB - 1GB
- **Duration**: 2-15 minutes (brand data takes longest)
- **Network**: API calls to Anthropic, web searches

#### Backend Container:
- **CPU**: 0.5-1 core (base) + (concurrent_jobs × 1 core)
- **RAM**: 1GB (base) + (concurrent_jobs × 1GB)
- **Storage**: Grows with generated content

#### Frontend Container:
- **CPU**: 0.25-0.5 cores
- **RAM**: 256-512 MB
- **Storage**: ~100 MB

---

## Performance Optimization

### 1. Adjust Concurrent Jobs

Edit [app.py:44](app.py#L44) or set environment variable:

```python
# In docker-compose.yml
environment:
  - MAX_CONCURRENT_JOBS=5  # Increase if you have more resources
```

**Guidelines:**
- 4 GB RAM = 2 jobs max
- 8 GB RAM = 3-4 jobs
- 16 GB RAM = 6-8 jobs
- 32 GB RAM = 10+ jobs

### 2. Enable Docker BuildKit

```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

### 3. Resource Limits

Adjust in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '8'      # Increase for more concurrent jobs
      memory: 8G
    reservations:
      cpus: '4'
      memory: 4G
```

### 4. Volume Performance

For better I/O:
- Use SSD storage
- Consider named volumes instead of bind mounts for production

### 5. Log Rotation

```bash
# Add to docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Monitoring & Scaling

### Container Monitoring

```bash
# Real-time stats
docker stats

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Inspect container
docker exec -it claude-workflow-backend bash
```

### Application Monitoring

```bash
# Check running jobs
curl http://localhost:8000/api/jobs

# Check specific job
curl http://localhost:8000/api/jobs/{job_id}

# Stream job logs
curl http://localhost:8000/api/jobs/{job_id}/logs
```

### Health Checks

Built-in health checks run automatically:

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Scaling Horizontally

For multiple backend instances:

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 2
    # Add load balancer (nginx/traefik)
```

**Note**: Current implementation uses in-memory job storage. For horizontal scaling, implement:
1. Redis/database for job storage
2. Shared volume for file storage
3. Load balancer for distribution

---

## Troubleshooting

### Issue: Claude CLI not found

**Solution**: Ensure Claude CLI is installed in container

```dockerfile
# Add to Dockerfile.backend
RUN npm install -g @anthropic-ai/claude-cli
```

### Issue: Permission errors on volumes

**Solution**: Fix permissions

```bash
sudo chown -R 1000:1000 backend/brand-data backend/brief-outputs backend/draft-outputs backend/logs
```

### Issue: Out of memory

**Solution**:
1. Reduce MAX_CONCURRENT_JOBS
2. Increase server RAM
3. Add swap space

```bash
# Add 4GB swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Issue: API key not working

**Solution**: Ensure `.env` file is properly configured

```bash
# Check environment variables
docker-compose exec backend env | grep ANTHROPIC
```

### Issue: Frontend can't connect to backend

**Solution**: Check CORS settings in [app.py:20-26](app.py#L20-L26)

```python
# Update allowed origins
allow_origins=["http://your-domain.com", "https://your-domain.com"]
```

### Issue: Jobs timeout or hang

**Solution**:
1. Check Claude API status
2. Increase timeout in app.py
3. Check network connectivity

```bash
# Test from container
docker-compose exec backend curl https://api.anthropic.com
```

---

## Backup & Restore

### Backup Generated Files

```bash
# Create backup
tar -czf backup-$(date +%Y%m%d).tar.gz backend/brand-data backend/brief-outputs backend/draft-outputs

# Restore
tar -xzf backup-20241024.tar.gz
```

### Database Backup (if implemented)

```bash
# PostgreSQL example
docker-compose exec backend pg_dump -U postgres > backup.sql
```

---

## Security Considerations

1. **API Keys**: Never commit `.env` to version control
2. **SSL/TLS**: Use Let's Encrypt for HTTPS
3. **Firewall**: Only expose ports 80/443
4. **Updates**: Regularly update Docker images
5. **Secrets Management**: Consider Docker secrets or Vault

```bash
# Create Docker secret
echo "sk-ant-xxx" | docker secret create anthropic_api_key -

# Use in docker-compose
secrets:
  anthropic_api_key:
    external: true
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build images
        run: docker-compose build

      - name: Deploy to server
        run: |
          ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

---

## Cost Estimates

### Cloud Hosting (Monthly)

| Provider | Instance Type | vCPU | RAM | Storage | Cost |
|----------|--------------|------|-----|---------|------|
| DigitalOcean | Basic Droplet | 4 | 8GB | 50GB | $48 |
| AWS EC2 | t3.large | 2 | 8GB | 50GB | $60 |
| Linode | Dedicated 8GB | 4 | 8GB | 80GB | $40 |
| Hetzner | CPX31 | 4 | 8GB | 80GB | €12 |

### Claude API Usage

- Brand Research: ~$0.50-2.00 per job
- Brief Generation: ~$0.20-0.50 per job
- Draft Generation: ~$0.30-1.00 per job

**Estimated monthly cost (100 jobs)**: $50-150

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. Create GitHub issue with logs and configuration
