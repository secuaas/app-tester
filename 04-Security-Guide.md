# TestForge - Guide de Sécurité

## Architecture de Sécurité et Gestion des Credentials

**Version:** 1.0  
**Date:** 30 janvier 2026  
**Classification:** Interne

---

## 1. Vue d'Ensemble de la Sécurité

### 1.1 Principes de Sécurité

TestForge manipule des informations sensibles (credentials, tokens, accès aux applications). La sécurité est intégrée à tous les niveaux :

1. **Defense in Depth** : Plusieurs couches de protection
2. **Least Privilege** : Accès minimal nécessaire
3. **Zero Trust** : Vérification systématique de chaque requête
4. **Encryption Everywhere** : Chiffrement en transit et au repos
5. **Audit Everything** : Traçabilité complète des actions

### 1.2 Modèle de Menaces

| Menace | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Fuite de credentials | Critique | Moyenne | Chiffrement AES-256, accès audité |
| Injection SQL | Haute | Basse | ORM Prisma, requêtes paramétrées |
| XSS/CSRF | Moyenne | Moyenne | CSP, tokens CSRF, sanitization |
| Accès non autorisé | Haute | Moyenne | RBAC, JWT, API Keys |
| MITM | Haute | Basse | TLS 1.3 obligatoire |
| Brute force | Moyenne | Haute | Rate limiting, lockout |

---

## 2. Authentification

### 2.1 JWT Tokens

**Configuration :**

```typescript
const jwtConfig = {
  algorithm: 'RS256',           // Asymétrique pour validation distribuée
  accessTokenExpiry: '1h',      // Durée courte
  refreshTokenExpiry: '7d',     // Rotation régulière
  issuer: 'testforge.secuaas.ca',
  audience: 'testforge-api'
};
```

**Structure du token :**

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2026-01"
  },
  "payload": {
    "sub": "user_abc123",
    "email": "admin@secuaas.ca",
    "name": "Olivier",
    "role": "ADMIN",
    "permissions": ["admin:*"],
    "iat": 1706630400,
    "exp": 1706634000,
    "iss": "testforge.secuaas.ca",
    "aud": "testforge-api"
  }
}
```

**Rotation des clés :**

- Nouvelle paire de clés générée tous les 90 jours
- Ancienne clé reste valide 30 jours après rotation
- Identifiée par `kid` dans le header

### 2.2 API Keys

**Format :**

```
tf_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
│  │    │
│  │    └── 32 caractères aléatoires (base62)
│  └─────── Environnement (live/test)
└────────── Préfixe TestForge
```

**Stockage sécurisé :**

```typescript
// La clé n'est jamais stockée en clair
async function createApiKey(userId: string, name: string): Promise<{ key: string, id: string }> {
  // Génération de la clé
  const randomBytes = crypto.randomBytes(24);
  const key = `tf_live_${base62.encode(randomBytes)}`;
  
  // Hash pour stockage
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12); // Pour identification
  
  // Stockage en base
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      prefix,
      permissions: ['tests:execute', 'executions:read']
    }
  });
  
  // La clé complète n'est retournée qu'une fois
  return { key, id: apiKey.id };
}

