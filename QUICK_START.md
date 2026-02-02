# TestForge - Quick Start Guide

## 🚀 Accès à l'Application

### URLs de l'environnement k8s-dev

- **Frontend**: https://testforge.k8s-dev.secuaas.ca
- **Backend API**: https://testforge-backend.k8s-dev.secuaas.ca/api/v1
- **API Documentation**: https://testforge-backend.k8s-dev.secuaas.ca/docs
- **Health Check**: https://testforge-backend.k8s-dev.secuaas.ca/health
- **Prometheus Metrics**: https://testforge-backend.k8s-dev.secuaas.ca/metrics

⏳ **Note**: Les certificats SSL sont en cours d'émission (1-5 minutes). Utilisez HTTP temporairement si HTTPS ne fonctionne pas encore.

## 🔐 Première Connexion

### 1. Créer l'utilisateur administrateur

```bash
cd /home/ubuntu/projects/app-tester/k8s
./create-admin.sh
```

Credentials par défaut (modifiables):
- Email: `admin@secuaas.ca`
- Password: `TestForge2026!`
- Role: `ADMIN`

### 2. Se connecter à l'interface

1. Accédez à https://testforge.k8s-dev.secuaas.ca
2. Entrez les credentials admin
3. Vous serez redirigé vers le dashboard

## 📝 Premier Test

### Créer une application de test

1. Cliquez sur "Applications" dans le menu
2. Cliquez sur "New Application"
3. Remplissez:
   - Name: `Demo API`
   - Type: `API`
   - Description: `Test application`

### Ajouter un environnement

1. Ouvrez l'application créée
2. Cliquez sur "Environments"
3. Ajoutez un environnement:
   - Name: `dev`
   - Base URL: `https://jsonplaceholder.typicode.com`

### Créer un test suite

1. Cliquez sur "Tests" → "New Test Suite"
2. Remplissez:
   - Name: `Get Users Test`
   - Application: `Demo API`
   - Type: `API`

### Ajouter des steps de test

**Step 1: Get Users**
```json
{
  "endpoint": "/users",
  "method": "GET",
  "assertions": [
    {
      "type": "status_code",
      "expected": 200
    },
    {
      "type": "json_path",
      "path": "$[0].name",
      "expected": "exists"
    }
  ]
}
```

**Step 2: Get User by ID**
```json
{
  "endpoint": "/users/1",
  "method": "GET",
  "assertions": [
    {
      "type": "status_code",
      "expected": 200
    },
    {
      "type": "json_path",
      "path": "$.id",
      "expected": 1
    }
  ]
}
```

### Exécuter le test

1. Cliquez sur "Run Test"
2. Sélectionnez l'environnement `dev`
3. Observez l'exécution en temps réel
4. Consultez les résultats détaillés

## 🔧 Commandes Utiles

### Vérifier le statut du déploiement

```bash
# Tous les pods
secuops kubectl --env=k8s-dev -- get pods -n testforge

# Tous les services
secuops kubectl --env=k8s-dev -- get svc -n testforge

# Ingress et certificats SSL
secuops kubectl --env=k8s-dev -- get ingress,certificate -n testforge
```

### Voir les logs

```bash
# Backend
secuops kubectl --env=k8s-dev -- logs -f deployment/backend -n testforge

# Frontend
secuops kubectl --env=k8s-dev -- logs -f deployment/frontend -n testforge

# PostgreSQL
secuops kubectl --env=k8s-dev -- logs -f statefulset/postgres -n testforge
```

### Redémarrer un service

```bash
# Backend
secuops kubectl --env=k8s-dev -- rollout restart deployment/backend -n testforge

# Frontend
secuops kubectl --env=k8s-dev -- rollout restart deployment/frontend -n testforge
```

### Rebuild et redeploy après modifications

```bash
# 1. Commit vos changements
git add -A
git commit -m "Your changes"
git push

# 2. Rebuild les images
secuops build --app=testforge --env=k8s-dev

# 3. Restart pour pull les nouvelles images
secuops kubectl --env=k8s-dev -- rollout restart deployment/backend -n testforge
secuops kubectl --env=k8s-dev -- rollout restart deployment/frontend -n testforge
```

