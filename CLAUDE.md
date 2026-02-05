# Projet $(basename "$project")

Ce fichier contient les instructions spécifiques pour Claude lors du travail sur ce projet.


## 🔧 Standards de Développement SecuAAS

### Interface Utilisateur

#### Éditeur de Texte Riche - TinyMCE
- **Utilisation:** Pour tous les champs d'édition de contenu riche (descriptions, articles, etc.)
- **Package:** `@tinymce/tinymce-react`
- **Configuration:**
  - Clé API stockée dans OVH KMS
  - Récupération: `secuops secrets get tinymce-api-key --project <nom-projet>`
  - Documentation: https://www.tiny.cloud/docs/
  - Inscription gratuite: https://www.tiny.cloud/auth/signup/

#### Mise en Page - v0.dev
- **Utilisation:** Pour la création rapide de composants UI et pages
- **Outil:** https://v0.dev
- **Workflow:**
  1. Créer le design sur v0.dev
  2. Exporter le code React/Next.js
  3. Adapter au projet avec TailwindCSS
  4. Intégrer les composants Radix UI si nécessaire

#### Responsivité
- ✅ **OBLIGATOIRE:** Toutes les interfaces web doivent être 100% responsives
- **Breakpoints standard:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Framework:** TailwindCSS (classes responsive: `sm:`, `md:`, `lg:`, `xl:`)
- **Test:** Tester sur mobile, tablet, desktop avant chaque commit

### Authentification et Autorisation

#### SSO JumpCloud
- **Utilisation:** Pour tous les accès admin et super-admin
- **Module:** `/Module-SSO-Jumpcloud`
- **Configuration:**
  - Client ID, Secret, Org ID stockés dans OVH KMS
  - Récupération: `secuops secrets get jumpcloud-credentials --project <nom-projet>`
  - Callback URL: `https://<domain>/api/auth/sso/callback`
- **Groupes JumpCloud:**
  - `secuaas-admins` → Rôle admin
  - `secuaas-superadmins` → Rôle super-admin
  - `secuaas-users` → Rôle utilisateur standard

**Implémentation:**
```javascript
// Backend (Node.js/Express)
import { JumpCloudSSO } from '@secuaas/sso-jumpcloud';

const sso = new JumpCloudSSO({
  clientId: process.env.JUMPCLOUD_CLIENT_ID,
  clientSecret: process.env.JUMPCLOUD_CLIENT_SECRET,
  orgId: process.env.JUMPCLOUD_ORG_ID,
  callbackUrl: process.env.JUMPCLOUD_CALLBACK_URL
});

// Routes
app.get('/api/auth/sso/login', sso.login);
app.get('/api/auth/sso/callback', sso.callback);
```

```python
# Backend (Python/FastAPI)
from sso_jumpcloud import JumpCloudSSO

sso = JumpCloudSSO(
    client_id=os.getenv("JUMPCLOUD_CLIENT_ID"),
    client_secret=os.getenv("JUMPCLOUD_CLIENT_SECRET"),
    org_id=os.getenv("JUMPCLOUD_ORG_ID"),
    callback_url=os.getenv("JUMPCLOUD_CALLBACK_URL")
)

@app.get("/api/auth/sso/login")
async def sso_login():
    return sso.login()
```

### Envoi d'Emails - Resend

