# Troubleshooting Guide

## Common Issues and Solutions

### Deployment Issues

#### Container Fails to Start

**Symptoms**: Container exits immediately or shows unhealthy status

**Solutions**:
```bash
# Check container logs
docker logs <container-name>

# Check if required environment variables are set
docker inspect <container-name> | grep -A 20 Env

# Verify Anthropic API key is set
docker exec <backend-container> env | grep ANTHROPIC
```

#### Port Conflicts

**Symptoms**: Error: "port is already allocated"

**Solutions**:
```bash
# Check what's using the port
sudo lsof -i :8000
sudo lsof -i :3000

# Stop conflicting service or change ports in docker-compose.coolify.yml
```

#### Build Failures

**Symptoms**: Docker build fails during deployment

**Solutions**:
1. Check Dockerfile syntax
2. Ensure all COPY paths exist
3. Review build logs in Coolify
4. Try building locally: `docker build -t test -f Dockerfile.backend .`

### Connectivity Issues

#### Cannot Access Services from Browser

**Symptoms**: Connection timeout or refused

**Check List**:
1. **Container Status**:
   ```bash
   docker ps | grep workflow
   # Verify both containers show as "healthy"
   ```

2. **Port Listening**:
   ```bash
   sudo netstat -tlnp | grep -E ":3000|:8000"
   # Should show docker-proxy listening on both ports
   ```

3. **Firewall**:
   ```bash
   # Check if ufw is blocking
   sudo ufw status

   # If active, allow ports
   sudo ufw allow 3000/tcp
   sudo ufw allow 8000/tcp
   ```

4. **Cloud Provider Firewall**:
   - AWS: Check Security Groups
   - GCP: Check Firewall Rules
   - Hetzner: Check Cloud Firewall settings
   - Add inbound rules for TCP ports 3000 and 8000

5. **Test Locally First**:
   ```bash
   # SSH into server
   curl http://localhost:8000/health
   curl http://localhost:3000/

   # If these work but external access doesn't, it's a firewall issue
   ```

#### Domain Not Resolving

**Symptoms**: Domain returns "This site can't be reached"

**Solutions**:
1. **Check DNS**:
   ```bash
   dig workflow.yourdomain.com
   # Should return your server IP
   ```

2. **Wait for DNS Propagation**: Can take up to 48 hours (usually 5-10 minutes)

3. **Verify DNS Records**:
   - Type: A
   - Name: workflow / workflow-api
   - Value: Your server IP
   - TTL: Auto or 300

4. **Check Coolify Configuration**:
   - Verify domain is correctly entered in Coolify UI
   - Check if SSL certificate was issued
   - Review Traefik logs: `docker logs coolify-proxy --tail 100`

### Application Issues

#### Backend Returns 500 Errors

**Check Logs**:
```bash
docker logs backend --tail 100
```

**Common Causes**:
1. **Missing API Key**:
   - Verify `ANTHROPIC_API_KEY` is set in Coolify environment variables
   - Check it's not empty: `docker exec backend env | grep ANTHROPIC`

2. **Claude Code Not Working**:
   - Ensure Claude Code CLI is installed in the container
   - Check the Dockerfile.backend includes Claude installation

3. **File Permission Issues**:
   ```bash
   # Check volume permissions
   docker exec backend ls -la /app/backend/brand-data
   docker exec backend ls -la /app/backend/logs
   ```

#### Frontend Shows Blank Page

**Solutions**:
1. **Check Browser Console**: Look for JavaScript errors

2. **Verify API Connection**:
   ```bash
   # From your browser console
   fetch('http://YOUR-SERVER-IP:8000/health')
     .then(r => r.json())
     .then(console.log)
   ```

3. **Check Frontend Logs**:
   ```bash
   docker logs frontend --tail 50
   ```

4. **Rebuild Frontend**:
   - May be a cached build issue
   - Redeploy with "force rebuild" option in Coolify

#### Jobs Stuck in "Running" State

**Symptoms**: Job never completes

**Solutions**:
1. **Check Job Logs**:
   - View logs in the UI
   - Look for error messages or hangs

2. **Check Backend Logs**:
   ```bash
   docker logs backend --tail 100
   ```

3. **Check Resource Usage**:
   ```bash
   docker stats backend
   # If CPU/memory maxed out, increase container resources
   ```

4. **Restart Backend**:
   ```bash
   docker restart backend
   ```

### Performance Issues

#### Slow Response Times

**Solutions**:
1. **Check Resource Usage**:
   ```bash
   docker stats
   ```

2. **Increase Container Resources**:
   - Edit `docker-compose.coolify.yml`
   - Increase CPU/memory limits
   - Redeploy

3. **Reduce Concurrent Jobs**:
   - Set `MAX_CONCURRENT_JOBS=2` or `1`

#### High Memory Usage

**Solutions**:
1. **Check for Memory Leaks**:
   ```bash
   docker stats backend --no-stream
   ```

2. **Restart Container**:
   ```bash
   docker restart backend
   ```

3. **Review Job Logs**: Look for jobs that might be consuming excessive memory

### Database/File Issues

#### Files Not Persisting

**Symptoms**: Generated files disappear after container restart

**Check Volumes**:
```bash
# List volumes
docker volume ls | grep workflow

# Inspect volume
docker volume inspect <volume-name>

# Check if volumes are mounted
docker inspect backend | grep Mounts -A 20
```

**Solution**: Ensure volumes are defined in docker-compose.coolify.yml

#### Cannot Upload Files

**Symptoms**: Upload fails or returns error

**Check**:
1. **File Size**: Max 10MB (configurable in backend/app.py)
2. **Permissions**:
   ```bash
   docker exec backend ls -la /app/backend/brand-data
   ```
3. **Disk Space**:
   ```bash
   df -h
   ```

### SSL/HTTPS Issues

#### SSL Certificate Not Issued

**Symptoms**: Browser shows "Not Secure" or certificate error

**Solutions**:
1. **Check Let's Encrypt Logs**:
   ```bash
   docker logs coolify-proxy | grep -i acme
   ```

2. **Common Causes**:
   - Domain not pointing to correct IP
   - Port 80 blocked (needed for ACME challenge)
   - Rate limit hit (5 failures per hour per domain)

3. **Wait and Retry**: Let's Encrypt will retry automatically

4. **Manual Certificate Request**: In Coolify UI, force SSL certificate renewal

## Debugging Commands

### Container Inspection
```bash
# Get container ID
docker ps

# View full container config
docker inspect <container-id>

# Check environment variables
docker exec <container-id> env

# Access container shell
docker exec -it <container-id> /bin/sh
```

### Network Debugging
```bash
# Check network connectivity
docker network inspect <network-name>

# Ping between containers
docker exec backend ping frontend

# Check if service is reachable
docker exec coolify-proxy wget -O- http://backend:8000/health
```

### Log Analysis
```bash
# Follow logs in real-time
docker logs -f backend

# Last 100 lines
docker logs --tail 100 backend

# Logs since specific time
docker logs --since 30m backend

# Search logs
docker logs backend 2>&1 | grep ERROR
```

## Getting Help

If the issue persists:

1. **Gather Information**:
   ```bash
   # Save all relevant logs
   docker logs backend > backend.log
   docker logs frontend > frontend.log
   docker logs coolify-proxy > traefik.log
   docker ps -a > containers.log
   ```

2. **Check Documentation**:
   - [Coolify Docs](https://coolify.io/docs)
   - [Docker Compose Reference](https://docs.docker.com/compose/)

3. **Open an Issue**:
   - Include error logs
   - Describe steps to reproduce
   - Mention environment (OS, Docker version, etc.)
