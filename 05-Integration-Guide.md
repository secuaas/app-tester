# TestForge - Guide d'Intégration

## Intégration MCP, CI/CD et Scripts

**Version:** 1.0  
**Date:** 30 janvier 2026

---

## 1. Intégration MCP pour Claude

### 1.1 Vue d'Ensemble

TestForge expose un serveur MCP (Model Context Protocol) permettant à Claude d'interagir directement avec la plateforme de tests. Cette intégration permet des interactions comme :

- "Lance les tests de ConformVault sur dev"
- "Montre-moi l'état de santé de toutes les applications"
- "Pourquoi le dernier test a échoué ?"

### 1.2 Architecture MCP

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Desktop                            │
│                                                                 │
│  "Teste ConformVault et dis-moi si tout fonctionne"            │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TestForge MCP Server                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Available Tools                         │ │
│  │                                                           │ │
│  │  • testforge_list_applications                            │ │
│  │  • testforge_get_application                              │ │
│  │  • testforge_run_test                                     │ │
│  │  • testforge_get_execution_status                         │ │
│  │  • testforge_get_report                                   │ │
│  │  • testforge_health_summary                               │ │
│  │  • testforge_list_tests                                   │ │
│  │  • testforge_get_recent_executions                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TestForge API                               │
│                https://testforge.secuaas.ca/api/v1              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Configuration du Serveur MCP

**Installation :**

```bash
# Clone du repo
git clone https://github.com/secuaas/testforge-mcp.git
cd testforge-mcp

# Installation
npm install

# Configuration
cp .env.example .env
# Éditer .env avec l'URL et l'API Key
```

**Variables d'environnement :**

