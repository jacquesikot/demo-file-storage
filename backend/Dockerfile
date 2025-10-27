# Multi-stage build for efficient image
FROM python:3.11-slim AS base

# Install system dependencies including Node.js
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI via npm
RUN npm install -g @anthropic-ai/claude-code

# Set working directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user
RUN useradd -m -u 1000 appuser

# Copy application code
COPY backend/ .

# Create necessary directories with proper permissions
RUN mkdir -p \
    brand-data \
    brief-outputs \
    draft-outputs \
    instructions \
    logs \
    data \
    && chown -R appuser:appuser /app

# Create Claude Code settings to allow all tools without prompts
RUN mkdir -p /home/appuser/.claude && \
    echo '{"permissions": {"allow": ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)", "Glob(*)", "Grep(*)", "WebFetch(*)", "WebSearch(*)", "Task(*)", "Skill(*)", "TodoWrite(*)", "NotebookEdit(*)", "ExitPlanMode(*)", "BashOutput(*)", "KillShell(*)", "SlashCommand(*)"]}}' > /home/appuser/.claude/settings.local.json && \
    chown -R appuser:appuser /home/appuser/.claude

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
