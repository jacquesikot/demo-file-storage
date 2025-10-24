# Changelog

## 2024-10-24 - Initial Docker Deployment Setup

### Added
- Docker deployment infrastructure
  - `Dockerfile.backend` - Backend container definition
  - `Dockerfile.frontend` - Frontend container definition
  - `docker-compose.yml` - Development environment
  - `docker-compose.prod.yml` - Production environment
  - `nginx.conf` - Reverse proxy configuration
  - `.dockerignore` - Build optimization
  - `.env.example` - Environment template
  - `Makefile` - Convenient commands

- Comprehensive documentation
  - `QUICK_START.md` - 3-minute getting started guide
  - `DOCKER_GUIDE.md` - Complete deployment guide (14KB)
  - `DEPLOYMENT.md` - Production deployment instructions (10KB)
  - `ARCHITECTURE.md` - Technical architecture deep dive (22KB)
  - `DEPLOYMENT_INDEX.md` - Navigation hub for all docs

### Fixed
- Makefile `.PHONY` declarations now include all targets
  - Added: setup, install, backup, restore, health, stats, top
  - Added: logs-backend, logs-frontend, shell-backend, shell-frontend, ps
  - Added: build-prod, up-prod, down-prod, logs-prod, clean-logs, prune, test-backend

### Features
- Async subprocess model for true parallelism
- Configurable concurrent job limits
- SSE log streaming
- Health checks
- Resource limits
- Auto-restart policies
- Log rotation
- Backup/restore commands

### Documentation Highlights
- Complete server sizing guide (2GB to 32GB+ RAM)
- Performance characteristics and benchmarks
- Cost analysis and ROI calculations
- Cloud provider recommendations (Hetzner, DigitalOcean, AWS, Linode)
- Horizontal scaling strategy
- Security best practices
- Troubleshooting guides

### Usage
```bash
# Quick start
make setup     # Create .env from .env.example
make install   # Build images
make up        # Start services

# Production
make build-prod
make up-prod

# Maintenance
make logs      # View logs
make health    # Check health
make backup    # Backup files
make stats     # Resource usage
```

### Requirements
- Docker Engine 24.0+
- Docker Compose 2.0+
- Anthropic API key
- Minimum 4GB RAM for development
- Recommended 8GB+ RAM for production

### Server Recommendations
- **Light use (1-2 jobs)**: 2 vCPU, 4GB RAM (~$20-30/mo)
- **Medium use (3-4 jobs)**: 4 vCPU, 8GB RAM (~$40-60/mo)
- **Production (5-10 jobs)**: 8 vCPU, 16GB RAM (~$80-120/mo)
- **Best value**: Hetzner CPX31 (4 vCPU, 8GB RAM, €12/mo)

### Performance
- Per job: 500MB-1GB RAM, 0.5-1 CPU core
- Job duration: 2-15 minutes
- Throughput (3 concurrent): 12-18 jobs/hour
- API cost per job: $0.20-$2.00

### Known Issues
None

### Breaking Changes
None

### Migration Notes
- Existing installations can adopt Docker without data loss
- Existing files in backend/* directories are preserved
- .env file must be manually configured with ANTHROPIC_API_KEY
