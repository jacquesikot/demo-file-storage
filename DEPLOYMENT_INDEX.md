# Docker Deployment - Complete File Index

## 📋 Overview

This document provides an index of all deployment-related files created for the Claude Workflow Manager Docker deployment.

---

## 🚀 Getting Started

**Start here:**
1. Read [QUICK_START.md](QUICK_START.md) - 3-minute setup guide
2. Review [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Complete deployment guide
3. Follow [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed production deployment

---

## 📁 File Reference

### Core Docker Files

| File | Purpose | Size | When to Edit |
|------|---------|------|--------------|
| [Dockerfile.backend](Dockerfile.backend) | Backend container definition | 1.1KB | Add system dependencies |
| [Dockerfile.frontend](Dockerfile.frontend) | Frontend container definition | 647B | Change build process |
| [docker-compose.yml](docker-compose.yml) | Development setup | 1.4KB | Local development config |
| [docker-compose.prod.yml](docker-compose.prod.yml) | Production setup | 2.9KB | Production deployment |
| [.dockerignore](.dockerignore) | Build optimization | 586B | Exclude files from build |
| [.env.example](.env.example) | Environment template | 310B | Never (copy to .env) |

### Configuration Files

| File | Purpose | Size |
|------|---------|------|
| [nginx.conf](nginx.conf) | Frontend + API proxy | 1.5KB |
| [Makefile](Makefile) | Command shortcuts | 3.4KB |

### Documentation Files

| File | Purpose | Best For |
|------|---------|----------|
| [QUICK_START.md](QUICK_START.md) | 3-minute guide | First-time users |
| [DOCKER_GUIDE.md](DOCKER_GUIDE.md) | Complete guide | Understanding the system |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment | DevOps/deployment |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical deep dive | Developers/architects |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues | Problem solving |
| [README.md](README.md) | Application overview | General users |

---

## 🎯 Use Case Navigation

### I want to...

#### ...deploy locally for development
1. Read: [QUICK_START.md](QUICK_START.md)
2. Use: `docker-compose.yml`
3. Run: `make install && make up`

#### ...deploy to production
1. Read: [DEPLOYMENT.md](DEPLOYMENT.md)
2. Use: `docker-compose.prod.yml`
3. Follow: Cloud provider setup (AWS/DO/Hetzner)

#### ...understand how it works
1. Read: [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Performance insights
2. Read: [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
3. Review: [app.py](backend/app.py) - Source code

#### ...choose a server
1. Read: [DOCKER_GUIDE.md](DOCKER_GUIDE.md#server-requirements)
2. Use table: Server Requirements by Use Case
3. Recommendation: Hetzner CPX31 for best value

#### ...optimize performance
1. Read: [DOCKER_GUIDE.md](DOCKER_GUIDE.md#performance-optimization)
2. Adjust: `MAX_CONCURRENT_JOBS` in `.env`
3. Monitor: `make stats`

#### ...troubleshoot issues
1. Check: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. View logs: `make logs`
3. Check health: `make health`

#### ...scale horizontally
1. Read: [ARCHITECTURE.md](ARCHITECTURE.md#horizontal-scaling-advanced)
2. Implement: Redis for job storage
3. Setup: Shared storage (NFS/S3)
4. Add: Load balancer

---

## 📊 Quick Reference Tables

### Server Sizing Guide

| Use Case | vCPU | RAM | Storage | Cost/mo | Concurrent Jobs |
|----------|------|-----|---------|---------|-----------------|
| Dev/Test | 2 | 4GB | 20GB | $20-30 | 1-2 |
| Small Team | 4 | 8GB | 50GB | $40-60 | 3-4 |
| Production | 8 | 16GB | 100GB | $80-120 | 5-10 |
| Enterprise | 16+ | 32GB+ | 250GB+ | $150+ | 10+ |

**Formula**: `MAX_JOBS ≈ (RAM - 2GB) / 1.2GB`

### Command Reference

```bash
# Development
make install        # Initial setup + build
make up            # Start services
make down          # Stop services
make logs          # View logs
make health        # Check health

# Production
make build-prod    # Build production images
make up-prod       # Start production
make logs-prod     # View production logs

# Maintenance
make backup        # Backup files
make clean         # Remove all containers
make stats         # Resource usage
```

### Performance Characteristics

| Metric | Value |
|--------|-------|
| **Per Job RAM** | 500MB - 1GB |
| **Per Job CPU** | 0.5 - 1 core |
| **Job Duration** | 2-15 minutes |
| **API Cost/Job** | $0.20 - $2.00 |
| **Throughput (3 jobs)** | 12-18 jobs/hour |

---

## 🔧 Configuration Quick Reference

### Environment Variables (.env)

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxx...    # Your Claude API key

# Optional
MAX_CONCURRENT_JOBS=3              # Concurrent job limit
```

### Resource Limits (docker-compose.yml)

```yaml
deploy:
  resources:
    limits:
      cpus: '8'      # Total CPU cores
      memory: 8G     # Total RAM
    reservations:
      cpus: '4'      # Minimum guaranteed
      memory: 4G
```

### Ports

```yaml
# Development
frontend:  localhost:80
backend:   localhost:8000

# Production (with reverse proxy)
frontend:  127.0.0.1:80
backend:   127.0.0.1:8000
```

---

## 🏗️ Architecture Summary

```
User → Nginx → React SPA (Frontend)
              ↓
         FastAPI (Backend)
              ↓
    asyncio.create_subprocess()
              ↓
    ┌─────────┬─────────┬─────────┐
    │         │         │         │
  Job 1     Job 2     Job 3     (Claude CLI Processes)
    │         │         │
    └─────────┴─────────┴─────────┘
              ↓
        Anthropic API
```

**Key Points:**
- **NOT thread-based**: Uses asyncio + subprocesses
- **True parallelism**: Each job is independent OS process
- **No GIL issues**: Full multi-core utilization
- **Resource isolation**: Job failures don't affect others

---

## 📈 Cost Breakdown

### Infrastructure (Monthly)

| Provider | Instance | Specs | Cost |
|----------|----------|-------|------|
| **Hetzner** ⭐ | CPX31 | 4 vCPU, 8GB RAM | €12 (~$15) |
| DigitalOcean | Standard | 4 vCPU, 8GB RAM | $48 |
| Linode | Dedicated | 4 vCPU, 8GB RAM | $40 |
| AWS | t3.large | 2 vCPU, 8GB RAM | ~$60 |

### API Costs (Per Job)

- Brand Data: $0.50 - $2.00
- Brief: $0.20 - $0.50
- Draft: $0.30 - $1.00

### Total Cost Examples

| Scenario | Server | Jobs/mo | API Cost | Total |
|----------|--------|---------|----------|-------|
| Light Use | Hetzner CPX21 | 20 | $10-40 | $25-55 |
| Medium Use | Hetzner CPX31 | 100 | $50-150 | $65-165 |
| Heavy Use | Hetzner CPX51 | 500 | $250-750 | $285-785 |

---

## 🔐 Security Checklist

- [ ] API key in `.env` (never commit)
- [ ] `.env` in `.gitignore`
- [ ] Firewall: only 80/443 open
- [ ] SSL/TLS enabled (Let's Encrypt)
- [ ] Docker images updated regularly
- [ ] Logs rotated automatically
- [ ] Resource limits configured
- [ ] Backups automated
- [ ] Monitoring/alerts setup

---

## 🐛 Common Issues & Solutions

### Issue: Out of memory
**File**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md#high-memory-usage)
**Quick Fix**: Reduce `MAX_CONCURRENT_JOBS` in `.env`

### Issue: Jobs failing
**File**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md#jobs-failing)
**Quick Fix**: Check `docker-compose logs backend`

### Issue: Can't connect
**File**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md#cant-connect)
**Quick Fix**: Run `make health` to diagnose

### Issue: Build errors
**File**: [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)
**Quick Fix**: Clear cache with `docker-compose build --no-cache`

---

## 📚 Learning Path

### For Developers
1. [README.md](README.md) - Understand the application
2. [ARCHITECTURE.md](ARCHITECTURE.md) - System design
3. [app.py](backend/app.py) - Source code review

### For DevOps
1. [QUICK_START.md](QUICK_START.md) - Quick deployment
2. [DEPLOYMENT.md](DEPLOYMENT.md) - Production setup
3. [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Optimization

### For Decision Makers
1. [DOCKER_GUIDE.md](DOCKER_GUIDE.md#cost-analysis) - Cost analysis
2. [DOCKER_GUIDE.md](DOCKER_GUIDE.md#server-requirements) - Infrastructure needs
3. [ARCHITECTURE.md](ARCHITECTURE.md#scalability-limits) - Scaling options

---

## 🎓 Key Concepts Explained

### Asyncio vs Threading
**File**: [ARCHITECTURE.md](ARCHITECTURE.md#concurrency-model-deep-dive)
- Your app uses asyncio (event loop) + subprocesses
- NOT traditional threading
- Better performance, no GIL limitations

### Resource Calculation
**File**: [DOCKER_GUIDE.md](DOCKER_GUIDE.md#performance-math)
```
Total RAM = Base (1GB) + (Jobs × 1GB)
3 concurrent jobs = 1 + 3 = 4GB minimum (6-8GB recommended)
```

### Horizontal Scaling
**File**: [ARCHITECTURE.md](ARCHITECTURE.md#horizontal-scaling-advanced)
- Requires: Redis + Shared Storage + Load Balancer
- Suitable for: >10 concurrent jobs
- Cost-effective at: >30 concurrent jobs

---

## 💡 Pro Tips

1. **Start Small**: Deploy with 2-3 concurrent jobs first
2. **Monitor First**: Run for 1 week, watch resource usage
3. **Choose Hetzner**: Best price/performance ratio
4. **Use Makefile**: Commands like `make up`, `make logs`
5. **Enable Auto-Restart**: Set `restart: always` in compose
6. **Setup Monitoring**: UptimeRobot for uptime alerts
7. **Automate Backups**: Daily cron job for `make backup`

---

## 🆘 Support Resources

### Documentation
- Application docs: [README.md](README.md)
- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)

### Commands
```bash
# Health check
make health

# View logs
make logs

# Resource usage
make stats

# Restart services
make restart
```

### External Resources
- Docker docs: https://docs.docker.com
- FastAPI docs: https://fastapi.tiangolo.com
- Claude API: https://docs.anthropic.com

---

## 🎯 Next Steps

1. **Review** [QUICK_START.md](QUICK_START.md)
2. **Deploy locally** with `make install && make up`
3. **Test the system** with sample jobs
4. **Review** [DEPLOYMENT.md](DEPLOYMENT.md) for production
5. **Choose** a cloud provider
6. **Deploy** to production
7. **Monitor** for 1 week
8. **Optimize** `MAX_CONCURRENT_JOBS` based on usage

---

## 📝 File Creation Summary

**Total files created**: 11
**Total documentation**: ~50KB
**Deployment ready**: ✅

### Files by Category

**Docker**:
- Dockerfile.backend
- Dockerfile.frontend
- docker-compose.yml
- docker-compose.prod.yml
- .dockerignore
- nginx.conf

**Build Tools**:
- Makefile
- .env.example

**Documentation**:
- QUICK_START.md (getting started)
- DOCKER_GUIDE.md (comprehensive guide)
- DEPLOYMENT.md (production deployment)
- ARCHITECTURE.md (technical deep dive)
- DEPLOYMENT_INDEX.md (this file)

**Existing**:
- README.md (application docs)
- TROUBLESHOOTING.md (issue resolution)

---

## 📞 Questions?

If you need help:
1. Check the relevant guide above
2. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. Check container logs: `make logs`
4. Run health check: `make health`

**Ready to deploy?** Start with [QUICK_START.md](QUICK_START.md)!
