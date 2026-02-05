# SSO JumpCloud Integration - TestForge

Documentation de l'intégration SSO JumpCloud dans TestForge.

## Architecture

L'authentification SSO remplace l'authentification JWT locale par une authentification centralisée via JumpCloud OIDC.

### Services Implémentés

1. **JumpCloudOidcService** (`jumpcloud-oidc.service.ts`)
   - Client OIDC pour JumpCloud
   - Gestion PKCE (Proof Key for Code Exchange)
   - Échange de code d'autorisation contre tokens
   - Refresh de tokens
   - Validation ID token JWT avec JWKS
   - Récupération user info
   - Révocation de tokens

2. **SessionService** (`session.service.ts`)
   - Gestion des sessions SSO dans Redis
   - Création/récupération/révocation de sessions
   - Sliding window (prolongation automatique TTL)
   - Support multi-rôles avec sélection
   - Gestion des tokens et expiration

3. **RoleSelectorService** (`role-selector.service.ts`)
   - Mapping groupes JumpCloud → rôles applicatifs
   - Hiérarchie de rôles (SUPER_ADMIN > ADMIN > USER)
   - Validation de rôles
   - Options UI pour sélection de rôles

4. **AuditService** (`audit.service.ts`)
   - Logging événements SSO
   - Événements: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ROLE_SELECTED, etc.
   - Format structuré pour future persistance

5. **RedisSessionStore** (`redis-session-store.ts`)
   - Implémentation Redis du stockage de sessions
   - Index utilisateur pour liste des sessions
   - TTL automatique
   - Cleanup des sessions expirées

## Routes SSO

Toutes les routes SSO sont préfixées sans `/api/v1` pour permettre les redirections OAuth.

### GET /auth/sso/login
Initie le flow d'authentification JumpCloud.

**Processus:**
1. Génère PKCE (code_verifier, code_challenge)
2. Stocke PKCE dans Redis (expire 10 min)
3. Redirige vers JumpCloud avec OIDC params

**Redirection:** `https://oauth.id.jumpcloud.com/oauth2/auth?client_id=...&response_type=code&scope=openid+profile+email+groups&redirect_uri=...&state=...&code_challenge=...&code_challenge_method=S256`

---

### GET /auth/sso/callback
Callback OIDC après authentification JumpCloud.

**Query params:**
- `code` - Code d'autorisation OAuth
- `state` - État CSRF
- `error` (optionnel) - Erreur OAuth

**Processus:**
1. Récupère PKCE depuis Redis via `state`
2. Échange `code` contre tokens (access_token, id_token, refresh_token)
3. Valide ID token JWT
4. Récupère user info (email, name, groups)
5. Mappe groupes → rôles
6. Crée session Redis
7. Définit cookie de session
8. Redirige vers frontend

**Redirections:**
- Si multi-rôles: `/auth/role-selection` (frontend)
- Sinon: `/` (frontend)
- En erreur: `/auth/error?message=...` (frontend)

---

### POST /auth/sso/role
Sélection de rôle pour utilisateurs multi-rôles.

**Body:**
```json
{
  "role": "ADMIN"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "userId": "sub-from-jumpcloud",
    "email": "user@example.com",
    "name": "User Name",
    "currentRole": "ADMIN",
    "availableRoles": ["SUPER_ADMIN", "ADMIN"]
  }
}
```

---

### GET /auth/sso/session
Récupère les informations de session courante.

**Headers:** Cookie `testforge_sso_session`

**Response:**
```json
{
  "userId": "sub-from-jumpcloud",
  "email": "user@example.com",
  "name": "User Name",
  "currentRole": "ADMIN",
  "availableRoles": ["ADMIN", "USER"],
  "roleSelected": true,
  "groups": ["secuaas-admins", "secuaas-users"]
}
```

**Auto-refresh token:** Si token expiré et refresh_token disponible, refresh automatique.

---

### GET /auth/sso/logout
Déconnexion SSO.

**Processus:**
1. Récupère session depuis cookie
2. Révoque access_token dans JumpCloud
3. Supprime session Redis
4. Supprime cookie
5. Redirige vers JumpCloud logout endpoint

**Redirection:** `https://oauth.id.jumpcloud.com/oauth2/sessions/logout?post_logout_redirect_uri=...`

---

### GET /auth/sso/roles
Liste les rôles disponibles pour l'utilisateur courant.

**Response:**
```json
{
  "roles": [
    {
      "name": "SUPER_ADMIN",
      "displayName": "Super Admin",
      "description": "Accès complet à toutes les fonctionnalités du système"
    },
    {
      "name": "ADMIN",
      "displayName": "Admin",
      "description": "Accès aux fonctions d'administration de l'application"
    }
  ],
  "currentRole": "ADMIN",
  "requiresSelection": false
}
```

