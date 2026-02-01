# TestForge Frontend

Interface web moderne pour TestForge - Plateforme de tests automatisés.

## Stack Technique

- **Framework**: React 18
- **Build Tool**: Vite 7
- **Styling**: TailwindCSS 3
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios avec intercepteurs
- **Icons**: Lucide React
- **Language**: JavaScript (ES6+)

## Installation

```bash
npm install
```

## Configuration

Copier le fichier d'environnement:

```bash
cp .env.example .env
```

Variables disponibles:
- `VITE_API_URL`: URL de l'API backend (défaut: `http://localhost:3000/api/v1`)

## Développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`.

## Build Production

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`.

## Preview Production

```bash
npm run preview
```

## Structure du Projet

```
frontend/
├── src/
│   ├── pages/              # Pages principales (7 pages)
│   │   ├── Login.jsx       # Authentification
│   │   ├── Dashboard.jsx   # Tableau de bord
│   │   ├── Applications.jsx # Gestion applications
│   │   ├── Tests.jsx       # Liste test suites
│   │   ├── TestDetail.jsx  # Éditeur de test + steps
│   │   ├── Executions.jsx  # Historique exécutions
│   │   ├── ExecutionDetail.jsx # Résultats détaillés
│   │   └── Credentials.jsx # Gestion credentials
│   │
│   ├── components/         # Composants réutilisables
│   │   ├── Layout.jsx      # Layout avec sidebar
│   │   ├── Modal.jsx       # Modal générique
│   │   ├── Button.jsx      # Bouton avec variants
│   │   ├── Badge.jsx       # Badge de status
│   │   └── ProtectedRoute.jsx # Route guard
│   │
│   ├── contexts/           # Contextes React
│   │   └── AuthContext.jsx # Auth state + JWT
│   │
│   ├── services/           # Services API
│   │   └── api.js          # Client Axios configuré
│   │
│   ├── App.jsx             # Composant racine + routes
│   ├── main.jsx            # Point d'entrée
│   └── index.css           # Styles globaux
│
├── public/                 # Assets statiques
├── .env.example            # Template environnement
├── vite.config.js          # Configuration Vite
├── tailwind.config.js      # Configuration TailwindCSS
└── package.json            # Dépendances

```

## Fonctionnalités

### 🔐 Authentication
- Login avec email/password
- JWT tokens avec auto-refresh
- Gestion automatique de l'expiration
- Logout sécurisé

### 📊 Dashboard
- Vue d'ensemble des statistiques
- Exécutions récentes
- Actions rapides
- Widgets informatifs

### 🔧 Applications Management
- CRUD complet
- Health check par environnement
- Filtrage et recherche
- Cards visuelles responsive

### 🧪 Test Suites
- Liste avec filtres (application, type)
- Création de test suites
- Export/Import YAML
- Duplicate et delete

### ✏️ Test Editor
- Éditeur de test complet
- Gestion visuelle des steps
- Réorganisation drag & drop (up/down)
- Configuration JSON par step
- Types de steps API et E2E
- Exécution directe depuis l'éditeur

### ▶️ Executions
- Historique complet
- Multi-filtres (app, test, status)
- Retry sur échecs
- Export JSON des résultats
- Statuts temps réel

### 📊 Execution Detail
- Monitoring temps réel (auto-refresh 5s)
- Résultats step par step
- Expandable details avec request/response
- Support screenshots (E2E)
- Timeline visuelle
- Métriques de performance

### 🔑 Credentials
- Gestion sécurisée
- Chiffrement AES-256-GCM
- Révélation on-demand avec décryptage
- Copy to clipboard
- Types: API_KEY, PASSWORD, TOKEN, SECRET

## Composants Réutilisables

### Modal
```jsx
<Modal isOpen={true} onClose={handleClose} title="Mon Modal" size="md">
  <div>Contenu du modal</div>
</Modal>
```

Tailles: `sm`, `md`, `lg`, `xl`

### Button
```jsx
<Button
  variant="primary"
  size="md"
  icon={PlusIcon}
  onClick={handleClick}
>
  Créer
</Button>
```

Variants: `primary`, `secondary`, `danger`, `outline`, `ghost`

### Badge
```jsx
<Badge variant="success">Active</Badge>
```

Variants: `default`, `success`, `warning`, `error`, `info`, `purple`

## API Client

Le client API (`src/services/api.js`) inclut:
- Intercepteurs pour injection automatique du JWT
- Auto-refresh sur 401 avec refresh token
- Gestion centralisée des erreurs
- 7 modules API: auth, applications, environments, tests, testSteps, executions, credentials

```javascript
import { testsAPI } from '../services/api';

const { data } = await testsAPI.list({ applicationId: '123' });
```

## Authentification Flow

1. User login → JWT access token (1h) + refresh token (7d)
2. Access token stocké dans `localStorage`
3. Auto-injection dans headers via intercepteur
4. Sur 401 → tentative refresh automatique
5. Si refresh échoue → redirect vers `/login`

## Conventions de Code

- Composants en PascalCase
- Fichiers en kebab-case ou PascalCase
- Props destructurés
- useState pour state local
- useEffect pour side effects
- useContext pour state global (Auth)

## Credentials par Défaut

Après création de l'admin backend:
- Email: `admin@secuaas.ca`
- Password: `TestForge2026!`

## Build Stats

- **Size**: 347KB JS (gzip: 103KB), 22KB CSS (gzip: 4KB)
- **Pages**: 7
- **Components**: 15+
- **Lines of Code**: ~3500

## Troubleshooting

### Port 5173 déjà utilisé
```bash
# Changer le port dans vite.config.js
export default defineConfig({
  server: { port: 3001 }
})
```

### Erreur CORS
Vérifier que le backend accepte les requêtes de `http://localhost:5173` dans sa configuration CORS.

### JWT expiré
L'auto-refresh devrait gérer cela automatiquement. Si problème persistant, clear localStorage et reconnecter.

## License

Proprietary - SecuAAS © 2026
