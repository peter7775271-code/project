# User Authentication Web App

A beginner-friendly full-stack web application built with Next.js, TypeScript, Tailwind CSS, and SQLite. Users can create accounts, log in, and view their dashboard.

## Features

- ✅ User sign-up with validation
- ✅ Secure login with JWT authentication
- ✅ Password hashing with bcrypt
- ✅ SQLite database for user storage
- ✅ Protected dashboard page
- ✅ Beautiful UI with Tailwind CSS
- ✅ Fully responsive design
- ✅ Progressive Web App (installable + offline fallback)

## Tech Stack

- **Frontend**: Next.js 15+ with React 19+
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT + bcryptjs
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PWA Setup & Testing

This app is configured as a Progressive Web App using `@ducanh2912/next-pwa`.

- App manifest is generated from `src/app/manifest.ts`
- Service worker is generated at build time
- Offline fallback page is available at `/~offline`

To test PWA behavior locally, run the app in production mode:

```bash
npm run build
npm run start
```

Then open Chrome DevTools → Application to verify:

- Manifest is detected
- Service worker is active
- Install prompt is available (when criteria are met)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
