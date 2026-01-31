# TestForge - Spécification API

## OpenAPI 3.0 Specification

**Version:** 1.0.0  
**Date:** 30 janvier 2026

---

```yaml
openapi: 3.0.3
info:
  title: TestForge API
  description: |
    API pour la plateforme de tests automatisés TestForge.
    
    ## Authentification
    
    L'API supporte deux méthodes d'authentification :
    
    1. **JWT Token** : Pour les utilisateurs web, obtenu via `/auth/login`
    2. **API Key** : Pour les intégrations (CI/CD, Claude), format `tf_live_xxx`
    
    ## Rate Limiting
    
    - 1000 requêtes par minute pour les endpoints standards
    - 100 requêtes par minute pour les endpoints d'exécution
    
    ## Codes d'Erreur
    
    | Code | Description |
    |------|-------------|
    | 400 | Requête invalide |
    | 401 | Non authentifié |
    | 403 | Non autorisé |
    | 404 | Ressource non trouvée |
    | 409 | Conflit (ex: nom dupliqué) |
    | 422 | Validation échouée |
    | 429 | Rate limit dépassé |
    | 500 | Erreur serveur |
    
  version: 1.0.0
  contact:
    name: SecuAAS
    email: support@secuaas.ca
  license:
    name: Proprietary

servers:
  - url: https://testforge.secuaas.ca/api/v1
    description: Production
  - url: https://testforge-dev.secuaas.ca/api/v1
    description: Development

tags:
  - name: Authentication
    description: Authentification et gestion des tokens
  - name: Applications
    description: Gestion des applications à tester
  - name: Environments
    description: Gestion des environnements par application
  - name: Tests
    description: Définition et gestion des suites de tests
  - name: Executions
    description: Lancement et suivi des exécutions de tests
  - name: Credentials
    description: Gestion sécurisée des credentials
  - name: Reports
    description: Génération et récupération des rapports

security:
  - bearerAuth: []
  - apiKeyAuth: []

paths:
  # ==================== AUTHENTICATION ====================
  /auth/login:
    post:
      tags: [Authentication]
      summary: Connexion utilisateur
      description: Authentifie un utilisateur et retourne un JWT token
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                  example: admin@secuaas.ca
                password:
                  type: string
                  format: password
                  example: "********"
      responses:
        '200':
          description: Authentification réussie
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: Identifiants invalides
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/refresh:
    post:
      tags: [Authentication]
      summary: Rafraîchir le token
      description: Obtient un nouveau JWT à partir du refresh token
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refreshToken]
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Token rafraîchi
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: Refresh token invalide ou expiré

  /auth/me:
    get:
      tags: [Authentication]
      summary: Utilisateur courant
      description: Retourne les informations de l'utilisateur authentifié
      responses:
        '200':
          description: Informations utilisateur
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

  # ==================== APPLICATIONS ====================
  /applications:
    get:
      tags: [Applications]
      summary: Liste des applications
      description: Retourne la liste de toutes les applications enregistrées
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: type
          in: query
          schema:
            $ref: '#/components/schemas/AppType'
        - name: search
          in: query
          schema:
            type: string
          description: Recherche par nom
      responses:
        '200':
          description: Liste des applications
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/ApplicationSummary'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      tags: [Applications]
      summary: Créer une application
      description: Enregistre une nouvelle application à tester
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApplicationCreate'
      responses:
        '201':
          description: Application créée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Application'
        '409':
          description: Une application avec ce nom existe déjà

  /applications/{applicationId}:
    parameters:
      - $ref: '#/components/parameters/ApplicationId'
    
    get:
      tags: [Applications]
      summary: Détail d'une application
      responses:
        '200':
          description: Détail de l'application
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApplicationDetail'
        '404':
          description: Application non trouvée

    put:
      tags: [Applications]
      summary: Modifier une application
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApplicationUpdate'
      responses:
        '200':
          description: Application modifiée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Application'

    delete:
      tags: [Applications]
      summary: Supprimer une application
      description: Supprime l'application et toutes ses données associées
      responses:
        '204':
          description: Application supprimée
        '404':
          description: Application non trouvée

  /applications/{applicationId}/health:
    parameters:
      - $ref: '#/components/parameters/ApplicationId'
    get:
      tags: [Applications]
      summary: État de santé
      description: Retourne l'état de santé agrégé basé sur les dernières exécutions
      responses:
        '200':
          description: État de santé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'

  # ==================== ENVIRONMENTS ====================
  /applications/{applicationId}/environments:
    parameters:
      - $ref: '#/components/parameters/ApplicationId'
    
    get:
      tags: [Environments]
      summary: Liste des environnements
      responses:
        '200':
          description: Liste des environnements
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Environment'

    post:
      tags: [Environments]
      summary: Créer un environnement
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EnvironmentCreate'
      responses:
        '201':
          description: Environnement créé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Environment'
        '409':
          description: Environnement avec ce nom existe déjà

  /environments/{environmentId}:
    parameters:
      - name: environmentId
        in: path
        required: true
        schema:
          type: string
    
    put:
      tags: [Environments]
      summary: Modifier un environnement
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EnvironmentUpdate'
      responses:
        '200':
          description: Environnement modifié
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Environment'

    delete:
      tags: [Environments]
      summary: Supprimer un environnement
      responses:
        '204':
          description: Environnement supprimé

  # ==================== TESTS ====================
  /applications/{applicationId}/tests:
    parameters:
      - $ref: '#/components/parameters/ApplicationId'
    
    get:
      tags: [Tests]
      summary: Liste des suites de tests
      parameters:
        - name: tags
          in: query
          schema:
            type: array
            items:
              type: string
          description: Filtrer par tags
        - name: isActive
          in: query
          schema:
            type: boolean
      responses:
        '200':
          description: Liste des suites de tests
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/TestSuiteSummary'

    post:
      tags: [Tests]
      summary: Créer une suite de tests
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TestSuiteCreate'
      responses:
        '201':
          description: Suite de tests créée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TestSuite'

  /tests/{testId}:
    parameters:
      - $ref: '#/components/parameters/TestId'
    
    get:
      tags: [Tests]
      summary: Détail d'une suite de tests
      responses:
        '200':
          description: Suite de tests avec ses étapes
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TestSuiteDetail'

    put:
      tags: [Tests]
      summary: Modifier une suite de tests
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TestSuiteUpdate'
      responses:
        '200':
          description: Suite modifiée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TestSuite'

    delete:
      tags: [Tests]
      summary: Supprimer une suite de tests
      responses:
        '204':
          description: Suite supprimée

  /tests/{testId}/export:
    parameters:
      - $ref: '#/components/parameters/TestId'
    get:
      tags: [Tests]
      summary: Exporter en YAML
      description: Exporte la définition de la suite de tests au format YAML
      responses:
        '200':
          description: Définition YAML
          content:
            application/x-yaml:
              schema:
                type: string
            application/json:
              schema:
                type: object
                properties:
                  yaml:
                    type: string

  /tests/{testId}/import:
    parameters:
      - $ref: '#/components/parameters/TestId'
    post:
      tags: [Tests]
      summary: Importer depuis YAML
      description: Met à jour la suite de tests à partir d'une définition YAML
      requestBody:
        required: true
        content:
          application/x-yaml:
            schema:
              type: string
          application/json:
            schema:
              type: object
              required: [yaml]
              properties:
                yaml:
                  type: string
      responses:
        '200':
          description: Suite mise à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TestSuite'
        '422':
          description: YAML invalide

  # ==================== EXECUTIONS ====================
  /tests/{testId}/execute:
    parameters:
      - $ref: '#/components/parameters/TestId'
    post:
      tags: [Executions]
      summary: Lancer une exécution
      description: Démarre l'exécution asynchrone d'une suite de tests
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExecutionRequest'
      responses:
        '202':
          description: Exécution démarrée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExecutionStarted'

  /executions:
    get:
      tags: [Executions]
      summary: Liste des exécutions
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: applicationId
          in: query
          schema:
            type: string
        - name: testId
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/ExecutionStatus'
        - name: environment
          in: query
          schema:
            type: string
        - name: from
          in: query
          schema:
            type: string
            format: date-time
        - name: to
          in: query
          schema:
            type: string
            format: date-time
        - name: sort
          in: query
          schema:
            type: string
            default: "-startedAt"
      responses:
        '200':
          description: Liste des exécutions
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/ExecutionSummary'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

  /executions/{executionId}:
    parameters:
      - $ref: '#/components/parameters/ExecutionId'
    
    get:
      tags: [Executions]
      summary: Détail d'une exécution
      responses:
        '200':
          description: Détail de l'exécution
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExecutionDetail'

  /executions/{executionId}/cancel:
    parameters:
      - $ref: '#/components/parameters/ExecutionId'
    delete:
      tags: [Executions]
      summary: Annuler une exécution
      description: Annule une exécution en cours
      responses:
        '200':
          description: Exécution annulée
        '400':
          description: L'exécution n'est pas en cours

  /executions/{executionId}/report:
    parameters:
      - $ref: '#/components/parameters/ExecutionId'
    get:
      tags: [Reports]
      summary: Rapport d'exécution
      parameters:
        - name: format
          in: query
          schema:
            type: string
            enum: [json, html, pdf, junit]
            default: json
      responses:
        '200':
          description: Rapport d'exécution
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExecutionReport'
            text/html:
              schema:
                type: string
            application/pdf:
              schema:
                type: string
                format: binary
            application/xml:
              schema:
                type: string
                description: JUnit XML format

  # ==================== CREDENTIALS ====================
  /applications/{applicationId}/credentials:
    parameters:
      - $ref: '#/components/parameters/ApplicationId'
    
    get:
      tags: [Credentials]
      summary: Liste des credentials
      description: Retourne la liste des credentials (sans les valeurs sensibles)
      responses:
        '200':
          description: Liste des credentials
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CredentialSummary'

    post:
      tags: [Credentials]
      summary: Créer un credential
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CredentialCreate'
      responses:
        '201':
          description: Credential créé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CredentialSummary'

  /credentials/{credentialId}:
    parameters:
      - name: credentialId
        in: path
        required: true
        schema:
          type: string
    
    put:
      tags: [Credentials]
      summary: Modifier un credential
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CredentialUpdate'
      responses:
        '200':
          description: Credential modifié
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CredentialSummary'

    delete:
      tags: [Credentials]
      summary: Supprimer un credential
      responses:
        '204':
          description: Credential supprimé

  # ==================== API KEYS ====================
  /api-keys:
    get:
      tags: [Authentication]
      summary: Liste des clés API
      responses:
        '200':
          description: Liste des clés API
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ApiKeySummary'

    post:
      tags: [Authentication]
      summary: Créer une clé API
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApiKeyCreate'
      responses:
        '201':
          description: Clé API créée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiKeyCreated'
          headers:
            X-Api-Key:
              description: La clé API (visible une seule fois)
              schema:
                type: string

  /api-keys/{apiKeyId}:
    parameters:
      - name: apiKeyId
        in: path
        required: true
        schema:
          type: string
    delete:
      tags: [Authentication]
      summary: Révoquer une clé API
      responses:
        '204':
          description: Clé révoquée

  # ==================== HEALTH ====================
  /health:
    get:
      tags: [System]
      summary: Health check
      security: []
      responses:
        '200':
          description: Service healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SystemHealth'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  parameters:
    ApplicationId:
      name: applicationId
      in: path
      required: true
      schema:
        type: string
      description: ID unique de l'application
    
    TestId:
      name: testId
      in: path
      required: true
      schema:
        type: string
      description: ID unique de la suite de tests
    
    ExecutionId:
      name: executionId
      in: path
      required: true
      schema:
        type: string
      description: ID unique de l'exécution
    
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  schemas:
    # ===== Auth =====
    AuthResponse:
      type: object
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        expiresIn:
          type: integer
          description: Secondes avant expiration
        user:
          $ref: '#/components/schemas/User'

    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        name:
          type: string
        role:
          type: string
          enum: [ADMIN, USER, VIEWER]

    # ===== Applications =====
    AppType:
      type: string
      enum: [API, WEB, HYBRID]

    ApplicationCreate:
      type: object
      required: [name, type]
      properties:
        name:
          type: string
          maxLength: 100
        description:
          type: string
          maxLength: 500
        type:
          $ref: '#/components/schemas/AppType'
        environments:
          type: array
          items:
            $ref: '#/components/schemas/EnvironmentCreate'

    ApplicationUpdate:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        type:
          $ref: '#/components/schemas/AppType'

    Application:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        type:
          $ref: '#/components/schemas/AppType'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    ApplicationSummary:
      allOf:
        - $ref: '#/components/schemas/Application'
        - type: object
          properties:
            environmentCount:
              type: integer
            testCount:
              type: integer
            lastExecution:
              $ref: '#/components/schemas/LastExecution'

    ApplicationDetail:
      allOf:
        - $ref: '#/components/schemas/Application'
        - type: object
          properties:
            environments:
              type: array
              items:
                $ref: '#/components/schemas/Environment'
            tests:
              type: array
              items:
                $ref: '#/components/schemas/TestSuiteSummary'
            recentExecutions:
              type: array
              items:
                $ref: '#/components/schemas/ExecutionSummary'

    LastExecution:
      type: object
      nullable: true
      properties:
        id:
          type: string
        status:
          $ref: '#/components/schemas/ExecutionStatus'
        completedAt:
          type: string
          format: date-time
        passedCount:
          type: integer
        totalCount:
          type: integer

    HealthStatus:
      type: object
      properties:
        overall:
          type: string
          enum: [healthy, degraded, unhealthy, unknown]
        environments:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              status:
                type: string
                enum: [healthy, degraded, unhealthy, unknown]
              lastChecked:
                type: string
                format: date-time

    # ===== Environments =====
    EnvironmentCreate:
      type: object
      required: [name, baseUrl]
      properties:
        name:
          type: string
          maxLength: 50
        baseUrl:
          type: string
          format: uri

    EnvironmentUpdate:
      type: object
      properties:
        name:
          type: string
        baseUrl:
          type: string
          format: uri
        isActive:
          type: boolean

    Environment:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        baseUrl:
          type: string
        isActive:
          type: boolean
        applicationId:
          type: string

    # ===== Tests =====
    TestSuiteCreate:
      type: object
      required: [name]
      properties:
        name:
          type: string
        description:
          type: string
        timeout:
          type: integer
          default: 300
        tags:
          type: array
          items:
            type: string
        steps:
          type: array
          items:
            $ref: '#/components/schemas/TestStepCreate'
        credentialId:
          type: string
          description: ID du credential à utiliser par défaut

    TestSuiteUpdate:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        timeout:
          type: integer
        tags:
          type: array
          items:
            type: string
        isActive:
          type: boolean
        credentialId:
          type: string

    TestSuite:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        timeout:
          type: integer
        tags:
          type: array
          items:
            type: string
        isActive:
          type: boolean
        applicationId:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    TestSuiteSummary:
      allOf:
        - $ref: '#/components/schemas/TestSuite'
        - type: object
          properties:
            stepCount:
              type: integer
            lastExecution:
              $ref: '#/components/schemas/LastExecution'

    TestSuiteDetail:
      allOf:
        - $ref: '#/components/schemas/TestSuite'
        - type: object
          properties:
            steps:
              type: array
              items:
                $ref: '#/components/schemas/TestStep'
            credential:
              $ref: '#/components/schemas/CredentialSummary'

    TestStepCreate:
      type: object
      required: [name, type, config]
      properties:
        name:
          type: string
        type:
          type: string
          enum: [API, WEB]
        config:
          oneOf:
            - $ref: '#/components/schemas/ApiStepConfig'
            - $ref: '#/components/schemas/WebStepConfig'
        timeout:
          type: integer
        continueOnError:
          type: boolean
          default: false

    TestStep:
      allOf:
        - $ref: '#/components/schemas/TestStepCreate'
        - type: object
          properties:
            id:
              type: string
            order:
              type: integer

    ApiStepConfig:
      type: object
      required: [request]
      properties:
        request:
          type: object
          required: [method, path]
          properties:
            method:
              type: string
              enum: [GET, POST, PUT, DELETE, PATCH]
            path:
              type: string
            headers:
              type: object
              additionalProperties:
                type: string
            queryParams:
              type: object
              additionalProperties:
                type: string
            body:
              type: object
            timeout:
              type: integer
        extract:
          type: object
          additionalProperties:
            type: string
          description: Variables à extraire (JSONPath)
        assert:
          type: array
          items:
            $ref: '#/components/schemas/Assertion'

    WebStepConfig:
      type: object
      required: [actions]
      properties:
        actions:
          type: array
          items:
            $ref: '#/components/schemas/WebAction'

    WebAction:
      type: object
      required: [type]
      properties:
        type:
          type: string
          enum: [navigate, click, type, select, wait, waitForNavigation, screenshot, assert]
        url:
          type: string
        selector:
          type: string
        text:
          type: string
        value:
          type: string
        timeout:
          type: integer
        name:
          type: string
        assertion:
          $ref: '#/components/schemas/WebAssertion'

    WebAssertion:
      type: object
      required: [type, expected]
      properties:
        type:
          type: string
          enum: [visible, hidden, text, attribute, url]
        selector:
          type: string
        attribute:
          type: string
        expected:
          type: string

    Assertion:
      type: object
      required: [type, expected]
      properties:
        type:
          type: string
          enum: [status, body, header, responseTime]
        path:
          type: string
          description: JSONPath pour les assertions body
        operator:
          type: string
          enum: [equals, contains, matches, lessThan, greaterThan]
          default: equals
        expected:
          oneOf:
            - type: string
            - type: number
            - type: boolean
            - type: object

    # ===== Executions =====
    ExecutionStatus:
      type: string
      enum: [PENDING, RUNNING, PASSED, FAILED, ERROR, CANCELLED]

    ExecutionRequest:
      type: object
      required: [environment]
      properties:
        environment:
          type: string
          description: Nom de l'environnement (dev, staging, prod)
        verbose:
          type: boolean
          default: false
        timeout:
          type: integer
        retryCount:
          type: integer
          default: 0
        tags:
          type: array
          items:
            type: string
          description: Filtrer les étapes par tags

    ExecutionStarted:
      type: object
      properties:
        executionId:
          type: string
        status:
          $ref: '#/components/schemas/ExecutionStatus'
        message:
          type: string
        links:
          type: object
          properties:
            status:
              type: string
            report:
              type: string

    ExecutionSummary:
      type: object
      properties:
        id:
          type: string
        testSuiteId:
          type: string
        testSuiteName:
          type: string
        applicationName:
          type: string
        environment:
          type: string
        status:
          $ref: '#/components/schemas/ExecutionStatus'
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
        duration:
          type: integer
          description: Durée en millisecondes
        triggeredBy:
          type: string
        summary:
          $ref: '#/components/schemas/ExecutionSummaryStats'

    ExecutionSummaryStats:
      type: object
      properties:
        total:
          type: integer
        passed:
          type: integer
        failed:
          type: integer
        skipped:
          type: integer

    ExecutionDetail:
      allOf:
        - $ref: '#/components/schemas/ExecutionSummary'
        - type: object
          properties:
            options:
              $ref: '#/components/schemas/ExecutionRequest'
            steps:
              type: array
              items:
                $ref: '#/components/schemas/StepResult'
            artifacts:
              type: array
              items:
                $ref: '#/components/schemas/Artifact'

    StepResult:
      type: object
      properties:
        id:
          type: string
        stepName:
          type: string
        stepType:
          type: string
          enum: [API, WEB]
        status:
          $ref: '#/components/schemas/ExecutionStatus'
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
        duration:
          type: integer
        request:
          type: object
          description: Détails de la requête (pour API)
        response:
          type: object
          description: Détails de la réponse (pour API)
        assertions:
          type: array
          items:
            $ref: '#/components/schemas/AssertionResult'
        error:
          type: string

    AssertionResult:
      type: object
      properties:
        type:
          type: string
        expected:
          {}
        actual:
          {}
        passed:
          type: boolean
        message:
          type: string

    Artifact:
      type: object
      properties:
        id:
          type: string
        type:
          type: string
          enum: [SCREENSHOT, REPORT_HTML, REPORT_PDF, REPORT_JSON, LOG]
        name:
          type: string
        url:
          type: string
        size:
          type: integer
        createdAt:
          type: string
          format: date-time

    ExecutionReport:
      type: object
      properties:
        execution:
          $ref: '#/components/schemas/ExecutionSummary'
        summary:
          $ref: '#/components/schemas/ExecutionSummaryStats'
        steps:
          type: array
          items:
            $ref: '#/components/schemas/StepResult'
        artifacts:
          type: array
          items:
            $ref: '#/components/schemas/Artifact'

    # ===== Credentials =====
    CredentialType:
      type: string
      enum: [BASIC, API_KEY, JWT, OAUTH2, CERTIFICATE]

    CredentialCreate:
      type: object
      required: [name, type, value]
      properties:
        name:
          type: string
        type:
          $ref: '#/components/schemas/CredentialType'
        environmentId:
          type: string
        value:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
            apiKey:
              type: string
            token:
              type: string
            refreshToken:
              type: string
            clientId:
              type: string
            clientSecret:
              type: string
            tokenUrl:
              type: string
        metadata:
          type: object
          properties:
            expiresAt:
              type: string
              format: date-time
            scopes:
              type: array
              items:
                type: string

    CredentialUpdate:
      type: object
      properties:
        name:
          type: string
        value:
          type: object
        metadata:
          type: object

    CredentialSummary:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        type:
          $ref: '#/components/schemas/CredentialType'
        environmentId:
          type: string
        environmentName:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    # ===== API Keys =====
    ApiKeyCreate:
      type: object
      required: [name]
      properties:
        name:
          type: string
        permissions:
          type: array
          items:
            type: string
          description: Liste des permissions (ex: applications:read, tests:execute)
        expiresAt:
          type: string
          format: date-time

    ApiKeySummary:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        prefix:
          type: string
          description: Premiers caractères de la clé
        permissions:
          type: array
          items:
            type: string
        lastUsedAt:
          type: string
          format: date-time
        expiresAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time

    ApiKeyCreated:
      allOf:
        - $ref: '#/components/schemas/ApiKeySummary'
        - type: object
          properties:
            key:
              type: string
              description: Clé complète (visible une seule fois)

    # ===== System =====
    SystemHealth:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        version:
          type: string
        uptime:
          type: integer
        checks:
          type: object
          properties:
            database:
              type: string
            redis:
              type: string
            s3:
              type: string

    # ===== Common =====
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

    Error:
      type: object
      properties:
        statusCode:
          type: integer
        error:
          type: string
        message:
          type: string
        details:
          type: object
```

