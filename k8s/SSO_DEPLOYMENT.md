# Déploiement SSO JumpCloud sur k8s-dev

Guide pour déployer l'authentification SSO JumpCloud sur TestForge.

## Prérequis

1. **Application JumpCloud configurée:**
   - Client ID et Client Secret générés
   - Redirect URI: `https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/callback`
   - Logout Redirect URI: `https://testforge.k8s-dev.secuaas.ca`
   - Scopes activés: `openid`, `profile`, `email`, `groups`
   - Groups claim activé dans l'application

2. **Groupes JumpCloud créés:**
   - `secuaas-super-admins` (ou nom personnalisé)
   - `secuaas-admins` (ou nom personnalisé)
   - `secuaas-users` (ou nom personnalisé)

3. **Utilisateurs assignés aux groupes appropriés**

## Étapes de Déploiement

### 1. Créer les Secrets Kubernetes

Utiliser le script automatisé:

```bash
cd /home/ubuntu/projects/app-tester
./k8s/create-sso-secrets.sh
```

Le script va demander:
- `JUMPCLOUD_CLIENT_ID`: Client ID de l'application JumpCloud
- `JUMPCLOUD_CLIENT_SECRET`: Client Secret de l'application JumpCloud
- `JUMPCLOUD_ORG_ID`: Organization ID JumpCloud
- `JUMPCLOUD_CALLBACK_URL`: URL de callback (défaut: https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/callback)
- `FRONTEND_URL`: URL frontend (défaut: https://testforge.k8s-dev.secuaas.ca)
- `SSO_GROUP_SUPER_ADMIN`: Nom du groupe super-admins (défaut: secuaas-super-admins)
- `SSO_GROUP_ADMIN`: Nom du groupe admins (défaut: secuaas-admins)
- `SSO_GROUP_USER`: Nom du groupe users (défaut: secuaas-users)

Le secret `jumpcloud-sso` sera créé dans le namespace `testforge`.

### 2. Mettre à Jour backend.yaml

Ajouter dans `k8s/backend.yaml` après `envFrom`:

```yaml
spec:
  template:
    spec:
      containers:
        - name: backend
          envFrom:
            - configMapRef:
                name: backend-config
            - secretRef:
                name: backend-secret
            - secretRef:
                name: jumpcloud-sso  # <-- Ajouter cette ligne
```

**OU** ajouter les variables individuellement dans la section `env`:

```yaml
spec:
  template:
    spec:
      containers:
        - name: backend
          env:
            - name: JUMPCLOUD_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: JUMPCLOUD_CLIENT_ID
            - name: JUMPCLOUD_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: JUMPCLOUD_CLIENT_SECRET
            - name: JUMPCLOUD_ORG_ID
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: JUMPCLOUD_ORG_ID
            - name: JUMPCLOUD_CALLBACK_URL
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: JUMPCLOUD_CALLBACK_URL
            - name: FRONTEND_URL
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: FRONTEND_URL
            - name: SSO_GROUP_SUPER_ADMIN
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: SSO_GROUP_SUPER_ADMIN
            - name: SSO_GROUP_ADMIN
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: SSO_GROUP_ADMIN
            - name: SSO_GROUP_USER
              valueFrom:
                secretKeyRef:
                  name: jumpcloud-sso
                  key: SSO_GROUP_USER
```

### 3. Mettre à Jour frontend.yaml

Ajouter dans `k8s/frontend.yaml` dans la section `env` du container frontend:

```yaml
spec:
  template:
    spec:
      containers:
        - name: frontend
          env:
            - name: VITE_SSO_ENABLED
              value: "true"
```

### 4. Rebuild les Images Docker

```bash
secuops build --app=testforge --env=k8s-dev
```

Cette commande va:
1. Builder l'image backend avec les nouveaux services SSO
2. Builder l'image frontend avec le support SSO
3. Pusher les images vers Harbor OVH

### 5. Appliquer les Changements Kubernetes

```bash
# Appliquer les nouveaux manifests
secuops kubectl --env=k8s-dev -- apply -f k8s/backend.yaml
secuops kubectl --env=k8s-dev -- apply -f k8s/frontend.yaml

# OU redémarrer les deployments pour pull les nouvelles images
secuops kubectl --env=k8s-dev -- rollout restart deployment/backend -n testforge
secuops kubectl --env=k8s-dev -- rollout restart deployment/frontend -n testforge
```

### 6. Vérifier le Déploiement

```bash
# Vérifier les pods
secuops kubectl --env=k8s-dev -- get pods -n testforge

# Vérifier les logs backend
secuops kubectl --env=k8s-dev -- logs -f deployment/backend -n testforge

# Vérifier les secrets
secuops kubectl --env=k8s-dev -- get secret jumpcloud-sso -n testforge
```

### 7. Tester l'Authentification SSO

1. Accéder à https://testforge.k8s-dev.secuaas.ca
2. Cliquer sur "Se connecter avec JumpCloud SSO"
3. S'authentifier sur JumpCloud
4. Vérifier la redirection vers TestForge
5. Si multi-rôles, vérifier la page de sélection de rôle
6. Vérifier l'accès à l'application

**Tester le flow complet:**
```bash
# Login
curl -v -L https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/login

# Session (avec cookie)
curl -v --cookie-jar cookies.txt https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/session

# Logout
curl -v -L --cookie cookies.txt https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/logout
```

## Rollback en Cas de Problème

Si SSO ne fonctionne pas:

```bash
# 1. Désactiver SSO frontend
secuops kubectl --env=k8s-dev -- set env deployment/frontend -n testforge VITE_SSO_ENABLED=false

# 2. Redémarrer frontend
secuops kubectl --env=k8s-dev -- rollout restart deployment/frontend -n testforge

# 3. L'authentification JWT locale reste disponible
```

## Troubleshooting

### Erreur "Invalid or expired state parameter"
- Le paramètre PKCE a expiré (> 10 min)
- Vérifier que Redis est accessible
- Recommencer le flow SSO

### Erreur "User has no roles assigned"
- L'utilisateur n'est dans aucun groupe JumpCloud configuré
- Vérifier les groupes dans JumpCloud Admin Console
- Assigner l'utilisateur à au moins un groupe

### Cookie non défini
- Vérifier `CORS_ORIGIN` dans backend-config
- Vérifier que frontend envoie `credentials: true`
- Vérifier que `FRONTEND_URL` correspond au domaine frontend

### ID token validation failed
- Vérifier `JUMPCLOUD_CLIENT_ID` dans le secret
- Vérifier la connectivité réseau vers `oauth.id.jumpcloud.com`
- Vérifier les logs backend pour details

### Backend ne démarre pas
```bash
# Vérifier les logs
secuops kubectl --env=k8s-dev -- logs deployment/backend -n testforge --tail=100

# Vérifier les secrets
secuops kubectl --env=k8s-dev -- describe secret jumpcloud-sso -n testforge

# Vérifier les variables d'environnement du pod
secuops kubectl --env=k8s-dev -- exec -it deployment/backend -n testforge -- env | grep JUMPCLOUD
```

## Variables d'Environnement SSO

| Variable | Description | Exemple |
|----------|-------------|---------|
| `JUMPCLOUD_CLIENT_ID` | Client ID JumpCloud | `08c54a97-ee91-488f-b327-82be47ea93ad` |
| `JUMPCLOUD_CLIENT_SECRET` | Client Secret JumpCloud | `your-secret-here` |
| `JUMPCLOUD_ORG_ID` | Organization ID JumpCloud | `69497392d5650768670ea4de` |
| `JUMPCLOUD_CALLBACK_URL` | URL callback OAuth | `https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/callback` |
| `FRONTEND_URL` | URL frontend pour redirections | `https://testforge.k8s-dev.secuaas.ca` |
| `SSO_GROUP_SUPER_ADMIN` | Nom groupe super-admins | `secuaas-super-admins` |
| `SSO_GROUP_ADMIN` | Nom groupe admins | `secuaas-admins` |
| `SSO_GROUP_USER` | Nom groupe users | `secuaas-users` |
| `VITE_SSO_ENABLED` | Activer SSO frontend | `true` ou `false` |

## Sécurité

- Les secrets sont stockés dans Kubernetes Secrets (base64 encoded)
- Les cookies de session sont `httpOnly`, `secure`, `sameSite: strict`
- PKCE utilisé pour protection contre interception code
- ID tokens validés cryptographiquement avec JWKS
- Tokens révoqués dans JumpCloud lors du logout
- Sessions Redis avec TTL 24h

## Monitoring

Vérifier les événements SSO dans les logs backend:

```bash
secuops kubectl --env=k8s-dev -- logs -f deployment/backend -n testforge | grep AUDIT
```

Événements loggés:
- `LOGIN_INITIATED` - Début du flow SSO
- `LOGIN_SUCCESS` - Connexion réussie
- `LOGIN_FAILED` - Échec connexion
- `LOGOUT` - Déconnexion
- `ROLE_SELECTED` - Sélection de rôle
- `TOKEN_REFRESH` - Refresh token
- `SESSION_REVOKED` - Révocation session

## Support

Pour plus de détails, voir:
- `backend/SSO_INTEGRATION.md` - Documentation technique SSO
- `backend/.env.example` - Variables d'environnement complètes
- `frontend/.env.example` - Variables frontend

---

**Auteur:** Claude AI
**Date:** 2026-02-05
**Version:** 0.2.0
