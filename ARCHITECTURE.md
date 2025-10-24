# System Architecture - Claude Workflow Manager

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Browser                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ HTTP/HTTPS
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                         │
│  ┌──────────────────┐                  ┌────────────────────┐   │
│  │  Static Files    │                  │   API Proxy        │   │
│  │  (React SPA)     │                  │   /api/* → :8000   │   │
│  └──────────────────┘                  └────────────────────┘   │
└───────────────┬──────────────────────────────────┬──────────────┘
                │                                  │
                │ Serve Static                     │ Proxy API
                ↓                                  ↓
┌───────────────────────────┐    ┌────────────────────────────────┐
│   Frontend Container      │    │    Backend Container           │
│   ─────────────────────   │    │    ──────────────────────      │
│                           │    │                                │
│   React App (Built)       │    │   FastAPI Application          │
│   - Job UI                │    │   - REST API                   │
│   - File Manager          │    │   - SSE Streaming              │
│   - Log Viewer (SSE)      │    │   - Job Manager                │
│                           │    │                                │
│   nginx:alpine            │    │   Python 3.11                  │
│   100MB RAM               │    │   Base: 1GB RAM                │
└───────────────────────────┘    └──────────────┬─────────────────┘
                                                 │
                                                 │ asyncio.create_subprocess_exec()
                                                 ↓
                                 ┌───────────────────────────────────┐
                                 │   Subprocess Pool (OS Managed)    │
                                 ├───────────────────────────────────┤
                                 │  ┌─────────────────────────────┐ │
                                 │  │ Claude CLI Process 1        │ │
                                 │  │ - Brand Data Generation     │ │
                                 │  │ RAM: ~1GB | CPU: 1 core     │ │
                                 │  └─────────────────────────────┘ │
                                 │  ┌─────────────────────────────┐ │
                                 │  │ Claude CLI Process 2        │ │
                                 │  │ - Brief Generation          │ │
                                 │  │ RAM: ~800MB | CPU: 0.8 core │ │
                                 │  └─────────────────────────────┘ │
                                 │  ┌─────────────────────────────┐ │
                                 │  │ Claude CLI Process 3        │ │
                                 │  │ - Draft Generation          │ │
                                 │  │ RAM: ~800MB | CPU: 0.8 core │ │
                                 │  └─────────────────────────────┘ │
                                 └────────────┬──────────────────────┘
                                              │
                                              │ API Calls
                                              ↓
                                 ┌─────────────────────────────────┐
                                 │     Anthropic API               │
                                 │     (Claude AI Models)          │
                                 └─────────────────────────────────┘
```

## Component Breakdown

### 1. Frontend Container (React + Nginx)
**Purpose**: Serve static React application and proxy API requests

**Specifications:**
- **Base Image**: `nginx:alpine` (~40MB)
- **Runtime**: Nginx web server
- **CPU**: 0.25-0.5 cores
- **RAM**: 100-256 MB
- **Storage**: ~50 MB (built React app)

**Responsibilities:**
- Serve compiled React SPA
- Proxy `/api/*` to backend
- Support SSE (Server-Sent Events) for log streaming
- Cache static assets
- Gzip compression

**Ports:**
- Internal: 80
- External: 80 (or 443 with SSL)

---

### 2. Backend Container (FastAPI + Python)
**Purpose**: Job orchestration and API server

**Specifications:**
- **Base Image**: `python:3.11-slim` (~200MB)
- **Runtime**: Uvicorn ASGI server
- **CPU**: 0.5-1 core (base) + subprocess overhead
- **RAM**: 1-2 GB (base) + subprocesses
- **Storage**: Growing (logs + generated files)

**Responsibilities:**
- REST API endpoints (CRUD operations)
- Job scheduling and queuing
- Subprocess management
- File I/O operations
- SSE log streaming
- Health monitoring

**Key Characteristics:**
- **Concurrency Model**: Asyncio (event loop)
- **Max Jobs**: Configurable (default: 3)
- **Job Storage**: In-memory dict (jobs variable)
- **File Storage**: Local filesystem (volumes)

**Ports:**
- Internal: 8000
- External: 8000 (exposed to localhost only in prod)

---

### 3. Claude CLI Subprocesses
**Purpose**: Execute AI-powered content generation tasks

**Specifications:**
- **Type**: Independent OS processes (not threads)
- **Runtime**: Node.js (Claude CLI is npm package)
- **CPU**: 0.5-1 core per process
- **RAM**: 500MB-1GB per process
- **Isolation**: Full process isolation

**Lifecycle:**
1. Spawned by `asyncio.create_subprocess_exec()`
2. Receives prompt via stdin
3. Executes with `--print --verbose --stream-json`
4. Streams output to stdout (JSON lines)
5. Terminates on completion
6. Exit code determines job status

**Resource Pattern:**
```
Job Start:      RAM +1GB,  CPU +1 core
Job Running:    Steady usage (API I/O bound)
Job Complete:   RAM -1GB,  CPU -1 core
```

---

## Data Flow Diagrams

### Job Submission Flow

```
User                Frontend            Backend             Claude CLI           Anthropic API
 │                     │                   │                    │                      │
 │─────Submit Job─────>│                   │                    │                      │
 │                     │──POST /api/jobs──>│                    │                      │
 │                     │                   │                    │                      │
 │                     │                   │─Create job_id      │                      │
 │                     │                   │─Check queue        │                      │
 │                     │                   │─Save job state     │                      │
 │                     │                   │                    │                      │
 │                     │<──job_id: abc123──│                    │                      │
 │<────job_id─────────│                   │                    │                      │
 │                     │                   │                    │                      │
 │                     │                   │──spawn process────>│                      │
 │                     │                   │   (asyncio)        │                      │
 │                     │                   │                    │                      │
 │                     │                   │<──pid: 12345───────│                      │
 │                     │                   │                    │                      │
 │                     │                   │                    │────API Request──────>│
 │                     │                   │                    │                      │
 │                     │                   │                    │<───AI Response───────│
 │                     │                   │                    │                      │
 │                     │                   │<──stdout (JSON)────│                      │
 │                     │                   │─Parse & Log        │                      │
 │                     │                   │                    │                      │
 │                     │                   │<──exit(0)──────────│                      │
 │                     │                   │─Update job status  │                      │
 │                     │                   │─Find output files  │                      │
 │                     │                   │                    │                      │
 │────Poll status─────>│──GET /api/jobs/──>│                    │                      │
 │<───Completed────────│<──status: done────│                    │                      │
```

### Log Streaming Flow (SSE)

```
User Browser          Frontend           Backend            Log File
     │                   │                  │                   │
     │──Click "View"────>│                  │                   │
     │                   │                  │                   │
     │                   │──GET /api/jobs/abc123/logs (SSE)──>  │
     │                   │                  │                   │
     │                   │                  │───read existing───>│
     │                   │                  │<──log lines────────│
     │                   │<──event: log────│                   │
     │<──Display logs────│  data: {...}    │                   │
     │                   │                  │                   │
     │                   │                  │─watch file (loop)─>│
     │                   │                  │                   │
     │                   │                  │<──new bytes────────│
     │                   │<──event: log────│                   │
     │<──Append log──────│  data: {...}    │                   │
     │                   │                  │                   │
     │                   │                  │<──job done─────────│
     │                   │<──event: done───│                   │
     │<──Show complete───│  data: {...}    │                   │
```

---

## Concurrency Model Deep Dive

### Traditional Threading (NOT Used)
```python
# What we DON'T do
import threading

def run_job():
    # All threads share same process
    # Subject to GIL
    # Context switching overhead
    pass

threads = [threading.Thread(target=run_job) for _ in range(3)]
```

### Our Approach: Asyncio + Subprocesses
```python
# What we DO
import asyncio

async def run_job():
    # Spawn independent process
    process = await asyncio.create_subprocess_exec(
        "claude", "--print",
        stdin=PIPE, stdout=PIPE
    )
    # No GIL limitations
    # True OS-level parallelism
    await process.wait()

# Event loop manages I/O, processes run independently
tasks = [asyncio.create_task(run_job()) for _ in range(3)]
```

### Why This Is Better

| Aspect | Threading | Our Approach (Async + Subprocess) |
|--------|-----------|-----------------------------------|
| **GIL Impact** | Severe (Python GIL limits) | None (separate processes) |
| **Memory** | Shared (race conditions) | Isolated (no conflicts) |
| **CPU Usage** | Limited by GIL | Full multi-core utilization |
| **Stability** | One crash affects all | Isolated failures |
| **Overhead** | Context switching | Process spawn (acceptable) |
| **Scalability** | Limited by GIL | Linear with CPU cores |

### Resource Timeline

```
Time →        0s      10s      20s      30s      40s      50s      60s
          ────┼────────┼────────┼────────┼────────┼────────┼────────┼───

RAM       2GB ┤████████████████████████████████████████████
          4GB ┤████████████████████████████████████████████████████
          6GB ┤████████████████████████████████████████████████████████
          8GB ┤

Legend:   ████ = Base (1GB)
          ████ = Job 1 (brand data, 15 min)
          ████ = Job 2 (brief, 5 min)
          ████ = Job 3 (draft, 8 min)

CPU       ┌─Base (0.5 core)
Cores  1  ├─Job 1 (1 core)
       2  ├─Job 2 (0.8 core)
       3  ├─Job 3 (0.8 core)
       4  └─Idle capacity
```

---

## Storage Architecture

### Volume Mounts (Production)

```
Host Machine                Docker Container
────────────────            ────────────────

./backend/brand-data    →   /app/backend/brand-data     (read-write)
./backend/brief-outputs →   /app/backend/brief-outputs  (read-write)
./backend/draft-outputs →   /app/backend/draft-outputs  (read-write)
./backend/logs          →   /app/backend/logs           (read-write)
./backend/instructions  →   /app/backend/instructions   (read-only)
./backend/data          →   /app/backend/data           (read-only)
~/.anthropic            →   /root/.anthropic            (read-only)
```

### Storage Growth Pattern

```
Day 1:    5 MB   (app + dependencies)
Week 1:   50 MB  (10 jobs × ~5MB average)
Month 1:  200 MB (40 jobs + logs)
Year 1:   2.4 GB (480 jobs + logs)

Add 15-20% for logs and overhead
```

---

## Network Architecture

### Development Mode
```
┌──────────────────────────────────────┐
│         Host Machine (macOS)         │
│                                      │
│  localhost:80      → Frontend        │
│  localhost:8000    → Backend         │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Docker Bridge Network         │ │
│  │  (172.28.0.0/16)               │ │
│  │                                │ │
│  │  frontend:80                   │ │
│  │  backend:8000                  │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
         │
         └──> Internet (Anthropic API)
```

### Production Mode (with Reverse Proxy)
```
Internet
   │
   │ Port 443 (HTTPS)
   ↓
┌──────────────────────────────────────┐
│    Nginx Reverse Proxy (Host)        │
│    SSL Termination                   │
│    Rate Limiting                     │
│    Load Balancing                    │
└────────────┬─────────────────────────┘
             │
             │ Port 80 (HTTP, internal only)
             ↓
┌──────────────────────────────────────┐
│  Docker Network (127.0.0.1 only)    │
│                                      │
│  frontend:80   → React SPA           │
│  backend:8000  → FastAPI             │
└──────────────────────────────────────┘
             │
             └──> Internet (Anthropic API)
```

---

## Performance Characteristics

### Request Latency

| Endpoint | Typical | With Load | Max |
|----------|---------|-----------|-----|
| GET /api/jobs | 5ms | 20ms | 100ms |
| POST /api/jobs | 50ms | 200ms | 500ms |
| GET /api/jobs/:id/logs (SSE) | 100ms | 500ms | 2s |
| GET /api/brand-data | 10ms | 50ms | 200ms |
| Claude Job Completion | 2-15min | N/A | 30min |

### Throughput

| Scenario | Jobs/Hour | Jobs/Day | Bottleneck |
|----------|-----------|----------|------------|
| 1 concurrent | 4-6 | 96-144 | Job duration |
| 3 concurrent | 12-18 | 288-432 | CPU/RAM |
| 5 concurrent | 20-30 | 480-720 | API rate limits |
| 10 concurrent | 40-60 | 960-1440 | System resources |

### Scalability Limits

**Vertical Scaling:**
- Single machine limit: ~30 concurrent jobs
- Constrained by: RAM (32GB), API rate limits

**Horizontal Scaling:**
- Theoretical limit: Unlimited
- Requires: Shared storage, job queue, load balancer

---

## Failure Modes & Recovery

### 1. Claude Process Crash
```
Event:    Claude subprocess exits with non-zero code
Impact:   Single job fails
Recovery: Job marked as "failed", logs preserved
Action:   User can retry, other jobs unaffected
```

### 2. Backend Container Crash
```
Event:    FastAPI process crashes
Impact:   All in-flight jobs lost (no persistence)
Recovery: Docker restart policy
Action:   Running jobs lost, need restart (consider Redis)
```

### 3. Out of Memory
```
Event:    Container exceeds memory limit
Impact:   OOMKiller stops container
Recovery: Reduce MAX_CONCURRENT_JOBS
Action:   Add swap, upgrade RAM, or scale horizontally
```

### 4. API Rate Limit
```
Event:    Anthropic API returns 429
Impact:   Job execution slows or fails
Recovery: Exponential backoff (handle in Claude CLI)
Action:   Reduce concurrent jobs or upgrade API tier
```

---

## Security Model

### Attack Surface

```
Public Internet
       │
       │ (1) HTTPS/SSL
       ↓
   Nginx Proxy ────────┐
       │               │ (2) DDoS Protection
       │               │     Rate Limiting
       │ (3) Auth? ────┘
       ↓
   Backend API ────────┐
       │               │ (4) Input Validation
       │               │     CORS
       │               │     API Key Protection
       │               └────> .env file
       │
       │ (5) Subprocess Isolation
       ↓
   Claude CLI
       │
       │ (6) Encrypted API Calls
       ↓
   Anthropic API
```

### Security Layers

1. **SSL/TLS**: Encrypt all public traffic
2. **Firewall**: Only 80/443 exposed
3. **CORS**: Restrict origins
4. **Input Validation**: Sanitize user input
5. **Process Isolation**: Each job in separate process
6. **API Key**: Environment variable, never logged
7. **File Permissions**: Read-only where possible

---

## Monitoring Points

### Application Metrics
- Active jobs count
- Job success/failure rate
- Average job duration
- Queue depth
- API error rate

### System Metrics
- CPU usage per container
- Memory usage per container
- Disk usage (storage growth)
- Network I/O
- Container restarts

### Business Metrics
- Jobs per hour/day/month
- Cost per job
- User satisfaction (job completion rate)
- API costs

---

## Summary

### Key Architectural Decisions

1. **Asyncio over Threading**: Better for I/O-bound coordination
2. **Subprocesses over In-Process**: True parallelism, no GIL
3. **Local Storage over Database**: Simpler deployment (v1)
4. **In-Memory Job State**: Fast, simple (needs Redis for HA)
5. **SSE for Logs**: Real-time updates without websockets
6. **Static Frontend**: Fast, cacheable, CDN-ready

### Performance Profile

- **Lightweight coordination**: FastAPI + asyncio
- **Heavy computation**: Separate Claude processes
- **Linear scaling**: More RAM/CPU = more jobs
- **Bottleneck**: Claude API execution time

### Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| In-memory jobs | Fast, simple | Lost on restart |
| Local filesystem | Easy to deploy | Hard to scale horizontally |
| Subprocess model | True parallelism | Higher memory |
| No job persistence | Simple code | Need to restart jobs manually |

For most use cases (single server, <10 concurrent jobs), this architecture is optimal. For enterprise scale, consider adding Redis, shared storage, and load balancing.
