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

### 🚧 À venir

- 🌐 **Tests Web (E2E)** : Tests Playwright pour interfaces web (Phase 2)
- 📊 **Rapports avancés** : HTML, PDF, JUnit XML (Phase 2)
- 🤖 **Intégration Claude (MCP)** : Tests pilotés par IA (Phase 2)
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

### Frontend (à venir)

```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
app-tester/
├── backend/          # API Fastify + TypeScript
│   ├── src/
│   │   ├── modules/  # Modules métier
│   │   ├── engine/   # Moteur d'exécution
│   │   ├── common/   # Utils, middleware
│   │   └── config/   # Configuration
│   └── prisma/       # Schema DB
├── frontend/         # React + TailwindCSS (à venir)
├── docs/             # Documentation
└── deploy/           # Kubernetes manifests

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

### Phase 1 : MVP Backend (✅ TERMINÉE)
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
- [ ] Interface web (Phase 2)
- [ ] Intégration MCP Claude (Phase 2)

### Phase 2 : Tests Web (2-3 semaines)
- [ ] Moteur Playwright
- [ ] Actions web et assertions
- [ ] Captures d'écran
- [ ] Éditeur visuel

### Phase 3 : Production Ready (2-3 semaines)
- [ ] Scheduling & cron
- [ ] Métriques et alerting
- [ ] Documentation complète
- [ ] Tests & hardening sécurité

## Support

Pour toute question ou problème :
- GitHub Issues: https://github.com/secuaas/app-tester/issues
- Email: support@secuaas.ca

## License

Proprietary - SecuAAS © 2026
