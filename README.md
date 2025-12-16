# VueMaster - AI-Powered Mock Interviews

VueMaster is a Next.js web application that allows users to practice job interviews with an AI-powered interviewer. Users can create an account, generate mock interviews for specific job roles and technologies, and receive detailed feedback on their performance.

## Technologies Used

- **Frontend:** [Next.js](https://nextjs.org/) with [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/)
- **Backend:** Next.js API Routes and Server-Side Actions
- **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **AI:**
  - **Interview Questions Generation:** [Google AI SDK](https://ai.google.dev/sdks) with the `gemini-2.5-pro` model.
  - **Feedback Generation:** [Google AI SDK](https://ai.google.dev/sdks) with the `gemini-2.0-flash-001` model.

## Getting Started

### Prerequisites

- [Node.js](https.org/en/) (version 20 or higher)
- [Yarn](https://yarnpkg.com/) (optional)

### Environment Variables

Create a `.env.local` file in the root of the project and add the following environment variables:

```
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Google AI
GOOGLE_API_KEY=
```

**Note:** You can get the Firebase configuration from your Firebase project console. The `FIREBASE_PRIVATE_KEY` should be the private key from your service account JSON file. The `GOOGLE_API_KEY` can be obtained from the Google AI Studio.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/vuemaster.git
   ```
2. Install the dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about the technologies used in this project, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Firebase Documentation](https://firebase.google.com/docs) - learn about Firebase products and features.
- [Google AI Documentation](https://ai.google.dev/docs) - learn about the Google AI SDK.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.