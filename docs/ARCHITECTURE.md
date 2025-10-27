# Architecture Overview

## System Design

Claude Workflow Manager is a full-stack web application for managing content generation workflows using Claude Code CLI.

### High-Level Architecture

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │ HTTP/SSE
         ▼
┌─────────────────┐
│  React Frontend │ (Port 3000)
│   (Nginx)       │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│ FastAPI Backend │ (Port 8000)
│   (Python)      │
└────────┬────────┘
         │ Subprocess
         ▼
┌─────────────────┐
│  Claude Code    │
│      CLI        │
└─────────────────┘
```

## Components

### Frontend (React + Vite)

**Technology Stack**:
- React 18
- Vite (build tool)
- TailwindCSS (styling)
- Lucide React (icons)
- React Markdown (rendering)
- EventSource API (SSE)

**Key Features**:
- Three main tabs: Brand Data, Briefs, Drafts
- Real-time log streaming via Server-Sent Events
- File upload/download/delete
- Markdown rendering for previews
- Active jobs monitoring panel

**Component Structure**:
```
src/
├── components/
│   ├── BrandDataTab.jsx    # Brand data generation UI
│   ├── BriefTab.jsx         # Brief generation UI
│   ├── DraftTab.jsx         # Draft generation UI
│   ├── ActiveJobsPanel.jsx  # Job monitoring sidebar
│   └── LogViewer.jsx        # SSE log streaming component
├── api.js                   # API client wrapper
├── App.jsx                  # Main app with tab navigation
└── main.jsx                 # Entry point
```

### Backend (FastAPI + Python)

**Technology Stack**:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- AsyncIO (concurrent job execution)
- Subprocess (Claude Code CLI execution)

**Key Features**:
- RESTful API for CRUD operations
- Async job execution (max 3 concurrent)
- Server-Sent Events for log streaming
- File-based storage (JSON/Markdown)
- Job lifecycle management

**Architecture Patterns**:
- **Job Manager**: Singleton class managing job queue and execution
- **Async Subprocess**: Non-blocking CLI execution
- **SSE Streaming**: Real-time log delivery to clients
- **File System Storage**: Simple, reliable persistence

**API Structure**:
```python
FastAPI App
├── /api/brand-data/*      # Brand data endpoints
├── /api/briefs/*          # Brief endpoints
├── /api/drafts/*          # Draft endpoints
├── /api/jobs/*            # Job management
└── /health                # Health check
```

## Data Flow

### 1. Job Submission Flow

```
User Input (Frontend)
    ↓
POST /api/*/generate
    ↓
Create Job (JobManager)
    ↓
Execute Subprocess (Claude Code)
    ↓
Stream Logs via SSE
    ↓
Save Output Files
    ↓
Job Complete (Status Update)
```

### 2. Log Streaming Flow

```
Backend starts subprocess
    ↓
Read stdout/stderr lines
    ↓
Push to SSE queue
    ↓
EventSource connection
    ↓
Frontend receives events
    ↓
Update LogViewer UI
```

### 3. File Management Flow

```
User uploads file
    ↓
