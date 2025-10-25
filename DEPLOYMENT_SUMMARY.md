# Deployment Summary

This document summarizes the key learnings from deploying Claude Workflow Manager to Coolify.

## Root Cause of 404 Error

The 404 error was caused by **environment variable substitution not happening in Traefik labels**. The docker-compose file had:

```yaml
labels:
  - "traefik.http.routers.frontend.rule=Host(`${SERVICE_FQDN_FRONTEND}`)"
```

But Traefik received the **literal string** `${SERVICE_FQDN_FRONTEND}` instead of the actual domain, causing routing to fail.

## The Solution

**Remove all custom Traefik labels and let Coolify handle routing automatically.**

### What Works

```yaml
services:
  backend:
    # No ports: directive
    # No networks: directive  
    # No labels: directive
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:?}
    volumes:
      - brand-data:/app/backend/brand-data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

### What Doesn't Work

```yaml
services:
  backend:
    ports:
      - "8000:8000"  # ❌ Conflicts with Traefik
    labels:
      - "traefik.enable=true"  # ❌ Coolify generates these
      - "traefik.http.routers.backend.rule=Host(`${SERVICE_FQDN_BACKEND}`)"  # ❌ Vars not substituted
    networks:
      - my-network  # ❌ Must use Coolify's network
```

## Key Learnings

### 1. Coolify's Auto-Configuration

Coolify automatically adds:
- Traefik labels for routing
- Network configuration  
- SSL certificate management via Let's Encrypt
- Domain routing rules
- Health check monitoring

**Don't try to do this manually** - it will conflict with Coolify's configuration.

### 2. Domain Configuration

**Critical Step:** After deployment, configure domains in Coolify UI:

1. Click on service (frontend or backend)
2. Set **Port** (80 for frontend, 8000 for backend)
3. Set **Domain** (use Coolify's auto-generated domain)
4. Click **Save**

Without this step, Traefik won't know how to route traffic.

### 3. Network Connectivity

Containers must be on the `coolify` network for Traefik to reach them. If deployment creates a custom network, manually connect containers:

```bash
docker network connect coolify <container-id>
```

Or let Coolify manage networks entirely (recommended).

### 4. Environment Variables

Set environment variables in **Coolify UI**, not in docker-compose:

```yaml
# ❌ Wrong - literals in docker-compose
environment:
  - DOMAIN=mydomain.com

# ✅ Correct - reference from Coolify
environment:
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:?}
```

Then set `ANTHROPIC_API_KEY` in Coolify's Environment Variables section.

### 5. Health Checks Are Critical

Coolify monitors container health. Without proper health checks:
- Containers marked as unhealthy
- May be restarted unnecessarily
- Deployment may fail

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

Ensure the health endpoint (`/health`) exists and returns 200 OK.

## Diagnostic Process

When troubleshooting 404 errors:

1. **Verify containers are running:**
   ```bash
   docker ps | grep project-id
   ```

2. **Test containers internally:**
   ```bash
   docker exec <container-id> curl -I http://localhost/
   ```
   Should return 200 OK.

3. **Check if on coolify network:**
   ```bash
   docker network inspect coolify | grep <container-id>
   ```

4. **Check Traefik labels:**
   ```bash
   docker inspect <container-id> | grep -A 20 Labels
   ```
   Look for `traefik.http.routers.*` labels with actual domains (not `${VARIABLES}`).

5. **Check Traefik logs:**
   ```bash
   docker logs coolify-proxy | grep -i error
   ```
   Look for routing errors or SSL certificate issues.

## Files Structure

### Keep
- `docker-compose.yml` - Local development
- `docker-compose.coolify.yml` - Coolify deployment (simplified)
- `COOLIFY_QUICKSTART.md` - Quick deployment guide
- `COOLIFY_DEPLOYMENT.md` - Detailed deployment guide
- `COOLIFY_CHECKLIST.md` - Deployment checklist
- `DEPLOYMENT.md` - General Docker deployment

### Removed
- `docker-compose.coolify-simple.yml` - Redundant (merged into main)
- `docker-compose.prod.yml` - Redundant (use Coolify instead)
- `COOLIFY_404_FIX.md` - Obsolete (issue resolved)
- `.env.coolify.example` - Redundant (vars documented in QUICKSTART)

## Best Practices

### DO ✅
- Let Coolify manage Traefik labels
- Set domains in Coolify UI after deployment
- Use Coolify's auto-generated domains
- Set environment variables in Coolify UI
- Include health checks in docker-compose
- Test containers internally before checking external access
- Use simplified docker-compose with minimal configuration

### DON'T ❌
- Add custom Traefik labels in docker-compose
- Add `ports:` directives (Traefik handles routing)
- Create custom networks (use Coolify's network)
- Put secrets in docker-compose files
- Skip domain configuration in Coolify UI
- Use environment variable substitution in labels
- Over-configure - keep it simple

## Architecture

```
Internet
    ↓
Traefik Proxy (managed by Coolify)
    ↓
┌─────────────────────────────────────┐
│ Frontend Container                  │
│ - Port 80 internal                  │
│ - No ports exposed                  │
│ - Coolify network + project network │
└─────────────────────────────────────┘
    ↓ (internal Docker network)
┌─────────────────────────────────────┐
│ Backend Container                   │
│ - Port 8000 internal                │
│ - No ports exposed                  │
│ - Coolify network + project network │
└─────────────────────────────────────┘
```

## Deployment Workflow

1. **Push code to Git**
2. **Create application in Coolify**
   - Select Docker Compose
   - Point to `docker-compose.coolify.yml`
3. **Set environment variables** in Coolify UI
4. **Deploy** (click Deploy button)
5. **Configure domains** in Coolify UI:
   - Frontend: Port 80
   - Backend: Port 8000
6. **Wait 30 seconds** for Traefik to reload
7. **Test** external access

## Troubleshooting Quick Reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 Not Found | Domain not configured | Set domain in Coolify UI |
| 502 Bad Gateway | Container not healthy | Check health endpoint |
| SSL errors | Let's Encrypt failed | Check DNS, wait for retry |
| Literal `${VAR}` in labels | Var not substituted | Remove custom labels |
| Container can't reach Traefik | Wrong network | Connect to coolify network |
| Environment var missing | Not set in Coolify | Add in Environment Variables |

## Resources

- **Coolify Docs**: https://coolify.io/docs
- **Traefik Docs**: https://doc.traefik.io/traefik/
- **Docker Compose Spec**: https://docs.docker.com/compose/compose-file/
- **Coolify Discord**: https://coollabs.io/discord

---

**Last Updated:** January 2025
**Issue Resolved:** Environment variable substitution in Traefik labels
**Solution:** Remove custom labels, let Coolify manage routing
