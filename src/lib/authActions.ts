'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { encodeSession, SESSION_COOKIE, type Role, type Session } from './session';

export type SignInState = { status: 'idle' } | { status: 'error'; message: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const name = String(formData.get('name') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  if (!name) return { status: 'error', message: 'Enter your name.' };
  if (role !== 'officer' && role !== 'viewer' && role !== 'bidder') {
    return { status: 'error', message: 'Choose a role.' };
  }

  let session: Session = { name, role };

  if (role === 'bidder') {
    const companySlug = String(formData.get('companySlug') ?? '').trim();
    if (!companySlug) return { status: 'error', message: 'Choose which company you are signing in as.' };
    // Validate against real seed data - never trust a form-supplied value.
    const match = await prisma.bidder.findFirst({ where: { companySlug }, select: { companySlug: true } });
    if (!match) return { status: 'error', message: 'That company is not a registered bidder on any tender.' };
    session = { name, role, companySlug: match.companySlug };
  }

  cookies().set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  redirect('/dashboard');
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  redirect('/sign-in');
}
