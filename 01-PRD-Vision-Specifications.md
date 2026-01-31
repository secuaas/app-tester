# TestForge - Product Requirements Document

## Vision et Objectifs

**Version:** 1.0  
**Date:** 30 janvier 2026  
**Auteur:** SecuAAS  
**Statut:** Draft

---

## 1. Executive Summary

### 1.1 Contexte

SecuAAS développe et maintient plusieurs applications web et APIs dans le cadre de ses services de cybersécurité (ConformVault, SecuOps, portails clients, etc.). La multiplication des applications nécessite une approche systématique pour valider leur bon fonctionnement après chaque déploiement.

### 1.2 Problème à Résoudre

Actuellement, les tests de validation sont effectués manuellement ou via des scripts disparates, ce qui présente plusieurs défis :

- Absence de centralisation des procédures de test
- Impossibilité de tracer l'historique des tests et leurs résultats
- Difficulté à intégrer les tests dans une pipeline CI/CD automatisée
- Manque de visibilité sur l'état de santé global des applications
- Gestion manuelle et non sécurisée des credentials de test

### 1.3 Solution Proposée

**TestForge** est une plateforme centralisée de tests automatisés qui permet de :

- Définir des procédures de tests (API et Web) de manière déclarative
- Exécuter ces tests manuellement ou via API/scripts
- Gérer de manière sécurisée les credentials d'authentification
- Générer des rapports détaillés de conformité
- S'intégrer nativement avec Claude pour des tests pilotés par IA

### 1.4 Proposition de Valeur

| Bénéfice | Impact |
|----------|--------|
| Centralisation | Une seule source de vérité pour tous les tests |
| Automatisation | Tests exécutables par script, API, ou IA |
| Traçabilité | Historique complet des résultats |
| Sécurité | Gestion cryptée des credentials |
| Scalabilité | Architecture extensible pour nouvelles applications |

---

## 2. Périmètre Fonctionnel

### 2.1 Fonctionnalités Principales (MVP)

#### 2.1.1 Gestion des Applications

Le système doit permettre d'enregistrer et gérer les applications à tester :

- **Enregistrement d'application** : Nom, description, URL de base (dev/staging/prod), type (API, Web, Hybride)
- **Configuration d'environnements** : Chaque application peut avoir plusieurs environnements avec leurs URLs respectives
- **État de santé** : Indicateur visuel du dernier état de test connu
- **Groupement** : Organisation des applications par projet ou domaine métier

#### 2.1.2 Définition des Procédures de Test

Le système doit supporter deux types de tests :

**Tests API :**
- Définition de requêtes HTTP (GET, POST, PUT, DELETE, PATCH)
- Configuration des headers, body, query parameters
- Assertions sur : status code, body content, headers de réponse, temps de réponse
- Chaînage de requêtes avec extraction de variables (ex: token JWT)
- Support des formats JSON, XML, form-data

**Tests Web (E2E) :**
- Navigation vers URL
- Interactions : click, type, select, scroll, wait
- Assertions : présence d'élément, texte visible, attributs
- Capture d'écran sur erreur
- Support des sélecteurs CSS et XPath

**Structure d'une procédure de test :**
```yaml
name: "Test complet de ConformVault"
application: "conformvault"
environment: "dev"
timeout: 300s
steps:
  - type: api
    name: "Health check"
    request:
      method: GET
      path: /health
    assert:
      status: 200
      
  - type: api
    name: "Login"
    request:
      method: POST
      path: /auth/login
      body:
        email: "{{credentials.email}}"
        password: "{{credentials.password}}"
    extract:
      token: "response.body.token"
    assert:
      status: 200
      
  - type: web
    name: "Vérification dashboard"
    actions:
      - navigate: "{{app.baseUrl}}/dashboard"
      - wait: selector("#main-content")
      - assert: text("Bienvenue")
```

#### 2.1.3 Gestion des Credentials

Le système doit gérer de manière sécurisée les informations d'authentification :

- **Types supportés** :
  - Username/Password
  - API Keys
  - JWT Tokens (avec refresh automatique)
  - OAuth2/SSO (client credentials, authorization code)
  - Certificats clients

- **Stockage sécurisé** :
  - Chiffrement AES-256 au repos
  - Accès via rôles et permissions
  - Audit log de chaque accès
  - Rotation des secrets supportée

- **Injection automatique** :
  - Les credentials sont injectés dans les tests via templating
  - Support des headers Authorization, cookies, body fields
  - Gestion automatique du refresh des tokens expirés

#### 2.1.4 Exécution des Tests

**Modes d'exécution :**

