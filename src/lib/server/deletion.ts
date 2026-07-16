import { eq } from 'drizzle-orm';
import { db } from './db';
import { user } from './db/schema';
import { deleteUploadDir } from './uploads';

/**
 * Permanently delete a candidat account. Wipes the per-user uploads tree
 * and removes the `user` row — every dependent record (candidat, cv,
 * candidature, retenu, session, account, staffFormation)
 * cascades automatically via the FK definitions in schema.ts.
 *
 * Returns false if no matching user row existed.
 */
export async function deleteCandidatForUser(userId: string): Promise<boolean> {
	// Files first so a DB failure leaves us in a recoverable state (orphan
	// files are easier to spot than orphan DB rows pointing at nothing).
	await deleteUploadDir(`candidat/${userId}`);
	const res = await db.delete(user).where(eq(user.id, userId)).returning({ id: user.id });
	return res.length > 0;
}
