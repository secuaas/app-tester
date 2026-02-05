# Historique des Versions - TestForge

## Version Actuelle
**0.1.0** - 2026-02-04

---

## Versions

### 0.1.0 - 2026-02-04
**Commit:** `7167c70`
**Type:** Minor - Premier déploiement k8s-dev

**Changements:**
- Déploiement complet sur k8s-dev avec Harbor OVH
- Infrastructure complète: PostgreSQL, Redis, MinIO, Backend API, Frontend
- Images Docker: `secuops/testforge-backend:latest` et `secuops/testforge-frontend:latest`
- Ingress configuré avec SSL Let's Encrypt
- Corrections: OpenSSL Prisma, MASTER_KEY 32 bytes, CMD index.js, imagePullSecrets Harbor
- Documentation complète (DEPLOYMENT_STATUS.md, QUICK_START.md, secuops.yaml)

**Composants déployés:**
- Backend: Node.js 20 + Fastify 4 + Prisma 5 + PostgreSQL 16
- Frontend: React 18 + Vite 7 + TailwindCSS 3
- Infrastructure: Redis 7, MinIO, PostgreSQL 16
- Kubernetes: 5/5 pods Running sur k8s-dev
- Ingress: https://testforge.k8s-dev.secuaas.ca (frontend)
- API: https://testforge-backend.k8s-dev.secuaas.ca (backend)

**Tests effectués:**
- ✅ Build Docker images réussi (secuops build)
- ✅ Push vers Harbor OVH réussi
- ✅ Déploiement k8s-dev réussi (secuops kubectl)
- ✅ Tous les pods Running (5/5)
- ✅ Health checks backend OK (200)
- ✅ Ingress configuré avec SSL
- ✅ Validation infrastructure complète

**Configuration:**
- Registry: Harbor OVH (qq9o8vqe.c1.bhs5.container-registry.ovh.net)
- Cluster: k8s-dev (secuops-dev)
- Namespace: testforge
- Storage: 30Gi (10Gi PostgreSQL + 20Gi MinIO)
- Resources: ~730m CPU requests, ~832Mi RAM requests

**Documentation créée:**
- DEPLOYMENT_STATUS.md (200 lignes)
- QUICK_START.md (300 lignes)
- secuops.yaml (configuration multi-environnement)
- k8s/README.md
- k8s/deploy.sh (script automatisé)

---

**Notes:**
- Premier déploiement opérationnel sur k8s-dev
- Infrastructure 100% fonctionnelle
- Prêt pour création utilisateur admin et tests fonctionnels
- Prochaine étape: Intégration SSO JumpCloud
