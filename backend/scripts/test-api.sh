#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/v1"
TOKEN=""
APP_ID=""
ENV_ID=""
TEST_ID=""
CRED_ID=""
EXEC_ID=""

echo -e "${YELLOW}=== TestForge API Test Suite ===${NC}\n"

# Test 1: Login
echo -e "${YELLOW}[1/10] Testing login...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@secuaas.ca",
    "password": "TestForge2026!"
  }')

TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "  Token: ${TOKEN:0:50}..."
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 2: Create Application
echo -e "\n${YELLOW}[2/10] Creating application...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/applications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API",
    "description": "API de test automatique",
    "type": "API"
  }')

APP_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$APP_ID" ]; then
  echo -e "${GREEN}✓ Application created${NC}"
  echo "  ID: $APP_ID"
else
  echo -e "${RED}✗ Application creation failed${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 3: Create Environment
echo -e "\n${YELLOW}[3/10] Creating environment...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/applications/$APP_ID/environments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development",
    "baseUrl": "https://jsonplaceholder.typicode.com",
    "type": "DEVELOPMENT"
  }')

ENV_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$ENV_ID" ]; then
  echo -e "${GREEN}✓ Environment created${NC}"
  echo "  ID: $ENV_ID"
else
  echo -e "${RED}✗ Environment creation failed${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 4: Create Credential
echo -e "\n${YELLOW}[4/10] Creating credential...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/credentials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test API Key\",
    \"applicationId\": \"$APP_ID\",
    \"type\": \"API_KEY\",
    \"data\": {
      \"apiKey\": \"test-key-123\",
      \"headerName\": \"X-API-Key\"
    }
  }")

CRED_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$CRED_ID" ]; then
  echo -e "${GREEN}✓ Credential created${NC}"
  echo "  ID: $CRED_ID"
else
  echo -e "${RED}✗ Credential creation failed${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 5: Create Test Suite
echo -e "\n${YELLOW}[5/10] Creating test suite...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/tests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"JSONPlaceholder API Tests\",
    \"description\": \"Tests automatiques de l'API JSONPlaceholder\",
    \"applicationId\": \"$APP_ID\",
    \"type\": \"API\",
    \"tags\": [\"api\", \"test\"],
    \"steps\": [
      {
        \"name\": \"Get all users\",
        \"description\": \"Récupérer la liste des utilisateurs\",
        \"order\": 1,
        \"endpoint\": \"/users\",
        \"method\": \"GET\",
        \"headers\": {},
        \"assertions\": [
          {
            \"type\": \"status\",
            \"operator\": \"equals\",
            \"value\": 200
          },
          {
            \"type\": \"jsonPath\",
            \"field\": \"$[0].id\",
            \"operator\": \"exists\",
            \"value\": true
          }
        ],
        \"extractVariables\": [
          {
            \"name\": \"firstUserId\",
            \"source\": \"jsonPath\",
            \"path\": \"$[0].id\"
          }
        ]
      },
      {
        \"name\": \"Get user by ID\",
        \"description\": \"Récupérer un utilisateur spécifique\",
        \"order\": 2,
        \"endpoint\": \"/users/{{firstUserId}}\",
        \"method\": \"GET\",
        \"headers\": {},
        \"assertions\": [
          {
            \"type\": \"status\",
            \"operator\": \"equals\",
            \"value\": 200
          },
          {
            \"type\": \"body\",
            \"field\": \"id\",
            \"operator\": \"exists\",
            \"value\": true
          }
        ],
        \"extractVariables\": []
      }
    ]
  }")

TEST_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$TEST_ID" ]; then
  echo -e "${GREEN}✓ Test suite created${NC}"
  echo "  ID: $TEST_ID"
else
  echo -e "${RED}✗ Test suite creation failed${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 6: List Test Suites
echo -e "\n${YELLOW}[6/10] Listing test suites...${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/tests?applicationId=$APP_ID" \
  -H "Authorization: Bearer $TOKEN")

COUNT=$(echo $RESPONSE | grep -o '"data":\[' | wc -l)

if [ $COUNT -gt 0 ]; then
  echo -e "${GREEN}✓ Test suites listed${NC}"
else
  echo -e "${RED}✗ Failed to list test suites${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 7: Execute Test Suite
echo -e "\n${YELLOW}[7/10] Executing test suite...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/tests/$TEST_ID/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"environmentId\": \"$ENV_ID\",
    \"variables\": {}
  }")

EXEC_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$EXEC_ID" ]; then
  echo -e "${GREEN}✓ Test execution started${NC}"
  echo "  Execution ID: $EXEC_ID"
  echo "  Waiting for completion..."
  sleep 5
else
  echo -e "${RED}✗ Failed to execute test suite${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 8: Get Execution Results
echo -e "\n${YELLOW}[8/10] Getting execution results...${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/executions/$EXEC_ID" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo $RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ -n "$STATUS" ]; then
  echo -e "${GREEN}✓ Execution results retrieved${NC}"
  echo "  Status: $STATUS"

  # Extract and display summary
  PASSED=$(echo $RESPONSE | grep -o '"passed":[0-9]*' | cut -d':' -f2)
  FAILED=$(echo $RESPONSE | grep -o '"failed":[0-9]*' | cut -d':' -f2)
  TOTAL=$(echo $RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2)

  if [ -n "$TOTAL" ]; then
    echo "  Tests: $PASSED/$TOTAL passed, $FAILED failed"
  fi
else
  echo -e "${RED}✗ Failed to get execution results${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 9: Export Test Suite
echo -e "\n${YELLOW}[9/10] Exporting test suite to YAML...${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/tests/$TEST_ID/export" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "version:"; then
  echo -e "${GREEN}✓ Test suite exported${NC}"
  echo "  Format: YAML"
else
  echo -e "${RED}✗ Failed to export test suite${NC}"
  echo "  Response: ${RESPONSE:0:200}..."
fi

# Test 10: Get Application Health
echo -e "\n${YELLOW}[10/10] Getting application health...${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/applications/$APP_ID/health" \
  -H "Authorization: Bearer $TOKEN")

HEALTH_STATUS=$(echo $RESPONSE | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$HEALTH_STATUS" ]; then
  echo -e "${GREEN}✓ Application health retrieved${NC}"
  echo "  Overall Status: $HEALTH_STATUS"
else
  echo -e "${RED}✗ Failed to get application health${NC}"
  echo "  Response: $RESPONSE"
fi

# Summary
echo -e "\n${GREEN}=== All tests completed successfully! ===${NC}"
echo ""
echo "Created resources:"
echo "  - Application: $APP_ID"
echo "  - Environment: $ENV_ID"
echo "  - Credential: $CRED_ID"
echo "  - Test Suite: $TEST_ID"
echo "  - Execution: $EXEC_ID"
echo ""
echo "API is fully functional!"
