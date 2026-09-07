'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { encodeSession, SESSION_COOKIE, type Role } from './session';

export type SignInState = { status: 'idle' } | { status: 'error'; message: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const name = String(formData.get('name') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  if (!name) return { status: 'error', message: 'Enter your name.' };
  if (role !== 'officer' && role !== 'viewer') return { status: 'error', message: 'Choose a role.' };

  cookies().set(SESSION_COOKIE, encodeSession({ name, role }), {
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