// Vérification
async function verifyApiKey(key: string): Promise<ApiKey | null> {
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  return prisma.apiKey.findUnique({ where: { keyHash } });
}
```

### 2.3 Rate Limiting

```typescript
const rateLimits = {
  // Par IP non authentifiée
  anonymous: {
    windowMs: 60 * 1000,  // 1 minute
    max: 20
  },
  
  // Par utilisateur authentifié
  authenticated: {
    windowMs: 60 * 1000,
    max: 1000
  },
  
  // Pour les endpoints d'exécution
  execution: {
    windowMs: 60 * 1000,
    max: 100
  },
  
  // Pour l'authentification (anti brute-force)
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,
    blockDuration: 60 * 60 * 1000  // 1 heure après 5 échecs
  }
};
```

---

## 3. Autorisation (RBAC)

### 3.1 Rôles

| Rôle | Description |
|------|-------------|
| `ADMIN` | Accès complet à toutes les fonctionnalités |
| `USER` | Gestion des tests et exécutions, lecture des credentials |
| `VIEWER` | Lecture seule sur les applications et rapports |

### 3.2 Matrice de Permissions

```typescript
const permissionMatrix = {
  ADMIN: {
    applications: ['create', 'read', 'update', 'delete'],
    tests: ['create', 'read', 'update', 'delete', 'execute'],
    credentials: ['create', 'read', 'update', 'delete'],
    executions: ['read', 'cancel'],
    users: ['create', 'read', 'update', 'delete'],
    apiKeys: ['create', 'read', 'delete'],
    settings: ['read', 'update']
  },
  USER: {
    applications: ['read', 'update'],
    tests: ['create', 'read', 'update', 'delete', 'execute'],
    credentials: ['create', 'read'],
    executions: ['read', 'cancel'],
    users: [],
    apiKeys: ['create', 'read', 'delete'], // Ses propres clés
    settings: ['read']
  },
  VIEWER: {
    applications: ['read'],
    tests: ['read'],
    credentials: [],
    executions: ['read'],
    users: [],
    apiKeys: [],
    settings: ['read']
  }
};
```

### 3.3 Middleware d'Autorisation

```typescript
// decorators/authorize.ts
function Authorize(resource: string, action: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const request = args[0];
      const user = request.user;
      
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }
      
      const permissions = permissionMatrix[user.role];
      const allowedActions = permissions[resource] || [];
      
      if (!allowedActions.includes(action)) {
        await auditLog({
          action: `${resource}.${action}.denied`,
          userId: user.id,
          details: { resource, action }
        });
        throw new ForbiddenError(`Permission denied: ${resource}:${action}`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// Utilisation
class ApplicationController {
  @Authorize('applications', 'delete')
  async deleteApplication(req: Request, reply: Reply) {
    // ...
  }
}
```

---

## 4. Chiffrement des Credentials

### 4.1 Architecture de Chiffrement

```
┌─────────────────────────────────────────────────────────────────┐
│                    Credential Encryption Flow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Master Key (32 bytes)                                          │
│  └── Stocké dans: Kubernetes Secret / HashiCorp Vault           │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────┐                    │
│  │           HKDF Key Derivation           │                    │
│  │                                         │                    │
│  │  Input: Master Key + Application ID     │                    │
│  │  Salt: "testforge-credential-v1"        │                    │
│  │  Info: Application ID                   │                    │
│  │  Output: Derived Key (32 bytes)         │                    │
│  └─────────────────────────────────────────┘                    │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────┐                    │
│  │           AES-256-GCM Encryption        │                    │
│  │                                         │                    │
│  │  IV: Random 12 bytes (per credential)   │                    │
│  │  Plaintext: JSON credential data        │                    │
│  │  Output: Ciphertext + Auth Tag (16b)    │                    │
│  └─────────────────────────────────────────┘                    │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────┐                    │
│  │           Database Storage              │                    │
│  │                                         │                    │
│  │  iv: BYTEA (12 bytes)                   │                    │
│  │  encryptedData: BYTEA (ciphertext+tag)  │                    │
│  │  applicationId: VARCHAR                 │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Implémentation

```typescript
// services/encryption.service.ts
import * as crypto from 'crypto';

export class EncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly SALT = 'testforge-credential-v1';
  
  constructor(private readonly masterKey: Buffer) {
    if (masterKey.length !== 32) {
      throw new Error('Master key must be 32 bytes');
    }
  }
  
  /**
   * Dérive une clé spécifique à l'application
   */
  private deriveKey(applicationId: string): Buffer {
    return crypto.hkdfSync(
      'sha256',
      this.masterKey,
      this.SALT,
      applicationId,
      32
    );
  }
  
  /**
   * Chiffre les données d'un credential
   */
  async encrypt(data: object, applicationId: string): Promise<EncryptedCredential> {
    const derivedKey = this.deriveKey(applicationId);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const plaintext = JSON.stringify(data);
    
    const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv, {
      authTagLength: this.AUTH_TAG_LENGTH
    });
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv,
      encryptedData: Buffer.concat([encrypted, authTag])
    };
  }
  
  /**
   * Déchiffre les données d'un credential
   */
  async decrypt(
    encryptedData: Buffer,
    iv: Buffer,
    applicationId: string
  ): Promise<object> {
    const derivedKey = this.deriveKey(applicationId);
    
    // Séparer le ciphertext et l'auth tag
    const authTag = encryptedData.slice(-this.AUTH_TAG_LENGTH);
    const ciphertext = encryptedData.slice(0, -this.AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv, {
      authTagLength: this.AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }
}

interface EncryptedCredential {
  iv: Buffer;
  encryptedData: Buffer;
}
```

### 4.3 Gestion du Master Key

**Option 1 : Kubernetes Secret (recommandé pour MVP)**

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: testforge-master-key
  namespace: testforge
type: Opaque
data:
  master-key: <base64-encoded-32-bytes>
```

```typescript
// Chargement
const masterKey = Buffer.from(process.env.MASTER_KEY, 'base64');
```

**Option 2 : HashiCorp Vault (recommandé pour production)**

```typescript
import * as vault from 'node-vault';

async function getMasterKey(): Promise<Buffer> {
  const client = vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN
  });
  
  const { data } = await client.read('secret/data/testforge/master-key');
  return Buffer.from(data.data.value, 'base64');
}
```

### 4.4 Rotation des Clés

```typescript
// Processus de rotation
async function rotateMasterKey(oldKey: Buffer, newKey: Buffer): Promise<void> {
  const credentials = await prisma.credential.findMany();
  
  for (const cred of credentials) {
    // Déchiffrer avec l'ancienne clé
    const oldService = new EncryptionService(oldKey);
    const plaintext = await oldService.decrypt(
      cred.encryptedData,
      cred.iv,
      cred.applicationId
    );
    
    // Re-chiffrer avec la nouvelle clé
    const newService = new EncryptionService(newKey);
    const { iv, encryptedData } = await newService.encrypt(
      plaintext,
      cred.applicationId
    );
    
    // Mettre à jour en base
    await prisma.credential.update({
      where: { id: cred.id },
      data: { iv, encryptedData }
    });
  }
  
  // Logger la rotation
  await auditLog({
    action: 'master-key.rotated',
    details: { credentialsCount: credentials.length }
  });
}
```

---

## 5. Gestion des Credentials par Type

### 5.1 Basic Auth (Username/Password)

```typescript
interface BasicCredential {
  username: string;
  password: string;
}

