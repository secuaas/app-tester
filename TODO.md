# TODO - SecuOps Conformité pour app-tester

Ce projet nécessite les modifications suivantes pour être conforme SecuOps:

## ❌ .secuops.yaml manquant

Créer un fichier .secuops.yaml à la racine du projet:

```yaml
name: app-tester
type: fullstack
description: Description du projet
port: 8080

github:
  repo: https://github.com/secuaas/app-tester.git
  branch: main

kubernetes:
  namespace: app-tester
  replicas: 1
```

## ❌ Manifests Kubernetes manquants

Créer deploy/k8s/app-tester.yaml avec:
- Namespace
- Deployment avec resources limits/requests
- Service
- Ingress avec TLS
- Health probes (liveness/readiness)

Utiliser 'secuops new app-tester' pour générer un template

## ❌ .dockerignore manquant

Créer un .dockerignore pour exclure:
- .git/
- node_modules/
- .env
- README.md
- .gitignore

## Commandes pour déployer

Une fois conforme:

```bash
# Build l'image
secuops build --app=app-tester

# Déployer en dev
secuops deploy --app=app-tester --env=k8s-dev

# Déployer en prod
secuops deploy --app=app-tester --env=k8s-prod
```
