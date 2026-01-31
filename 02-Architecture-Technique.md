# TestForge - Architecture Technique

## Document d'Architecture Logicielle

**Version:** 1.0  
**Date:** 30 janvier 2026  
**Auteur:** SecuAAS  
**Statut:** Draft

---

## 1. Vue d'Ensemble de l'Architecture

### 1.1 Principes Directeurs

L'architecture de TestForge est guidée par les principes suivants :

1. **Séparation des responsabilités** : Chaque composant a une responsabilité unique et bien définie
2. **API-First** : Toutes les fonctionnalités sont accessibles via API REST
3. **Sécurité par conception** : Les credentials sont chiffrés, les accès audités
4. **Scalabilité horizontale** : Les composants peuvent être répliqués indépendamment
5. **Observabilité** : Logs structurés, métriques, traces pour le debugging
6. **Cloud-Native** : Conçu pour Kubernetes, conteneurisé, stateless

### 1.2 Diagramme d'Architecture Haut Niveau

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  Interface   │    │   Claude     │    │   CI/CD      │                  │
│  │     Web      │    │  (via MCP)   │    │  (Scripts)   │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
└─────────┼───────────────────┼───────────────────┼───────────────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGRESS (Traefik)                                  │
│                        testforge.secuaas.ca                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│      API Gateway        │         │     Frontend (SPA)      │
│       (Backend)         │         │      (React/Vue)        │
│                         │         │                         │
│  • Authentication       │         │  • Dashboard            │
│  • Rate Limiting        │         │  • Test Editor          │
│  • Request Validation   │         │  • Reports Viewer       │
│  • API Routing          │         │  • Settings             │
└───────────┬─────────────┘         └─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE SERVICES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Application    │  │     Test        │  │   Credential    │             │
│  │    Service      │  │    Service      │  │    Service      │             │
│  │                 │  │                 │  │                 │             │
│  │ • CRUD Apps     │  │ • CRUD Tests    │  │ • Store/Retrieve│             │
│  │ • Environments  │  │ • Validation    │  │ • Encryption    │             │
│  │ • Health Status │  │ • Import/Export │  │ • Audit Log     │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                                ▼                                            │
│                    ┌─────────────────────┐                                  │
│                    │   Execution Engine  │                                  │
│                    │                     │                                  │
│                    │  • Test Orchestrator│                                  │
│                    │  • API Test Runner  │                                  │
│                    │  • Web Test Runner  │                                  │
│                    │  • Report Generator │                                  │
│                    └──────────┬──────────┘                                  │
│                               │                                             │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   PostgreSQL    │  │     Redis       │  │   MinIO/S3      │             │
│  │                 │  │                 │  │                 │             │
│  │ • Applications  │  │ • Sessions      │  │ • Screenshots   │             │
│  │ • Tests         │  │ • Cache         │  │ • Reports PDF   │             │
│  │ • Executions    │  │ • Job Queue     │  │ • Artifacts     │             │
│  │ • Audit Logs    │  │ • Rate Limits   │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SYSTEMS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Applications   │  │    OAuth2       │  │   Notification  │             │
│  │   Under Test    │  │   Providers     │  │    Services     │             │
│  │                 │  │                 │  │                 │             │
│  │ • ConformVault  │  │ • Keycloak      │  │ • Slack         │             │
│  │ • SecuOps       │  │ • Auth0         │  │ • Email         │             │
│  │ • Portails      │  │ • Azure AD      │  │ • Webhooks      │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Composants Détaillés

### 2.1 Frontend (SPA)

**Technologie recommandée :** React 18 + TypeScript + TailwindCSS + Vite

**Justification :**
- React : Écosystème mature, nombreux composants disponibles
- TypeScript : Typage fort pour réduire les erreurs
- TailwindCSS : Styling rapide et cohérent
- Vite : Build rapide, HMR efficace

**Structure du projet :**

```
frontend/
├── src/
│   ├── components/           # Composants réutilisables
│   │   ├── ui/              # Composants UI de base (Button, Input, Modal)
│   │   ├── applications/    # Composants liés aux applications
│   │   ├── tests/           # Éditeur et visualisation de tests
│   │   └── reports/         # Affichage des rapports
│   ├── pages/               # Pages/routes principales
│   │   ├── Dashboard.tsx
│   │   ├── Applications.tsx
│   │   ├── TestEditor.tsx
│   │   └── Reports.tsx
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API clients
│   ├── stores/              # State management (Zustand)
│   ├── types/               # TypeScript types
│   └── utils/               # Utilitaires
├── public/
├── package.json
└── vite.config.ts
```