// Injection dans les tests
function injectBasicAuth(request: HttpRequest, credential: BasicCredential): void {
  const encoded = Buffer.from(`${credential.username}:${credential.password}`).toString('base64');
  request.headers['Authorization'] = `Basic ${encoded}`;
}
```

### 5.2 API Key

```typescript
interface ApiKeyCredential {
  apiKey: string;
  headerName?: string;  // Par défaut: X-API-Key
  prefix?: string;      // Ex: "Bearer", "ApiKey"
}

function injectApiKey(request: HttpRequest, credential: ApiKeyCredential): void {
  const headerName = credential.headerName || 'X-API-Key';
  const value = credential.prefix 
    ? `${credential.prefix} ${credential.apiKey}` 
    : credential.apiKey;
  request.headers[headerName] = value;
}
```

### 5.3 JWT Token (avec Refresh)

```typescript
interface JwtCredential {
  token: string;
  refreshToken?: string;
  tokenUrl?: string;      // Endpoint pour refresh
  expiresAt?: Date;
}

class JwtCredentialManager {
  async getValidToken(credential: JwtCredential): Promise<string> {
    // Vérifier si le token est expiré
    if (credential.expiresAt && new Date() >= credential.expiresAt) {
      if (credential.refreshToken && credential.tokenUrl) {
        return this.refreshToken(credential);
      }
      throw new Error('Token expired and no refresh token available');
    }
    return credential.token;
  }
  
