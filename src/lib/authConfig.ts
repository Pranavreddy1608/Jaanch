import type { Role } from './session';
import { hashPassword } from './passwords';

/**
 * Demo credential store for the sign-in screen.
 *
 * Government staff (Procurement Officer, Viewer) authenticate with a fixed
 * username + password. Bidders pick their company from the list and enter a
 * shared portal access code (their company identity is still validated
 * against the database in authActions.ts - the access code just gates the
 * portal). Every sign-in also has to pass the CAPTCHA (see captcha.ts).
 *
 * Passwords are compared as scrypt hashes only (passwords.ts), never
 * plaintext. The baked-in hashes below are for the documented demo
 * passwords (docs/DEMO_CREDENTIALS.md); setting an env var rotates an
 * account's password without touching code:
 *   OFFICER_PASSWORD, VIEWER_PASSWORD, BIDDER_ACCESS_CODE
 *
 * A real deployment would replace this whole module with the organisation's
 * SSO / IdP integration.
 */

export interface StaffCredential {
  username: string;
  passwordHash: string;
  role: Extract<Role, 'officer' | 'viewer'>;
  /** Display name written into the session + audit trail. */
  name: string;
}

// scrypt hashes of the documented demo passwords:
//   officer -> "Officer@2026"   viewer -> "Viewer@2026"   bidder code -> "Bidder@2026"
const BAKED = {
  officer: 'scrypt$a75b79fee84c2608ed298b068c17167b$a3a85376fd1cc7050d7f0f1f37c5d24ca054ccae19d5a15dbfae5e4e8afc283f',
  viewer: 'scrypt$8776646bad54078b9d0bac28857bc539$60531f32f289debb3209987a39b8d1e96e5b87837ee61181fafa11bb3b0fbd09',
  bidder: 'scrypt$fd8f540d94a846f65ea54750cf60c8f0$431f6aeecf96d26260d7dbd6b2b25ee40955c126db023fe7d33102adc79e9ae0',
};

const resolve = (envVal: string | undefined, baked: string) => (envVal ? hashPassword(envVal) : baked);

export const STAFF_CREDENTIALS: StaffCredential[] = [
  {
    username: 'officer',
    passwordHash: resolve(process.env.OFFICER_PASSWORD, BAKED.officer),
    role: 'officer',
    name: 'R. Kalyanasundaram',
  },
  {
    username: 'viewer',
    passwordHash: resolve(process.env.VIEWER_PASSWORD, BAKED.viewer),
    role: 'viewer',
    name: 'Audit Desk',
  },
];

export const BIDDER_ACCESS_CODE_HASH = resolve(process.env.BIDDER_ACCESS_CODE, BAKED.bidder);

/** One arbitrary hash to compare against when the username is unknown, so a
 *  bad username and a bad password take about the same time. */
export const DUMMY_PASSWORD_HASH = BAKED.officer;

export function findStaff(username: string): StaffCredential | undefined {
  const u = username.trim().toLowerCase();
  return STAFF_CREDENTIALS.find((c) => c.username === u);
}
