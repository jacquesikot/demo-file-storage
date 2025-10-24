# Coolify Deployment Checklist

Use this checklist to ensure a smooth deployment to your Coolify server.

## Pre-Deployment Checklist

### Server Setup
- [ ] Coolify installed on server (Ubuntu 20.04+ LTS)
- [ ] Server meets minimum requirements:
  - [ ] 4+ vCPUs
  - [ ] 8+ GB RAM
  - [ ] 50+ GB SSD storage
- [ ] Firewall configured (ports 80, 443, 8000 open)
- [ ] SSH access to server confirmed
- [ ] Coolify dashboard accessible

### Domain & DNS
- [ ] Domain name purchased/ready
- [ ] DNS A records configured:
  - [ ] `@` → server IP (for yourdomain.com)
  - [ ] `api` → server IP (for api.yourdomain.com)
  - [ ] `app` or `www` → server IP (optional)
- [ ] DNS propagation verified (`dig yourdomain.com`)
- [ ] Email configured in Coolify (for Let's Encrypt)

### Repository Setup
- [ ] Code pushed to Git repository (GitHub/GitLab/Bitbucket)
- [ ] `docker-compose.coolify.yml` in repository root
- [ ] `.env.coolify.example` reviewed
- [ ] Health check endpoint added to backend (`/health`)
- [ ] Repository access configured in Coolify:
  - [ ] GitHub App connected OR
  - [ ] Deploy key added OR
  - [ ] Repository is public

### Credentials Ready
- [ ] Anthropic API key obtained (https://console.anthropic.com/)
- [ ] API key has sufficient credits
- [ ] Billing alerts configured in Anthropic console

---

## Deployment Checklist

### Step 1: Create Project in Coolify
- [ ] Logged into Coolify dashboard
- [ ] Created new project: "claude-workflow-manager"
- [ ] Project created successfully

### Step 2: Add Resource
- [ ] Clicked "+ Add Resource"
- [ ] Selected repository type (Public/Private)
- [ ] Repository connected successfully
- [ ] Selected repository from dropdown

### Step 3: Configure Build
- [ ] Branch selected: `main` (or your branch)
- [ ] Base Directory: `/` (root)
- [ ] Build Pack: "Docker Compose"
- [ ] Docker Compose Location: `docker-compose.coolify.yml`
- [ ] Configuration saved

### Step 4: Environment Variables
- [ ] `ANTHROPIC_API_KEY` added (required)
- [ ] `MAX_CONCURRENT_JOBS` set (optional, default: 3)
- [ ] Environment variables saved
- [ ] No variables showing as "missing required"

### Step 5: Domain Configuration

**Frontend Service:**
- [ ] Clicked on `frontend` service
- [ ] Domain set (e.g., `app.yourdomain.com`)
- [ ] Domain saved
- [ ] SSL certificate requested

**Backend Service:**
- [ ] Clicked on `backend` service
- [ ] Domain set (e.g., `api.yourdomain.com`)
- [ ] Domain saved
- [ ] SSL certificate requested

### Step 6: Storage Volumes
- [ ] Volumes detected automatically:
  - [ ] `brand-data`
  - [ ] `brief-outputs`
  - [ ] `draft-outputs`
  - [ ] `logs`
  - [ ] `claude-config`
- [ ] No volume errors shown

### Step 7: Resource Limits (Optional)
- [ ] Backend resources configured:
  - [ ] CPU: 4 cores
  - [ ] Memory: 4 GB
- [ ] Frontend resources configured:
  - [ ] CPU: 1 core
  - [ ] Memory: 512 MB

### Step 8: Deploy Application
- [ ] Clicked "Deploy" button
- [ ] Build started successfully
- [ ] Watched deployment logs
- [ ] Backend image built successfully
- [ ] Frontend image built successfully
- [ ] Containers started
- [ ] Health checks passing
- [ ] No errors in logs
- [ ] Deployment status: "Running"

---

## Post-Deployment Verification

### Health Checks
- [ ] Frontend accessible: `https://yourdomain.com`
- [ ] Backend health check: `https://api.yourdomain.com/health`
- [ ] Backend API docs: `https://api.yourdomain.com/docs`
- [ ] SSL certificates valid (padlock icon in browser)
- [ ] No SSL warnings

### Functionality Tests

**Test 1: Brand Data Generation**
- [ ] Opened frontend
- [ ] Navigated to "Brand Data" tab
- [ ] Entered test data:
  - Brand name: "Test Company"
  - URLs: "https://example.com"
- [ ] Clicked "Generate Brand Data"
- [ ] Job created successfully
- [ ] Job ID displayed
- [ ] Log viewer shows real-time logs
- [ ] Job completed successfully
- [ ] Output file appears in file list
- [ ] Can view/download generated file

**Test 2: Brief Generation**
- [ ] Navigated to "Brief" tab
- [ ] Uploaded brand data file
- [ ] Entered content details
- [ ] Clicked "Generate Brief"
- [ ] Job completed successfully
- [ ] Output file generated

**Test 3: Draft Generation**
- [ ] Navigated to "Draft" tab
- [ ] Uploaded brand data and brief
- [ ] Clicked "Generate Draft"
- [ ] Job completed successfully
- [ ] Output file generated

### Container Health
- [ ] Checked Coolify dashboard:
  - [ ] Backend status: 🟢 Healthy
  - [ ] Frontend status: 🟢 Healthy
- [ ] No container restarts
- [ ] Resource usage normal:
  - [ ] CPU < 50% idle
  - [ ] Memory < 80% of limit
  - [ ] Disk space > 20% free

### Log Verification
- [ ] Backend logs show no errors
- [ ] Frontend logs show no errors
- [ ] Claude CLI working (no "command not found")
- [ ] API calls to Anthropic succeeding

---

## Post-Deployment Configuration

### Security
- [ ] Changed Coolify admin password
- [ ] Configured firewall rules
- [ ] API keys stored securely (only in Coolify UI)
- [ ] No `.env` files in Git repository

### Monitoring
- [ ] Bookmarked Coolify dashboard
- [ ] Set up monitoring alerts (if available)
- [ ] Configured server monitoring (optional: Uptime Robot, etc.)

### Backups
- [ ] Backup strategy planned
- [ ] Backup script created (see COOLIFY_DEPLOYMENT.md)
- [ ] Test backup performed
- [ ] Test restore performed
- [ ] Backup schedule configured (cron job)

### Documentation
- [ ] Documented custom configuration
- [ ] Saved domain/DNS settings
- [ ] Recorded server credentials securely
- [ ] Team members trained (if applicable)

### Automation
- [ ] GitHub webhook configured (optional)
- [ ] Auto-deploy on push enabled (optional)
- [ ] Webhook tested (if configured)

---

## Optional Enhancements

### Custom Domain SSL
- [ ] Custom SSL certificate uploaded (if not using Let's Encrypt)
- [ ] Certificate auto-renewal configured

### Advanced Monitoring
- [ ] Integrated with monitoring service (Sentry, Datadog, etc.)
- [ ] Log aggregation configured
- [ ] Error tracking enabled

### Performance Optimization
- [ ] Adjusted `MAX_CONCURRENT_JOBS` based on usage
- [ ] Enabled Docker BuildKit
- [ ] Configured CDN for frontend (optional)

### Horizontal Scaling (Advanced)
- [ ] Implemented Redis/PostgreSQL backend
- [ ] Configured shared volumes
- [ ] Added load balancer
- [ ] Deployed multiple backend instances

---

## Troubleshooting Reference

If you encounter issues, refer to:
1. **Coolify logs**: Dashboard → Service → Logs tab
2. **Container logs**: SSH to server → `docker logs <container-id>`
3. **Health endpoints**: `curl https://api.yourdomain.com/health`
4. **Troubleshooting guide**: [COOLIFY_DEPLOYMENT.md](COOLIFY_DEPLOYMENT.md#troubleshooting)

### Common Issues Quick Reference

**Deployment Failed:**
- Check: Build logs in Coolify
- Check: Dockerfile syntax
- Check: Environment variables set

**Container Restarting:**
- Check: Health check endpoint working
- Check: ANTHROPIC_API_KEY is valid
- Check: Resource limits not exceeded

**Can't Access Application:**
- Check: DNS records correct
- Check: Firewall allows ports 80, 443
- Check: SSL certificate generated
- Try: Access via IP address

**Jobs Failing:**
- Check: Claude CLI installed in container
- Check: API key valid and has credits
- Check: Anthropic API not down
- Check: Sufficient memory available

---

## Success Criteria

Your deployment is successful when:
- ✅ Frontend loads without errors
- ✅ Backend health check returns "healthy"
- ✅ SSL certificates valid (HTTPS working)
- ✅ Can create and complete jobs end-to-end
- ✅ Generated files accessible and downloadable
- ✅ Logs streaming in real-time
- ✅ No container restarts or errors
- ✅ Resource usage within limits

---

## Next Steps After Deployment

1. **Monitor for 24 hours**: Watch for any errors or issues
2. **Run production workloads**: Test with real content
3. **Set up backups**: Automate backup process
4. **Document changes**: Keep deployment notes updated
5. **Plan scaling**: Monitor usage and plan for growth
6. **Consider upgrades**: Review architecture improvements in [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Support

If you need help:
1. Check [COOLIFY_DEPLOYMENT.md](COOLIFY_DEPLOYMENT.md) for detailed guide
2. Review [DEPLOYMENT.md](DEPLOYMENT.md) for architecture details
3. Search Coolify docs: https://coolify.io/docs
4. Join Coolify Discord: https://coollabs.io/discord
5. Create GitHub issue with logs and configuration

---

**Checklist Version**: 1.0
**Last Updated**: January 2025
**For**: Claude Workflow Manager on Coolify v4.x

Good luck with your deployment! 🚀
