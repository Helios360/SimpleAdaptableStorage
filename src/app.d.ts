import type { auth } from '$server/auth';

declare global {
  namespace App {
    interface Locals {
      session: typeof auth.$Infer.Session.session | null;
      user: AppUser | null;
    }
    interface PageData {
      user: AppUser | null;
    }
    interface Error {
      message: string;
    }
    interface Platform {}
  }

  type AppUser = {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    emailVerified: boolean;
    formationId: number | null;
  };
}

export {};
