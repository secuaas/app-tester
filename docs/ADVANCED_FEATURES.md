# TestForge - Fonctionnalités Avancées

Ce document décrit les fonctionnalités avancées de TestForge implémentées en Phase 4.

## 📊 Monitoring & Métriques (Prometheus)

TestForge expose des métriques Prometheus sur l'endpoint `/metrics`.

### Métriques Disponibles

**Métriques HTTP:**
- `http_requests_total` - Compteur total des requêtes HTTP
  - Labels: `method`, `route`, `status_code`
- `http_request_duration_seconds` - Histogramme de la durée des requêtes
  - Labels: `method`, `route`, `status_code`
  - Buckets: 0.1, 0.5, 1, 2, 5, 10 secondes

**Métriques Tests:**
- `test_executions_total` - Compteur total d'exécutions de tests
  - Labels: `status`, `test_type`
- `test_execution_duration_seconds` - Histogramme de durée d'exécution
  - Labels: `test_type`, `status`
  - Buckets: 1, 5, 10, 30, 60, 120, 300 secondes
- `active_tests_total` - Jauge du nombre de tests actifs

**Métriques Credentials:**
- `credentials_total` - Nombre total de credentials stockés
  - Labels: `type`

**Métriques par Défaut:**
- Métriques Node.js standards (CPU, mémoire, GC, etc.)

### Configuration Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'testforge'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Visualisation Grafana

Import du dashboard TestForge:
1. Connecter Prometheus comme datasource
2. Importer le dashboard depuis `docs/grafana-dashboard.json`
3. Visualiser les métriques en temps réel

## ⏰ Scheduling Automatique

TestForge permet de planifier des exécutions automatiques de tests via des expressions cron.

### Créer un Schedule

```bash
POST /api/v1/schedules
Content-Type: application/json
Authorization: Bearer <token>

{
  "testId": "test-uuid",
  "environmentId": "env-uuid",
  "cronExpression": "0 0 * * *",
  "isActive": true
}
```

### Exemples d'Expressions Cron

```
"0 0 * * *"    # Tous les jours à minuit
"0 */6 * * *"  # Toutes les 6 heures
"0 9-17 * * 1-5"  # Lun-Ven de 9h à 17h
"*/15 * * * *" # Toutes les 15 minutes
"0 0 * * 0"    # Tous les dimanches à minuit
```

### Gérer les Schedules

```bash
# Lister tous les schedules
GET /api/v1/schedules

# Obtenir un schedule
GET /api/v1/schedules/:id

# Modifier un schedule
PATCH /api/v1/schedules/:id
{
  "cronExpression": "0 */12 * * *",
  "isActive": false
}

# Supprimer un schedule
DELETE /api/v1/schedules/:id
```

### Monitoring des Schedules

Chaque schedule track:
- `lastRunAt` - Dernière exécution
- `nextRunAt` - Prochaine exécution prévue
- `errorCount` - Nombre d'erreurs
- `lastError` - Dernière erreur rencontrée

## 🔔 Webhooks

TestForge peut notifier des systèmes externes via webhooks lors d'événements spécifiques.

### Événements Disponibles

- `execution.started` - Une exécution démarre
- `execution.completed` - Une exécution se termine (succès ou échec)
- `execution.failed` - Une exécution échoue

### Créer un Webhook

```bash
POST /api/v1/webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "events": ["execution.failed", "execution.completed"],
  "isActive": true
}
```

### Format du Payload

```json
{
  "event": "execution.completed",
  "timestamp": "2026-02-01T12:00:00.000Z",
  "data": {
    "execution": {
      "id": "exec-uuid",
      "testId": "test-uuid",
      "testName": "API Health Checks",
      "status": "SUCCESS",
      "duration": 5.234,
      "stepsTotal": 10,
      "stepsCompleted": 10,
      "stepsFailed": 0
    }
  }
}
```

### Vérification de Signature

Chaque webhook inclut une signature HMAC-SHA256 dans le header `X-TestForge-Signature`.

**Vérifier la signature (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Logs des Webhooks

Tous les webhooks sont loggés avec:
- Status (SUCCESS/FAILED)
- Code HTTP de réponse
- Payload de la requête
- Corps de la réponse
- Erreurs éventuelles

```bash
GET /api/v1/webhooks/:id/logs
```

### Retry Logic

⚠️ **Important:** TestForge n'implémente pas de retry automatique. Il est recommandé d'implémenter votre propre logique de retry côté récepteur.

## 📝 Documentation API (Swagger)

TestForge expose une documentation OpenAPI 3.0 complète.

### Accéder à la Documentation

```
http://localhost:3000/docs
https://testforge-backend.k8s-dev.secuaas.ca/docs
```

### Fonctionnalités Swagger UI

- 🔍 **Exploration interactive** des endpoints
- 🧪 **Test des API** directement depuis l'interface
- 📋 **Schémas** de requêtes/réponses
- 🔐 **Authentification** Bearer token intégrée
- 📖 **Documentation** complète de tous les paramètres

### Exporter la Spec OpenAPI

```bash
# Format JSON
GET /docs/json

# Format YAML
GET /docs/yaml
```

### Utiliser avec Postman

1. Importer la spec OpenAPI depuis `/docs/json`
2. Configurer l'authentification Bearer token
3. Tester les endpoints

## 🔒 Sécurité

### Webhooks

- Signatures HMAC-SHA256 pour vérifier l'authenticité
- Secrets générés automatiquement (32 bytes hex)
- Timeout de 10 secondes par webhook
- Isolation des erreurs (un webhook failed n'affecte pas les autres)

### Schedules

- Validation des expressions cron avant création
- Isolation des erreurs (un schedule failed continue de tourner)
- Logs d'erreurs pour debugging

### Métriques

- Endpoint `/metrics` public (pas d'auth requise)
- Pas de données sensibles exposées
- Uniquement des compteurs/histogrammes agrégés

## 📈 Best Practices

### Monitoring

1. **Configurer des alertes** sur:
   - `test_executions_total{status="FAILED"}` - Taux d'échec élevé
   - `http_request_duration_seconds` - Latence API élevée
   - `active_tests_total` - Nombre de tests anormal

2. **Dashboard Grafana** recommandé avec:
   - Graphe de taux d'exécution de tests
   - Taux de succès vs échec
   - Durée moyenne d'exécution
   - Latence API P50/P95/P99

### Scheduling

1. **Éviter** les schedules trop fréquents (< 1 minute)
2. **Stagger** les tests pour éviter la surcharge
3. **Monitor** les `errorCount` et investiguer
4. **Désactiver** temporairement en cas de problème

### Webhooks

1. **Implémenter** un retry côté récepteur
2. **Vérifier** toujours la signature
3. **Monitor** les logs de webhooks
4. **Limiter** le nombre d'événements abonnés
5. **Timeout** rapide (< 10s) côté récepteur

## 🚀 Déploiement

### Prometheus en Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: testforge
data:
  prometheus.yml: |
    scrape_configs:
      - job_name: 'testforge'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - testforge
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: backend
```

### Grafana Dashboard

Import le dashboard depuis `docs/grafana-dashboard.json` ou créez-en un personnalisé.

### Variables d'Environnement

```bash
# Scheduler
SCHEDULER_ENABLED=true

# Webhooks
WEBHOOKS_ENABLED=true
WEBHOOKS_TIMEOUT=10000

# Metrics
METRICS_ENABLED=true
```

## 📚 Références

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Cron Expression Format](https://crontab.guru/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [HMAC Signature Verification](https://en.wikipedia.org/wiki/HMAC)