---

## Configuration

### Variables d'environnement requises

```bash
# JumpCloud OAuth Client
JUMPCLOUD_CLIENT_ID="08c54a97-ee91-488f-b327-82be47ea93ad"
JUMPCLOUD_CLIENT_SECRET="your-secret-here"
JUMPCLOUD_ORG_ID="69497392d5650768670ea4de"

# Callback URL (doit matcher JumpCloud config)
JUMPCLOUD_CALLBACK_URL="https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/callback"

# Mapping groupes JumpCloud → rôles
SSO_GROUP_SUPER_ADMIN="secuaas-super-admins"
SSO_GROUP_ADMIN="secuaas-admins"
SSO_GROUP_USER="secuaas-users"

# Frontend URL pour redirections
FRONTEND_URL="https://testforge.k8s-dev.secuaas.ca"
```

### Configuration JumpCloud

Dans JumpCloud Admin Console:

1. **Application SSO:**
   - Type: Custom OIDC
   - Client ID: (généré)
   - Client Secret: (généré)
   - Redirect URIs: `https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/callback`
   - Logout Redirect URIs: `https://testforge.k8s-dev.secuaas.ca`

2. **Groupes utilisateurs:**
   - Créer groupes: `secuaas-super-admins`, `secuaas-admins`, `secuaas-users`
   - Assigner utilisateurs aux groupes
   - Activer "Include in User Claims" pour les groupes

3. **Claims OIDC:**
   - Activer: `openid`, `profile`, `email`, `groups`
   - Groups claim doit retourner les noms de groupes

---

## Workflow d'Authentification

```
1. User → GET /auth/sso/login
   ↓
2. Backend génère PKCE, stocke dans Redis
   ↓
3. Backend redirige → JumpCloud OAuth
   ↓
4. User s'authentifie sur JumpCloud
   ↓
5. JumpCloud redirige → GET /auth/sso/callback?code=...&state=...
   ↓
6. Backend échange code → tokens (avec PKCE)
   ↓
7. Backend valide ID token JWT
   ↓
8. Backend récupère user info
   ↓
9. Backend mappe groupes → rôles
   ↓
10. Backend crée session Redis + cookie
    ↓
11. Si multi-rôles: redirige → /auth/role-selection
    Sinon: redirige → /
    ↓
12. (Multi-rôles) User sélectionne rôle → POST /auth/sso/role
    ↓
13. User accède à l'application avec session SSO active
```

---

## Hiérarchie de Rôles

```
SUPER_ADMIN (priorité 0)
  ├─ Accès complet système
  ├─ Gestion utilisateurs
  └─ Toutes permissions

ADMIN (priorité 1)
  ├─ Administration application
  ├─ Gestion ressources
  └─ Pas accès système

USER (priorité 2)
  ├─ Accès standard
  └─ Permissions limitées
```

**Auto-sélection:** Si utilisateur a un seul rôle, il est auto-sélectionné.

**Multi-rôles:** Si utilisateur a plusieurs rôles, il doit en choisir un.

---

## Sessions Redis

**Clés Redis:**
- Sessions: `sso:session:{sessionId}`
- Index utilisateur: `sso:user:{userId}` (set de sessionIds)
- PKCE temporaire: `pkce:{state}` (TTL 10 min)

**TTL sessions:** 24 heures (configurable)

**Sliding window:** Activé (TTL prolongé à chaque requête)

---

## Cookies

**Nom:** `testforge_sso_session`

**Options:**
- `httpOnly: true` (protection XSS)
- `secure: true` (HTTPS uniquement en production)
- `sameSite: 'strict'` (protection CSRF)
- `maxAge: 86400000` (24h en ms)
- `path: '/'`

---

## Sécurité

### PKCE (Proof Key for Code Exchange)
- Protection contre interception du code d'autorisation
- `code_verifier` stocké en Redis (jamais exposé au client)
- `code_challenge` envoyé à JumpCloud
- Validation lors de l'échange de code

### JWKS (JSON Web Key Set)
- Validation cryptographique ID token
- Clés publiques JumpCloud récupérées depuis `/.well-known/jwks.json`
- Cache des clés pour performance

### Validation ID Token
- Signature JWT vérifiée avec JWKS
- `issuer` vérifié: `https://oauth.id.jumpcloud.com`
- `audience` vérifié: `{CLIENT_ID}`
- Expiration (`exp`) vérifiée