  private async refreshToken(credential: JwtCredential): Promise<string> {
    const response = await axios.post(credential.tokenUrl!, {
      refresh_token: credential.refreshToken,
      grant_type: 'refresh_token'
    });
    
    // Mettre à jour le credential en base
    await this.updateCredential(credential.id, {
      token: response.data.access_token,
      refreshToken: response.data.refresh_token || credential.refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    });
    
    return response.data.access_token;
  }
}
```

### 5.4 OAuth2 Client Credentials

```typescript
interface OAuth2Credential {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scopes?: string[];
  // Cache du token
  cachedToken?: string;
  cachedTokenExpiresAt?: Date;
}

class OAuth2CredentialManager {
  private tokenCache = new Map<string, { token: string; expiresAt: Date }>();
  
  async getAccessToken(credential: OAuth2Credential): Promise<string> {
    const cacheKey = `${credential.clientId}:${credential.tokenUrl}`;
    const cached = this.tokenCache.get(cacheKey);
    
    if (cached && new Date() < cached.expiresAt) {
      return cached.token;
    }
    
    // Obtenir un nouveau token
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credential.clientId,
      client_secret: credential.clientSecret
    });
    
    if (credential.scopes?.length) {
      params.append('scope', credential.scopes.join(' '));
    }
    
    const response = await axios.post(credential.tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const token = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000); // 60s de marge
    
    this.tokenCache.set(cacheKey, { token, expiresAt });
    
    return token;
  }
}
```

### 5.5 SSO / OAuth2 Authorization Code

Pour les applications nécessitant une authentification utilisateur :

```typescript
interface SsoCredential {
  provider: 'keycloak' | 'auth0' | 'azure-ad' | 'custom';
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
  // Tokens obtenus après flow
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: Date;
}

// Le flow OAuth2 Authorization Code nécessite une interaction utilisateur
// On stocke les tokens après que l'utilisateur se soit authentifié manuellement
```

**Workflow pour SSO :**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SSO Credential Setup Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Admin configure SSO credential (clientId, etc.)             │
│          │                                                      │
│          ▼                                                      │
│  2. Admin clique "Authenticate"                                 │
│          │                                                      │
│          ▼                                                      │
│  3. Redirection vers Identity Provider                          │
│          │                                                      │
│          ▼                                                      │
│  4. Utilisateur s'authentifie                                   │
│          │                                                      │
│          ▼                                                      │
│  5. Callback avec authorization code                            │
│          │                                                      │
│          ▼                                                      │
│  6. TestForge échange code contre tokens                        │
│          │                                                      │
│          ▼                                                      │
│  7. Tokens chiffrés et stockés                                  │
│          │                                                      │
│          ▼                                                      │
│  8. Lors des tests, refresh automatique si nécessaire           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Audit et Logging

### 6.1 Événements Audités

| Catégorie | Événements |
|-----------|------------|
| Auth | login.success, login.failure, logout, token.refresh |
| Credentials | credential.create, credential.read, credential.update, credential.delete |
| Tests | test.create, test.execute, test.delete |
| Applications | application.create, application.delete |
| Admin | user.create, user.role.change, apikey.create, apikey.revoke |

### 6.2 Format des Logs d'Audit

```typescript
interface AuditEvent {
  timestamp: string;
  action: string;
  actor: {
    type: 'user' | 'apikey' | 'system';
    id: string;
    name?: string;
    ip?: string;
  };
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  result: 'success' | 'failure' | 'denied';
  details?: Record<string, unknown>;
  requestId: string;
}
```

**Exemple de log :**

```json
{
  "timestamp": "2026-01-30T15:30:00.000Z",
  "action": "credential.read",
  "actor": {
    "type": "user",
    "id": "user_abc123",
    "name": "Olivier",
    "ip": "192.168.1.100"
  },
  "resource": {
    "type": "credential",
    "id": "cred_xyz789",
    "name": "conformvault-dev-admin"
  },
  "result": "success",
  "details": {
    "applicationId": "app_123",
    "environment": "dev"
  },
  "requestId": "req-456"
}
```

### 6.3 Rétention et Stockage

```typescript
const auditConfig = {
  // Rétention en base PostgreSQL
  retention: {
    days: 90,
    cleanupSchedule: '0 3 * * *'  // 3h du matin chaque jour
  },
  
  // Export vers stockage long terme (optionnel)
  archive: {
    enabled: true,
    destination: 's3://secuaas-audit-logs/testforge/',
    format: 'json-lines',
    compression: 'gzip'
  }
};
```

---

## 7. Sécurité Réseau

### 7.1 TLS Configuration

```typescript
// Configuration TLS stricte
const tlsConfig = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  honorCipherOrder: true
};
```

### 7.2 Headers de Sécurité

```typescript
// Fastify security headers plugin
app.addHook('onSend', async (request, reply) => {
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.testforge.secuaas.ca",
    "frame-ancestors 'none'"
  ].join('; '));
});
```

### 7.3 Network Policies Kubernetes

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: testforge-backend-policy
  namespace: testforge
spec:
  podSelector:
    matchLabels:
      app: testforge-backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Autoriser le trafic depuis l'ingress
    - from:
        - namespaceSelector:
            matchLabels:
              name: traefik
      ports:
        - protocol: TCP
          port: 3000
  egress:
    # Autoriser PostgreSQL
    - to:
        - namespaceSelector:
            matchLabels:
              name: databases
      ports:
        - protocol: TCP
          port: 5432
    # Autoriser Redis
    - to:
        - namespaceSelector:
            matchLabels:
              name: redis
      ports:
        - protocol: TCP
          port: 6379
    # Autoriser les appels vers les applications testées
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
```

