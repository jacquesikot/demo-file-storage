# Deployment Guide

## Quick Start - Deploy to Coolify

### Prerequisites
- Self-hosted Coolify instance
- Docker and Docker Compose support
- Git repository access

### Deployment Steps

1. **In Coolify Dashboard**:
   - Create New Resource → Docker Compose
   - Connect your Git repository
   - Set branch to `main`
   - Coolify will auto-detect `docker-compose.coolify.yml`

2. **Configure Environment Variables**:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   MAX_CONCURRENT_JOBS=3
   ```

3. **Deploy**:
   - Click "Deploy"
   - Wait 5-10 minutes for build to complete

4. **Configure Domains** (Optional):
   - Frontend: `workflow.yourdomain.com`
   - Backend: `workflow-api.yourdomain.com`
   - Add DNS A records pointing to your server IP
   - Coolify will automatically handle SSL certificates

### Access URLs

After deployment, your services will be available at:

- **Direct Port Access**:
  - Frontend: `http://YOUR-SERVER-IP:3000`
  - Backend API: `http://YOUR-SERVER-IP:8000`

- **With Custom Domains** (after DNS configuration):
  - Frontend: `https://workflow.yourdomain.com`
  - Backend API: `https://workflow-api.yourdomain.com`

### Architecture

The deployment uses:
- **Direct port mapping** (bypasses Traefik proxy)
- **Docker Compose** for multi-service orchestration
- **Persistent volumes** for data storage
- **Health checks** for container monitoring

Services:
- **Backend**: FastAPI on port 8000
- **Frontend**: Nginx serving React app on port 3000 (internal port 80)

### Port Configuration

```yaml
backend:
  ports: ["8000:8000"]  # Direct host port mapping

frontend:
  ports: ["3000:80"]    # Host 3000 → Container 80
```

### Persistent Data

The following volumes are automatically created:
- `brand-data`: Brand JSON files
- `brief-outputs`: Generated briefs
- `draft-outputs`: Generated drafts
- `logs`: Job execution logs
- `claude-config`: Claude Code configuration

### Troubleshooting

#### Container Not Starting
```bash
# Check container logs
docker logs <container-name>

# Check container status
docker ps -a | grep workflow
```

#### Port Conflicts
If ports 8000 or 3000 are already in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.coolify.yml`
3. Redeploy in Coolify

#### Cannot Access Services
1. **Check firewall**: Ensure ports 8000 and 3000 are open
2. **Check cloud provider security groups**: Allow inbound TCP on these ports
3. **Use domain-based access**: Configure domains in Coolify instead

#### Health Check Failures
```bash
# Test backend health
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000/
```

### Updating the Application

1. Push changes to your Git repository
2. In Coolify, click "Redeploy"
3. Coolify will pull latest code and rebuild

### Rollback

If deployment fails:
1. In Coolify, view deployment history
2. Click on a previous successful deployment
3. Click "Redeploy" on that version

## Production Deployment (Alternative Methods)

### Docker Compose (Manual)

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd claude-workflow-manager
   ```

2. **Create `.env` file**:
   ```bash
   ANTHROPIC_API_KEY=your-api-key-here
   MAX_CONCURRENT_JOBS=3
   ```

3. **Deploy**:
   ```bash
   docker-compose -f docker-compose.coolify.yml up -d
   ```

### Traditional Server Deployment

See [TRADITIONAL_DEPLOYMENT.md](./TRADITIONAL_DEPLOYMENT.md) for nginx, systemd, and manual setup instructions.

## Security Considerations

1. **API Keys**: Never commit API keys to Git
2. **Firewall**: Restrict access to necessary ports only
3. **SSL**: Always use HTTPS in production (via domains)
4. **Updates**: Keep Docker images and dependencies updated

## Monitoring

### Check Container Health
```bash
docker ps
docker logs backend
docker logs frontend
```

### Check Resource Usage
```bash
docker stats
```

### View Application Logs
```bash
# Backend logs
docker exec backend tail -f /app/backend/logs/*.log

# Access logs via Coolify UI
```

## Scaling

Current configuration supports:
- Up to 3 concurrent jobs (configurable via `MAX_CONCURRENT_JOBS`)
- Single backend instance
- Single frontend instance

For higher loads:
- Increase `MAX_CONCURRENT_JOBS`
- Add more CPU/memory to containers
- Consider load balancing multiple instances

## Support

For issues:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review container logs
3. Check Coolify deployment logs
4. Open an issue on GitHub
