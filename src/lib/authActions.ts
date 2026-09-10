'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { encodeSession, SESSION_COOKIE, type Session } from './session';
import { verifyPassword } from './passwords';
import { verifyCaptcha } from './captcha';
import { findStaff, BIDDER_ACCESS_CODE_HASH, DUMMY_PASSWORD_HASH } from './authConfig';

export type SignInState = { status: 'idle' } | { status: 'error'; message: string };

const GENERIC_BAD_LOGIN = 'Wrong credentials. Check the username / password (or bidder access code) and try again.';

function setSessionCookie(session: Session) {
  cookies().set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const accountType = String(formData.get('accountType') ?? '');
  const password = String(formData.get('password') ?? '');
  const captchaToken = String(formData.get('captchaToken') ?? '');
  const captchaAnswer = String(formData.get('captcha') ?? '');

  // CAPTCHA first - a failed challenge never touches the credential check.
  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return {
      status: 'error',
      message: "CAPTCHA doesn't match (or it expired). Retype the characters, or hit “New image” for a fresh one.",
    };
  }

  if (accountType === 'staff') {
    const username = String(formData.get('username') ?? '').trim();
    const cred = findStaff(username);
    // Always run a hash comparison, even for an unknown username, so timing
    // doesn't leak whether the username exists.
    const ok = verifyPassword(password, cred?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!cred || !ok) {
      return { status: 'error', message: GENERIC_BAD_LOGIN };
    }
    setSessionCookie({ name: cred.name, role: cred.role });
    redirect('/dashboard');
  }

  if (accountType === 'bidder') {
    if (!verifyPassword(password, BIDDER_ACCESS_CODE_HASH)) {
      return { status: 'error', message: GENERIC_BAD_LOGIN };
    }
    const companySlug = String(formData.get('companySlug') ?? '').trim();
    if (!companySlug) return { status: 'error', message: 'Choose which company you are signing in as.' };
    // Company identity is always validated against real data - never trusted from the form.
    const match = await prisma.bidder.findFirst({
      where: { companySlug },
      select: { companySlug: true, name: true },
    });
    if (!match) return { status: 'error', message: 'That company is not a registered bidder on any tender.' };
    setSessionCookie({ name: match.name, role: 'bidder', companySlug: match.companySlug });
    redirect('/dashboard');
  }

  return { status: 'error', message: 'Choose an account type.' };
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  redirect('/sign-in');
}