**Dépendances principales :**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "@monaco-editor/react": "^4.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "date-fns": "^3.x"
  }
}
```

### 2.2 Backend API

**Technologie recommandée :** Node.js + Fastify + TypeScript + Prisma

**Justification :**
- Fastify : Performances supérieures à Express, validation JSON Schema native
- TypeScript : Cohérence avec le frontend, typage end-to-end
- Prisma : ORM moderne avec excellente DX et migrations
- Node.js : Écosystème riche pour HTTP, WebSockets, et intégrations

**Alternative considérée :** Go + Gin (meilleure performance brute, mais courbe d'apprentissage)

**Structure du projet :**

```
backend/
├── src/
│   ├── modules/
│   │   ├── applications/
│   │   │   ├── application.controller.ts
│   │   │   ├── application.service.ts
│   │   │   ├── application.schema.ts
│   │   │   └── application.routes.ts
│   │   ├── tests/
│   │   ├── credentials/
│   │   ├── executions/
│   │   └── auth/
│   ├── engine/
│   │   ├── orchestrator.ts
│   │   ├── api-runner.ts
│   │   ├── web-runner.ts
│   │   └── report-generator.ts
│   ├── common/
│   │   ├── middleware/
│   │   ├── decorators/
│   │   ├── guards/
│   │   └── utils/
│   ├── config/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── app.ts
├── tests/
├── package.json
└── tsconfig.json
```

**Dépendances principales :**

```json
{
  "dependencies": {
    "fastify": "^4.x",
    "@fastify/cors": "^8.x",
    "@fastify/jwt": "^7.x",
    "@fastify/swagger": "^8.x",
    "@prisma/client": "^5.x",
    "axios": "^1.x",
    "playwright": "^1.x",
    "bullmq": "^5.x",
    "ioredis": "^5.x",
    "pino": "^8.x",
    "zod": "^3.x",
    "crypto-js": "^4.x"
  }
}
```

### 2.3 Execution Engine

Le moteur d'exécution est le cœur de TestForge. Il orchestre l'exécution des tests.

**Composants :**

#### 2.3.1 Test Orchestrator

Responsable de :
- Parser la définition du test (YAML/JSON)
- Résoudre les variables et credentials
- Séquencer l'exécution des étapes
- Gérer les timeouts et retries
- Collecter les résultats

```typescript
interface TestOrchestrator {
  execute(testId: string, options: ExecutionOptions): Promise<ExecutionResult>;
  cancel(executionId: string): Promise<void>;
  getStatus(executionId: string): Promise<ExecutionStatus>;
}

interface ExecutionOptions {
  environment: 'dev' | 'staging' | 'prod';
  verbose: boolean;
  timeout: number;
  retryCount: number;
  tags?: string[];
}

interface ExecutionResult {
  id: string;
  testId: string;
  status: 'passed' | 'failed' | 'error' | 'cancelled';
  startedAt: Date;
  completedAt: Date;
  duration: number;
  steps: StepResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}
```

#### 2.3.2 API Test Runner

Basé sur Axios pour l'exécution des requêtes HTTP.

```typescript
interface ApiTestRunner {
  executeStep(step: ApiTestStep, context: ExecutionContext): Promise<StepResult>;
}

interface ApiTestStep {
  name: string;
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
    queryParams?: Record<string, string>;
    timeout?: number;
  };
  extract?: Record<string, string>;  // JSONPath expressions
  assert?: Assertion[];
}

interface Assertion {
  type: 'status' | 'body' | 'header' | 'responseTime';
  path?: string;  // JSONPath for body assertions
  operator: 'equals' | 'contains' | 'matches' | 'lessThan' | 'greaterThan';
  expected: unknown;
}
```

#### 2.3.3 Web Test Runner

Basé sur Playwright pour les tests E2E.

```typescript
interface WebTestRunner {
  executeStep(step: WebTestStep, context: ExecutionContext): Promise<StepResult>;
}

interface WebTestStep {
  name: string;
  actions: WebAction[];
}

