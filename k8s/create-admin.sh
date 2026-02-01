#!/bin/bash

# Create admin user in TestForge backend running on Kubernetes

set -e

NAMESPACE="testforge"
EMAIL="${1:-admin@secuaas.ca}"
PASSWORD="${2:-TestForge2026!}"
NAME="${3:-Admin User}"

echo "👤 Creating admin user in TestForge"
echo "Email: ${EMAIL}"

# Check for secuops
if ! command -v secuops &> /dev/null; then
    echo "❌ Error: secuops command not found"
    exit 1
fi

# Get backend pod
BACKEND_POD=$(secuops kubectl -e dev -- get pods -n ${NAMESPACE} -l app=backend -o jsonpath='{.items[0].metadata.name}')

if [ -z "$BACKEND_POD" ]; then
    echo "❌ Error: No backend pod found"
    exit 1
fi

echo "📦 Using pod: ${BACKEND_POD}"

# Create admin user script
CREATE_ADMIN_SCRIPT=$(cat <<'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
      role: 'ADMIN',
    },
    create: {
      email,
      password: hashedPassword,
      name,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created/updated:', user.email);
  console.log('ID:', user.id);
  console.log('Role:', user.role);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF
)

# Execute the script in the backend pod
echo "🔧 Creating admin user..."
secuops kubectl -e dev -- exec -n ${NAMESPACE} ${BACKEND_POD} -- sh -c "
cat > /tmp/create-admin.js <<'EOFSCRIPT'
${CREATE_ADMIN_SCRIPT}
EOFSCRIPT

ADMIN_EMAIL='${EMAIL}' ADMIN_PASSWORD='${PASSWORD}' ADMIN_NAME='${NAME}' node /tmp/create-admin.js
rm /tmp/create-admin.js
"

echo ""
echo "✅ Admin user created successfully!"
echo ""
echo "📝 Login credentials:"
echo "  Email: ${EMAIL}"
echo "  Password: ${PASSWORD}"
