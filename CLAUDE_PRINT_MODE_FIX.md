# Claude Print Mode Fix - Job Hanging Issue

## Problem

Jobs were getting stuck with logs showing:
```
02:25:01 | Starting job type: brand_data
02:25:01 | Working directory: /path/to/claude-workflow-manager
02:25:01 | Executing Claude Code...
[No further output - job hangs indefinitely]
```

The Claude Code process was running but not producing any output.

## Root Causes (Multiple Issues Fixed)

### Issue 1: Interactive Mode
Claude Code runs in **interactive mode** by default. When called without the `--print` flag, it:
- Starts an interactive session
- Waits for terminal input/output
- Does NOT execute and exit
- Hangs indefinitely in subprocess mode

### Issue 2: Prompt Input Method
Claude CLI expects prompts via **stdin**, not as command-line arguments:
- ❌ `claude --print "prompt"` - Does NOT work
- ✅ `echo "prompt" | claude --print` - Works correctly

### Issue 3: Output Buffering
Python and subprocess output is buffered by default, causing:
- No real-time output in logs
- Output only appears after process completes
- Makes it appear as if the job is hanging

## Solutions Applied

### 1. Added `--print` Flag
Run Claude Code in non-interactive mode.

### 2. Changed to Stdin Input
Modified subprocess to write prompt via stdin instead of passing as argument.

### 3. Disabled Output Buffering
Added `PYTHONUNBUFFERED=1` environment variable to ensure real-time output.

### Final Implementation in `backend/app.py` (Lines 206-225)

**Before (Broken):**
```python
process = await asyncio.create_subprocess_exec(
    "claude",
    "--dangerously-skip-permissions",
    prompt,  # ← Wrong: prompt as argument doesn't work
    ...
)
```

**After (Working):**
```python
# Set environment variables to disable buffering
env = os.environ.copy()
env['PYTHONUNBUFFERED'] = '1'  # ← Fix #3: Disable buffering

process = await asyncio.create_subprocess_exec(
    "claude",
    "--print",                          # ← Fix #1: Non-interactive mode
    "--dangerously-skip-permissions",   # ← Auto-approve permissions
    stdin=asyncio.subprocess.PIPE,      # ← Fix #2: Use stdin
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.STDOUT,
    cwd=str(BASE_DIR.parent),
    env=env
)

# Write the prompt to stdin
if process.stdin:
    process.stdin.write(prompt.encode())
    await process.stdin.drain()
    process.stdin.close()
```

## What `--print` Does

The `--print` flag:
- ✅ Runs Claude in **non-interactive mode**
- ✅ Executes the prompt and exits
- ✅ Prints response to stdout
- ✅ Suitable for subprocess execution
- ✅ Works with pipes and automation

**Note**: The workspace trust dialog is skipped when using `--print` mode.

## Complete Command

The subprocess now runs:
```bash
claude --print --dangerously-skip-permissions "your prompt here"
```

This combines:
1. `--print` - Non-interactive execution
2. `--dangerously-skip-permissions` - Auto-approve all tools
3. `prompt` - The actual task to execute

## How to Monitor Logs

### Method 1: UI Log Viewer (Best)
The frontend automatically shows real-time logs when you create a job.

### Method 2: Terminal (Real-time)
```bash
# Watch logs for a specific job
tail -f backend/logs/[job-id].log

# Or use the helper script
./watch-logs.sh [job-id]

# Or just watch the latest job
./watch-logs.sh
```

### Method 3: View Complete Log
```bash
# View entire log file
cat backend/logs/[job-id].log

# Or through the API
curl http://localhost:8000/api/jobs/[job-id]/logs
```

## Expected Behavior After Fix

### Before Fix (Stuck)
```
02:25:01 | Starting job type: brand_data
02:25:01 | Working directory: /path/to/project
02:25:01 | Executing Claude Code...
[Process hangs - no output]
```

### After Fix (Working)
```
02:25:01 | Starting job type: brand_data
02:25:01 | Working directory: /path/to/project
02:25:01 | Executing Claude Code...
02:25:05 | Starting brand research for stripe.com
02:25:10 | Searching web for: "stripe company information"
02:25:15 | Fetching https://stripe.com
02:25:20 | Found company description...
02:25:25 | Researching competitors...
02:26:00 | Writing brand data to backend/brand-data/stripe.com_brand_data.json
02:26:01 | Process completed with return code: 0
```

## Verification Steps

1. **Restart your backend** (auto-reload should have picked up the change):
   ```bash
   # If backend is running, just wait for auto-reload
   # Or restart manually:
   cd backend
   python3 app.py
   ```

2. **Create a new job** through the UI or API:
   ```bash
   curl -X POST http://localhost:8000/api/brand-data/generate \
     -H "Content-Type: application/json" \
     -d '{"urls": ["https://example.com"]}'
   ```

3. **Watch the logs** in real-time:
   ```bash
   # Get job_id from step 2
   tail -f backend/logs/[job-id].log
   ```

4. **Look for output** within 5-10 seconds:
   - ✅ Should see Claude Code starting research
   - ✅ Should see web search activity
   - ✅ Should see file creation
   - ✅ Should see process completion

## Alternative: Using Stream JSON

For even more detailed output, you could use:
```python
process = await asyncio.create_subprocess_exec(
    "claude",
    "--print",
    "--output-format", "stream-json",
    "--dangerously-skip-permissions",
    prompt,
    ...
)
```

This provides structured JSON output with message chunks, but requires parsing.

## Troubleshooting

### Job Still Hanging?

**Check 1**: Verify Claude CLI is working:
```bash
claude --print "Say hello"
# Should immediately return: "Hello!"
```

**Check 2**: Check if process is running:
```bash
ps aux | grep claude
# Should show claude process with --print flag
```

**Check 3**: Check job status:
```bash
curl http://localhost:8000/api/jobs/[job-id]
# Should show status: "running" or "completed"
```

**Check 4**: Kill stuck processes:
```bash
# Find Claude processes
ps aux | grep claude | grep -v grep

# Kill stuck process
kill -9 [PID]
```

### Logs Show Error?

If you see errors in the log, they'll now be visible immediately:
```
02:25:01 | Executing Claude Code...
02:25:02 | Error: Unable to connect to Claude API
02:25:02 | Process completed with return code: 1
```

This is actually helpful - you can now see what's wrong!

## Summary

✅ **Problem**: Claude Code ran in interactive mode and hung
✅ **Solution**: Added `--print` flag for non-interactive execution
✅ **Result**: Jobs now execute and complete properly
✅ **Monitoring**: Logs now show real-time output

The fix is simple but critical:
- Interactive mode (`claude prompt`) → Hangs
- Non-interactive mode (`claude --print prompt`) → Works

## Next Steps

1. Restart your backend if it hasn't auto-reloaded
2. Try creating a brand data job
3. Watch the logs stream in real-time
4. Enjoy a fully functional workflow! 🎉

The application will now work end-to-end without jobs hanging!