type WebAction = 
  | { type: 'navigate'; url: string }
  | { type: 'click'; selector: string }
  | { type: 'type'; selector: string; text: string }
  | { type: 'select'; selector: string; value: string }
  | { type: 'wait'; selector: string; timeout?: number }
  | { type: 'waitForNavigation' }
  | { type: 'screenshot'; name: string }
  | { type: 'assert'; assertion: WebAssertion };

interface WebAssertion {
  type: 'visible' | 'hidden' | 'text' | 'attribute' | 'url';
  selector?: string;
  expected: string;
  attribute?: string;
}
```

### 2.4 Credential Service

Gestion sécurisée des credentials avec chiffrement AES-256-GCM.

```typescript
interface CredentialService {
  store(credential: CredentialInput): Promise<string>;
  retrieve(id: string, applicationId: string): Promise<DecryptedCredential>;
  list(applicationId: string): Promise<CredentialSummary[]>;
  delete(id: string): Promise<void>;
  rotate(id: string, newValue: CredentialInput): Promise<void>;
}

interface CredentialInput {
  name: string;
  type: 'basic' | 'apiKey' | 'jwt' | 'oauth2';
  applicationId: string;
  environment: string;
  value: {
    username?: string;
    password?: string;
    apiKey?: string;
    token?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
  };
  metadata?: {
    expiresAt?: Date;
    scopes?: string[];
  };
}
```

**Processus de chiffrement :**

```
┌─────────────────────────────────────────────────────────────┐
│                  Credential Storage Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. Input credential data                                  │
│          │                                                  │
│          ▼                                                  │
│   2. Generate random IV (12 bytes)                          │
│          │                                                  │
│          ▼                                                  │
│   3. Derive key from master key + application ID (HKDF)     │
│          │                                                  │
│          ▼                                                  │
│   4. Encrypt with AES-256-GCM                               │
│          │                                                  │
│          ▼                                                  │
│   5. Store: IV || Ciphertext || Auth Tag                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Modèle de Données

### 3.1 Schéma Prisma

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============== APPLICATIONS ==============

model Application {
  id          String   @id @default(cuid())
  name        String
  description String?
  type        AppType
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  environments  Environment[]
  testSuites    TestSuite[]
  credentials   Credential[]
  
  @@map("applications")
}

enum AppType {
  API
  WEB
  HYBRID
}

model Environment {
  id            String   @id @default(cuid())
  name          String   // dev, staging, prod
  baseUrl       String
  isActive      Boolean  @default(true)
  applicationId String
  
  application   Application  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  executions    Execution[]
  credentials   Credential[]
  
  @@unique([applicationId, name])
  @@map("environments")
}

// ============== TESTS ==============

model TestSuite {
  id            String   @id @default(cuid())
  name          String
  description   String?
  timeout       Int      @default(300) // seconds
  tags          String[] @default([])
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  applicationId String
  
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  steps         TestStep[]
  executions    Execution[]
  
  @@map("test_suites")
}

model TestStep {
  id          String   @id @default(cuid())
  name        String
  type        StepType
  order       Int
  config      Json     // API or Web step configuration
  timeout     Int?     // Override suite timeout
  continueOnError Boolean @default(false)
  testSuiteId String
  
  testSuite   TestSuite @relation(fields: [testSuiteId], references: [id], onDelete: Cascade)
  
  @@map("test_steps")
}

enum StepType {
  API
  WEB
}

// ============== EXECUTIONS ==============

model Execution {
  id            String          @id @default(cuid())
  status        ExecutionStatus
  startedAt     DateTime        @default(now())
  completedAt   DateTime?
  duration      Int?            // milliseconds
  triggeredBy   String          // user ID or "api" or "scheduler" or "claude"
  options       Json            // ExecutionOptions
  summary       Json?           // { total, passed, failed, skipped }
  testSuiteId   String
  environmentId String
  
  testSuite     TestSuite      @relation(fields: [testSuiteId], references: [id])
  environment   Environment    @relation(fields: [environmentId], references: [id])
  stepResults   StepResult[]
  artifacts     Artifact[]
  
  @@map("executions")
}

enum ExecutionStatus {
  PENDING
  RUNNING
  PASSED
  FAILED
  ERROR
  CANCELLED
}

