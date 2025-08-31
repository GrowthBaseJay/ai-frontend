// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware((auth) => {
  // Require sign-in for all matched routes
  auth().protect();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*|favicon.ico|sign-in|sign-up|api/webhooks).*)'],
};
