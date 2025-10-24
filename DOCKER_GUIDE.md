# Complete Docker Deployment Guide - Claude Workflow Manager

## Executive Summary

This application orchestrates multiple Claude Code CLI processes to generate content (brand research, briefs, drafts). Here's what you need to know:

### Architecture
- **Backend**: FastAPI with asyncio subprocess management
- **Frontend**: React + Vite (static build)
- **Concurrency**: Async I/O (single-threaded event loop spawning multiple Claude processes)
- **Max Jobs**: 3 concurrent by default

### Performance Characteristics

#### Threading Model
Your application does NOT use traditional threading. Instead:
- Python's asyncio event loop handles concurrency (single-threaded)
- Each job spawns a separate Claude CLI subprocess (independent process)
- Subprocesses are true OS processes (multi-process, not multi-threaded)

**Impact on Performance:**
- ✅ **No GIL contention** (each Claude process is independent)
- ✅ **True parallelism** (OS-level process isolation)
- ✅ **Better stability** (one job crash won't affect others)
- ⚠️ **Higher memory usage** (~1GB per active job)
- ⚠️ **CPU intensive** (each job uses 0.5-1 core)

#### Resource Usage Per Job

| Job Type | Avg Duration | CPU Usage | RAM Usage | API Calls |
|----------|--------------|-----------|-----------|-----------|
| Brand Data | 5-15 min | 0.5-1 core | 800MB-1GB | High (many web searches) |
| Brief Generation | 2-5 min | 0.5-0.8 core | 500-800MB | Medium |
| Draft Generation | 3-8 min | 0.5-0.8 core | 500-800MB | Medium-High |

---

## Server Requirements by Use Case

### Light Usage (1-2 concurrent jobs)
**Personal use, testing, demo**
- **CPU**: 2-4 vCPUs
- **RAM**: 4-6 GB
- **Storage**: 20-50 GB SSD
- **Cost**: $20-30/month
- **Provider Options**:
  - DigitalOcean Basic Droplet ($24/mo)
  - AWS t3.medium (~$30/mo)
  - Linode Shared 4GB ($24/mo)

### Medium Usage (3-5 concurrent jobs)
**Small team, production workload**
- **CPU**: 4-6 vCPUs
- **RAM**: 8-12 GB
- **Storage**: 50-100 GB SSD
- **Cost**: $40-60/month
- **Provider Options**:
  - DigitalOcean Standard Droplet ($48/mo)
  - AWS t3.large (~$60/mo)
  - Hetzner CPX31 (~$15/mo)
  - Linode Dedicated 8GB ($40/mo)

### Heavy Usage (6-10 concurrent jobs)
**Large team, high throughput**
- **CPU**: 8-12 vCPUs
- **RAM**: 16-24 GB
- **Storage**: 100-250 GB SSD
- **Cost**: $80-120/month
- **Provider Options**:
  - DigitalOcean CPU-Optimized ($112/mo)
  - AWS c5.2xlarge (~$120/mo)
  - Hetzner CPX51 (~$35/mo)

### Enterprise (10+ concurrent jobs)
**Multiple teams, 24/7 operation**
- **CPU**: 16+ vCPUs
- **RAM**: 32+ GB
- **Storage**: 250+ GB NVMe SSD
- **Cost**: $150-300/month
- **Additional**: Load balancing, auto-scaling, monitoring

---

## Quick Start (5 minutes)

```bash
# 1. Clone repository
cd claude-workflow-manager

# 2. Setup environment
make setup
# Edit .env and add ANTHROPIC_API_KEY

# 3. Build and run
make install
make up

# 4. Access
# Frontend: http://localhost
# Backend: http://localhost:8000
# Docs: http://localhost:8000/docs
```

---

## Production Deployment

### Option 1: DigitalOcean Droplet (Recommended for Beginners)

```bash
# Create droplet via web UI or CLI
doctl compute droplet create claude-workflow \
  --region nyc1 \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64

# SSH into droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and deploy
git clone <your-repo>
cd claude-workflow-manager
cp .env.example .env
nano .env  # Add ANTHROPIC_API_KEY
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: AWS EC2

```bash
# Launch EC2 instance (t3.large recommended)
# Security group: Allow 80, 443, 22

# Connect
ssh -i your-key.pem ubuntu@ec2-instance-ip

# Install Docker
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu
newgrp docker

# Deploy
git clone <your-repo>
cd claude-workflow-manager
cp .env.example .env
nano .env  # Add ANTHROPIC_API_KEY
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Docker Hub + Any Server

```bash
# Build locally
docker build -t yourusername/claude-backend:latest -f Dockerfile.backend .
docker build -t yourusername/claude-frontend:latest -f Dockerfile.frontend .

# Push to Docker Hub
docker push yourusername/claude-backend:latest
docker push yourusername/claude-frontend:latest

# On server, modify docker-compose.prod.yml
# Change image: lines to your Docker Hub images
# Then run:
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## How Threading Affects Performance

### What Actually Happens

```
User Request → FastAPI → asyncio.create_task() → Subprocess spawn
                ↓                                      ↓
         Event Loop                            Claude CLI Process
         (1 thread)                            (Independent OS process)
                ↓                                      ↓
         Manages I/O                           Uses full CPU core
         Non-blocking                          Runs until complete
```

### Key Points:

1. **Event Loop Overhead**: Minimal (~10MB RAM, <5% CPU)
2. **Subprocess Isolation**: Each Claude process runs independently
3. **No Context Switching**: Unlike threads, processes don't share CPU time
4. **Memory Multiplication**: 3 jobs = 3× memory usage
5. **Linear Scaling**: Double jobs ≈ double resources needed

### Performance Math:

```
Base: 1GB (OS + Docker + FastAPI + Frontend)
Per Job: 1GB (Claude process + buffers)

2 concurrent jobs = 1GB + (2 × 1GB) = 3GB RAM minimum (4GB recommended)
3 concurrent jobs = 1GB + (3 × 1GB) = 4GB RAM minimum (6-8GB recommended)
5 concurrent jobs = 1GB + (5 × 1GB) = 6GB RAM minimum (10-12GB recommended)
```

### Why Async Is Better Than Threads Here:

- ✅ Each Claude CLI is already a separate process
- ✅ No Python GIL limitations
- ✅ Better error isolation
- ✅ Lower context-switching overhead
- ✅ Can handle thousands of async tasks (though limited by MAX_CONCURRENT_JOBS)

---

## Scaling Strategy

### Vertical Scaling (Easier)
Increase MAX_CONCURRENT_JOBS based on server resources:

```yaml
# docker-compose.yml
environment:
  - MAX_CONCURRENT_JOBS=5  # Adjust based on RAM/CPU

deploy:
  resources:
    limits:
      cpus: '8'    # 1-1.5 cores per job
      memory: 8G   # 1-1.5GB per job
```

**Formula**: `MAX_JOBS = floor((AVAILABLE_RAM - 2GB) / 1.2GB)`

Examples:
- 4GB server → 1-2 jobs
- 8GB server → 4-5 jobs
- 16GB server → 10-12 jobs
- 32GB server → 25-28 jobs

### Horizontal Scaling (Advanced)
For >10 concurrent jobs, consider multiple instances:

**Requirements:**
1. Shared storage (NFS, S3, or distributed filesystem)
2. Job queue system (Redis, RabbitMQ)
3. Load balancer (Nginx, Traefik)
4. Database for job tracking (PostgreSQL, MongoDB)

**Architecture:**
```
                    Load Balancer
                         |
        +----------------+----------------+
        |                |                |
   Backend 1        Backend 2        Backend 3
   (3 jobs)         (3 jobs)         (3 jobs)
        |                |                |
        +----------------+----------------+
                         |
                  Shared Storage
                  (NFS/S3/GlusterFS)
```

---

## Monitoring & Optimization

### Real-Time Monitoring

```bash
# Container stats
docker stats

# Application logs
docker-compose logs -f backend

# Job monitoring
curl http://localhost:8000/api/jobs

# System resources
htop
```

### Performance Tuning

#### 1. Optimize Docker Images
```dockerfile
# Multi-stage builds (already implemented)
# Result: ~300MB vs 1GB+
```

#### 2. Enable BuildKit Caching
```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

#### 3. Use Volume Caching
```yaml
volumes:
  - ./data:/app/data:cached  # macOS/Windows
```

#### 4. Adjust Uvicorn Workers
Currently: 1 worker (sufficient with async)
For CPU-bound tasks, consider:
```bash
uvicorn app:app --workers 4  # Generally not needed
```

#### 5. Enable Nginx Caching
```nginx
# In nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
```

---

## Cost Analysis

### Infrastructure Costs (Monthly)

| Scenario | Server | Claude API | Total |
|----------|--------|------------|-------|
| **Dev/Testing** | $20-30 | $10-20 | $30-50 |
| **Small Team (50 jobs/mo)** | $40-60 | $50-100 | $90-160 |
| **Medium Team (200 jobs/mo)** | $80-120 | $200-400 | $280-520 |
| **Enterprise (1000+ jobs/mo)** | $150-300 | $1000-2000 | $1150-2300 |

### Claude API Cost Per Job Type

- **Brand Data**: $0.50 - $2.00 (many web searches + long context)
- **Brief**: $0.20 - $0.50 (structured generation)
- **Draft**: $0.30 - $1.00 (content generation)

### ROI Considerations

**Manual Alternative:**
- Brand research: 2-4 hours @ $50/hr = $100-200
- Brief writing: 1-2 hours @ $50/hr = $50-100
- Draft writing: 2-3 hours @ $50/hr = $100-150

**Automated (this system):**
- Same tasks: $1-3.50 + 5-15 minutes
- **Savings per workflow**: $245-445 (98% cost reduction)

---

## Security Best Practices

### 1. Environment Variables
```bash
# Never commit .env
echo ".env" >> .gitignore

# Use Docker secrets in production
docker secret create anthropic_key your_api_key
```

### 2. Network Security
```yaml
# Expose only to localhost
ports:
  - "127.0.0.1:8000:8000"  # Backend
  - "127.0.0.1:80:80"      # Frontend
```

### 3. Use Reverse Proxy
```bash
# Let Nginx handle public traffic
# See DEPLOYMENT.md for Nginx config
```

### 4. Update Regularly
```bash
# Update base images
docker pull python:3.11-slim
docker pull node:20-alpine
docker-compose build --no-cache
```

### 5. Limit Resources
```yaml
# Prevent resource exhaustion
deploy:
  resources:
    limits:
      cpus: '8'
      memory: 8G
```

---

## Troubleshooting

### High Memory Usage
```bash
# Check per-container usage
docker stats

# Solution 1: Reduce concurrent jobs
# Edit docker-compose.yml
environment:
  - MAX_CONCURRENT_JOBS=2

# Solution 2: Add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Jobs Taking Too Long
```bash
# Check Claude API status
curl https://status.anthropic.com

# Check network latency
docker-compose exec backend ping anthropic.com

# Review job logs
curl http://localhost:8000/api/jobs/{job_id}/logs
```

### Out of Disk Space
```bash
# Check usage
df -h

# Clean Docker resources
docker system prune -af --volumes

# Rotate logs
find backend/logs -mtime +7 -delete
```

### Container Crashes
```bash
# Check logs
docker-compose logs backend

# Check events
docker events --since 24h

# Restart with fresh state
docker-compose down -v
docker-compose up -d
```

---

## Advanced Configuration

### Custom MAX_CONCURRENT_JOBS Based on RAM

Add to [app.py](app.py):

```python
import psutil

# Dynamic job limit based on available RAM
available_ram_gb = psutil.virtual_memory().available / (1024**3)
MAX_CONCURRENT_JOBS = max(1, int((available_ram_gb - 2) / 1.2))
```

### Auto-Scaling with Docker Swarm

```yaml
# docker-compose.swarm.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: '4'
          memory: 4G
```

### Health Monitoring with Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'claude-workflow'
    static_configs:
      - targets: ['localhost:8000']
```

---

## File Structure Summary

```
claude-workflow-manager/
├── backend/
│   ├── app.py                    # FastAPI app (asyncio + subprocess)
│   ├── requirements.txt          # Python dependencies
│   ├── brand-data/              # Generated brand research
│   ├── brief-outputs/           # Generated briefs
│   ├── draft-outputs/           # Generated drafts
│   ├── instructions/            # Generation templates
│   └── logs/                    # Job execution logs
├── frontend/
│   ├── src/                     # React source
│   ├── package.json            # Node dependencies
│   └── dist/                   # Built static files (in container)
├── Dockerfile.backend          # Backend image definition
├── Dockerfile.frontend         # Frontend image definition
├── docker-compose.yml          # Development setup
├── docker-compose.prod.yml     # Production setup
├── nginx.conf                  # Frontend + API reverse proxy
├── Makefile                    # Convenience commands
├── .env.example               # Environment template
├── .dockerignore              # Build optimization
├── DEPLOYMENT.md              # Full deployment guide
└── DOCKER_GUIDE.md            # This file
```

---

## Summary: What Type of Machine Do You Need?

### Quick Decision Matrix

**For 1-2 concurrent jobs (testing/personal):**
- 2 vCPU, 4GB RAM, 20GB storage
- Any budget VPS ($20-30/month)
- DigitalOcean Basic, Linode Shared, Hetzner CX21

**For 3-4 concurrent jobs (small team):**
- 4 vCPU, 8GB RAM, 50GB SSD
- Mid-tier VPS ($40-60/month)
- **Recommended**: Hetzner CPX31 (best value)

**For 5-10 concurrent jobs (production):**
- 8 vCPU, 16GB RAM, 100GB SSD
- High-performance VPS ($80-120/month)
- DigitalOcean CPU-Optimized, AWS c5.2xlarge

**For 10+ concurrent jobs (enterprise):**
- 16+ vCPU, 32+ GB RAM, 250+ GB NVMe
- Dedicated server or cloud compute ($150-300/month)
- Consider horizontal scaling

---

## Next Steps

1. **Development**: `make install && make up`
2. **Production**: Review [DEPLOYMENT.md](DEPLOYMENT.md)
3. **Monitoring**: Setup alerts and log aggregation
4. **Optimization**: Tune MAX_CONCURRENT_JOBS based on usage
5. **Scaling**: Implement Redis + shared storage for horizontal scaling

For questions or issues, review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
