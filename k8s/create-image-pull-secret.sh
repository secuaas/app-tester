#!/bin/bash

# Script to create imagePullSecret for GitHub Container Registry
# This allows Kubernetes to pull private images from ghcr.io

set -e

NAMESPACE="testforge"
SECRET_NAME="ghcr-secret"

echo "Creating imagePullSecret for GHCR..."
echo ""
echo "You need a GitHub Personal Access Token with 'read:packages' permission."
echo "Create one at: https://github.com/settings/tokens/new"
echo ""

# Prompt for username and token
read -p "GitHub Username: " GITHUB_USER
read -sp "GitHub Token (PAT): " GITHUB_TOKEN
echo ""

# Create the secret using secuops
secuops kubectl -e prod -- create secret docker-registry ${SECRET_NAME} \
  --namespace=${NAMESPACE} \
  --docker-server=ghcr.io \
  --docker-username="${GITHUB_USER}" \
  --docker-password="${GITHUB_TOKEN}" \
  --docker-email="${GITHUB_USER}@users.noreply.github.com"

echo "✅ ImagePullSecret '${SECRET_NAME}' created in namespace '${NAMESPACE}'"
echo ""
echo "To delete this secret later:"
echo "  secuops kubectl -e prod -- delete secret ${SECRET_NAME} -n ${NAMESPACE}"
