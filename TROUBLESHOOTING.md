# Troubleshooting Guide

## Error: "Generate Brand Data" button returns an error

### Problem
When clicking the "Generate Brand Data" button, you get an error from `http://localhost:8000/api/brand-data/generate`

### Possible Causes and Solutions

#### 1. Backend Server Not Running
**Check**: Is the backend server running?

```bash
# Check if port 8000 is in use
lsof -i:8000

# If nothing appears, the backend is not running
```

**Solution**: Start the backend server
```bash
cd backend
python3 app.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### 2. CORS Issue
**Symptoms**: Browser console shows CORS error

**Solution**: Ensure the backend is running and CORS is properly configured. The backend already includes CORS middleware for `localhost:5173`.

#### 3. Invalid Request Format
**Check**: Open browser Developer Tools (F12) → Network tab → Look at the failed request

**Solution**: Ensure the frontend is sending the correct format:
```json
{
  "urls": ["https://example.com"]
}
```

#### 4. Claude Code CLI Not Installed
**Check**: Is Claude Code installed?

```bash
which claude
# Should return: /usr/local/bin/claude (or similar)

claude --version
# Should show version number
```

**Solution**: Install Claude Code CLI if missing
```bash
# Follow Claude Code installation instructions
# https://claude.com/claude-code
```

#### 5. Working Directory Issues
**Check**: Verify the backend can access the parent directory

The backend runs from `claude-workflow-manager/backend/` but needs to access files in the parent directory (`claude-workflow-manager/`).

**Solution**: Ensure you're starting the backend from the correct directory:
```bash
cd claude-workflow-manager/backend
python3 app.py
```

#### 6. Check Job Logs
When a job is created, check the log file for detailed error information:

```bash
# List recent log files
ls -lt backend/logs/

# View the most recent log
tail -f backend/logs/*.log
```

The logs will show:
- Job start time
- Working directory
- Claude Code execution output
- Any errors or exceptions

### Debugging Steps

1. **Test the Backend Directly**

Use the test script:
```bash
python3 test-backend.py
```

Or use curl:
```bash
# Test server is running
curl http://localhost:8000

# Test brand data generation endpoint
curl -X POST http://localhost:8000/api/brand-data/generate \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"]}'
```

Expected response:
```json
{"job_id": "abc12345"}
```

2. **Check Backend Logs**

Look at the terminal where the backend is running. You should see:
```
INFO:     127.0.0.1:xxxxx - "POST /api/brand-data/generate HTTP/1.1" 200 OK
```

If you see 4xx or 5xx errors, there's an issue with the request or server.

3. **Check Browser Console**

Open Developer Tools (F12) → Console tab

Look for:
- Network errors (failed to fetch)
- CORS errors
- JavaScript errors

4. **Verify File Permissions**

Ensure the backend can write to directories:
```bash
# Check permissions
ls -la backend/

# Should see directories like:
# drwxr-xr-x  brand-data/
# drwxr-xr-x  brief-outputs/
# drwxr-xr-x  draft-outputs/
# drwxr-xr-x  logs/
```

If directories don't exist:
```bash
cd backend
mkdir -p brand-data brief-outputs draft-outputs logs
```

5. **Test Claude Code Manually**

Verify Claude Code works:
```bash
cd claude-workflow-manager
claude "Say hello"
```

If this fails, the issue is with Claude Code installation, not the application.

### Common Error Messages

#### "Maximum concurrent jobs reached (3)"
**Cause**: You already have 3 jobs running

**Solution**: Wait for a job to complete or restart the backend to clear job history

#### "File not found" when generating brief/draft
**Cause**: The selected brand data or brief file doesn't exist

**Solution**:
1. Check that the file exists in the correct directory
2. Generate brand data first before creating briefs
3. Create briefs before generating drafts

#### "Cannot connect to backend"
**Cause**: Backend is not running or running on wrong port

**Solution**:
1. Start backend: `cd backend && python3 app.py`
2. Check it's on port 8000
3. Verify firewall isn't blocking localhost connections

#### Frontend shows blank page
**Cause**: Frontend build issue or server not running

**Solution**:
```bash
cd frontend
rm -rf node_modules dist .vite
npm install
npm run dev
```

### Network Issues

#### Backend and Frontend on Different Ports
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

Both must be running simultaneously in separate terminals.

#### Testing Backend API
```bash
# Install requests if needed
pip install requests

# Run test script
python3 test-backend.py
```

This will test all endpoints and show which ones are working.

### Still Having Issues?

1. **Restart Everything**
```bash
# Stop backend (Ctrl+C in Terminal 1)
# Stop frontend (Ctrl+C in Terminal 2)

# Start backend
cd backend && python3 app.py

# Start frontend (new terminal)
cd frontend && npm run dev
```

2. **Check Python Version**
```bash
python3 --version
# Should be 3.9 or higher
```

3. **Check Node Version**
```bash
node --version
# Should be 18 or higher
```

4. **Reinstall Dependencies**

Backend:
```bash
cd backend
pip install --force-reinstall -r requirements.txt
```

Frontend:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

5. **Check System Resources**
```bash
# Check if system has enough resources
top

# Check disk space
df -h
```

### Getting More Information

Enable verbose logging in the backend by checking the terminal output when the error occurs. The improved error handling will now show:

- Exact working directory
- Process return codes
- Full stack traces for exceptions
- Claude Code output

Check the log files in `backend/logs/` for complete execution history.

### Contact Support

If none of these solutions work, please provide:

1. Backend terminal output
2. Frontend browser console errors
3. Job log files from `backend/logs/`
4. Operating system and versions (Python, Node, Claude Code)
5. Exact steps to reproduce the error

This information will help diagnose the issue quickly.