```bash
# .env
TESTFORGE_API_URL=https://testforge.secuaas.ca/api/v1
TESTFORGE_API_KEY=tf_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Configuration Claude Desktop :**

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%\Claude\claude_desktop_config.json (Windows)

{
  "mcpServers": {
    "testforge": {
      "command": "node",
      "args": ["/path/to/testforge-mcp/dist/index.js"],
      "env": {
        "TESTFORGE_API_URL": "https://testforge.secuaas.ca/api/v1",
        "TESTFORGE_API_KEY": "tf_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 1.4 Implémentation du Serveur MCP

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';

const API_URL = process.env.TESTFORGE_API_URL!;
const API_KEY = process.env.TESTFORGE_API_KEY!;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'X-API-Key': API_KEY }
});

const server = new Server(
  { name: 'testforge', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Liste des outils disponibles
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'testforge_list_applications',
      description: 'Liste toutes les applications enregistrées dans TestForge avec leur état de santé',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'testforge_get_application',
      description: 'Obtient les détails d\'une application spécifique',
      inputSchema: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Nom de l\'application' 
          }
        },
        required: ['name']
      }
    },
    {
      name: 'testforge_run_test',
      description: 'Lance l\'exécution d\'une suite de tests pour une application',
      inputSchema: {
        type: 'object',
        properties: {
          applicationName: { 
            type: 'string', 
            description: 'Nom de l\'application' 
          },
          testSuiteName: { 
            type: 'string', 
            description: 'Nom de la suite de tests (optionnel, exécute tous les tests si omis)' 
          },
          environment: { 
            type: 'string', 
            enum: ['dev', 'staging', 'prod'],
            description: 'Environnement cible'
          }
        },
        required: ['applicationName', 'environment']
      }
    },
    {
      name: 'testforge_get_execution_status',
      description: 'Obtient le statut d\'une exécution en cours ou terminée',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { 
            type: 'string', 
            description: 'ID de l\'exécution' 
          }
        },
        required: ['executionId']
      }
    },
    {
      name: 'testforge_get_report',
      description: 'Obtient le rapport détaillé d\'une exécution terminée',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { 
            type: 'string', 
            description: 'ID de l\'exécution' 
          }
        },
        required: ['executionId']
      }
    },
    {
      name: 'testforge_health_summary',
      description: 'Obtient un résumé de l\'état de santé de toutes les applications',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'testforge_list_tests',
      description: 'Liste les suites de tests d\'une application',
      inputSchema: {
        type: 'object',
        properties: {
          applicationName: { 
            type: 'string', 
            description: 'Nom de l\'application' 
          }
        },
        required: ['applicationName']
      }
    },
    {
      name: 'testforge_get_recent_executions',
      description: 'Obtient les exécutions récentes, optionnellement filtrées par application',
      inputSchema: {
        type: 'object',
        properties: {
          applicationName: { 
            type: 'string', 
            description: 'Nom de l\'application (optionnel)' 
          },
          limit: { 
            type: 'number', 
            description: 'Nombre d\'exécutions à retourner (défaut: 10)' 
          }
        }
      }
    }
  ]
}));

// Implémentation des outils
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'testforge_list_applications': {
        const { data } = await api.get('/applications');
        return formatApplicationList(data.data);
      }
      
      case 'testforge_get_application': {
        const app = await findApplicationByName(args.name);
        const { data } = await api.get(`/applications/${app.id}`);
        return formatApplicationDetail(data);
      }
      
      case 'testforge_run_test': {
        const app = await findApplicationByName(args.applicationName);
        
        // Trouver l'environnement
        const env = app.environments.find(e => e.name === args.environment);
        if (!env) {
          return { content: [{ type: 'text', text: `Environnement '${args.environment}' non trouvé` }] };
        }
        
        // Trouver la suite de tests
        let testSuiteId: string;
        if (args.testSuiteName) {
          const tests = await api.get(`/applications/${app.id}/tests`);
          const test = tests.data.find(t => t.name.toLowerCase().includes(args.testSuiteName.toLowerCase()));
          if (!test) {
            return { content: [{ type: 'text', text: `Suite de tests '${args.testSuiteName}' non trouvée` }] };
          }
          testSuiteId = test.id;
        } else {
          // Prendre la première suite de tests
          const tests = await api.get(`/applications/${app.id}/tests`);
          if (tests.data.length === 0) {
            return { content: [{ type: 'text', text: 'Aucune suite de tests configurée' }] };
          }
          testSuiteId = tests.data[0].id;
        }
        
        // Lancer l'exécution
        const { data } = await api.post(`/tests/${testSuiteId}/execute`, {
          environment: args.environment
        });
        
        return {
          content: [{
            type: 'text',
            text: `✅ Test lancé avec succès!\n\nID d'exécution: ${data.executionId}\nStatut: ${data.status}\n\nUtilisez testforge_get_execution_status pour suivre la progression.`
          }]
        };
      }
      
      case 'testforge_get_execution_status': {
        const { data } = await api.get(`/executions/${args.executionId}`);
        return formatExecutionStatus(data);
      }
      
      case 'testforge_get_report': {
        const { data } = await api.get(`/executions/${args.executionId}/report`);
        return formatReport(data);
      }
      
      case 'testforge_health_summary': {
        const { data } = await api.get('/applications');
        return formatHealthSummary(data.data);
      }
      
      case 'testforge_list_tests': {
        const app = await findApplicationByName(args.applicationName);
        const { data } = await api.get(`/applications/${app.id}/tests`);
        return formatTestList(data);
      }
      
      case 'testforge_get_recent_executions': {
        const params: any = { limit: args.limit || 10 };
        if (args.applicationName) {
          const app = await findApplicationByName(args.applicationName);
          params.applicationId = app.id;
        }
        const { data } = await api.get('/executions', { params });
        return formatExecutionList(data.data);
      }
      
      default:
        return { content: [{ type: 'text', text: `Outil inconnu: ${name}` }] };
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Erreur: ${error.response?.data?.message || error.message}`
      }]
    };
  }
});

// Fonctions utilitaires
async function findApplicationByName(name: string) {
  const { data } = await api.get('/applications', { params: { search: name } });
  const app = data.data.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
  if (!app) {
    throw new Error(`Application '${name}' non trouvée`);
  }
  return app;
}

function formatApplicationList(apps: any[]) {
  const lines = apps.map(app => {
    const status = app.lastExecution?.status === 'PASSED' ? '✅' :
                   app.lastExecution?.status === 'FAILED' ? '❌' : '⚪';
    return `${status} ${app.name} (${app.type}) - ${app.testCount} tests`;
  });
  
  return {
    content: [{
      type: 'text',
      text: `📱 Applications (${apps.length}):\n\n${lines.join('\n')}`
    }]
  };
}

function formatHealthSummary(apps: any[]) {
  const healthy = apps.filter(a => a.lastExecution?.status === 'PASSED').length;
  const failed = apps.filter(a => a.lastExecution?.status === 'FAILED').length;
  const unknown = apps.filter(a => !a.lastExecution).length;
  
  let text = `📊 État de santé global:\n\n`;
  text += `✅ Saines: ${healthy}\n`;
  text += `❌ En échec: ${failed}\n`;
  text += `⚪ Non testées: ${unknown}\n\n`;
  
  if (failed > 0) {
    const failedApps = apps.filter(a => a.lastExecution?.status === 'FAILED');
    text += `⚠️ Applications en échec:\n`;
    failedApps.forEach(app => {
      text += `  - ${app.name}\n`;
    });
  }
  
  return { content: [{ type: 'text', text }] };
}

function formatReport(report: any) {
  let text = `📋 Rapport d'exécution\n\n`;
  text += `Application: ${report.execution.applicationName}\n`;
  text += `Suite: ${report.execution.testSuiteName}\n`;
  text += `Environnement: ${report.execution.environment}\n`;
  text += `Statut: ${report.execution.status === 'PASSED' ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}\n`;
  text += `Durée: ${(report.execution.duration / 1000).toFixed(1)}s\n\n`;
  
  text += `📊 Résumé: ${report.summary.passed}/${report.summary.total} tests passés\n\n`;
  
  text += `📝 Détail des étapes:\n`;
  report.steps.forEach((step: any, i: number) => {
    const icon = step.status === 'PASSED' ? '✅' : '❌';
    text += `\n${i + 1}. ${icon} ${step.stepName} (${step.duration}ms)\n`;
    
    if (step.status === 'FAILED' && step.error) {
      text += `   ⚠️ ${step.error}\n`;
    }
    
    step.assertions.forEach((assertion: any) => {
      const assertIcon = assertion.passed ? '✓' : '✗';
      text += `   ${assertIcon} ${assertion.type}: attendu ${JSON.stringify(assertion.expected)}, obtenu ${JSON.stringify(assertion.actual)}\n`;
    });
  });
  
  return { content: [{ type: 'text', text }] };
}

