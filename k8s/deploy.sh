#!/bin/bash

# TestForge Kubernetes Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: dev (default), prod

set -e

ENVIRONMENT="${1:-dev}"
NAMESPACE="testforge"

echo "🚀 Deploying TestForge to Kubernetes (${ENVIRONMENT})"

# Function to check if secuops is available
check_secuops() {
    if ! command -v secuops &> /dev/null; then
        echo "❌ Error: secuops command not found"
        echo "Please install secuops or ensure it's in your PATH"
        exit 1
    fi
}

# Check for secuops
check_secuops

echo "✅ Using secuops for Kubernetes operations"

# Select the right context
echo "📍 Switching to k8s-${ENVIRONMENT} context..."
secuops context k8s-${ENVIRONMENT}

# Create namespace
echo "📦 Creating namespace..."
secuops apply -f namespace.yaml

# Deploy infrastructure (PostgreSQL, Redis, MinIO)
echo "💾 Deploying PostgreSQL..."
secuops apply -f postgres.yaml

echo "🔴 Deploying Redis..."
secuops apply -f redis.yaml

echo "📦 Deploying MinIO..."
secuops apply -f minio.yaml

# Wait for infrastructure to be ready
echo "⏳ Waiting for infrastructure to be ready..."
secuops wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=300s
secuops wait --for=condition=ready pod -l app=redis -n ${NAMESPACE} --timeout=120s
secuops wait --for=condition=ready pod -l app=minio -n ${NAMESPACE} --timeout=120s

echo "✅ Infrastructure is ready"

# Deploy backend
echo "🔧 Deploying backend..."
secuops apply -f backend.yaml

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
secuops wait --for=condition=ready pod -l app=backend -n ${NAMESPACE} --timeout=300s

echo "✅ Backend is ready"

# Run database migrations
echo "🔄 Running database migrations..."
BACKEND_POD=$(secuops get pods -n ${NAMESPACE} -l app=backend -o jsonpath='{.items[0].metadata.name}')
secuops exec -n ${NAMESPACE} ${BACKEND_POD} -- npx prisma db push --skip-generate || echo "⚠️  Migration warning (may be normal)"

# Deploy frontend
echo "🎨 Deploying frontend..."
secuops apply -f frontend.yaml

# Deploy ingress
echo "🌐 Deploying ingress..."
secuops apply -f ingress.yaml

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
secuops wait --for=condition=ready pod -l app=frontend -n ${NAMESPACE} --timeout=120s

echo "✅ Frontend is ready"

# Display deployment status
echo ""
echo "📊 Deployment Status:"
echo "===================="
secuops get all -n ${NAMESPACE}

echo ""
echo "🌐 Ingress URLs:"
echo "===================="
secuops get ingress -n ${NAMESPACE}

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Create admin user: ./create-admin.sh"
echo "  2. Access frontend: https://testforge.k8s-${ENVIRONMENT}.secuaas.ca"
echo "  3. Access backend API: https://testforge-backend.k8s-${ENVIRONMENT}.secuaas.ca"
echo "  4. View logs: secuops logs -f -l app=backend -n ${NAMESPACE}"