- **Service:** Resend (https://resend.com)
- **Utilisation:** Pour tous les emails transactionnels
- **Configuration:**
  - API Key stockée dans OVH KMS
  - Récupération: `secuops secrets get resend-api-key --project <nom-projet>`
  - Documentation: https://resend.com/docs

**Implémentation:**
```javascript
// Node.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'SecuAAS <noreply@secuaas.com>',
  to: user.email,
  subject: 'Welcome to SecuAAS',
  html: emailTemplate
});
```

```python
# Python
import resend

resend.api_key = os.getenv("RESEND_API_KEY")

resend.Emails.send({
    "from": "SecuAAS <noreply@secuaas.com>",
    "to": user.email,
    "subject": "Welcome to SecuAAS",
    "html": email_template
})
```

### Gestion des Secrets - OVH KMS

#### Stockage Sécurisé
Toutes les clés API et secrets sont stockés dans OVH KMS, jamais en clair dans le code.

**Récupération des secrets:**
```bash
# JumpCloud credentials
secuops secrets get jumpcloud-client-id --project <nom-projet>
secuops secrets get jumpcloud-client-secret --project <nom-projet>
secuops secrets get jumpcloud-org-id --project <nom-projet>

# Resend API Key
secuops secrets get resend-api-key --project <nom-projet>

# TinyMCE API Key
secuops secrets get tinymce-api-key --project <nom-projet>
```

**Stockage d'un nouveau secret:**
```bash
secuops secrets create <secret-name> \
  --value "<secret-value>" \
  --project <nom-projet> \
  --description "Description du secret"
```

**Liste des secrets d'un projet:**
```bash
secuops secrets list --project <nom-projet>
```

#### Secrets par Projet

**Secrets Communs (tous les projets avec interface web):**
- `jumpcloud-client-id` - JumpCloud Client ID
- `jumpcloud-client-secret` - JumpCloud Client Secret
- `jumpcloud-org-id` - JumpCloud Organization ID
- `resend-api-key` - Resend API Key pour emails
- `tinymce-api-key` - TinyMCE API Key (si éditeur riche utilisé)

**Secrets Spécifiques (selon le projet):**
- `jwt-secret` - Secret pour JWT tokens
- `encryption-key` - Clé de chiffrement
- `database-password` - Mot de passe base de données
- `redis-password` - Mot de passe Redis

### Variables d'Environnement Standard

#### Fichier .env (Développement)
```bash
# ==================== AUTHENTICATION ====================
# JumpCloud SSO (Récupérer depuis OVH KMS)
JUMPCLOUD_CLIENT_ID=
JUMPCLOUD_CLIENT_SECRET=
JUMPCLOUD_ORG_ID=
JUMPCLOUD_CALLBACK_URL=http://localhost:3000/api/auth/sso/callback

# ==================== EMAILS ====================
# Resend (Récupérer depuis OVH KMS)
RESEND_API_KEY=

# ==================== CONTENT EDITING ====================
# TinyMCE (Récupérer depuis OVH KMS - optionnel)
TINYMCE_API_KEY=

# ==================== APPLICATION ====================
NODE_ENV=development
PORT=3000
API_URL=http://localhost:8000
```

#### Kubernetes Secrets (Production)
Les secrets sont injectés via Kubernetes Secrets, alimentés depuis OVH KMS.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: <project-namespace>
type: Opaque
stringData:
  JUMPCLOUD_CLIENT_ID: ${JUMPCLOUD_CLIENT_ID}
  JUMPCLOUD_CLIENT_SECRET: ${JUMPCLOUD_CLIENT_SECRET}
  JUMPCLOUD_ORG_ID: ${JUMPCLOUD_ORG_ID}
  RESEND_API_KEY: ${RESEND_API_KEY}
  TINYMCE_API_KEY: ${TINYMCE_API_KEY}
```

### Checklist Pré-Commit

Avant chaque commit, vérifier:

- [ ] Interface 100% responsive (testé sur mobile/tablet/desktop)
- [ ] TinyMCE configuré pour les champs de texte riche
- [ ] JumpCloud SSO implémenté pour les routes admin/super-admin
- [ ] Resend configuré pour l'envoi d'emails
- [ ] Aucun secret en clair dans le code (utiliser OVH KMS)
- [ ] Variables d'environnement documentées dans .env.example
- [ ] Tests de sécurité passés (pas de XSS, SQL injection, etc.)
- [ ] Code formaté et linté

### Ressources Utiles

**Documentation:**
- TinyMCE: https://www.tiny.cloud/docs/
- Resend: https://resend.com/docs
- JumpCloud: https://docs.jumpcloud.com/
- v0.dev: https://v0.dev
- OVH KMS: https://help.ovhcloud.com/csm/fr-kms-quick-start

**Support:**
- TinyMCE: support@tiny.cloud
- Resend: support@resend.com
- JumpCloud: support@jumpcloud.com
- SecuAAS: admin@secuaas.com