// ... autres fonctions de formatage

// Démarrage du serveur
const transport = new StdioServerTransport();
server.connect(transport);
```

### 1.5 Exemples d'Interactions avec Claude

**Scénario 1 : Vérification rapide**

> **Utilisateur** : "Est-ce que toutes mes applications fonctionnent ?"
>
> **Claude** : *utilise testforge_health_summary*
> 
> "📊 État de santé global:
> - ✅ Saines: 3
> - ❌ En échec: 1
> - ⚪ Non testées: 0
> 
> L'application Client Portal est en échec. Veux-tu que je lance les tests pour voir ce qui ne va pas ?"

**Scénario 2 : Test complet**

> **Utilisateur** : "Teste ConformVault sur l'environnement de dev"
>
> **Claude** : *utilise testforge_run_test*
> 
> "J'ai lancé les tests de ConformVault sur dev. L'exécution est en cours (ID: exec_abc123). Je vais vérifier le résultat dans quelques secondes..."
>
> *utilise testforge_get_execution_status après un délai*
>
> "Les tests sont terminés. 14/15 tests passés. Le test 'File Upload' a échoué avec l'erreur: timeout après 30 secondes. Veux-tu voir le rapport complet ?"

**Scénario 3 : Diagnostic d'échec**

> **Utilisateur** : "Pourquoi ConformVault a échoué hier ?"
>
> **Claude** : *utilise testforge_get_recent_executions*
>
> "Je vois une exécution échouée hier à 18:45. Laisse-moi récupérer le rapport..."
>
> *utilise testforge_get_report*
>
> "Le test 'Authentication Flow' a échoué à l'étape de login. L'API a retourné une erreur 401 (Invalid credentials). Il semble que les credentials de test aient expiré ou soient incorrects. Tu devrais vérifier et mettre à jour les credentials dans TestForge."

---

## 2. Intégration CI/CD

### 2.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy and Test

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/myapp -n production
      
      - name: Run TestForge Tests
        env:
          TESTFORGE_API_KEY: ${{ secrets.TESTFORGE_API_KEY }}
        run: |
          # Lancer les tests
          RESPONSE=$(curl -s -X POST \
            "https://testforge.secuaas.ca/api/v1/tests/test_abc123/execute" \
            -H "X-API-Key: $TESTFORGE_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"environment": "staging", "timeout": 300}')
          
          EXECUTION_ID=$(echo $RESPONSE | jq -r '.executionId')
          echo "Execution ID: $EXECUTION_ID"
          
          # Attendre la fin de l'exécution
          while true; do
            STATUS=$(curl -s \
              "https://testforge.secuaas.ca/api/v1/executions/$EXECUTION_ID" \
              -H "X-API-Key: $TESTFORGE_API_KEY" | jq -r '.status')
            
            echo "Status: $STATUS"
            
            if [ "$STATUS" = "PASSED" ]; then
              echo "✅ Tests passed!"
              exit 0
            elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "ERROR" ]; then
              echo "❌ Tests failed!"
              # Récupérer le rapport
              curl -s \
                "https://testforge.secuaas.ca/api/v1/executions/$EXECUTION_ID/report" \
                -H "X-API-Key: $TESTFORGE_API_KEY"
              exit 1
            fi
            
            sleep 10
          done
      
      - name: Upload Test Report
        if: always()
        run: |
          curl -s \
            "https://testforge.secuaas.ca/api/v1/executions/$EXECUTION_ID/report?format=junit" \
            -H "X-API-Key: $TESTFORGE_API_KEY" \
            -o test-results.xml
      
      - name: Publish Test Results
        uses: mikepenz/action-junit-report@v4
        if: always()
        with:
          report_paths: 'test-results.xml'
```

