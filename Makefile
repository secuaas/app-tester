.PHONY: help dev build deploy clean logs status test

# Variables
DOCKER_REGISTRY := ghcr.io/secuaas
BACKEND_IMAGE := $(DOCKER_REGISTRY)/testforge-backend
FRONTEND_IMAGE := $(DOCKER_REGISTRY)/testforge-frontend
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

help: ## Show this help message
	@echo "TestForge - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
dev: ## Start development environment with docker-compose
	docker-compose up -d
	@echo "✅ Development environment started"
	@echo "Backend: http://localhost:3000"
	@echo "Frontend: http://localhost:5173"
	@echo "MinIO Console: http://localhost:9011"

dev-stop: ## Stop development environment
	docker-compose down

dev-logs: ## Show development logs
	docker-compose logs -f

# Build
build-backend: ## Build backend Docker image
	@echo "🔨 Building backend image..."
	docker build -t $(BACKEND_IMAGE):$(VERSION) -t $(BACKEND_IMAGE):latest ./backend
	@echo "✅ Backend image built: $(BACKEND_IMAGE):$(VERSION)"

build-frontend: ## Build frontend Docker image
	@echo "🔨 Building frontend image..."
	docker build -t $(FRONTEND_IMAGE):$(VERSION) -t $(FRONTEND_IMAGE):latest --target production ./frontend
	@echo "✅ Frontend image built: $(FRONTEND_IMAGE):$(VERSION)"

build: build-backend build-frontend ## Build all Docker images

# Push
push-backend: build-backend ## Push backend image to registry
	docker push $(BACKEND_IMAGE):$(VERSION)
	docker push $(BACKEND_IMAGE):latest
	@echo "✅ Backend image pushed"

push-frontend: build-frontend ## Push frontend image to registry
	docker push $(FRONTEND_IMAGE):$(VERSION)
	docker push $(FRONTEND_IMAGE):latest
	@echo "✅ Frontend image pushed"

push: push-backend push-frontend ## Push all images to registry

# Kubernetes
k8s-deploy-dev: ## Deploy to k8s-dev using secuops
	@cd k8s && ./deploy.sh dev

k8s-deploy-prod: ## Deploy to k8s-prod using secuops
	@cd k8s && ./deploy.sh prod

k8s-delete: ## Delete Kubernetes deployment
	@echo "⚠️  Deleting TestForge from Kubernetes..."
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		secuops delete namespace testforge; \
		echo "✅ TestForge deleted"; \
	fi

k8s-logs-backend: ## Show backend logs in Kubernetes
	secuops logs -f -l app=backend -n testforge

k8s-logs-frontend: ## Show frontend logs in Kubernetes
	secuops logs -f -l app=frontend -n testforge

k8s-status: ## Show Kubernetes deployment status
	secuops get all -n testforge

k8s-create-admin: ## Create admin user in Kubernetes
	@cd k8s && ./create-admin.sh

# Database
db-migrate: ## Run database migrations locally
	cd backend && npx prisma db push

db-studio: ## Open Prisma Studio
	cd backend && npx prisma studio

db-generate: ## Generate Prisma Client
	cd backend && npx prisma generate

# Testing
test-backend: ## Run backend tests
	cd backend && npm test

test-api: ## Run API integration tests
	cd backend && bash scripts/test-api.sh

# Clean
clean: ## Clean build artifacts and dependencies
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/dist frontend/node_modules
	docker-compose down -v
	@echo "✅ Clean completed"

# Install
install: ## Install all dependencies
	cd backend && npm install
	cd frontend && npm install
	@echo "✅ Dependencies installed"

# Full deployment workflow
deploy-all: build push k8s-deploy-dev ## Build, push and deploy to k8s-dev
	@echo "🎉 Full deployment completed!"

# Version
version: ## Show current version
	@echo "Version: $(VERSION)"
