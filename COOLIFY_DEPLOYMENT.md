# Coolify Deployment Guide for Claude Workflow Manager

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Preparing Your Repository](#preparing-your-repository)
3. [Coolify Server Setup](#coolify-server-setup)
4. [Deploying to Coolify](#deploying-to-coolify)
5. [Configuration](#configuration)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Coolify Server Requirements
- **OS**: Ubuntu 20.04, 22.04, or 24.04 LTS
- **CPU**: 4-8 vCPUs (minimum 2)
- **RAM**: 8-16 GB (minimum 4 GB)
- **Storage**: 50-100 GB SSD
- **Network**: Public IP address with ports 80, 443, and 8000 open

### Required Credentials
- Anthropic API Key (get from https://console.anthropic.com/)
- Git repository access (GitHub, GitLab, or Bitbucket)
- SSH access to your Coolify server

### Estimated Monthly Cost
- **VPS Hosting**: $40-80/month (DigitalOcean, Hetzner, Linode, etc.)
- **Claude API Usage**: $50-150/month (varies by usage)
- **Total**: ~$100-230/month

---

## Coolify Server Setup

### 1. Install Coolify on Your Server

SSH into your server and run the installation script:

```bash
# Quick install (recommended)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

**Installation takes about 1 minute.** This script will:
- Install Docker Engine
- Install Docker Compose
- Set up Coolify management interface
- Configure Traefik reverse proxy
- Set up SSL certificates

### 2. Access Coolify Dashboard

After installation completes:

```bash
# Get your Coolify admin credentials
cat ~/.coolify/credentials
```

Access the dashboard at: `http://your-server-ip:8000`

### 3. Initial Configuration

1. **Change default password** immediately
2. **Add SSH key** for Git repository access
3. **Configure email** for SSL certificate notifications (Let's Encrypt)
4. **Set up domain** (optional but recommended)

---

## Preparing Your Repository

### 1. Create Coolify-Optimized Docker Compose File

Create a new file `docker-compose.coolify.yml` in your repository root:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: unless-stopped
    environment:
      # Coolify will prompt for these values in UI
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:?Please set your Anthropic API key}
      - MAX_CONCURRENT_JOBS=${MAX_CONCURRENT_JOBS:-3}
      - PYTHONUNBUFFERED=1
      # Magic variables (Coolify generates these)
      - SERVICE_FQDN_BACKEND=${SERVICE_FQDN_BACKEND}
    volumes:
      # Persistent storage for generated files
      - brand-data:/app/backend/brand-data
      - brief-outputs:/app/backend/brief-outputs
      - draft-outputs:/app/backend/draft-outputs
      - logs:/app/backend/logs
      # Read-only instruction files
      - ./backend/instructions:/app/backend/instructions:ro
      - ./backend/data:/app/backend/data:ro
      # Claude Code configuration
      - claude-config:/home/appuser/.claude
    networks:
      - claude-network
    labels:
      - "coolify.managed=true"
      # Expose backend API on custom domain
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`${SERVICE_FQDN_BACKEND}`) && PathPrefix(`/api`)"
      - "traefik.http.services.backend.loadbalancer.server.port=8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      # Coolify magic variables
      - SERVICE_FQDN_FRONTEND=${SERVICE_FQDN_FRONTEND}
      - BACKEND_URL=http://backend:8000
    networks:
      - claude-network
    labels:
      - "coolify.managed=true"
      # Expose frontend on custom domain
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`${SERVICE_FQDN_FRONTEND}`)"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  claude-network:
    driver: bridge

volumes:
  brand-data:
  brief-outputs:
  draft-outputs:
  logs:
  claude-config:
```

**Key Changes for Coolify:**
- ✅ Removed port mappings (Coolify's Traefik proxy handles routing)
- ✅ Added magic environment variables (`SERVICE_FQDN_*`)
- ✅ Added Traefik labels for domain routing
- ✅ Used named volumes for persistence
- ✅ Added healthchecks for monitoring
- ✅ Made ANTHROPIC_API_KEY required with `:?` syntax

### 2. Push to Git Repository

```bash
git add docker-compose.coolify.yml
git commit -m "Add Coolify deployment configuration"
git push origin main
```

### 3. Verify Dockerfiles

Ensure your `Dockerfile.backend` includes a health endpoint. Add to [backend/app.py](backend/app.py):

```python
@app.get("/health")
async def health_check():
    """Health check endpoint for Coolify"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_jobs": job_manager.active_count()
    }
```

---

## Deploying to Coolify

### Step 1: Create New Project in Coolify

1. Log into Coolify dashboard
2. Click **"+ Add"** → **"Create New Project"**
3. Give it a name: `claude-workflow-manager`
4. Click **"Create"**

### Step 2: Add New Resource

1. Click **"+ Add Resource"**
2. Select deployment type:
   - **Public Repository**: For open-source repos
   - **Private Repository (GitHub App)**: For private GitHub repos
   - **Private Repository (Deploy Key)**: For GitLab/Bitbucket

### Step 3: Configure Repository

**For GitHub (recommended):**

1. Click **"Connect GitHub App"**
2. Authorize Coolify to access your repository
3. Select your repository from dropdown
4. Configure settings:
   - **Branch**: `main` (or your default branch)
   - **Base Directory**: `/` (root of repository)
   - **Build Pack**: Select **"Docker Compose"**
   - **Docker Compose Location**: `docker-compose.coolify.yml`

### Step 4: Configure Environment Variables

Coolify will detect variables from your compose file and show them in the UI:

**Required Variables (must set):**
- `ANTHROPIC_API_KEY`: Your Anthropic API key (from https://console.anthropic.com/)

**Optional Variables (defaults provided):**
- `MAX_CONCURRENT_JOBS`: `3` (adjust based on server resources)

**Auto-Generated Variables (Coolify creates these):**
- `SERVICE_FQDN_BACKEND`: Backend domain
- `SERVICE_FQDN_FRONTEND`: Frontend domain

Click **"Save Environment Variables"**

### Step 5: Configure Domains

Coolify will show two services: `backend` and `frontend`

**Frontend Service:**
1. Click on `frontend` service
2. Click **"Set Domain"**
3. Enter your domain: `yourdomain.com` or `app.yourdomain.com`
4. Coolify will auto-configure SSL with Let's Encrypt

**Backend Service:**
1. Click on `backend` service
2. Click **"Set Domain"**
3. Enter subdomain: `api.yourdomain.com`
4. Or use same domain with path: `yourdomain.com/api`

**Using IP Address (Testing):**
If you don't have a domain yet, use your server IP:
- Frontend: `http://your-server-ip`
- Backend: `http://your-server-ip:8000`

### Step 6: Configure Storage Volumes

Coolify automatically handles volumes defined in your compose file. Verify:

1. Go to **"Storage"** tab
2. Confirm these volumes exist:
   - `brand-data`
   - `brief-outputs`
   - `draft-outputs`
   - `logs`
   - `claude-config`

**Volume Location on Server:**
Volumes are stored at: `/var/lib/docker/volumes/coolify-*`

### Step 7: Deploy Application

1. Click **"Deploy"** button (top right)
2. Watch the deployment logs in real-time
3. Wait for build to complete (~5-10 minutes first time)

**Build Process:**
```
✓ Cloning repository
✓ Building backend image
✓ Building frontend image
✓ Creating network
✓ Starting containers
✓ Configuring Traefik proxy
✓ Generating SSL certificates
✓ Health checks passing
✓ Deployment successful
```

---

## Configuration

### Adjusting Concurrent Jobs

Based on your server resources:

**4 GB RAM:**
```yaml
environment:
  - MAX_CONCURRENT_JOBS=2
```

**8 GB RAM:**
```yaml
environment:
  - MAX_CONCURRENT_JOBS=3  # Default
```

**16 GB RAM:**
```yaml
environment:
  - MAX_CONCURRENT_JOBS=6
```

**32 GB RAM:**
```yaml
environment:
  - MAX_CONCURRENT_JOBS=10
```

Update in Coolify UI: **Environment Variables → Edit → Save → Redeploy**

### Enabling CORS for Custom Domain

If using custom domain, update CORS in [backend/app.py](backend/app.py):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Development
        "http://localhost",       # Docker
        "https://yourdomain.com", # Production frontend
        "https://api.yourdomain.com"  # Production backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push changes, then redeploy in Coolify.

### Configuring Resource Limits

Coolify allows setting resource limits per service:

1. Click on service (backend or frontend)
2. Go to **"Resources"** tab
3. Set limits:

**Backend:**
- CPU: 4 cores
- Memory: 4 GB

**Frontend:**
- CPU: 1 core
- Memory: 512 MB

---

## Post-Deployment

### Verify Deployment

**1. Check Application Health:**
```bash
# Frontend
curl https://yourdomain.com

# Backend health endpoint
curl https://api.yourdomain.com/health

# Backend API docs
curl https://api.yourdomain.com/docs
```

**2. Test Job Submission:**

Open your frontend at `https://yourdomain.com` and:
1. Navigate to **Brand Data** tab
2. Enter test brand information
3. Click **"Generate Brand Data"**
4. Verify job starts and logs stream

**3. Check Container Logs:**

In Coolify dashboard:
1. Click on service
2. Go to **"Logs"** tab
3. View real-time logs

**Via SSH:**
```bash
# View all containers
docker ps

# View backend logs
docker logs -f <backend-container-id>

# View frontend logs
docker logs -f <frontend-container-id>
```

### Access Generated Files

Files are stored in Docker volumes. To access:

```bash
# SSH into your Coolify server
ssh user@your-server

# List volumes
docker volume ls | grep coolify

# Inspect volume
docker volume inspect <volume-name>

# Copy files out
docker run --rm -v <volume-name>:/data -v $(pwd):/backup ubuntu tar czf /backup/brand-data-backup.tar.gz /data
```

### Backup Strategy

**Automated Backups (Recommended):**

Create a cron job on your Coolify server:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-claude-workflow.sh
```

**Backup Script** (`/usr/local/bin/backup-claude-workflow.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/backups/claude-workflow"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR

# Backup volumes
docker run --rm \
  -v coolify-brand-data:/data \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/brand-data-$DATE.tar.gz /data

docker run --rm \
  -v coolify-brief-outputs:/data \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/brief-outputs-$DATE.tar.gz /data

docker run --rm \
  -v coolify-draft-outputs:/data \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/draft-outputs-$DATE.tar.gz /data

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable:
```bash
chmod +x /usr/local/bin/backup-claude-workflow.sh
```

---

## Monitoring & Maintenance

### Coolify Built-in Monitoring

**Dashboard Overview:**
1. Navigate to your project
2. View service status indicators:
   - 🟢 Green: Healthy
   - 🟡 Yellow: Warning
   - 🔴 Red: Down

**Resource Usage:**
- Click on service → **"Metrics"** tab
- View CPU, Memory, Network usage

**Real-time Logs:**
- Click on service → **"Logs"** tab
- Filter by timestamp or search keywords

### Application-Level Monitoring

**Job Status API:**
```bash
# List all jobs
curl https://api.yourdomain.com/api/jobs

# Check specific job
curl https://api.yourdomain.com/api/jobs/<job-id>

# Stream job logs
curl https://api.yourdomain.com/api/jobs/<job-id>/logs
```

**Container Stats:**
```bash
# SSH into server
ssh user@your-server

# Real-time stats
docker stats

# Check disk usage
df -h

# Check volume sizes
docker system df -v
```

### Updating the Application

**Method 1: Via Coolify Dashboard (Recommended)**
1. Go to your project
2. Click **"Redeploy"** button
3. Coolify will:
   - Pull latest code from Git
   - Rebuild images
   - Perform rolling update (zero downtime)

**Method 2: Automatic Deployments**

Enable webhook in Coolify:
1. Go to project settings
2. Copy webhook URL
3. Add to GitHub repository:
   - Settings → Webhooks → Add webhook
   - Paste Coolify webhook URL
   - Select "Push" events
   - Save

Now every push to `main` branch auto-deploys!

**Method 3: Manual Git Push**

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Trigger deployment in Coolify
# Or wait for webhook (if enabled)
```

### Scaling Resources

**Vertical Scaling (Increase Resources):**

1. Upgrade your VPS to larger instance
2. In Coolify, update resource limits
3. Redeploy application

**Horizontal Scaling (Multiple Instances):**

⚠️ **Current Limitation:** Application uses in-memory job state, not suitable for horizontal scaling without modifications.

**To enable horizontal scaling:**
1. Implement Redis/PostgreSQL backend (see [DEPLOYMENT.md](DEPLOYMENT.md) Option 1)
2. Use shared volumes
3. Deploy multiple backend replicas in Coolify

---

## Troubleshooting

### Issue: Deployment Failed

**Symptom:** Build fails with error messages

**Solutions:**

1. **Check build logs:**
   - Coolify Dashboard → Logs tab
   - Look for error messages

2. **Common causes:**
   - Missing environment variables → Add in Coolify UI
   - Dockerfile errors → Test locally with `docker build`
   - Docker Compose syntax → Validate with `docker-compose config`

3. **Test locally first:**
   ```bash
   docker-compose -f docker-compose.coolify.yml config
   docker-compose -f docker-compose.coolify.yml build
   docker-compose -f docker-compose.coolify.yml up
   ```

### Issue: Container Keeps Restarting

**Symptom:** Status shows service is unhealthy or restarting

**Solutions:**

1. **Check logs:**
   ```bash
   docker logs <container-id>
   ```

2. **Common causes:**
   - Missing ANTHROPIC_API_KEY
   - Health check failing
   - Port conflicts

3. **Disable health check temporarily:**
   ```yaml
   # In docker-compose.coolify.yml
   healthcheck:
     disable: true
   ```

4. **Verify environment variables:**
   - Coolify Dashboard → Environment Variables
   - Ensure ANTHROPIC_API_KEY is set

### Issue: Can't Access Application

**Symptom:** Domain doesn't load or shows error

**Solutions:**

1. **DNS not configured:**
   - Add A record: `yourdomain.com` → `your-server-ip`
   - Wait 5-60 minutes for DNS propagation
   - Test with: `dig yourdomain.com`

2. **Firewall blocking:**
   ```bash
   # Allow ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 8000/tcp
   ```

3. **SSL certificate issue:**
   - Check Coolify logs
   - Ensure email is configured
   - Verify domain points to server

4. **Test with IP address:**
   - Try accessing via `http://your-server-ip`
   - If works, issue is DNS/domain related

### Issue: SSL Certificate Not Working

**Symptom:** "Not Secure" warning or SSL error

**Solutions:**

1. **Check domain configuration:**
   - Domain must point to server
   - A record must be correct

2. **Regenerate certificate:**
   - Coolify Dashboard → Service Settings
   - Click "Regenerate SSL Certificate"

3. **Check Let's Encrypt limits:**
   - Maximum 5 certs per week per domain
   - Wait if limit exceeded

### Issue: Jobs Failing or Timing Out

**Symptom:** Jobs fail with timeout or error

**Solutions:**

1. **Check API key:**
   ```bash
   # Test Claude CLI
   docker exec <backend-container> claude --version
   ```

2. **Increase memory:**
   - Server running out of RAM
   - Check with: `free -h`
   - Reduce MAX_CONCURRENT_JOBS

3. **Check network connectivity:**
   ```bash
   # Test API access
   docker exec <backend-container> curl https://api.anthropic.com
   ```

4. **Review job logs:**
   - Frontend → Log Viewer
   - Or: `/var/lib/docker/volumes/coolify-logs/_data/`

### Issue: Out of Disk Space

**Symptom:** Deployments fail, containers won't start

**Solutions:**

1. **Check disk usage:**
   ```bash
   df -h
   docker system df
   ```

2. **Clean up Docker:**
   ```bash
   # Remove unused images
   docker image prune -a

   # Remove unused volumes
   docker volume prune

   # Remove unused containers
   docker container prune

   # Full cleanup
   docker system prune -a --volumes
   ```

3. **Upgrade storage:**
   - Increase VPS disk size
   - Add external volume
   - Set up log rotation

### Issue: High Memory Usage

**Symptom:** Server slow, containers killed

**Solutions:**

1. **Check memory:**
   ```bash
   free -h
   docker stats
   ```

2. **Reduce concurrent jobs:**
   - Lower MAX_CONCURRENT_JOBS in environment variables
   - Redeploy

3. **Add swap space:**
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

4. **Upgrade server:**
   - Move to instance with more RAM

### Issue: Permission Errors

**Symptom:** Can't write to volumes

**Solutions:**

```bash
# Find volume location
docker volume inspect coolify-brand-data

# Fix permissions
sudo chown -R 1000:1000 /var/lib/docker/volumes/coolify-brand-data/_data
```

---

## Security Best Practices

### 1. Secure Your API Keys

✅ **Do:**
- Store API keys in Coolify environment variables only
- Never commit keys to Git
- Rotate keys periodically

❌ **Don't:**
- Hardcode keys in code
- Share keys publicly
- Commit `.env` files

### 2. Enable Firewall

```bash
# Install UFW
sudo apt install ufw

# Allow essential ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 8000/tcp # Coolify

# Enable firewall
sudo ufw enable
```

### 3. Use SSL/TLS

Coolify automatically configures Let's Encrypt SSL certificates. Ensure:
- Domain points to server
- Email configured in Coolify
- Certificates auto-renew (Coolify handles this)

### 4. Regular Updates

```bash
# Update server packages
sudo apt update && sudo apt upgrade -y

# Update Docker
sudo apt install docker-ce docker-ce-cli containerd.io

# Coolify auto-updates itself
```

### 5. Backup Regularly

- Set up automated backups (see Backup Strategy above)
- Store backups off-server (S3, Backblaze, etc.)
- Test restore process monthly

---

## Performance Optimization

### 1. Enable Docker BuildKit

Edit Coolify build settings or server Docker config:

```bash
# /etc/docker/daemon.json
{
  "features": {
    "buildkit": true
  }
}

sudo systemctl restart docker
```

### 2. Use Docker Layer Caching

In your Dockerfiles, order commands from least to most frequently changed:

```dockerfile
# Good: Dependencies cached separately
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Bad: Entire rebuild every time
COPY . .
RUN pip install -r requirements.txt
```

### 3. Optimize Resource Limits

Match limits to actual usage:

```yaml
# Backend (adjust based on monitoring)
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '2'
      memory: 2G
```

### 4. Enable Log Rotation

Prevent log files from filling disk:

```yaml
# Add to docker-compose.coolify.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Cost Optimization

### VPS Provider Comparison

**Best Value (2025):**

1. **Hetzner** (Recommended)
   - CPX31: 4 vCPU, 8GB RAM, 160GB SSD
   - Cost: €12.90/month (~$14)
   - Location: Germany

2. **Linode/Akamai**
   - Dedicated 8GB: 4 vCPU, 8GB RAM, 160GB SSD
   - Cost: $36/month
   - Locations: Global

3. **DigitalOcean**
   - Basic Droplet: 4 vCPU, 8GB RAM, 160GB SSD
   - Cost: $48/month
   - Locations: Global

### Reducing Claude API Costs

1. **Optimize prompts:** Remove unnecessary verbosity
2. **Cache results:** Reuse brand data when possible
3. **Use smaller models:** When appropriate (edit instructions)
4. **Batch requests:** Generate multiple items per session

---

## Migration from Docker Compose

If you're currently running with standard Docker Compose:

### 1. Export Current Data

```bash
# On current server
docker exec <backend-container> tar czf /tmp/backup.tar.gz \
  /app/backend/brand-data \
  /app/backend/brief-outputs \
  /app/backend/draft-outputs

# Copy to local machine
docker cp <backend-container>:/tmp/backup.tar.gz ./
```

### 2. Deploy to Coolify

Follow deployment steps above.

### 3. Import Data

```bash
# Copy backup to Coolify server
scp backup.tar.gz user@coolify-server:/tmp/

# SSH into Coolify server
ssh user@coolify-server

# Find backend container
docker ps | grep backend

# Import data
docker cp /tmp/backup.tar.gz <backend-container>:/tmp/
docker exec <backend-container> tar xzf /tmp/backup.tar.gz -C /
```

### 4. Verify Migration

- Test job submission
- Verify existing files accessible
- Check logs for errors

---

## Next Steps

After successful deployment:

1. ✅ Set up automated backups
2. ✅ Configure monitoring alerts
3. ✅ Enable auto-deploy webhook
4. ✅ Document your specific configuration
5. ✅ Train your team on the platform
6. ✅ Consider implementing Redis queue (see [DEPLOYMENT.md](DEPLOYMENT.md))

---

## Support & Resources

### Coolify Resources
- **Documentation**: https://coolify.io/docs
- **Discord Community**: https://coollabs.io/discord
- **GitHub Issues**: https://github.com/coollabsio/coolify/issues

### Application Support
- **Project Repository**: Your repo URL
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Architecture Analysis**: See conversation with Claude

### Getting Help

1. **Check logs first**: Coolify Dashboard → Logs
2. **Search documentation**: Both Coolify and application docs
3. **Community support**: Coolify Discord
4. **Create issue**: With logs and configuration details

---

## Appendix: Example DNS Configuration

### Cloudflare DNS Setup

```
Type  Name              Content           Proxy  TTL
A     @                 your-server-ip    No     Auto
A     api               your-server-ip    No     Auto
CNAME www               yourdomain.com    No     Auto
```

### Namecheap DNS Setup

```
Type    Host    Value           TTL
A       @       your-server-ip  Automatic
A       api     your-server-ip  Automatic
CNAME   www     @               Automatic
```

Wait 5-60 minutes for DNS propagation, then verify:

```bash
dig yourdomain.com
dig api.yourdomain.com
```

---

## Appendix: Environment Variable Reference

### Required Variables
```bash
ANTHROPIC_API_KEY=sk-ant-xxx  # Required for Claude CLI
```

### Optional Variables
```bash
MAX_CONCURRENT_JOBS=3         # Adjust based on server resources
PYTHONUNBUFFERED=1           # Keep for proper logging
```

### Coolify Magic Variables (Auto-Generated)
```bash
SERVICE_FQDN_FRONTEND=yourdomain.com
SERVICE_FQDN_BACKEND=api.yourdomain.com
```

---

**Last Updated**: January 2025
**Coolify Version**: v4.x
**Application Version**: 1.0

For the latest updates, check the [official Coolify documentation](https://coolify.io/docs).