model StepResult {
  id          String   @id @default(cuid())
  stepName    String
  stepType    StepType
  status      ExecutionStatus
  startedAt   DateTime
  completedAt DateTime
  duration    Int      // milliseconds
  request     Json?    // For API steps
  response    Json?    // For API steps
  assertions  Json     // Array of assertion results
  error       String?
  executionId String
  
  execution   Execution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  
  @@map("step_results")
}

model Artifact {
  id          String       @id @default(cuid())
  type        ArtifactType
  name        String
  path        String       // S3/MinIO path
  size        Int          // bytes
  mimeType    String
  createdAt   DateTime     @default(now())
  executionId String
  
  execution   Execution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  
  @@map("artifacts")
}

enum ArtifactType {
  SCREENSHOT
  REPORT_HTML
  REPORT_PDF
  REPORT_JSON
  LOG
}

// ============== CREDENTIALS ==============

model Credential {
  id            String         @id @default(cuid())
  name          String
  type          CredentialType
  encryptedData Bytes          // AES-256-GCM encrypted
  iv            Bytes          // Initialization vector
  metadata      Json?          // Non-sensitive metadata
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  applicationId String
  environmentId String?
  
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  environment   Environment? @relation(fields: [environmentId], references: [id])
  
  @@map("credentials")
}

enum CredentialType {
  BASIC
  API_KEY
  JWT
  OAUTH2
  CERTIFICATE
}

// ============== AUDIT ==============

model AuditLog {
  id          String   @id @default(cuid())
  action      String
  entityType  String
  entityId    String
  userId      String?
  ipAddress   String?
  userAgent   String?
  details     Json?
  createdAt   DateTime @default(now())
  
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ============== USERS ==============

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  role        UserRole @default(USER)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  apiKeys     ApiKey[]
  
  @@map("users")
}

enum UserRole {
  ADMIN
  USER
  VIEWER
}

model ApiKey {
  id          String   @id @default(cuid())
  name        String
  keyHash     String   @unique // SHA-256 hash of the key
  prefix      String   // First 8 chars for identification
  permissions String[] // Array of permission strings
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  userId      String
  
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("api_keys")
}
```

### 3.2 Diagramme ERD

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Application   │       │   Environment   │       │   Credential    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │───┐   │ id              │───┐   │ id              │
│ name            │   │   │ name            │   │   │ name            │
│ description     │   │   │ baseUrl         │   │   │ type            │
│ type            │   │   │ isActive        │   │   │ encryptedData   │
│ createdAt       │   └──<│ applicationId   │   └──<│ applicationId   │
│ updatedAt       │       │                 │       │ environmentId   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
        │                         │
        │                         │
        ▼                         │
┌─────────────────┐               │
│   TestSuite     │               │
├─────────────────┤               │
│ id              │               │
│ name            │               │
│ description     │               │
│ timeout         │               │
│ tags            │               │
│ applicationId   │               │
└─────────────────┘               │
        │                         │
        │                         │
        ▼                         │
┌─────────────────┐               │
│    TestStep     │               │
├─────────────────┤               │
│ id              │               │
│ name            │               │
│ type            │               │
│ order           │               │
│ config          │               │
│ testSuiteId     │               │
└─────────────────┘               │
                                  │
        ┌─────────────────────────┘
        │
        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Execution     │       │   StepResult    │       │    Artifact     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │───┐   │ id              │       │ id              │
│ status          │   │   │ stepName        │       │ type            │
│ startedAt       │   │   │ status          │       │ name            │
│ completedAt     │   └──<│ executionId     │   ┌──<│ executionId     │
│ testSuiteId     │       │ request         │   │   │ path            │
│ environmentId   │───────│ response        │   │   │ size            │
│ triggeredBy     │       │ assertions      │   │   └─────────────────┘
└─────────────────┘       └─────────────────┘   │
        │                                       │
        └───────────────────────────────────────┘
```

---

## 4. API Design

### 4.1 Convention d'API

- **Base URL** : `https://testforge.secuaas.ca/api/v1`
- **Format** : JSON
- **Authentication** : Bearer token (JWT) ou API Key
- **Versioning** : URL path (`/v1/`, `/v2/`)
- **Pagination** : `?page=1&limit=20`
- **Filtrage** : `?status=passed&tags=critical`
- **Tri** : `?sort=-createdAt` (préfixe `-` pour descendant)

### 4.2 Endpoints Principaux

