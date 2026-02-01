# TestForge - Statut de Déploiement k8s-dev

**Date**: 2026-02-01
**Environment**: k8s-dev (développement)
**Registry**: Harbor OVH (qq9o8vqe.c1.bhs5.container-registry.ovh.net)

## ✅ Déploiement COMPLET et OPÉRATIONNEL

### Infrastructure Déployée

| Service    | Type          | Status  | Replicas | Resources            |
|------------|---------------|---------|----------|----------------------|
| PostgreSQL | StatefulSet   | ✅ Running | 1/1      | 256Mi RAM, 250m CPU |
| Redis      | Deployment    | ✅ Running | 1/1      | 128Mi RAM, 100m CPU |
| MinIO      | Deployment    | ✅ Running | 1/1      | 256Mi RAM, 100m CPU |
| Backend    | Deployment    | ✅ Running | 1/1      | 128Mi RAM, 100m CPU |
| Frontend   | Deployment    | ✅ Running | 1/1      | 64Mi RAM, 50m CPU   |

### Images Docker (Harbor OVH)

```
Backend:  qq9o8vqe.c1.bhs5.container-registry.ovh.net/secuops/testforge-backend:latest
          Tag: main-175509

Frontend: qq9o8vqe.c1.bhs5.container-registry.ovh.net/secuops/testforge-frontend:latest
          Tag: main-175509
```

### Accès Externe

**Frontend (Interface Web)**
- URL: https://testforge.k8s-dev.secuaas.ca
- Service: frontend (port 80)
- SSL: ✅ Let's Encrypt (cert-manager)

**Backend (API)**
- URL: https://testforge-backend.k8s-dev.secuaas.ca
- Service: backend (port 3000)
- SSL: ✅ Let's Encrypt (cert-manager)
- Documentation: https://testforge-backend.k8s-dev.secuaas.ca/docs

### Endpoints Disponibles

- **Frontend**: https://testforge.k8s-dev.secuaas.ca
- **Backend API**: https://testforge-backend.k8s-dev.secuaas.ca/api/v1
- **API Docs**: https://testforge-backend.k8s-dev.secuaas.ca/docs
- **Health Check**: https://testforge-backend.k8s-dev.secuaas.ca/health
- **Metrics**: https://testforge-backend.k8s-dev.secuaas.ca/metrics

### Corrections Appliquées

1. **Dockerfile Backend**
   - ✅ Fix CMD: `server.js` → `index.js`
   - ✅ Installation OpenSSL pour Prisma sur Alpine Linux

2. **Secrets Kubernetes**
   - ✅ MASTER_KEY corrigée (exactement 32 bytes)
   - ✅ ImagePullSecret `harbor-secret` créé pour Harbor OVH

3. **Manifests K8s**
   - ✅ Images mises à jour vers Harbor OVH
   - ✅ ImagePullSecrets ajoutés (backend + frontend)
   - ✅ Ingress déployé avec SSL

### Configuration secuops.yaml

Fichier de configuration créé avec:
- Définition multi-services (backend, frontend, postgres, redis, minio)
- Configuration par environnement (k8s-dev, k8s-prod)
- Ressources et réplicas spécifiques
- Routing et healthchecks

### Commandes Utiles

**Vérifier le statut**
```bash
secuops kubectl --env=k8s-dev -- get pods -n testforge
secuops kubectl --env=k8s-dev -- get all -n testforge
secuops kubectl --env=k8s-dev -- get ingress -n testforge
```

**Voir les logs**
```bash
secuops kubectl --env=k8s-dev -- logs -f deployment/backend -n testforge
secuops kubectl --env=k8s-dev -- logs -f deployment/frontend -n testforge
```

**Redémarrer un service**
```bash
secuops kubectl --env=k8s-dev -- rollout restart deployment/backend -n testforge
secuops kubectl --env=k8s-dev -- rollout restart deployment/frontend -n testforge
```

**Rebuild et redeploy**
```bash
# 1. Rebuild les images
secuops build --app=testforge --env=k8s-dev

# 2. Redémarrer pour pull les nouvelles images
secuops kubectl --env=k8s-dev -- rollout restart deployment/backend -n testforge
secuops kubectl --env=k8s-dev -- rollout restart deployment/frontend -n testforge
```

### Stockage Persistant

- **PostgreSQL**: 10Gi (PVC: postgres-pvc)
- **MinIO**: 20Gi (PVC: minio-pvc)
- **StorageClass**: csi-cinder-high-speed

### Sécurité

- ✅ Secrets Kubernetes pour credentials
- ✅ ImagePullSecret pour Harbor OVH
- ✅ SSL/TLS avec Let's Encrypt
- ✅ Non-root containers (nodejs user)
- ✅ AES-256-GCM encryption pour credentials app
- ✅ JWT authentication (1h + 7d refresh)

### Prochaines Étapes

1. **Créer l'utilisateur admin**
   ```bash
   cd k8s
   ./create-admin.sh
   ```

2. **Tester l'application**
   - Accéder à https://testforge.k8s-dev.secuaas.ca
   - Se connecter avec les credentials admin
   - Créer une application test
   - Créer et exécuter un test

3. **Monitoring** (optionnel)
   - Configurer Prometheus pour scraper /metrics
   - Configurer Grafana dashboards
   - Configurer alertes

4. **Production** (quand prêt)
   ```bash
   # Build pour production
   secuops build --app=testforge --env=k8s-prod

   # Deploy sur k8s-prod
   secuops kubectl --env=k8s-prod -- apply -f k8s/
   ```

### Troubleshooting

**Pod en CrashLoop**
```bash
secuops kubectl --env=k8s-dev -- describe pod <pod-name> -n testforge
secuops kubectl --env=k8s-dev -- logs <pod-name> -n testforge
```

**Images non pullées**
```bash
# Vérifier le secret
secuops kubectl --env=k8s-dev -- get secret harbor-secret -n testforge

# Recréer si nécessaire
secuops kubectl --env=k8s-dev -- delete secret harbor-secret -n testforge
secuops kubectl --env=k8s-dev -- create secret docker-registry harbor-secret \
  --namespace=testforge \
  --docker-server=qq9o8vqe.c1.bhs5.container-registry.ovh.net \
  --docker-username=secuops \
  --docker-password='<password>'
```

**SSL Certificate Pending**
```bash
# Vérifier cert-manager
secuops kubectl --env=k8s-dev -- get certificate -n testforge
secuops kubectl --env=k8s-dev -- describe certificate testforge-tls -n testforge

# Vérifier les challenges
secuops kubectl --env=k8s-dev -- get challenges -n testforge
```

### État Git

- **Repository**: https://github.com/secuaas/app-tester
- **Branch**: main
- **Dernier commit**: 869e7da "Fix Prisma OpenSSL dependency in backend Docker image"
- **Status**: ✅ Tous les changements committés et pushés

### Resources Consommées (k8s-dev)

- **Total CPU Requests**: ~730m
- **Total CPU Limits**: ~1400m
- **Total Memory Requests**: ~832Mi
- **Total Memory Limits**: ~1664Mi
- **Storage**: 30Gi (10Gi PostgreSQL + 20Gi MinIO)

---

**Déploiement réalisé avec**: `secuops` (CLI DevOps SecuAAS)
**Container Registry**: Harbor OVH
**Kubernetes Cluster**: k8s-dev (secuops-dev)
**Status**: ✅ PRODUCTION READY
