# Historique des Versions - TestForge

## Version Actuelle
**0.2.0** - 2026-02-05

---

## Versions

### 0.2.0 - 2026-02-05
**Commit:** `a408752`
**Type:** Minor - Intégration SSO JumpCloud

**Changements:**
- Intégration complète SSO JumpCloud avec OIDC
- Services SSO adaptés de NestJS vers Fastify:
  - JumpCloudOidcService: Client OIDC avec PKCE
  - SessionService: Gestion sessions Redis
  - RoleSelectorService: Mapping groupes → rôles
  - AuditService: Logging événements SSO
  - RedisSessionStore: Stockage sessions avec TTL
- Routes SSO Fastify:
  - GET /auth/sso/login (initiation auth)
  - GET /auth/sso/callback (callback OIDC)
  - POST /auth/sso/role (sélection rôle)
  - GET /auth/sso/session (info session)
  - GET /auth/sso/logout (déconnexion)
  - GET /auth/sso/roles (liste rôles disponibles)
- Frontend React:
  - Service SSO (sso.js)
  - Page RoleSelection.jsx (multi-rôles)
  - Page SsoError.jsx (erreurs SSO)
  - AuthContext mis à jour pour SSO
  - Login page avec bouton SSO
- Configuration:
  - Variables d'environnement JumpCloud (.env.example)
  - Configuration SSO dans config/index.ts
  - Mapping groupes JumpCloud → rôles (SUPER_ADMIN, ADMIN, USER)
  - Hiérarchie de rôles
  - Sessions Redis 24h TTL
- Dépendances ajoutées:
  - @fastify/cookie ^9.3.1
  - jose ^5.2.0 (JWT/JWKS validation)
- Documentation:
  - SSO_INTEGRATION.md (300+ lignes)
  - Architecture complète SSO
  - Workflow d'authentification
  - Configuration JumpCloud
  - Troubleshooting

**Fonctionnalités SSO:**
- ✅ OIDC Authentication avec PKCE (sécurité renforcée)
- ✅ Validation ID token JWT avec JWKS
- ✅ Multi-rôles avec sélection utilisateur
- ✅ Hiérarchie de rôles (SUPER_ADMIN > ADMIN > USER)
- ✅ Sessions Redis avec sliding window
- ✅ Refresh automatique des tokens
- ✅ Révocation tokens JumpCloud
- ✅ Audit logging événements SSO
- ✅ Support groupes JumpCloud
- ✅ Cookies sécurisés (httpOnly, secure, sameSite)

**Tests effectués:**
- ⏳ En attente: Build images Docker
- ⏳ En attente: Deploy k8s-dev
- ⏳ En attente: Test flow SSO complet
- ⏳ En attente: Test sélection rôles
- ⏳ En attente: Test refresh tokens

**Fichiers modifiés/créés:**
Backend (13 fichiers):
- backend/src/modules/auth/sso/types.ts (nouveau)
- backend/src/modules/auth/sso/jumpcloud-oidc.service.ts (nouveau)
- backend/src/modules/auth/sso/session-store.interface.ts (nouveau)
- backend/src/modules/auth/sso/redis-session-store.ts (nouveau)
- backend/src/modules/auth/sso/session.service.ts (nouveau)
- backend/src/modules/auth/sso/role-selector.service.ts (nouveau)
- backend/src/modules/auth/sso/audit.service.ts (nouveau)
- backend/src/modules/auth/sso/index.ts (nouveau)
- backend/src/modules/auth/sso.routes.ts (nouveau)
- backend/src/app.ts (modifié: ajout cookie + routes SSO)
- backend/src/config/index.ts (modifié: ajout config SSO)
- backend/.env.example (modifié: variables SSO)
- backend/package.json (modifié: dépendances)
- backend/SSO_INTEGRATION.md (nouveau, documentation)

Frontend (5 fichiers):
- frontend/src/services/sso.js (nouveau)
- frontend/src/pages/RoleSelection.jsx (nouveau)
- frontend/src/pages/SsoError.jsx (nouveau)
- frontend/src/contexts/AuthContext.jsx (modifié: support SSO)
- frontend/src/pages/Login.jsx (modifié: bouton SSO)
- frontend/src/App.jsx (modifié: routes SSO)
- frontend/.env.example (modifié: VITE_SSO_ENABLED)

---

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
