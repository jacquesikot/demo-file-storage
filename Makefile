.PHONY: help build-frontend build-backend build run-frontend run-backend dev-frontend dev-backend
.PHONY: clean clean-images stop-frontend stop-backend stop logs-frontend logs-backend test health

PROJECT_NAME = claude-workflow-manager
FRONTEND_IMAGE = $(PROJECT_NAME)-frontend
BACKEND_IMAGE = $(PROJECT_NAME)-backend
FRONTEND_PORT = 3000
BACKEND_PORT = 8000

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Docker Build Commands
# =============================================================================

build: build-frontend build-backend ## Build both frontend and backend Docker images

build-frontend: ## Build frontend Docker image
	@echo "Building frontend Docker image..."
	docker build -t $(FRONTEND_IMAGE):latest -f frontend/Dockerfile ./frontend
	@echo "✓ Frontend image built: $(FRONTEND_IMAGE):latest"

build-backend: ## Build backend Docker image
	@echo "Building backend Docker image..."
	docker build -t $(BACKEND_IMAGE):latest -f backend/Dockerfile ./backend
	@echo "✓ Backend image built: $(BACKEND_IMAGE):latest"

# =============================================================================
# Docker Run Commands
# =============================================================================

run-frontend: ## Run frontend container (use BACKEND_URL env var to connect to backend)
	@echo "Starting frontend container..."
	@docker stop $(FRONTEND_IMAGE) 2>/dev/null || true
	@docker rm $(FRONTEND_IMAGE) 2>/dev/null || true
	docker run -d \
		--name $(FRONTEND_IMAGE) \
		-p $(FRONTEND_PORT):80 \
		--restart unless-stopped \
		$(FRONTEND_IMAGE):latest
	@echo "✓ Frontend running at http://localhost:$(FRONTEND_PORT)"
	@echo "Note: Update VITE_API_URL env var at build time to connect to your backend"

run-backend: ## Run backend container (requires ANTHROPIC_API_KEY)
	@if [ -z "$(ANTHROPIC_API_KEY)" ]; then \
		echo "Error: ANTHROPIC_API_KEY environment variable is required"; \
		echo "Usage: ANTHROPIC_API_KEY=your_key make run-backend"; \
		exit 1; \
	fi
	@echo "Starting backend container..."
	@docker stop $(BACKEND_IMAGE) 2>/dev/null || true
	@docker rm $(BACKEND_IMAGE) 2>/dev/null || true
	docker run -d \
		--name $(BACKEND_IMAGE) \
		-p $(BACKEND_PORT):8000 \
		-e ANTHROPIC_API_KEY=$(ANTHROPIC_API_KEY) \
		-e MAX_CONCURRENT_JOBS=3 \
		-e PYTHONUNBUFFERED=1 \
		-v $(PWD)/backend/brand-data:/app/brand-data \
		-v $(PWD)/backend/brief-outputs:/app/brief-outputs \
		-v $(PWD)/backend/draft-outputs:/app/draft-outputs \
		-v $(PWD)/backend/logs:/app/logs \
		-v $(PWD)/backend/instructions:/app/instructions:ro \
		-v $(PWD)/backend/data:/app/data:ro \
		--restart unless-stopped \
		$(BACKEND_IMAGE):latest
	@echo "✓ Backend running at http://localhost:$(BACKEND_PORT)"
	@echo "✓ API Docs: http://localhost:$(BACKEND_PORT)/docs"

run: run-backend run-frontend ## Run both frontend and backend containers

# =============================================================================
# Local Development Commands
# =============================================================================

dev-backend: ## Run backend locally (not in Docker)
	@if [ ! -f .env ]; then \
		echo "Error: .env file not found. Run 'make setup' first"; \
		exit 1; \
	fi
	@if ! command -v python3 >/dev/null 2>&1; then \
		echo "Error: Python 3 is not installed"; \
		echo "Install Python 3.11+ from https://www.python.org/downloads/"; \
		exit 1; \
	fi
	@if [ ! -d backend/venv ]; then \
		echo "Setting up Python virtual environment..."; \
		cd backend && python3 -m venv venv && \
		. venv/bin/activate && \
		pip install --upgrade pip && \
		pip install -r requirements.txt; \
	fi
	@echo "Starting backend in development mode..."
	@echo "Activating virtual environment and starting server..."
	@cd backend && . venv/bin/activate && export $$(grep -v '^#' ../.env | grep -v '^$$' | xargs) && uvicorn app:app --reload --host 0.0.0.0 --port $(BACKEND_PORT)