### 2.2 GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - deploy
  - test

variables:
  TESTFORGE_API_URL: https://testforge.secuaas.ca/api/v1

deploy:
  stage: deploy
  script:
    - kubectl apply -f k8s/
    - kubectl rollout status deployment/myapp

test:
  stage: test
  script:
    - |
      # Script de test
      RESPONSE=$(curl -s -X POST \
        "$TESTFORGE_API_URL/tests/$TEST_SUITE_ID/execute" \
        -H "X-API-Key: $TESTFORGE_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"environment": "staging"}')
      
      EXECUTION_ID=$(echo $RESPONSE | jq -r '.executionId')
      
      # Polling jusqu'à completion
      ./scripts/wait-for-tests.sh $EXECUTION_ID
  artifacts:
    when: always
    reports:
      junit: test-results.xml
```

### 2.3 Script de Test Standalone

```bash
#!/bin/bash
# scripts/run-tests.sh

set -e

# Configuration
TESTFORGE_API_URL="${TESTFORGE_API_URL:-https://testforge.secuaas.ca/api/v1}"
TESTFORGE_API_KEY="${TESTFORGE_API_KEY}"
APPLICATION="${1:-conformvault}"
ENVIRONMENT="${2:-dev}"
TIMEOUT="${3:-300}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧪 TestForge CLI${NC}"
echo "Application: $APPLICATION"
echo "Environment: $ENVIRONMENT"
echo ""

# Trouver l'application
echo "Recherche de l'application..."
APP_RESPONSE=$(curl -s "$TESTFORGE_API_URL/applications?search=$APPLICATION" \
  -H "X-API-Key: $TESTFORGE_API_KEY")

APP_ID=$(echo $APP_RESPONSE | jq -r '.data[0].id')
if [ "$APP_ID" = "null" ]; then
  echo -e "${RED}❌ Application '$APPLICATION' non trouvée${NC}"
  exit 1
fi

# Trouver les tests
TESTS_RESPONSE=$(curl -s "$TESTFORGE_API_URL/applications/$APP_ID/tests" \
  -H "X-API-Key: $TESTFORGE_API_KEY")

TEST_ID=$(echo $TESTS_RESPONSE | jq -r '.[0].id')
TEST_NAME=$(echo $TESTS_RESPONSE | jq -r '.[0].name')

echo "Suite de tests: $TEST_NAME"
echo ""

# Lancer l'exécution
echo "Lancement des tests..."
EXEC_RESPONSE=$(curl -s -X POST "$TESTFORGE_API_URL/tests/$TEST_ID/execute" \
  -H "X-API-Key: $TESTFORGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"environment\": \"$ENVIRONMENT\", \"timeout\": $TIMEOUT}")

EXECUTION_ID=$(echo $EXEC_RESPONSE | jq -r '.executionId')
echo "Execution ID: $EXECUTION_ID"
echo ""

# Attendre la fin
echo "En attente des résultats..."
START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  
  if [ $ELAPSED -gt $TIMEOUT ]; then
    echo -e "${RED}❌ Timeout après ${TIMEOUT}s${NC}"
    exit 1
  fi
  
  STATUS_RESPONSE=$(curl -s "$TESTFORGE_API_URL/executions/$EXECUTION_ID" \
    -H "X-API-Key: $TESTFORGE_API_KEY")
  
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
  
  case $STATUS in
    "PENDING"|"RUNNING")
      echo -ne "\r⏳ $STATUS... (${ELAPSED}s)"
      sleep 5
      ;;
    "PASSED")
      echo ""
      echo -e "${GREEN}✅ Tests passés!${NC}"
      break
      ;;
    "FAILED"|"ERROR")
      echo ""
      echo -e "${RED}❌ Tests échoués${NC}"
      
      # Afficher le rapport
      REPORT=$(curl -s "$TESTFORGE_API_URL/executions/$EXECUTION_ID/report" \
        -H "X-API-Key: $TESTFORGE_API_KEY")
      
      echo ""
      echo "Résumé:"
      echo $REPORT | jq '.summary'
      
      echo ""
      echo "Étapes échouées:"
      echo $REPORT | jq '.steps[] | select(.status == "FAILED")'
      
      exit 1
      ;;
  esac