---

## Notes d'Implémentation

### Variables et Templating

Le système supporte le templating dans les configurations de test :

| Syntaxe | Description | Exemple |
|---------|-------------|---------|
| `{{credentials.xxx}}` | Valeur du credential | `{{credentials.password}}` |
| `{{env.xxx}}` | Variable d'environnement | `{{env.baseUrl}}` |
| `{{extract.xxx}}` | Variable extraite | `{{extract.token}}` |
| `{{app.xxx}}` | Propriété de l'application | `{{app.name}}` |

### Codes de Permission

Les permissions pour les API Keys suivent le format `resource:action` :

| Permission | Description |
|------------|-------------|
| `applications:read` | Lire les applications |
| `applications:write` | Créer/modifier les applications |
| `tests:read` | Lire les tests |
| `tests:write` | Créer/modifier les tests |
| `tests:execute` | Exécuter les tests |
| `credentials:read` | Lister les credentials |
| `credentials:write` | Créer/modifier les credentials |
| `executions:read` | Lire les exécutions |
| `reports:read` | Accéder aux rapports |
| `admin:*` | Toutes les permissions |

### Webhooks (Post-MVP)

Pour recevoir des notifications :

```http
POST /webhooks
{
  "url": "https://my-server.com/webhook",
  "events": ["execution.completed", "execution.failed"],
  "secret": "webhook-secret-for-signature"
}
```
