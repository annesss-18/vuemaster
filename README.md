<div align="center">
  <img src="public/logo.svg" alt="VueMaster Logo" width="80" height="80" />
  <h1>VueMaster</h1>
  <p><strong>AI-Powered Mock Interview Platform</strong></p>
  <p>Master your technical interviews with real-time AI feedback</p>

  <p>
    <a href="#features"><strong>Features</strong></a> •
    <a href="#quick-start"><strong>Quick Start</strong></a> •
    <a href="#deployment"><strong>Deploy</strong></a> •
    <a href="#architecture"><strong>Architecture</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Firebase-Firestore-orange?style=flat-square&logo=firebase" alt="Firebase" />
    <img src="https://img.shields.io/badge/AI-Gemini%203-blueviolet?style=flat-square&logo=google" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  </p>
</div>

---

## Overview

VueMaster is a sophisticated mock interview platform that leverages Google's Gemini AI to provide realistic technical interview simulations. Users can create custom interview templates based on real job descriptions, practice with AI-generated questions, and receive detailed feedback to improve their performance.

## Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Interviewer** | Realistic interviews powered by Gemini 3 Pro |
| 📝 **Smart JD Analysis** | Automatically extract role, tech stack, and focus areas from job descriptions |
| 🎯 **Custom Templates** | Create reusable interview templates for any role |
| 📊 **Detailed Feedback** | Get scored assessments across 5 competency categories |
| 🔐 **Secure Auth** | Firebase Authentication with session-based cookies |
| 🌐 **Public Templates** | Share and discover community interview templates |
| 📱 **Responsive UI** | Modern dark theme with Tailwind CSS |

## Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **Firebase Project** with Authentication and Firestore enabled
- **Google AI API Key** from [AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/vuemaster.git
cd vuemaster

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure your environment variables (see .env.example for details)

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

## Architecture

```
vuemaster/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Authentication pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (root)/               # Protected application routes
│   │   ├── dashboard/        # User dashboard
│   │   ├── create/           # Create interview template
│   │   ├── explore/          # Browse public templates
│   │   └── interview/        # Interview sessions & feedback
│   ├── api/                  # API Routes
│   │   ├── auth/             # Authentication endpoints
│   │   ├── feedback/         # AI feedback generation
│   │   └── interview/        # Interview CRUD operations
│   └── layout.tsx            # Root layout with providers
├── components/               # React components
│   ├── ui/                   # ShadCN UI primitives
│   └── *.tsx                 # Application components
├── lib/                      # Utilities and configurations
│   ├── actions/              # Server Actions
│   ├── api-middleware.ts     # Auth & rate limiting middleware
│   └── *.ts                  # Utility functions
├── firebase/                 # Firebase configuration
│   ├── admin.ts              # Server-side SDK
│   └── client.ts             # Client-side SDK
├── types/                    # TypeScript definitions
└── middleware.ts             # Next.js Edge Middleware
```

### Data Model

| Collection | Purpose |
|------------|---------|
| `users` | User profiles (name, email) |
| `interview_templates` | Reusable interview configurations |
| `interview_sessions` | User practice sessions |
| `feedback` | AI-generated interview feedback |

## Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/vuemaster)

1. Click the button above or import your repository on [Vercel](https://vercel.com)
2. Configure environment variables in Vercel Dashboard
3. Deploy!

### Environment Variables

All required environment variables are documented in [`.env.example`](.env.example). Make sure to configure:

- Firebase Client SDK credentials (public)
- Firebase Admin SDK credentials (private)
- Google AI API key

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** with Email/Password provider
3. Create a **Firestore** database in production mode
4. Deploy security rules: `firebase deploy --only firestore:rules`
5. Generate a service account key for Admin SDK

## API Reference

### Interview Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/interview/analyze` | POST | Analyze job description with AI |
| `/api/interview/generate` | POST | Generate interview template |
| `/api/interview/draft` | POST | Generate template draft |
| `/api/interview/session/create` | POST | Create new interview session |
| `/api/interview/upload-resume` | POST | Upload resume for personalization |
| `/api/feedback` | POST | Generate AI feedback for session |

All endpoints require authentication and are rate-limited.

## Security

- **Authentication**: Firebase Auth with HTTP-only session cookies
- **Authorization**: Firestore security rules enforce data access
- **Rate Limiting**: API endpoints are protected with configurable limits
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more
- **Input Validation**: Zod schemas validate all API inputs
- **SSRF Protection**: URL scraping blocks private IP ranges

## Contributing

Contributions are welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ using Next.js, Firebase, and Google Gemini</p>
  <p><a href="https://vuemaster.app">vuemaster.app</a></p>
</div>