| Mode | Description | Cas d'usage |
|------|-------------|-------------|
| Manuel | Via interface web, bouton "Lancer le test" | Validation ponctuelle |
| API | Endpoint REST pour déclencher un test | Intégration CI/CD |
| Planifié | Cron jobs configurables | Monitoring continu |
| IA | Via Claude/MCP pour tests intelligents | Tests exploratoires |

**Paramètres d'exécution :**
- Environnement cible (dev, staging, prod)
- Mode verbose/debug
- Timeout global et par étape
- Retry automatique sur échec
- Tags de filtrage des tests à exécuter

#### 2.1.5 Rapports et Résultats

**Contenu du rapport :**
- Résumé global : nombre de tests passés/échoués/skippés
- Durée totale d'exécution
- Détail par étape : statut, durée, assertions, logs
- Captures d'écran (tests web)
- Requêtes/réponses complètes (tests API)
- Diff entre résultats attendus et obtenus

**Formats de sortie :**
- HTML (visualisation web)
- JSON (intégration programmatique)
- JUnit XML (compatibilité CI/CD)
- PDF (archivage)

**Historisation :**
- Conservation configurable (ex: 90 jours)
- Comparaison entre exécutions
- Tendances et métriques

### 2.2 Fonctionnalités Avancées (Post-MVP)

#### 2.2.1 Tests Intelligents via IA

Intégration avec Claude pour :
- Génération automatique de cas de test à partir de spécifications
- Analyse des échecs et suggestions de correction
- Tests exploratoires basés sur le contexte de l'application
- Validation sémantique des réponses (pas juste syntaxique)

#### 2.2.2 Monitoring et Alerting

- Tests périodiques automatiques (health checks)
- Alertes sur dégradation (Slack, email, webhook)
- Dashboard temps réel de l'état des applications
- SLA tracking et métriques de disponibilité

#### 2.2.3 Collaboration

- Partage de procédures de test entre projets
- Bibliothèque de tests réutilisables
- Commentaires et annotations sur les résultats
- Workflow d'approbation pour les nouvelles procédures

---

## 3. Exigences Non-Fonctionnelles

### 3.1 Performance

| Métrique | Objectif |
|----------|----------|
| Temps de démarrage d'un test | < 2 secondes |
| Tests API parallèles | Jusqu'à 10 simultanés |
| Tests Web parallèles | Jusqu'à 3 simultanés |
| Génération de rapport | < 5 secondes |
| API latency (p95) | < 200ms |

### 3.2 Sécurité

- Authentification obligatoire pour toutes les opérations
- Chiffrement TLS 1.3 pour toutes les communications
- Chiffrement AES-256-GCM pour les credentials stockés
- RBAC (Role-Based Access Control) avec granularité par application
- Audit logging de toutes les actions sensibles
- Conformité aux bonnes pratiques OWASP

### 3.3 Disponibilité

- Objectif de disponibilité : 99.5%
- Déploiement sur Kubernetes OVH (existant)
- Healthchecks et auto-recovery
- Backup quotidien des données

### 3.4 Scalabilité

- Support de 50+ applications
- 1000+ procédures de test
- 100+ exécutions par jour
- Architecture horizontalement scalable

### 3.5 Maintenabilité

- Code documenté et testé
- Logs structurés (JSON)
- Métriques Prometheus exposées
- Documentation API OpenAPI 3.0

---

## 4. Personas et Cas d'Usage

### 4.1 Persona Principal : DevOps/Développeur (Olivier)

**Contexte :** Gère l'infrastructure et développe les applications SecuAAS

**Besoins :**
- Valider rapidement qu'une application fonctionne après déploiement
- Automatiser les tests dans la pipeline CI/CD
- Avoir une vue d'ensemble de l'état de santé des applications
- Déléguer certains tests à Claude pour gagner du temps

**Cas d'usage typiques :**

1. **Post-déploiement** : Après un `kubectl apply`, lancer automatiquement la suite de tests de l'application
2. **Debug** : Exécuter un test spécifique en mode verbose pour identifier un problème
3. **Monitoring** : Consulter le dashboard pour voir si toutes les apps sont fonctionnelles
4. **Automatisation IA** : Demander à Claude "teste ConformVault et dis-moi si tout fonctionne"

### 4.2 Persona Secondaire : Claude (IA Assistant)

**Contexte :** Assistant IA utilisé pour automatiser des tâches

**Besoins :**
- Accéder à l'API de TestForge pour lancer des tests
- Récupérer et interpréter les résultats
- Suggérer des actions correctives

**Cas d'usage typiques :**