---

## 8. Checklist de Sécurité

### 8.1 Avant le Déploiement

- [ ] Master key générée avec `crypto.randomBytes(32)`
- [ ] Master key stockée dans Kubernetes Secret ou Vault
- [ ] TLS configuré avec certificat Let's Encrypt
- [ ] Rate limiting activé
- [ ] CORS configuré pour le domaine frontend uniquement
- [ ] Headers de sécurité configurés
- [ ] Audit logging activé
- [ ] Network policies en place
- [ ] Secrets Kubernetes en `data:` (base64) et non `stringData:`

### 8.2 En Production

- [ ] Rotation des clés JWT tous les 90 jours
- [ ] Monitoring des tentatives de brute force
- [ ] Alertes sur les accès credentials anormaux
- [ ] Revue des logs d'audit mensuelle
- [ ] Scan de vulnérabilités trimestriel
- [ ] Backup des données chiffrées

### 8.3 Pour les Développeurs

- [ ] Ne jamais logger les credentials en clair
- [ ] Ne jamais exposer les credentials dans les rapports
- [ ] Utiliser les variables d'environnement pour les secrets
- [ ] Valider et sanitizer toutes les entrées utilisateur
- [ ] Utiliser des requêtes paramétrées (Prisma)
- [ ] Ne pas stocker de données sensibles dans le frontend

---

## 9. Réponse aux Incidents

### 9.1 En cas de Fuite de Master Key

1. **Immédiat** : Révoquer l'accès au service
2. **Court terme** : Générer une nouvelle master key
3. **Re-chiffrement** : Exécuter la rotation de clé
4. **Audit** : Identifier les accès suspects
5. **Communication** : Informer les utilisateurs si nécessaire

### 9.2 En cas de Compromission d'un Credential

1. Identifier le credential compromis
2. Le marquer comme invalidé dans TestForge
3. Changer le credential dans l'application cible
4. Mettre à jour le credential dans TestForge
5. Auditer les utilisations récentes
6. Investiguer la source de la compromission

---

## 10. Contacts

**Security Lead** : Olivier (olivier@secuaas.ca)  
**Incident Response** : security@secuaas.ca