POST /api/*/upload
    ↓
Validate file (size, type)
    ↓
Save to disk (brand-data/, briefs/, drafts/)
    ↓
Return file metadata
    ↓
Frontend updates file list
```

## Storage Structure

### File System Layout

```
backend/
├── brand-data/           # Brand JSON files
│   └── brand_*.json
├── brief-outputs/        # Brief markdown files
│   └── brief_*.md
├── draft-outputs/        # Draft markdown files
│   └── draft_*.md
├── logs/                 # Job execution logs
│   └── job_*.log
└── instructions/         # Instruction templates (read-only)
    ├── brief_generation_instructions.md
    └── draft_generation_instructions.md
```

### Docker Volumes (Production)

```yaml
volumes:
  brand-data:       # Persistent brand data
  brief-outputs:    # Persistent briefs
  draft-outputs:    # Persistent drafts
  logs:             # Persistent logs
  claude-config:    # Claude Code configuration
```

## Concurrency Model

### Job Execution

**Constraints**:
- Maximum 3 concurrent jobs (configurable)
- Jobs queued if limit reached
- FIFO execution order

**Implementation**:
```python
class JobManager:
    active_jobs: Dict[str, JobInfo]
    max_concurrent: int = 3

    async def submit_job():
        if active_count() >= max_concurrent:
            return "Queue full"

        job_id = create_job()
        asyncio.create_task(execute_job(job_id))
        return job_id
```

### Process Management

**Claude Code Execution**:
```python
process = await asyncio.create_subprocess_exec(
    'claude',
    '--dangerously-skip-permissions',
    stdin=PIPE,
    stdout=PIPE,
    stderr=PIPE
)
```

**Log Streaming**:
- Async read from stdout/stderr
- Line-by-line buffering
- Broadcast to all SSE connections
- Cleanup on completion

## Security Considerations

### Current Implementation

**Local Development**:
- No authentication (single-user system)
- `--dangerously-skip-permissions` flag for automation
- CORS enabled for localhost

**Production (Coolify)**:
- Direct port exposure (no authentication)
- Environment variable-based secrets
- File system isolation via Docker volumes

### Recommendations for Production

1. **Add Authentication**:
   - JWT tokens
   - Session management
   - User-based file isolation

2. **Secure API Keys**:
   - Use Docker secrets
   - Environment variable encryption
   - Key rotation

3. **Rate Limiting**:
   - Per-user job limits
   - API endpoint throttling

4. **Input Validation**:
   - Strict file type checking
   - Content sanitization
   - Path traversal prevention

## Deployment Architecture

### Coolify Deployment

```
GitHub Repository
    ↓ (Git push)
Coolify Auto-Deploy
    ↓
Docker Build
    ↓
├── Backend Container (8000:8000)
└── Frontend Container (3000:80)
    ↓
Direct Port Mapping
    ↓
Server IP:8000 (API)
Server IP:3000 (UI)
```

**Network Configuration**:
- Containers on same bridge network
- Direct host port mapping (bypasses Traefik)
- Inter-container communication via container names

### Scaling Considerations

**Current Limitations**:
- Single backend instance
- In-memory job queue (not persistent)
- File-based storage (no database)

**To Scale**:
1. **Add Redis** for job queue
2. **Add PostgreSQL** for metadata
3. **Load balance** multiple backend instances
4. **Shared storage** (NFS/S3) for files
5. **Message queue** (RabbitMQ/Kafka) for jobs

## Technology Choices

### Why FastAPI?
- Async/await support for concurrent jobs
- Built-in SSE support
- Fast development with automatic API docs
- Type hints and validation

### Why React + Vite?
- Fast development with HMR
- Modern build tooling
- Rich ecosystem
- Simple deployment (static files)

### Why Subprocess for Claude Code?
- No Python SDK available
- CLI is official interface
- Reliable process isolation
- Easy to stream logs

### Why File-Based Storage?
- Simple implementation
- No database overhead
- Easy backup/restore
- Sufficient for single-user system

## Future Improvements

### Planned Enhancements

1. **Task Queue Architecture**:
   - Replace subprocess with Celery + Redis
   - Better job persistence
   - Distributed execution

2. **Database Integration**:
   - PostgreSQL for metadata
   - Query capabilities
   - Better job history

3. **Authentication**:
   - Multi-user support
   - Role-based access control

4. **WebSocket Communication**:
   - Bi-directional updates
   - Better than SSE for complex interactions

5. **Object Storage**:
   - S3-compatible storage
   - Better for scaling
   - Automatic backups

## Performance Characteristics

### Benchmarks

**Job Execution**:
- Brand Data: 2-5 minutes
- Brief Generation: 1-3 minutes
- Draft Generation: 3-7 minutes

**API Response Times**:
- File list: <50ms
- File upload: <200ms
- Job submission: <100ms

**Concurrent Capacity**:
- 3 parallel jobs
- ~9 jobs per 15 minutes
- ~36 jobs per hour

### Resource Usage

**Backend Container**:
- CPU: 2-4 cores recommended
- Memory: 2-4GB recommended
- Disk: Depends on file storage

**Frontend Container**:
- CPU: 0.5 cores sufficient
- Memory: 256-512MB sufficient
- Disk: <100MB

## Monitoring and Observability

### Health Checks

**Backend**:
```bash
GET /health
Response: {
  "status": "healthy",
  "timestamp": "...",
  "active_jobs": 2,
  "max_concurrent_jobs": 3
}
```

**Frontend**:
```bash
curl -I http://localhost:3000/
# Should return 200 OK
```

### Logs

**Backend Logs**:
- Job execution logs: `backend/logs/*.log`
- Container logs: `docker logs backend`

**Frontend Logs**:
- Nginx access logs
- Browser console for client errors

### Metrics (Future)

- Job completion rate
- Average execution time
- Error rate
- Resource utilization
- API endpoint latency
