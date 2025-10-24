# Quick Start Guide - Claude Workflow Manager

## 🚀 Get Running in 3 Minutes

### Prerequisites

- Docker & Docker Compose installed
- Anthropic API key

### Local Development

```bash
# 1. Setup
make setup
# Edit .env and add your ANTHROPIC_API_KEY

# 2. Build & Run
make install
make up

# 3. Access
open http://localhost           # Frontend
open http://localhost:8000/docs # API Docs
```

### Production Deployment

```bash
# On your server
git clone <your-repo>
cd claude-workflow-manager

# Setup
cp .env.example .env
nano .env  # Add ANTHROPIC_API_KEY

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps
docker-compose logs -f
```

---

## 🔧 Essential Commands

```bash
# Development
make up              # Start services
make down            # Stop services
make logs            # View all logs
make logs-backend    # View backend logs only
make health          # Check service health

# Production
make up-prod         # Start production services
make logs-prod       # View production logs

# Maintenance
make backup          # Backup generated files
make clean-logs      # Remove old log files
make stats           # Show resource usage

# Monitoring
docker stats                              # Real-time resource usage
curl http://localhost:8000/api/jobs      # List all jobs
curl http://localhost:8000/api/jobs/abc123/logs  # Stream job logs
```

---

## ⚙️ Configuration

### Adjust Concurrent Jobs

Edit `.env`:

```bash
MAX_CONCURRENT_JOBS=5  # Based on your server RAM
```

**Formula**: `MAX_JOBS = (AVAILABLE_RAM - 2GB) / 1.2GB`

- 4GB RAM → 1-2 jobs
- 8GB RAM → 4-5 jobs
- 16GB RAM → 10-12 jobs

### Resource Limits

Edit `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '8' # 1-1.5 cores per job
      memory: 8G # 1-1.5GB per job
```

---

## 🔍 Performance Insights

### How It Works

```
FastAPI (async)
    ↓
spawns → Claude CLI Process 1 (1GB RAM, 1 CPU core)
spawns → Claude CLI Process 2 (1GB RAM, 1 CPU core)
spawns → Claude CLI Process 3 (1GB RAM, 1 CPU core)
```

### Resource Usage Per Job

- **CPU**: 0.5-1 core
- **RAM**: 500MB-1GB
- **Duration**: 2-15 minutes
- **Cost**: $0.20-$2.00 per job

### Threading Model

- **NOT thread-based**: Uses asyncio + subprocesses
- **Each job = independent OS process**
- **No GIL limitations**
- **True parallelism** ✅

---

## 🐛 Common Issues

### Out of Memory

```bash
# Reduce concurrent jobs in .env
MAX_CONCURRENT_JOBS=2

# Add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Jobs Failing

```bash
# Check API key
docker-compose exec backend env | grep ANTHROPIC

# Check logs
docker-compose logs backend

# Restart services
make restart
```

### Can't Connect

```bash
# Check services are running
docker-compose ps

# Check health
make health

# View logs for errors
make logs
```

---

## 📁 File Locations

```
backend/
├── brand-data/      # Generated brand research files
├── brief-outputs/   # Generated content briefs
├── draft-outputs/   # Generated content drafts
└── logs/           # Job execution logs (job_id.log)
```

---

## 🔐 Security Checklist

- [ ] API key in `.env` (not committed to git)
- [ ] Firewall configured (only 80/443 open)
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Regular backups scheduled
- [ ] Docker images updated monthly
- [ ] Log rotation configured
- [ ] Resource limits set

---

## 📚 Documentation

- **Full Guide**: [DOCKER_GUIDE.md](DOCKER_GUIDE.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Application**: [README.md](README.md)

---

## 💡 Pro Tips

1. **Start small**: Begin with 2 concurrent jobs and scale up
2. **Monitor first**: Run for a week and check resource usage
3. **Use Hetzner**: Best price/performance ratio
4. **Enable auto-restart**: `restart: always` in docker-compose
5. **Setup alerts**: Use UptimeRobot or similar
6. **Backup regularly**: Schedule daily backups with cron

---

## 🎯 Next Steps

1. **Deploy**: Choose a provider and deploy
2. **Monitor**: Watch logs and resource usage for 1 week
3. **Optimize**: Adjust MAX_CONCURRENT_JOBS based on actual usage
4. **Scale**: Upgrade server or add instances as needed

Need help? Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.
