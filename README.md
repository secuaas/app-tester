# TestForge - Automated Testing Platform

TestForge est une plateforme centralisée de tests automatisés pour applications web et APIs.

## Fonctionnalités Principales

### ✅ Backend API (100% implémenté)

- 🧪 **Tests API** : Requêtes HTTP avec assertions avancées et chaînage de variables
- 🔐 **Gestion sécurisée des credentials** : Chiffrement AES-256-GCM avec HKDF key derivation
- 📊 **Execution Engine** : Orchestration asynchrone avec capture complète request/response
- 🔑 **Authentication**: JWT tokens (1h + 7d refresh) + API Keys (SHA-256)
- 🏥 **Health Monitoring**: Status par environnement avec métriques
- 📤 **Import/Export YAML**: Versioning et partage de test suites
- 🔍 **Assertions**: Status, Headers, Body, JSONPath, Response Time, Regex
- 🔗 **Variables**: Extraction et templating {{var}} entre steps
- 📝 **Audit Logs**: Traçabilité complète des opérations
- 🎯 **RBAC**: Admin, User, Viewer roles

**Stats**: 43 endpoints API, 11 modèles DB, ~4800 lignes TypeScript, 10/10 tests passing

### ✅ Frontend React (100% implémenté)

- 🎨 **Interface moderne** : React 18 + TailwindCSS + Vite
- 🔐 **Authentication UI** : Login avec JWT auto-refresh
- 📊 **Dashboard** : Stats en temps réel et actions rapides
- 🔧 **Applications Management** : CRUD complet avec health checks
- 🧪 **Test Suites Editor** : Éditeur visuel de steps avec drag & drop
- ▶️ **Executions Viewer** : Monitoring temps réel avec auto-refresh
- 🔑 **Credentials Manager** : Interface sécurisée avec décryptage on-demand
- 📝 **Test Detail Page** : Éditeur JSON de configuration steps
- 📊 **Execution Detail Page** : Résultats détaillés step par step avec screenshots
- 🎯 **Responsive Design** : Mobile-first avec sidebar adaptative

**Stats**: 7 pages, 15+ composants réutilisables, ~3500 lignes React/JSX

### 🚧 À venir

- 🤖 **Intégration Claude (MCP)** : Tests pilotés par IA (Phase 3)
- 📊 **Rapports avancés** : HTML, PDF, JUnit XML (Phase 3)
- 🔄 **CI/CD Ready** : Webhooks et scheduling (Phase 3)

## Quick Start

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+ (via Docker)

### Installation

```bash
# Cloner le repository
git clone git@github.com:secuaas/app-tester.git
cd app-tester

# Démarrer les services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Backend
cd backend
npm install
cp .env.example .env

# Générer le master key (32 bytes base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Mettre cette valeur dans .env comme MASTER_KEY

# Générer Prisma client
npm run prisma:generate

# Créer la base de données
npx prisma db push
npx prisma generate

# Créer l'utilisateur admin
npx ts-node scripts/create-admin.ts

# Démarrer le serveur de développement
npm run dev
```

Le backend sera disponible sur `http://localhost:3000`.
La documentation API (Swagger) sur `http://localhost:3000/docs`.

**Credentials admin par défaut:**
- Email: `admin@secuaas.ca`
- Password: `TestForge2026!`

## Tests

Pour tester l'API complète:

```bash
bash scripts/test-api.sh
```

Ce script teste tous les endpoints principaux et valide:
- Authentication (JWT)
- Applications & Environments CRUD
- Credentials chiffrés (AES-256-GCM)
- Test Suites avec assertions
- Execution engine avec JSONPlaceholder API
- Export YAML
- Health monitoring

Résultat attendu: **10/10 tests passing ✅**

### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # Configurer VITE_API_URL si nécessaire
npm run dev
```

Le frontend sera disponible sur `http://localhost:5173`.

**Credentials par défaut** (après création admin backend):
- Email: `admin@secuaas.ca`
- Password: `TestForge2026!`