#### Applications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /applications | Liste des applications |
| POST | /applications | Créer une application |
| GET | /applications/:id | Détail d'une application |
| PUT | /applications/:id | Modifier une application |
| DELETE | /applications/:id | Supprimer une application |
| GET | /applications/:id/health | État de santé agrégé |

#### Environments

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /applications/:appId/environments | Liste des environnements |
| POST | /applications/:appId/environments | Créer un environnement |
| PUT | /environments/:id | Modifier un environnement |
| DELETE | /environments/:id | Supprimer un environnement |

#### Test Suites

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /applications/:appId/tests | Liste des suites de tests |
| POST | /applications/:appId/tests | Créer une suite de tests |
| GET | /tests/:id | Détail d'une suite |
| PUT | /tests/:id | Modifier une suite |
| DELETE | /tests/:id | Supprimer une suite |
| POST | /tests/:id/import | Importer depuis YAML |
| GET | /tests/:id/export | Exporter en YAML |

#### Executions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | /tests/:id/execute | Lancer une exécution |
| GET | /executions | Liste des exécutions |
| GET | /executions/:id | Détail d'une exécution |
| GET | /executions/:id/report | Rapport formaté |
| DELETE | /executions/:id/cancel | Annuler une exécution |

#### Credentials

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /applications/:appId/credentials | Liste (sans valeurs) |
| POST | /applications/:appId/credentials | Créer un credential |
| PUT | /credentials/:id | Modifier un credential |
| DELETE | /credentials/:id | Supprimer un credential |

### 4.3 Exemples de Requêtes/Réponses

#### Créer une application

```http
POST /api/v1/applications
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "ConformVault",
  "description": "Plateforme de transfert sécurisé",
  "type": "HYBRID",
  "environments": [
    {
      "name": "dev",
      "baseUrl": "https://dev.conformvault.ca"
    },
    {
      "name": "prod",
      "baseUrl": "https://app.conformvault.ca"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "id": "clx1234567890",
  "name": "ConformVault",
  "description": "Plateforme de transfert sécurisé",
  "type": "HYBRID",
  "createdAt": "2026-01-30T15:00:00Z",
  "environments": [
    {
      "id": "env_dev_123",
      "name": "dev",
      "baseUrl": "https://dev.conformvault.ca",
      "isActive": true
    },
    {
      "id": "env_prod_456",
      "name": "prod",
      "baseUrl": "https://app.conformvault.ca",
      "isActive": true
    }
  ]
}
```

#### Lancer une exécution

```http
POST /api/v1/tests/test_abc123/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "environment": "dev",
  "verbose": true,
  "timeout": 300,
  "retryCount": 2
}
```

**Response (202 Accepted):**

```json
{
  "executionId": "exec_xyz789",
  "status": "PENDING",
  "message": "Test execution started",
  "links": {
    "status": "/api/v1/executions/exec_xyz789",
    "report": "/api/v1/executions/exec_xyz789/report"
  }
}
```

#### Récupérer un rapport

```http
GET /api/v1/executions/exec_xyz789/report?format=json
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "execution": {
    "id": "exec_xyz789",
    "testSuite": "Full Integration Suite",
    "application": "ConformVault",
    "environment": "dev",
    "status": "FAILED",
    "startedAt": "2026-01-30T15:05:00Z",
    "completedAt": "2026-01-30T15:07:30Z",
    "duration": 150000
  },
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0
  },
  "steps": [
    {
      "name": "Health Check",
      "type": "API",
      "status": "PASSED",
      "duration": 120,
      "assertions": [
        {
          "type": "status",
          "expected": 200,
          "actual": 200,
          "passed": true
        }
      ]
    },
    {
      "name": "Login",
      "type": "API",
      "status": "FAILED",
      "duration": 350,
      "error": "Assertion failed: expected status 200, got 401",
      "request": {
        "method": "POST",
        "url": "https://dev.conformvault.ca/auth/login",
        "headers": { "Content-Type": "application/json" },
        "body": { "email": "***", "password": "***" }
      },
      "response": {
        "status": 401,
        "body": { "error": "Invalid credentials" }
      },
      "assertions": [
        {
          "type": "status",
          "expected": 200,
          "actual": 401,
          "passed": false
        }
      ]
    }
  ]
}
```

---

## 5. Sécurité

### 5.1 Authentification

**Méthodes supportées :**

1. **JWT Token** (utilisateurs web)
   - Émis après login avec email/password
   - Durée de vie : 1 heure
   - Refresh token : 7 jours