done

# Afficher le résumé
REPORT=$(curl -s "$TESTFORGE_API_URL/executions/$EXECUTION_ID/report" \
  -H "X-API-Key: $TESTFORGE_API_KEY")

echo ""
echo "📊 Résumé:"
PASSED=$(echo $REPORT | jq '.summary.passed')
TOTAL=$(echo $REPORT | jq '.summary.total')
DURATION=$(echo $REPORT | jq '.execution.duration')

echo "   Tests: $PASSED/$TOTAL passés"
echo "   Durée: $((DURATION / 1000))s"
```

---

## 3. SDK Client

### 3.1 SDK TypeScript/Node.js

```typescript
// @secuaas/testforge-sdk

import axios, { AxiosInstance } from 'axios';

export interface TestForgeConfig {
  apiUrl: string;
  apiKey: string;
}

export interface Application {
  id: string;
  name: string;
  type: 'API' | 'WEB' | 'HYBRID';
  environments: Environment[];
}

export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
}

export interface ExecutionResult {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
  summary?: {
    total: number;
    passed: number;
    failed: number;
  };
}

export class TestForgeClient {
  private client: AxiosInstance;
  
  constructor(config: TestForgeConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: { 'X-API-Key': config.apiKey }
    });
  }
  
  // Applications
  async listApplications(): Promise<Application[]> {
    const { data } = await this.client.get('/applications');
    return data.data;
  }
  
  async getApplication(id: string): Promise<Application> {
    const { data } = await this.client.get(`/applications/${id}`);
    return data;
  }
  
  async findApplicationByName(name: string): Promise<Application | null> {
    const apps = await this.listApplications();
    return apps.find(a => a.name.toLowerCase().includes(name.toLowerCase())) || null;
  }
  
  // Tests
  async listTests(applicationId: string) {
    const { data } = await this.client.get(`/applications/${applicationId}/tests`);
    return data;
  }
  
  async runTest(testId: string, environment: string, options?: {
    timeout?: number;
    verbose?: boolean;
  }): Promise<{ executionId: string }> {
    const { data } = await this.client.post(`/tests/${testId}/execute`, {
      environment,
      ...options
    });
    return data;
  }
  
  // Executions
  async getExecution(executionId: string): Promise<ExecutionResult> {
    const { data } = await this.client.get(`/executions/${executionId}`);
    return data;
  }
  
  async getReport(executionId: string) {
    const { data } = await this.client.get(`/executions/${executionId}/report`);
    return data;
  }
  
  async waitForCompletion(executionId: string, options?: {
    timeout?: number;
    pollInterval?: number;
  }): Promise<ExecutionResult> {
    const timeout = options?.timeout || 300000; // 5 min
    const pollInterval = options?.pollInterval || 5000; // 5s
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const execution = await this.getExecution(executionId);
      
      if (['PASSED', 'FAILED', 'ERROR', 'CANCELLED'].includes(execution.status)) {
        return execution;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Timeout waiting for execution ${executionId}`);
  }
  
  // Convenience method
  async runTestAndWait(testId: string, environment: string, options?: {
    timeout?: number;
  }): Promise<ExecutionResult> {
    const { executionId } = await this.runTest(testId, environment, options);
    return this.waitForCompletion(executionId, { timeout: options?.timeout });
  }
}

// Export default
export default TestForgeClient;
```

**Utilisation :**

```typescript
import TestForgeClient from '@secuaas/testforge-sdk';

const client = new TestForgeClient({
  apiUrl: 'https://testforge.secuaas.ca/api/v1',
  apiKey: process.env.TESTFORGE_API_KEY!
});

async function runTests() {
  // Trouver l'application
  const app = await client.findApplicationByName('ConformVault');
  if (!app) throw new Error('Application not found');
  
  // Lister les tests
  const tests = await client.listTests(app.id);
  const fullSuite = tests.find(t => t.name.includes('Full'));
  
  // Lancer et attendre
  const result = await client.runTestAndWait(fullSuite.id, 'dev', {
    timeout: 300000
  });
  
  console.log(`Status: ${result.status}`);
  console.log(`Passed: ${result.summary?.passed}/${result.summary?.total}`);
  
  if (result.status === 'FAILED') {
    const report = await client.getReport(result.id);
    console.log('Failed steps:', report.steps.filter(s => s.status === 'FAILED'));
  }
}

runTests();
```

### 3.2 SDK Python

```python
# testforge_sdk.py

import requests
import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

@dataclass
class Application:
    id: str
    name: str
    type: str
    environments: List[Dict]

@dataclass  
class ExecutionResult:
    id: str
    status: str
    summary: Optional[Dict] = None

class TestForgeClient:
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers['X-API-Key'] = api_key
    
    def _get(self, path: str, **kwargs) -> Dict:
        response = self.session.get(f"{self.api_url}{path}", **kwargs)
        response.raise_for_status()
        return response.json()
    
    def _post(self, path: str, data: Dict = None, **kwargs) -> Dict:
        response = self.session.post(f"{self.api_url}{path}", json=data, **kwargs)
        response.raise_for_status()
        return response.json()
    
    def list_applications(self) -> List[Application]:
        data = self._get('/applications')
        return [Application(**app) for app in data['data']]
    
    def find_application_by_name(self, name: str) -> Optional[Application]:
        apps = self.list_applications()
        for app in apps:
            if name.lower() in app.name.lower():
                return app
        return None
    
    def list_tests(self, application_id: str) -> List[Dict]:
        return self._get(f'/applications/{application_id}/tests')
    
    def run_test(self, test_id: str, environment: str, 
                 timeout: int = 300) -> Dict:
        return self._post(f'/tests/{test_id}/execute', {
            'environment': environment,
            'timeout': timeout
        })
    
    def get_execution(self, execution_id: str) -> ExecutionResult:
        data = self._get(f'/executions/{execution_id}')
        return ExecutionResult(
            id=data['id'],
            status=data['status'],
            summary=data.get('summary')
        )
    
    def get_report(self, execution_id: str) -> Dict:
        return self._get(f'/executions/{execution_id}/report')
    
    def wait_for_completion(self, execution_id: str, 
                           timeout: int = 300,
                           poll_interval: int = 5) -> ExecutionResult:
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            result = self.get_execution(execution_id)
            
            if result.status in ['PASSED', 'FAILED', 'ERROR', 'CANCELLED']:
                return result
            
            time.sleep(poll_interval)
        
        raise TimeoutError(f"Timeout waiting for execution {execution_id}")
    
    def run_test_and_wait(self, test_id: str, environment: str,
                         timeout: int = 300) -> ExecutionResult:
        response = self.run_test(test_id, environment, timeout)
        return self.wait_for_completion(response['executionId'], timeout)


# Utilisation
if __name__ == '__main__':
    import os
    
    client = TestForgeClient(
        api_url='https://testforge.secuaas.ca/api/v1',
        api_key=os.environ['TESTFORGE_API_KEY']
    )
    
    # Trouver l'application
    app = client.find_application_by_name('ConformVault')
    if not app:
        raise Exception('Application not found')
    
    # Lister les tests
    tests = client.list_tests(app.id)
    test = tests[0]
    
    # Lancer et attendre
    result = client.run_test_and_wait(test['id'], 'dev')
    
    print(f"Status: {result.status}")
    print(f"Summary: {result.summary}")
    
    if result.status == 'FAILED':
        report = client.get_report(result.id)
        for step in report['steps']:
            if step['status'] == 'FAILED':
                print(f"Failed: {step['stepName']} - {step['error']}")
```

---

## 4. Webhooks (Post-MVP)

### 4.1 Configuration

```http
POST /api/v1/webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://my-server.com/testforge-webhook",
  "events": [
    "execution.completed",
    "execution.failed",
    "test.created"
  ],
  "secret": "my-webhook-secret"
}
```

### 4.2 Format des Events

```json
{
  "id": "evt_abc123",
  "type": "execution.completed",
  "timestamp": "2026-01-30T15:30:00Z",
  "data": {
    "executionId": "exec_xyz789",
    "testSuiteId": "test_123",
    "testSuiteName": "Full Integration Suite",
    "applicationId": "app_456",
    "applicationName": "ConformVault",
    "environment": "dev",
    "status": "PASSED",
    "summary": {
      "total": 15,
      "passed": 15,
      "failed": 0
    },
    "duration": 45000
  }
}
```

### 4.3 Vérification de Signature

```typescript
import * as crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}

// Express handler
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-testforge-signature'] as string;
  
  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(req.body);
  
  switch (event.type) {
    case 'execution.failed':
      // Envoyer une notification Slack
      notifySlack(`Test failed: ${event.data.testSuiteName}`);
      break;
  }
  
  res.status(200).send('OK');
});
```

---

## 5. Best Practices

### 5.1 Gestion des API Keys

- Créer des API Keys dédiées par environnement (CI/CD, monitoring, scripts)
- Utiliser des permissions minimales
- Faire tourner les clés régulièrement
- Ne jamais commiter les clés dans le code

### 5.2 Gestion des Erreurs

```typescript
try {
  const result = await client.runTestAndWait(testId, 'dev');
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      console.error('API Key invalide ou expirée');
    } else if (error.response?.status === 429) {
      console.error('Rate limit atteint, réessayer plus tard');
    } else {
      console.error('Erreur API:', error.response?.data?.message);
    }
  } else if (error.message.includes('Timeout')) {
    console.error('Les tests ont pris trop de temps');
  } else {
    throw error;
  }
}
```

### 5.3 Parallélisation

Pour tester plusieurs applications en parallèle :

```typescript
const apps = ['ConformVault', 'SecuOps', 'ClientPortal'];

const results = await Promise.all(
  apps.map(async (appName) => {
    const app = await client.findApplicationByName(appName);
    const tests = await client.listTests(app.id);
    return client.runTestAndWait(tests[0].id, 'dev');
  })
);

const failed = results.filter(r => r.status === 'FAILED');
if (failed.length > 0) {
  console.error(`${failed.length} applications ont échoué`);
  process.exit(1);
}
```

---

## 6. Troubleshooting

| Problème | Cause Possible | Solution |
|----------|----------------|----------|
| 401 Unauthorized | API Key invalide | Vérifier la clé, en générer une nouvelle |
| 403 Forbidden | Permissions insuffisantes | Ajouter les permissions nécessaires |
| 404 Not Found | Application/Test inexistant | Vérifier les IDs |
| Timeout | Tests trop longs | Augmenter le timeout |
| Connection refused | API inaccessible | Vérifier l'URL et le réseau |
