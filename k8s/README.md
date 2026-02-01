# TestForge Kubernetes Deployment

## Prerequisites

1. **secuops CLI** installed and configured
2. **GitHub Personal Access Token** with `read:packages` permission (for pulling private images)

## Quick Start

### 1. Create ImagePullSecret

The deployment requires access to private GitHub Container Registry images. Create the imagePullSecret:

```bash
./create-image-pull-secret.sh
```

Or manually:

```bash
# For k8s-prod
secuops kubectl -e prod -- create secret docker-registry ghcr-secret \
  --namespace=testforge \
  --docker-server=ghcr.io \
  --docker-username=<YOUR_GITHUB_USERNAME> \
  --docker-password=<YOUR_GITHUB_PAT> \
  --docker-email=<YOUR_EMAIL>

# For k8s-dev
secuops kubectl -e dev -- create secret docker-registry ghcr-secret \
  --namespace=testforge \
  --docker-server=ghcr.io \
  --docker-username=<YOUR_GITHUB_USERNAME> \
  --docker-password=<YOUR_GITHUB_PAT> \
  --docker-email=<YOUR_EMAIL>
```

**Create GitHub PAT:**
1. Go to https://github.com/settings/tokens/new
2. Select scope: `read:packages`
3. Generate token and copy it

### 2. Deploy to Kubernetes

```bash
# Deploy to development
./deploy.sh dev

# Deploy to production
./deploy.sh prod
```

### 3. Create Admin User

After deployment, create the initial admin user:

```bash
./create-admin.sh
```

## Components

| Component    | Service Port | Description                    |
|--------------|--------------|--------------------------------|
| Backend      | 3000         | FastifyNode.js API            |
| Frontend     | 80           | React/Nginx frontend          |
| PostgreSQL   | 5432         | Primary database              |
| Redis        | 6379         | Cache & queue                 |
| MinIO        | 9000         | Object storage (artifacts)    |

## Persistent Storage

- **PostgreSQL**: 10Gi PVC using `csi-cinder-high-speed` StorageClass
- **MinIO**: 20Gi PVC using `csi-cinder-high-speed` StorageClass

## Resource Allocation

### Backend
- Requests: 128Mi RAM, 100m CPU
- Limits: 256Mi RAM, 200m CPU
- Replicas: 1

### Frontend
- Requests: 64Mi RAM, 50m CPU
- Limits: 128Mi RAM, 100m CPU
- Replicas: 1

### PostgreSQL
- Requests: 256Mi RAM, 250m CPU
- Limits: 512Mi RAM, 500m CPU
- Replicas: 1 (StatefulSet)

### Redis
- Requests: 128Mi RAM, 100m CPU
- Limits: 256Mi RAM, 200m CPU
- Replicas: 1

### MinIO
- Requests: 256Mi RAM, 100m CPU
- Limits: 512Mi RAM, 200m CPU
- Replicas: 1

## Accessing Services

### Via Port-Forward

```bash
# Backend API
secuops kubectl -e prod -- port-forward -n testforge svc/backend 3000:3000

# Frontend
secuops kubectl -e prod -- port-forward -n testforge svc/frontend 8080:80

# MinIO Console
secuops kubectl -e prod -- port-forward -n testforge svc/minio 9011:9011
```

### Via Ingress

TODO: Configure ingress for external access

## Monitoring

View logs:

```bash
# Backend logs
secuops kubectl -e prod -- logs -f -l app=backend -n testforge

# Frontend logs
secuops kubectl -e prod -- logs -f -l app=frontend -n testforge

# PostgreSQL logs
secuops kubectl -e prod -- logs -f -l app=postgres -n testforge
```

Check pod status:

```bash
secuops kubectl -e prod -- get pods -n testforge
```

Check all resources:

```bash
secuops kubectl -e prod -- get all -n testforge
```

## Database Migrations

Migrations run automatically via the backend init container on startup.

To run migrations manually:

```bash
# Get backend pod name
POD=$(secuops kubectl -e prod -- get pod -l app=backend -n testforge -o jsonpath='{.items[0].metadata.name}')

# Execute migration
secuops kubectl -e prod -- exec -it $POD -n testforge -- npx prisma migrate deploy
```

## Troubleshooting

### ImagePullBackOff Error

```bash
# Check if imagePullSecret exists
secuops kubectl -e prod -- get secret ghcr-secret -n testforge

# If not found, create it
./create-image-pull-secret.sh
```

### Pod Not Starting

```bash
# Describe pod to see events
secuops kubectl -e prod -- describe pod <POD_NAME> -n testforge

# Check logs
secuops kubectl -e prod -- logs <POD_NAME> -n testforge
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
secuops kubectl -e prod -- get pod postgres-0 -n testforge

# Check PostgreSQL logs
secuops kubectl -e prod -- logs postgres-0 -n testforge

# Test connection from backend pod
secuops kubectl -e prod -- exec -it <BACKEND_POD> -n testforge -- nc -zv postgres 5432
```

## Cleanup

```bash
# Delete entire namespace (removes everything)
secuops kubectl -e prod -- delete namespace testforge

# Or delete individual components
secuops kubectl -e prod -- delete -f backend.yaml
secuops kubectl -e prod -- delete -f frontend.yaml
secuops kubectl -e prod -- delete -f postgres.yaml
secuops kubectl -e prod -- delete -f redis.yaml
secuops kubectl -e prod -- delete -f minio.yaml
```

## Security Notes

- All secrets are stored in Kubernetes Secrets
- PostgreSQL password is auto-generated
- Credentials are encrypted at application level using AES-256-GCM
- API uses JWT authentication with refresh tokens
- ImagePullSecret contains GitHub PAT - keep it secure

## Environment Variables

Configured via ConfigMaps and Secrets. See individual YAML files for details.

- `backend-config`: Non-sensitive configuration
- `backend-secret`: Sensitive data (DB password, JWT secret, encryption keys)
- `postgres-secret`: PostgreSQL credentials
- `minio-secret`: MinIO credentials

## High Availability (TODO)

Current deployment uses single replicas. For production HA:

1. Increase backend/frontend replicas to 2+
2. Configure PostgreSQL streaming replication or use managed DB
3. Configure Redis Sentinel or use managed Redis
4. Use distributed object storage instead of MinIO
5. Configure horizontal pod autoscaling based on CPU/memory