2. **API Key** (intégrations, Claude)
   - Format : `tf_live_xxxxxxxxxxxxxxxxxxxx`
   - Hashée en base (SHA-256)
   - Permissions granulaires

### 5.2 Autorisation (RBAC)

| Rôle | Applications | Tests | Credentials | Executions |
|------|-------------|-------|-------------|------------|
| Admin | CRUD | CRUD | CRUD | CRUD |
| User | Read, Update | CRUD | Create, Read | CRUD |
| Viewer | Read | Read | - | Read |

### 5.3 Chiffrement des Credentials

```typescript
// Processus de chiffrement
async function encryptCredential(data: object, applicationId: string): Promise<EncryptedCredential> {
  // 1. Dériver une clé spécifique à l'application
  const derivedKey = await hkdf(
    masterKey,
    applicationId,
    'testforge-credential',
    32 // 256 bits
  );
  
  // 2. Générer un IV aléatoire
  const iv = crypto.randomBytes(12);
  
  // 3. Chiffrer avec AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: Buffer.concat([encrypted, authTag]),
    iv: iv
  };
}
```

### 5.4 Audit Logging

Tous les événements sensibles sont loggés :

```typescript
interface AuditEvent {
  action: 'credential.read' | 'credential.create' | 'execution.start' | 'test.delete' | ...;
  entityType: string;
  entityId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: object;
}
```

---

## 6. Déploiement Kubernetes

### 6.1 Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                    OVH Managed Kubernetes                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Namespace: testforge                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Frontend   │  │   Backend   │  │   Worker    │     │   │
│  │  │  (2 pods)   │  │  (3 pods)   │  │  (2 pods)   │     │   │
│  │  │             │  │             │  │             │     │   │
│  │  │  nginx +    │  │  Fastify    │  │  BullMQ     │     │   │
│  │  │  React SPA  │  │  API        │  │  Processor  │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │         │                │                │             │   │
│  │         └────────────────┼────────────────┘             │   │
│  │                          │                              │   │
│  │                          ▼                              │   │
│  │                    ┌─────────────┐                      │   │
│  │                    │   Service   │                      │   │
│  │                    │  ClusterIP  │                      │   │
│  │                    └─────────────┘                      │   │
│  │                          │                              │   │
│  └──────────────────────────┼──────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────┐                              │
│                    │   Ingress   │                              │
│                    │   Traefik   │                              │
│                    └─────────────┘                              │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                    testforge.secuaas.ca
```

### 6.2 Manifestes Kubernetes

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: testforge
  labels:
    app.kubernetes.io/name: testforge

---
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: testforge-backend
  namespace: testforge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: testforge-backend
  template:
    metadata:
      labels:
        app: testforge-backend
    spec:
      containers:
        - name: backend
          image: registry.secuaas.ca/testforge-backend:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: testforge-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: testforge-secrets
                  key: redis-url
            - name: MASTER_KEY
              valueFrom:
                secretKeyRef:
                  name: testforge-secrets
                  key: master-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5

---
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: testforge-worker
  namespace: testforge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: testforge-worker
  template:
    metadata:
      labels:
        app: testforge-worker
    spec:
      containers:
        - name: worker
          image: registry.secuaas.ca/testforge-worker:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: testforge-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: testforge-secrets
                  key: redis-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "300m"
            limits:
              memory: "1Gi"
              cpu: "1000m"

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: testforge-ingress
  namespace: testforge
  annotations:
    traefik.ingress.kubernetes.io/router.tls: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - testforge.secuaas.ca
      secretName: testforge-tls
  rules:
    - host: testforge.secuaas.ca
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: testforge-backend
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: testforge-frontend
                port:
                  number: 80
```

### 6.3 Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| DATABASE_URL | URL PostgreSQL | postgresql://user:pass@host:5432/testforge |
| REDIS_URL | URL Redis | redis://host:6379 |
| MASTER_KEY | Clé de chiffrement (32 bytes, base64) | (généré aléatoirement) |
| JWT_SECRET | Secret pour JWT | (généré aléatoirement) |
| S3_ENDPOINT | Endpoint MinIO/S3 | https://s3.secuaas.ca |
| S3_ACCESS_KEY | Clé d'accès S3 | (secret) |
| S3_SECRET_KEY | Clé secrète S3 | (secret) |
| LOG_LEVEL | Niveau de log | info |

