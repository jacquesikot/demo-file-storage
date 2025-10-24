.PHONY: help build up down restart logs clean test deploy setup install backup restore health stats top
.PHONY: logs-backend logs-frontend shell-backend shell-frontend ps
.PHONY: build-prod up-prod down-prod logs-prod clean-logs prune test-backend

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_PROD = docker-compose -f docker-compose.prod.yml
PROJECT_NAME = claude-workflow-manager

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development Commands
build: ## Build Docker images
	$(DOCKER_COMPOSE) build

up: ## Start services in development mode
	$(DOCKER_COMPOSE) up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost"
	@echo "Backend: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

down: ## Stop all services
	$(DOCKER_COMPOSE) down

restart: down up ## Restart all services

logs: ## Show logs from all services
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## Show backend logs only
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## Show frontend logs only
	$(DOCKER_COMPOSE) logs -f frontend

shell-backend: ## Open shell in backend container
	$(DOCKER_COMPOSE) exec backend bash

shell-frontend: ## Open shell in frontend container
	$(DOCKER_COMPOSE) exec frontend sh

ps: ## Show running containers
	$(DOCKER_COMPOSE) ps

# Production Commands
build-prod: ## Build production images
	$(DOCKER_COMPOSE_PROD) build

up-prod: ## Start services in production mode
	$(DOCKER_COMPOSE_PROD) up -d
	@echo "Production services started!"

down-prod: ## Stop production services
	$(DOCKER_COMPOSE_PROD) down

logs-prod: ## Show production logs
	$(DOCKER_COMPOSE_PROD) logs -f

# Maintenance Commands
clean: ## Remove all containers, volumes, and images
	$(DOCKER_COMPOSE) down -v --rmi all

clean-logs: ## Clean all log files
	rm -rf backend/logs/*.log

prune: ## Remove unused Docker resources
	docker system prune -af --volumes

# Health Checks
health: ## Check health of all services
	@echo "Checking backend health..."
	@curl -f http://localhost:8000/ && echo "✓ Backend is healthy" || echo "✗ Backend is down"
	@echo "Checking frontend health..."
	@curl -f http://localhost/ && echo "✓ Frontend is healthy" || echo "✗ Frontend is down"

# Testing Commands
test-backend: ## Run backend tests
	$(DOCKER_COMPOSE) exec backend python -m pytest

# Deployment Commands
deploy: ## Deploy to production server (requires SSH config)
	@echo "Deploying to production..."
	@read -p "Enter server address: " server; \
	ssh $$server 'cd /opt/$(PROJECT_NAME) && git pull && make build-prod && make up-prod'

# Database/Volume Management
backup: ## Backup all generated files
	@mkdir -p backups
	tar -czf backups/backup-$$(date +%Y%m%d-%H%M%S).tar.gz \
		backend/brand-data \
		backend/brief-outputs \
		backend/draft-outputs \
		backend/logs

restore: ## Restore from backup (use: make restore FILE=backup.tar.gz)
	@test -n "$(FILE)" || (echo "Usage: make restore FILE=backup.tar.gz" && exit 1)
	tar -xzf backups/$(FILE)

# Setup Commands
setup: ## Initial setup (copy env file)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file from .env.example"; \
		echo "⚠ Please edit .env and add your ANTHROPIC_API_KEY"; \
	else \
		echo ".env file already exists"; \
	fi

install: setup build ## Full installation (setup + build)
	@echo "Installation complete!"
	@echo "Run 'make up' to start the services"

# Monitoring
stats: ## Show Docker container stats
	docker stats

top: ## Show running processes in containers
	$(DOCKER_COMPOSE) top