1. **Test à la demande** : "Lance les tests de ConformVault sur dev"
2. **Diagnostic** : "Pourquoi le test d'authentification échoue-t-il ?"
3. **Rapport** : "Donne-moi un résumé de l'état de toutes les applications"

---

## 5. User Stories

### 5.1 Gestion des Applications

| ID | Story | Priorité |
|----|-------|----------|
| US-001 | En tant qu'utilisateur, je veux enregistrer une nouvelle application avec ses environnements | Must |
| US-002 | En tant qu'utilisateur, je veux voir la liste de toutes mes applications avec leur statut | Must |
| US-003 | En tant qu'utilisateur, je veux modifier les informations d'une application | Must |
| US-004 | En tant qu'utilisateur, je veux supprimer une application et ses tests associés | Should |
| US-005 | En tant qu'utilisateur, je veux grouper mes applications par projet | Could |

### 5.2 Gestion des Tests

| ID | Story | Priorité |
|----|-------|----------|
| US-010 | En tant qu'utilisateur, je veux créer une procédure de test API | Must |
| US-011 | En tant qu'utilisateur, je veux créer une procédure de test Web E2E | Must |
| US-012 | En tant qu'utilisateur, je veux chaîner plusieurs étapes dans un test | Must |
| US-013 | En tant qu'utilisateur, je veux définir des assertions sur les réponses | Must |
| US-014 | En tant qu'utilisateur, je veux utiliser des variables extraites d'étapes précédentes | Must |
| US-015 | En tant qu'utilisateur, je veux importer/exporter mes tests en YAML | Should |

### 5.3 Gestion des Credentials

| ID | Story | Priorité |
|----|-------|----------|
| US-020 | En tant qu'utilisateur, je veux stocker des credentials de manière sécurisée | Must |
| US-021 | En tant qu'utilisateur, je veux associer des credentials à une application/environnement | Must |
| US-022 | En tant qu'utilisateur, je veux que les tokens JWT soient rafraîchis automatiquement | Should |
| US-023 | En tant qu'utilisateur, je veux configurer une authentification OAuth2 | Should |

### 5.4 Exécution et Résultats

| ID | Story | Priorité |
|----|-------|----------|
| US-030 | En tant qu'utilisateur, je veux lancer un test depuis l'interface web | Must |
| US-031 | En tant qu'utilisateur, je veux lancer un test via API | Must |
| US-032 | En tant qu'utilisateur, je veux voir le rapport détaillé d'une exécution | Must |
| US-033 | En tant qu'utilisateur, je veux voir l'historique des exécutions | Must |
| US-034 | En tant qu'utilisateur, je veux exporter un rapport en PDF | Should |
| US-035 | En tant qu'utilisateur, je veux planifier des tests récurrents | Should |

### 5.5 Intégration IA

| ID | Story | Priorité |
|----|-------|----------|
| US-040 | En tant que Claude, je veux lister les applications disponibles | Must |
| US-041 | En tant que Claude, je veux déclencher un test et récupérer les résultats | Must |
| US-042 | En tant que Claude, je veux obtenir un résumé de l'état de santé global | Should |

---

## 6. Wireframes et Maquettes

### 6.1 Dashboard Principal

