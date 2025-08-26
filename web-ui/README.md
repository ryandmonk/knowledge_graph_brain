# Knowledge Graph Brain - Web UI

A React-based configuration and management interface for the Knowledge Graph Brain platform.

## 🎯 Overview

This web UI transforms the Knowledge Graph Brain setup process from a 12-step README process into a user-friendly 3-click experience. Built with React, TypeScript, and Tailwind CSS, it provides:

- **Setup Wizard**: Step-by-step system configuration with real-time health checks
- **Service Management**: Monitor and manage all system components
- **Configuration Dashboard**: Visual environment variable management
- **Knowledge Base Browser**: Explore and manage your knowledge graphs

## 🚀 Quick Start

### Development Mode

```bash
# Install dependencies
npm install

# Start development server (with API proxy)
npm run dev
```

The development server runs on http://localhost:3100 with automatic proxy to the orchestrator API.

### Production Build

```bash
# Build for production
npm run build

# Files are built to ./dist and automatically served by orchestrator at /ui
```

## 🏗️ Architecture

### Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling (easily replaceable with Material-UI)
- **Vite** for build tooling and development
- **React Router** for navigation
- **Axios** for API communication
- **Lucide React** for icons

### Project Structure

```
src/
├── components/          # React components
│   ├── Layout.tsx      # Main application layout
│   ├── SetupWizard.tsx # Step-by-step setup process
│   └── Dashboard.tsx   # System monitoring dashboard
├── utils/              # Utilities and API client
│   ├── api.ts         # Orchestrator API client
│   └── config.ts      # Application configuration
└── main.tsx           # Application entry point
```

## 📡 API Integration

The web UI communicates with the orchestrator through REST APIs:

### Key Endpoints Used

- `GET /api/health` - Enhanced system health with alerts and scoring
- `GET /api/status` - System-wide status with knowledge bases
- `GET /api/config` - Environment configuration (secure credential handling)
- `GET /health` - Basic health check for individual services

### API Client Features

- **Automatic error handling** with user-friendly messages
- **Service health checking** with timeout and retry logic
- **Secure credential handling** (passwords/keys masked in responses)
- **TypeScript interfaces** for all API responses

## 🎨 UI Components

### Setup Wizard

Multi-step configuration process:

1. **Service Health Check** - Verify Neo4j, Ollama, and Orchestrator
2. **Environment Configuration** - Manage settings and credentials
3. **Connector Setup** - Configure data source connections
4. **System Validation** - Test complete setup with sample data

### Dashboard Features

- **Health Score Monitoring** - System performance scoring (0-100)
- **Knowledge Base Browser** - View all knowledge bases and their status
- **Real-time Status Updates** - Auto-refreshing service health
- **Alert Management** - System alerts and warnings

### Design System

Tailwind CSS classes are organized for easy replacement:

```css
/* Custom component classes */
.btn-primary { /* Blue action buttons */ }
.btn-secondary { /* Gray secondary buttons */ }
.card { /* White cards with shadow */ }
.status-healthy { /* Green success states */ }
.status-warning { /* Yellow warning states */ }
.status-error { /* Red error states */ }
```

## 🔧 Configuration

### Environment Variables

Create `.env` file for development:

```bash
VITE_API_URL=http://localhost:3000  # Orchestrator URL
```

### Build Configuration

The build process:
1. TypeScript compilation with strict checking
2. Vite bundling with tree-shaking
3. Static assets optimized for production
4. Output to `./dist` for orchestrator integration

## 🎯 Development Guidelines

### Component Structure

```typescript
// Standard component template
import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Component logic here
  
  return (
    <div className="card p-6">
      {/* Component UI here */}
    </div>
  );
}
```

### API Integration

```typescript
// Use the centralized API client
import { api } from '../utils/api';

// All API calls have error handling
try {
  const status = await api.getSystemStatus();
  setData(status);
} catch (error) {
  setError(error.message);
}
```

### Styling Guidelines

- Use Tailwind utility classes for styling
- Follow the established design tokens (colors, spacing)
- Components should be responsive by default
- Use semantic color classes (status-healthy, status-error, etc.)

## 🚀 Deployment

### Integrated Deployment

The web UI is automatically served by the orchestrator:

1. Build the React app: `npm run build`
2. Start orchestrator: `cd ../orchestrator && npm run dev`
3. Access at: http://localhost:3000/ui

### Standalone Deployment

For development or separate hosting:

```bash
npm run preview  # Preview production build locally
```

## 🎨 Customization

### Switching to Material-UI

To replace Tailwind with Material-UI:

1. Install Material-UI: `npm install @mui/material @emotion/react @emotion/styled`
2. Replace Tailwind classes with MUI components
3. Update `tailwind.config.js` and remove Tailwind imports

### Theme Customization

Update the color scheme in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom color palette
      }
    }
  }
}
```

## 📱 Future Features

- **3D Knowledge Graph Visualization** - Interactive graph exploration
- **Schema Designer** - Visual schema creation and editing
- **Connector Marketplace** - Browse and install community connectors
- **Performance Analytics** - Detailed system performance metrics
- **Collaborative Features** - Multi-user knowledge base management

## 🤝 Contributing

1. Follow the existing component structure
2. Use TypeScript for type safety
3. Include error handling for all API calls
4. Test components in both light/dark modes
5. Ensure responsive design for mobile devices

## 📄 License

Part of the Knowledge Graph Brain project - see main project license.
