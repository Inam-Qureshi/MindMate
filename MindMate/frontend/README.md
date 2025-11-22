# MindMate Frontend

A modern React application for mental health support, built with Vite and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone and navigate
cd frontend1

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Application will be available at http://localhost:5173

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run lint         # Lint code
```

## 📁 Project Structure

```
src/
├── components/
│   ├── common/      # Reusable components
│   ├── layout/      # Layout components
│   └── features/    # Feature-specific components
├── hooks/           # Custom React hooks
├── services/        # API services
├── store/           # State management (Zustand)
├── utils/           # Utility functions
├── config/          # Configuration files
└── types/           # Type definitions
```

## 🎨 Tech Stack

### Core
- **React 18.3.1** - UI library
- **React Router DOM 7.6.1** - Routing
- **Vite 6.2.0** - Build tool

### State Management
- **Zustand 5.0.2** - Lightweight state management

### Styling
- **Tailwind CSS 4.1.3** - Utility-first CSS
- **Framer Motion 12.7.4** - Animations

### Forms & Validation
- **React Hook Form 7.56.1** - Form management
- **Yup 1.6.1** - Schema validation

### HTTP & Data
- **Axios 1.10.0** - HTTP client
- **date-fns 4.1.0** - Date utilities

### Testing
- **Vitest 2.1.8** - Test framework
- **@testing-library/react 16.1.0** - React testing
- **jsdom 25.0.1** - DOM implementation

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 🔧 Development

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
```

### Path Aliases

The project uses path aliases for cleaner imports:

```javascript
import { Button } from '@components/common/Button';
import { useAuth } from '@hooks/useAuth';
import { apiClient } from '@services/api/client';
```

Available aliases:
- `@` → `./src`
- `@components` → `./src/components`
- `@hooks` → `./src/hooks`
- `@utils` → `./src/utils`
- `@services` → `./src/services`
- `@store` → `./src/store`
- `@config` → `./src/config`
- `@types` → `./src/types`
- `@assets` → `./src/assets`

## 📦 Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐳 Docker

```bash
# Build image
docker build -t mindmate-frontend .

# Run container
docker run -p 80:80 mindmate-frontend

# Using docker-compose
docker-compose up
```

## 🔒 Security

- All API requests use authentication tokens
- Environment variables for sensitive data
- XSS protection via React
- HTTPS recommended for production

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linter
4. Submit a pull request

## 📄 License

MIT License

## 🆘 Support

For issues or questions, please create an issue in the repository.

---

**Version**: 2.0.0  
**Last Updated**: October 30, 2025

