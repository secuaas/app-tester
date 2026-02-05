#!/bin/bash

# Script pour créer les secrets Kubernetes JumpCloud SSO
# Usage: ./k8s/create-sso-secrets.sh

set -e

echo "=== TestForge - Création Secrets JumpCloud SSO ==="
echo ""

# Variables à configurer
read -p "JUMPCLOUD_CLIENT_ID: " CLIENT_ID
read -p "JUMPCLOUD_CLIENT_SECRET: " CLIENT_SECRET
read -p "JUMPCLOUD_ORG_ID: " ORG_ID
read -p "JUMPCLOUD_CALLBACK_URL [https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/callback]: " CALLBACK_URL
CALLBACK_URL=${CALLBACK_URL:-https://testforge-backend.k8s-dev.secuaas.ca/auth/sso/callback}
read -p "FRONTEND_URL [https://testforge.k8s-dev.secuaas.ca]: " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-https://testforge.k8s-dev.secuaas.ca}
read -p "SSO_GROUP_SUPER_ADMIN [secuaas-super-admins]: " GROUP_SUPER_ADMIN
GROUP_SUPER_ADMIN=${GROUP_SUPER_ADMIN:-secuaas-super-admins}
read -p "SSO_GROUP_ADMIN [secuaas-admins]: " GROUP_ADMIN
GROUP_ADMIN=${GROUP_ADMIN:-secuaas-admins}
read -p "SSO_GROUP_USER [secuaas-users]: " GROUP_USER
GROUP_USER=${GROUP_USER:-secuaas-users}

echo ""
echo "Configuration SSO:"
echo "  CLIENT_ID: $CLIENT_ID"
echo "  ORG_ID: $ORG_ID"
echo "  CALLBACK_URL: $CALLBACK_URL"
echo "  FRONTEND_URL: $FRONTEND_URL"
echo "  SUPER_ADMIN_GROUP: $GROUP_SUPER_ADMIN"
echo "  ADMIN_GROUP: $GROUP_ADMIN"
echo "  USER_GROUP: $GROUP_USER"
echo ""

read -p "Confirmer la création des secrets? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Annulé."
    exit 1
fi

# Supprime le secret existant si présent
echo "Suppression du secret existant (si présent)..."
secuops kubectl --env=k8s-dev -- delete secret jumpcloud-sso -n testforge 2>/dev/null || true

# Crée le nouveau secret
echo "Création du secret jumpcloud-sso..."
secuops kubectl --env=k8s-dev -- create secret generic jumpcloud-sso \
  --namespace=testforge \
  --from-literal=JUMPCLOUD_CLIENT_ID="$CLIENT_ID" \
  --from-literal=JUMPCLOUD_CLIENT_SECRET="$CLIENT_SECRET" \
  --from-literal=JUMPCLOUD_ORG_ID="$ORG_ID" \
  --from-literal=JUMPCLOUD_CALLBACK_URL="$CALLBACK_URL" \
  --from-literal=FRONTEND_URL="$FRONTEND_URL" \
  --from-literal=SSO_GROUP_SUPER_ADMIN="$GROUP_SUPER_ADMIN" \
  --from-literal=SSO_GROUP_ADMIN="$GROUP_ADMIN" \
  --from-literal=SSO_GROUP_USER="$GROUP_USER"

echo ""
echo "✅ Secret jumpcloud-sso créé avec succès!"
echo ""
echo "Vérification du secret:"
secuops kubectl --env=k8s-dev -- get secret jumpcloud-sso -n testforge

echo ""
echo "Pour activer SSO dans le backend, ajouter les variables d'environnement dans k8s/backend.yaml:"
echo ""
cat <<'EOT'
env:
  # ... autres variables ...
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
EOT

echo ""
echo "Pour activer SSO dans le frontend, ajouter dans k8s/frontend.yaml:"
echo ""
cat <<'EOT'
env:
  - name: VITE_SSO_ENABLED
    value: "true"
EOT

echo ""
echo "Ensuite, rebuild et redeploy:"
echo "  secuops build --app=testforge --env=k8s-dev"
echo "  secuops kubectl --env=k8s-dev -- rollout restart deployment/backend -n testforge"
echo "  secuops kubectl --env=k8s-dev -- rollout restart deployment/frontend -n testforge"
echo ""