dev-frontend: ## Run frontend locally (not in Docker)
	@echo "Starting frontend in development mode..."
	@cd frontend && npm install && npm run dev

dev: ## Start both services locally for development
	@echo "Starting services in development mode..."
	@echo "Run in separate terminals:"
	@echo "  Terminal 1: make dev-backend"
	@echo "  Terminal 2: make dev-frontend"

dev-setup: ## Setup local development environment
	@echo "Setting up local development environment..."
	@if ! command -v python3 >/dev/null 2>&1; then \
		echo "Error: Python 3 is not installed"; \
		exit 1; \
	fi
	@if ! command -v node >/dev/null 2>&1; then \
		echo "Error: Node.js is not installed"; \
		exit 1; \
	fi
	@echo "Creating Python virtual environment..."
	@cd backend && python3 -m venv venv && \
		. venv/bin/activate && \
		pip install --upgrade pip && \
		pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install
	@echo ""
	@echo "✓ Development environment ready!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env and add your ANTHROPIC_API_KEY"
	@echo "  2. Terminal 1: make dev-backend"
	@echo "  3. Terminal 2: make dev-frontend"

# =============================================================================
# Container Management Commands
# =============================================================================

stop-frontend: ## Stop frontend container
	@docker stop $(FRONTEND_IMAGE) 2>/dev/null || echo "Frontend not running"
	@docker rm $(FRONTEND_IMAGE) 2>/dev/null || true

stop-backend: ## Stop backend container
	@docker stop $(BACKEND_IMAGE) 2>/dev/null || echo "Backend not running"
	@docker rm $(BACKEND_IMAGE) 2>/dev/null || true

stop: stop-frontend stop-backend ## Stop all containers

logs-frontend: ## Show frontend container logs
	docker logs -f $(FRONTEND_IMAGE)

logs-backend: ## Show backend container logs
	docker logs -f $(BACKEND_IMAGE)

# =============================================================================
# Cleanup Commands
# =============================================================================

clean: stop ## Stop containers and remove volumes
	@echo "Cleaning up containers..."
	@docker rm -f $(FRONTEND_IMAGE) $(BACKEND_IMAGE) 2>/dev/null || true
	@echo "✓ Cleanup complete"

clean-images: clean ## Remove Docker images
	@echo "Removing Docker images..."
	@docker rmi $(FRONTEND_IMAGE):latest $(BACKEND_IMAGE):latest 2>/dev/null || true
	@echo "✓ Images removed"

clean-logs: ## Clean all log files
	@rm -rf backend/logs/*.log
	@echo "✓ Logs cleaned"

prune: ## Remove unused Docker resources
	docker system prune -af --volumes

# =============================================================================
# Health & Testing Commands
# =============================================================================

health: ## Check health of running services
	@echo "Checking service health..."
	@echo -n "Backend: "
	@curl -sf http://localhost:$(BACKEND_PORT)/ >/dev/null && echo "✓ Healthy" || echo "✗ Down"
	@echo -n "Frontend: "
	@curl -sf http://localhost:$(FRONTEND_PORT)/ >/dev/null && echo "✓ Healthy" || echo "✗ Down"

test: ## Run backend tests
	@cd backend && python -m pytest

# =============================================================================
# Setup Commands
# =============================================================================

setup: ## Initial setup (create .env file)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file from .env.example"; \
		echo "⚠  Please edit .env and add your ANTHROPIC_API_KEY"; \
	else \
		echo ".env file already exists"; \
	fi

install: setup ## Complete installation and build
	@echo "Installing dependencies and building images..."
	@make build
	@echo ""
	@echo "✓ Installation complete!"
	@echo ""
	@echo "Quick start:"
	@echo "  1. Edit .env and add your ANTHROPIC_API_KEY"
	@echo "  2. Run: make run"
	@echo ""
	@echo "For local development:"
	@echo "  1. Terminal 1: make dev-backend"
	@echo "  2. Terminal 2: make dev-frontend"

# =============================================================================
# Backup Commands
# =============================================================================

backup: ## Backup all generated files
	@mkdir -p backups
	tar -czf backups/backup-$$(date +%Y%m%d-%H%M%S).tar.gz \
		backend/brand-data \
		backend/brief-outputs \
		backend/draft-outputs \
		backend/logs
	@echo "✓ Backup created in backups/"

restore: ## Restore from backup (use: make restore FILE=backup.tar.gz)
	@test -n "$(FILE)" || (echo "Usage: make restore FILE=backup.tar.gz" && exit 1)
	tar -xzf backups/$(FILE)
	@echo "✓ Backup restored"