---

## 7. Intégration MCP pour Claude

### 7.1 Serveur MCP TestForge

Pour permettre à Claude d'interagir avec TestForge, on expose un serveur MCP.

```typescript
// mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'testforge-mcp',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// Tool: List applications
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'testforge_list_applications',
      description: 'List all applications registered in TestForge with their health status',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'testforge_run_test',
      description: 'Execute a test suite for an application',
      inputSchema: {
        type: 'object',
        properties: {
          applicationName: { type: 'string', description: 'Name of the application' },
          testSuite: { type: 'string', description: 'Name of the test suite (optional)' },
          environment: { type: 'string', enum: ['dev', 'staging', 'prod'] }
        },
        required: ['applicationName', 'environment']
      }
    },
    {
      name: 'testforge_get_report',
      description: 'Get the detailed report of a test execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string' }
        },
        required: ['executionId']
      }
    },
    {
      name: 'testforge_health_summary',
      description: 'Get a summary of health status for all applications',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

// Tool implementations...
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'testforge_list_applications':
      return await listApplications();
    case 'testforge_run_test':
      return await runTest(args.applicationName, args.testSuite, args.environment);
    case 'testforge_get_report':
      return await getReport(args.executionId);
    case 'testforge_health_summary':
      return await getHealthSummary();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### 7.2 Exemple d'Utilisation par Claude

**Conversation utilisateur :**
> "Hey Claude, peux-tu tester ConformVault sur dev et me dire si tout fonctionne ?"

**Claude utilise les outils MCP :**

1. `testforge_run_test({ applicationName: "ConformVault", environment: "dev" })`
2. Attend le résultat
3. `testforge_get_report({ executionId: "exec_abc123" })`
4. Analyse et répond à l'utilisateur

---

## 8. Observabilité

### 8.1 Logging

Format JSON structuré avec Pino :

```json
{
  "level": "info",
  "time": "2026-01-30T15:00:00.000Z",
  "pid": 1234,
  "hostname": "testforge-backend-abc123",
  "req": {
    "id": "req-123",
    "method": "POST",
    "url": "/api/v1/tests/test_123/execute"
  },
  "msg": "Test execution started",
  "executionId": "exec_xyz789",
  "testId": "test_123",
  "environment": "dev"
}
```

### 8.2 Métriques Prometheus

Exposées sur `/metrics` :

```
# HELP testforge_executions_total Total number of test executions
# TYPE testforge_executions_total counter
testforge_executions_total{status="passed",application="conformvault"} 150
testforge_executions_total{status="failed",application="conformvault"} 12

# HELP testforge_execution_duration_seconds Duration of test executions
# TYPE testforge_execution_duration_seconds histogram
testforge_execution_duration_seconds_bucket{le="10"} 45
testforge_execution_duration_seconds_bucket{le="30"} 120
testforge_execution_duration_seconds_bucket{le="60"} 180

# HELP testforge_api_request_duration_seconds API request latency
# TYPE testforge_api_request_duration_seconds histogram
```

### 8.3 Health Checks

```http
GET /health
```

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "s3": "ok"
  }
}
```

---

## 9. Prochaines Étapes

1. **Validation de l'architecture** avec les besoins actuels
2. **Setup du projet** : repos Git, CI/CD, environnement de dev
3. **MVP Sprint 1** : CRUD applications, modèle de données, API de base
4. **MVP Sprint 2** : Moteur de test API, credentials
5. **MVP Sprint 3** : Interface web, rapports, intégration MCP

---

## 10. Annexes

### 10.1 Références

- [Fastify Documentation](https://fastify.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Playwright Documentation](https://playwright.dev/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [MCP Specification](https://modelcontextprotocol.io/)

### 10.2 Décisions Architecturales (ADR)

| ADR | Décision | Raison |
|-----|----------|--------|
| ADR-001 | Node.js + Fastify | Performance, écosystème, cohérence avec frontend |
| ADR-002 | PostgreSQL | Données relationnelles, JSON support, maturité |
| ADR-003 | Redis + BullMQ | Queue de jobs fiable, performances |
| ADR-004 | Playwright | Support multi-navigateur, API moderne, reliability |
| ADR-005 | Chiffrement applicatif | Contrôle total, pas de dépendance externe |
