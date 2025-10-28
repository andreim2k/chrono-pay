# WorkPay - Invoicing Application

This is a full-stack invoicing application built with Next.js and Firebase, designed to make invoice management simple and efficient.

## Tech Stack

This project is built with a modern, full-stack TypeScript setup:

- **Framework**: [Next.js](https://nextjs.org/) (using App Router)
- **UI Library**: [React](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) (used for the BNR exchange rate feature)
- **Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You will need to have [Node.js](https://nodejs.org/) (version 20 or later) and npm installed on your machine.

### Firebase Setup

Before running the application, you need to set up a Firebase project.

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.

2.  **Create a Web App**: Inside your project, create a new Web App. Firebase will provide you with a configuration object containing keys like `apiKey`, `authDomain`, etc.

3.  **Set up Environment Variables**: Create a file named `.env.local` in the root of the project and add the configuration values from the previous step, prefixed with `NEXT_PUBLIC_`:
    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
    ```

4.  **Enable Authentication**:
    - In the Firebase Console, go to **Authentication**.
    - On the **Sign-in method** tab, enable the **Google** provider.

5.  **Set up Firestore**:
    - In the Firebase Console, go to **Firestore Database**.
    - Click **Create database** and start in **production mode**. This will ensure your security rules are active.
    - After the database is created, go to the **Rules** tab and paste in the content from the `firestore.rules` file in this project. Publish the rules.

### Installation

1.  Clone the repository to your local machine.
2.  Navigate to the project directory and install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

To run the application in development mode, use the following command. This will start the Next.js development server, typically on `http://localhost:9002`.

```bash
npm run dev
```

To create a production build of the application, run:

```bash
npm run build
```

And to start the production server, use:

```bash
npm run start
```