**Pages disponibles:**
- `/` - Dashboard avec stats et actions rapides
- `/applications` - Gestion des applications
- `/tests` - Liste des test suites
- `/tests/:id` - Éditeur de test avec steps
- `/executions` - Historique d'exécutions
- `/executions/:id` - Détails d'exécution avec résultats
- `/credentials` - Gestion sécurisée des credentials

## Architecture

```
app-tester/
├── backend/          # API Fastify + TypeScript
│   ├── src/
│   │   ├── modules/  # Modules métier (Auth, Apps, Tests, Exec, Creds)
│   │   ├── engine/   # Moteur d'exécution asynchrone
│   │   ├── common/   # Utils, middleware, types
│   │   └── config/   # Configuration et validation
│   ├── prisma/       # Schema DB (11 models)
│   └── scripts/      # Scripts d'administration
├── frontend/         # React 18 + Vite + TailwindCSS
│   ├── src/
│   │   ├── pages/        # 7 pages principales
│   │   ├── components/   # Composants réutilisables
│   │   ├── contexts/     # Auth context avec JWT
│   │   ├── services/     # API client Axios
│   │   └── hooks/        # Custom React hooks
│   └── public/       # Assets statiques
├── docs/             # Documentation technique
└── deploy/           # Kubernetes manifests (à venir)
```

## Documentation

- [PRD - Vision et Spécifications](./01-PRD-Vision-Specifications.md)
- [Architecture Technique](./02-Architecture-Technique.md)
- [Spécification API](./03-API-Specification.md)
- [Guide de Sécurité](./04-Security-Guide.md)
- [Guide d'Intégration](./05-Integration-Guide.md)

## Développement

### Scripts disponibles

```bash
npm run dev          # Développement avec hot-reload
npm run build        # Build production
npm run start        # Démarrer en production
npm run prisma:studio # UI Prisma pour la DB
npm test             # Tests unitaires
```

### Workflow Git

1. Créer une branche feature: `git checkout -b feature/nom-feature`
2. Commiter avec messages conventionnels
3. Push et créer une Pull Request
4. Attendre review et tests CI
5. Merge après approbation

## Roadmap

### Phase 1 : Backend API (✅ 100% TERMINÉE)
- [x] Setup projet & architecture
- [x] Schéma DB et Prisma (11 models)
- [x] Configuration backend
- [x] Authentification JWT/API Keys
- [x] CRUD Applications & Environments
- [x] CRUD Tests avec Import/Export YAML
- [x] CRUD Credentials (AES-256-GCM)
- [x] Moteur d'exécution API complet
- [x] Assertions & Variables extraction
- [x] Health monitoring
- [x] 43 endpoints API fonctionnels
- [x] Tests automatisés (10/10 passing)

### Phase 2 : Frontend React (✅ 100% TERMINÉE)
- [x] Setup Vite + React 18 + TailwindCSS
- [x] Authentication flow avec JWT refresh
- [x] Dashboard avec stats temps réel
- [x] Applications management (CRUD + health)
- [x] Test Suites management (liste + éditeur)
- [x] Test Detail avec éditeur de steps
- [x] Executions viewer avec monitoring
- [x] Execution Detail avec résultats step-by-step
- [x] Credentials manager sécurisé
- [x] Composants réutilisables (Modal, Button, Badge)
- [x] Layout responsive avec sidebar
- [x] 7 pages complètes + 15 composants

### Phase 3 : MCP Server & Advanced Features (En cours)
- [ ] MCP Server pour intégration Claude
- [ ] Tests pilotés par IA via prompts
- [ ] Génération automatique de tests
- [ ] Moteur Playwright pour tests E2E web
- [ ] Scheduling & cron jobs
- [ ] Rapports avancés (HTML, PDF, JUnit)
- [ ] Métriques et alerting
- [ ] CI/CD webhooks
- [ ] Tests E2E frontend (Playwright/Cypress)
- [ ] Documentation utilisateur complète

## Support

Pour toute question ou problème :
- GitHub Issues: https://github.com/secuaas/app-tester/issues
- Email: support@secuaas.ca

## License

Proprietary - SecuAAS © 2026