```
┌─────────────────────────────────────────────────────────────────┐
│  TestForge                                    [User] [Settings] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Vue d'ensemble                                              │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │   Total     │   Healthy   │   Warning   │   Failed    │     │
│  │     12      │      9      │      2      │      1      │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
│                                                                 │
│  📱 Applications                               [+ Nouvelle App] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● ConformVault          API+Web    Dev ✅  Prod ⚠️     │   │
│  │   Dernière exécution: il y a 2h - 15/16 tests passés   │   │
│  │                                      [Tester] [Détails] │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ● SecuOps API           API        Dev ✅  Prod ✅     │   │
│  │   Dernière exécution: il y a 30min - 8/8 tests passés  │   │
│  │                                      [Tester] [Détails] │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ● Client Portal         Web        Dev ❌  Prod ✅     │   │
│  │   Dernière exécution: il y a 1h - 5/12 tests passés    │   │
│  │                                      [Tester] [Détails] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Détail d'une Application

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Retour    ConformVault                          [Éditer]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Type: API + Web    │    Environnements: Dev, Staging, Prod    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  🧪 Procédures de Test                    [+ Nouvelle Procédure]│
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ □ Health Check API              API     30s    [▶][✏][🗑]│   │
│  │ □ Authentication Flow           API     45s    [▶][✏][🗑]│   │
│  │ □ File Upload Complete          API     120s   [▶][✏][🗑]│   │
│  │ □ Dashboard Navigation          Web     60s    [▶][✏][🗑]│   │
│  │ □ Full Integration Suite        Mixed   300s   [▶][✏][🗑]│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Exécuter la sélection sur: [Dev ▼]]                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📜 Historique des Exécutions                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 30/01/2026 14:30  Dev   Full Suite    15/16 ⚠️  [Voir] │   │
│  │ 30/01/2026 10:00  Dev   Health Check   1/1  ✅  [Voir] │   │
│  │ 29/01/2026 18:45  Prod  Full Suite    16/16 ✅  [Voir] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Éditeur de Procédure de Test

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Retour    Édition: Full Integration Suite       [Sauvegarder]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Nom: [Full Integration Suite                              ]    │
│  Timeout: [300] secondes     Tags: [integration, critical  ]    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📋 Étapes                                        [+ Ajouter]   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. [API] Health Check                              [≡][🗑]│   │
│  │    GET /health                                           │   │
│  │    Assert: status = 200                                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 2. [API] Login                                     [≡][🗑]│   │
│  │    POST /auth/login                                      │   │
│  │    Body: { email, password } from credentials            │   │
│  │    Extract: token = response.body.token                  │   │
│  │    Assert: status = 200                                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 3. [WEB] Dashboard Check                           [≡][🗑]│   │
│  │    Navigate: {{baseUrl}}/dashboard                       │   │
│  │    Wait: #main-content                                   │   │
│  │    Assert: text contains "Bienvenue"                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  🔑 Credentials utilisés: [conformvault-dev-admin ▼]            │
│                                                                 │
│  [Tester maintenant]  [Exporter YAML]  [Annuler]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Roadmap

### Phase 1 : MVP (4-6 semaines)

**Objectif :** Version fonctionnelle minimale pour usage interne

| Semaine | Livrables |
|---------|-----------|
| S1-2 | Architecture, setup projet, modèle de données, API CRUD applications |
| S3-4 | Moteur de test API, gestion des credentials, API d'exécution |
| S5-6 | Interface web basique, rapports JSON/HTML, intégration MCP Claude |

**Critères de succès MVP :**
- [ ] Pouvoir enregistrer une application
- [ ] Créer et exécuter un test API basique
- [ ] Stocker et utiliser des credentials
- [ ] Générer un rapport de résultats
- [ ] Lancer un test via API (pour Claude)

### Phase 2 : Tests Web (2-3 semaines)

**Objectif :** Support complet des tests E2E

| Semaine | Livrables |
|---------|-----------|
| S7-8 | Moteur Playwright, actions web, captures d'écran |
| S9 | Éditeur visuel d'étapes web, debugging |

### Phase 3 : Production Ready (2-3 semaines)

**Objectif :** Robustesse et fonctionnalités avancées

| Semaine | Livrables |
|---------|-----------|
| S10-11 | Scheduling, historisation, métriques, alerting |
| S12 | Documentation, tests, hardening sécurité |

---

## 8. Critères d'Acceptation Globaux

### 8.1 Qualité

- Couverture de tests unitaires > 70%
- Tests d'intégration pour tous les flux critiques
- Pas de vulnérabilités critiques ou hautes (scan OWASP)
- Documentation API complète et à jour

### 8.2 Performance

- Temps de réponse API < 200ms (p95)
- Interface web responsive (< 3s de chargement initial)
- Exécution de tests parallélisée efficacement

### 8.3 Sécurité

- Audit de sécurité passé
- Credentials jamais exposés dans les logs ou rapports
- Authentification et autorisation fonctionnelles

---

## 9. Risques et Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Complexité des tests Web E2E | Moyen | Haute | Commencer par tests API, ajouter Web en phase 2 |
| Gestion des timeouts/flaky tests | Moyen | Moyenne | Mécanisme de retry, logs détaillés |
| Sécurité des credentials | Haute | Basse | Chiffrement fort, audit, accès limités |
| Adoption par Claude | Moyen | Basse | API simple et bien documentée |

---

## 10. Glossaire

| Terme | Définition |
|-------|------------|
| **Procédure de test** | Ensemble ordonné d'étapes de test pour valider une fonctionnalité |
| **Étape** | Action unitaire dans une procédure (requête API, action web, assertion) |
| **Assertion** | Vérification qu'une condition est vraie (status code, contenu, etc.) |
| **Credentials** | Informations d'authentification (login, tokens, clés API) |
| **Environnement** | Instance d'une application (dev, staging, prod) |
| **Rapport** | Document généré après exécution contenant les résultats détaillés |
| **MCP** | Model Context Protocol - protocole pour intégration avec Claude |