## 🗄️ Accès à la Base de Données

### Port-forward PostgreSQL

```bash
secuops kubectl --env=k8s-dev -- port-forward -n testforge statefulset/postgres 5432:5432
```

Puis connectez-vous avec:
- Host: `localhost`
- Port: `5432`
- Database: `testforge`
- User: `testforge`
- Password: `testforge_k8s_password_change_me`

### Prisma Studio (en local)

```bash
cd backend
npx prisma studio
```

## 📊 MinIO (Object Storage)

### Accéder à la console MinIO

```bash
secuops kubectl --env=k8s-dev -- port-forward -n testforge deployment/minio 9001:9001
```

Ouvrez http://localhost:9001:
- Username: `testforge`
- Password: `testforge_minio_k8s_password`

## 🔍 Troubleshooting

### Pods en erreur

```bash
# Décrire le pod
secuops kubectl --env=k8s-dev -- describe pod <pod-name> -n testforge

# Voir les logs
secuops kubectl --env=k8s-dev -- logs <pod-name> -n testforge

# Logs du conteneur précédent (si crashed)
secuops kubectl --env=k8s-dev -- logs <pod-name> -n testforge --previous
```

### Certificat SSL non émis

```bash
# Vérifier le statut
secuops kubectl --env=k8s-dev -- get certificate -n testforge

# Voir les challenges
secuops kubectl --env=k8s-dev -- get challenges -n testforge

# Logs de cert-manager
secuops kubectl --env=k8s-dev -- logs -n cert-manager deployment/cert-manager
```

### Backend ne démarre pas

Vérifiez:
1. PostgreSQL est bien running
2. Les secrets sont corrects
3. MASTER_KEY est bien base64 et 32 bytes

```bash
# Tester la connexion PG
secuops kubectl --env=k8s-dev -- exec -it deployment/backend -n testforge -- nc -zv postgres 5432

# Vérifier les secrets
secuops kubectl --env=k8s-dev -- get secret backend-secret -n testforge -o yaml
```

## 📚 Documentation Complète

- **Architecture**: Voir `DEPLOYMENT_STATUS.md`
- **API Reference**: https://testforge-backend.k8s-dev.secuaas.ca/docs
- **Kubernetes Manifests**: Dossier `k8s/`
- **Configuration secuops**: `secuops.yaml`

## 🚀 Déploiement en Production

Quand vous êtes prêt pour la production:

```bash
# 1. Build pour production
secuops build --app=testforge --env=k8s-prod

# 2. Mettre à jour les secrets de production dans k8s/backend.yaml
# 3. Déployer
secuops kubectl --env=k8s-prod -- apply -f k8s/

# 4. Vérifier
secuops kubectl --env=k8s-prod -- get pods -n testforge
```

⚠️ **Important pour la production:**
- Changez tous les passwords et secrets
- Configurez les backups PostgreSQL
- Configurez le monitoring (Prometheus/Grafana)
- Configurez les alertes
- Augmentez les replicas (backend: 2+, frontend: 2+)
- Configurez le horizontal pod autoscaling
- Mettez en place une stratégie de backup MinIO

## 💡 Astuces

### Tests en local avant déploiement

```bash
cd /home/ubuntu/projects/app-tester
docker-compose up -d
```

Accès local:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- MinIO: http://localhost:9011

### Variables d'environnement pour le développement local

Créez `.env` dans `backend/`:
```env
DATABASE_URL=postgresql://testforge:testforge@localhost:5432/testforge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_local_jwt_secret_32_bytes_min
JWT_REFRESH_SECRET=your_refresh_secret_32_bytes
MASTER_KEY=<base64_32_bytes>
NODE_ENV=development
PORT=3000
```

---

**Besoin d'aide?** Consultez les logs et la documentation, ou contactez l'équipe DevOps.