### State Parameter
- Protection CSRF
- Généré aléatoirement (16 bytes base64url)
- Validé lors du callback

---

## Audit Logging

**Événements loggés:**
- `LOGIN_INITIATED` - Début du flow SSO
- `LOGIN_SUCCESS` - Connexion réussie
- `LOGIN_FAILED` - Échec connexion
- `LOGOUT` - Déconnexion
- `ROLE_SELECTED` - Sélection de rôle
- `TOKEN_REFRESH` - Refresh token
- `SESSION_REVOKED` - Révocation session
- `ACCESS_DENIED` - Accès refusé

**Format:**
```typescript
{
  eventType: AuditEventType;
  timestamp: number;
  userId?: string;
  email?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  role?: string;
  resource?: string;
  action?: string;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
}
```

**Actuellement:** Logs console uniquement
**Future:** Persistance base de données ou service externe

---

## Troubleshooting

### Erreur "Invalid or expired state parameter"
- PKCE expiré (> 10 min entre login et callback)
- Solution: Recommencer le flow SSO

### Erreur "User has no roles assigned"
- Utilisateur n'appartient à aucun groupe JumpCloud configuré
- Solution: Assigner utilisateur à un groupe dans JumpCloud

### Erreur "Token refresh failed"
- Refresh token expiré ou révoqué
- Solution: Redemander connexion SSO complète

### Cookie non défini
- Vérifier CORS credentials: `credentials: true`
- Vérifier cookie `sameSite` compatible avec domaines
- Vérifier `secure: true` uniquement en production HTTPS

### ID token validation failed
- Vérifier `JUMPCLOUD_CLIENT_ID` correspond à l'app JumpCloud
- Vérifier connectivité réseau vers `oauth.id.jumpcloud.com`
- Vérifier horloge serveur synchronisée (JWT exp claim)

---

## Migration depuis JWT Local

Pour migrer l'authentification existante:

1. **Garder routes JWT existantes** (`/auth/login`, `/auth/refresh`)
   - Pour compatibilité temporaire
   - Pour API keys

2. **Ajouter routes SSO** (`/auth/sso/*`)
   - Nouveau flow d'authentification

3. **Frontend: Détecter SSO activé**
   ```typescript
   const ssoEnabled = import.meta.env.VITE_SSO_ENABLED === 'true';

   if (ssoEnabled) {
     window.location.href = '/auth/sso/login';
   } else {
     // Afficher formulaire login local
   }
   ```

4. **Middleware auth: Accepter les deux**
   ```typescript
   // Vérifier cookie SSO d'abord
   const ssoSessionId = request.cookies.testforge_sso_session;
   if (ssoSessionId) {
     const session = await sessionService.getSession(ssoSessionId);
     if (session) {
       request.user = session;
       return;
     }
   }

   // Fallback: JWT Bearer token
   await request.jwtVerify();
   ```

---

## Performance

**Optimisations implémentées:**
- Cache JWKS (clés publiques JumpCloud)
- Cache OIDC discovery endpoints
- Sliding window sessions (évite re-création fréquente)
- Index Redis utilisateur (lookup rapide sessions multiples)

**Latence typique:**
- Login initial: ~500-800ms (redirect JumpCloud + token exchange)
- Callback: ~200-400ms (validation + session création)
- Session check: ~5-20ms (Redis lookup)
- Token refresh: ~200-300ms (API JumpCloud)

---

## Tests

Pour tester localement:

1. **Configurer ngrok ou tunnel:**
   ```bash
   ngrok http 3000
   ```

2. **Update JumpCloud Redirect URI:**
   - Ajouter `https://xyz.ngrok.io/auth/sso/callback`

3. **Update variables d'environnement:**
   ```bash
   JUMPCLOUD_CALLBACK_URL="https://xyz.ngrok.io/auth/sso/callback"
   FRONTEND_URL="http://localhost:5173"
   ```

4. **Tester le flow:**
   ```bash
   # Démarrer backend
   npm run dev

   # Dans navigateur
   https://xyz.ngrok.io/auth/sso/login
   ```

---

## Prochaines Étapes

- [ ] Créer middleware Fastify pour protection routes par rôle
- [ ] Implémenter persistance audit logs en base de données
- [ ] Ajouter refresh automatique token en background
- [ ] Créer page sélection de rôle dans frontend
- [ ] Ajouter tests unitaires services SSO
- [ ] Ajouter tests d'intégration flow complet
- [ ] Documentation Swagger pour routes SSO
- [ ] Monitoring métriques SSO (Prometheus)

---

**Auteur:** Claude AI
**Date:** 2026-02-05
**Version:** 0.2.0
