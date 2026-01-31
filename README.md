# TestForge - Automated Testing Platform

TestForge est une plateforme centralisée de tests automatisés pour applications web et APIs.

## Fonctionnalités Principales

- 🧪 **Tests API** : Requêtes HTTP avec assertions et chaînage
- 🌐 **Tests Web (E2E)** : Tests Playwright pour interfaces web
- 🔐 **Gestion sécurisée des credentials** : Chiffrement AES-256-GCM
- 📊 **Rapports détaillés** : JSON, HTML, PDF, JUnit XML
- 🤖 **Intégration Claude (MCP)** : Tests pilotés par IA
- 🔄 **CI/CD Ready** : API REST pour intégration pipelines

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
npm run prisma:migrate

# Démarrer le serveur de développement
npm run dev
```

Le backend sera disponible sur `http://localhost:3000`.
La documentation API (Swagger) sur `http://localhost:3000/docs`.

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

### Phase 1 : MVP (4-6 semaines) - EN COURS
- [x] Setup projet & architecture
- [x] Schéma DB et Prisma
- [x] Configuration backend
- [ ] Authentification JWT/API Keys
- [ ] CRUD Applications & Tests
- [ ] Moteur d'exécution API
- [ ] Rapports JSON/HTML
- [ ] Interface web basique
- [ ] Intégration MCP Claude

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
