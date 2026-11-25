import { getAccount } from "../account/api";
import { linkedProfileSession, sameUuid } from "../account/profileSession";
import { getSession, isSessionValid, type ProfileSession } from "./session";
import { refusalText, StartRefusedError, type StartNoun } from "./start";

/** The parts of a skin or drink session that say whose upload it is. */
type UploadSession = { player_uuid: string; realm_id?: string; staff?: boolean };

const statusOf = (err: unknown) => (err instanceof Error ? (err as Error & { status?: number }).status : undefined);

function sessionEnded(noun: StartNoun, staff?: boolean): Error {
  return new Error(
    staff
      ? "Your code’s session has ended. Go back and enter your code again."
      : `Your ${noun} session has ended. Sign in to Profile in another tab with the same account, then press Submit again.`,
  );
}

/** The Profile session of the player whose upload this is, or null when they aren't signed in. */
async function profileOf(playerUuid: string): Promise<ProfileSession | null> {
  const stored = getSession();
  if (stored && isSessionValid(stored) && sameUuid(stored.player_uuid, playerUuid)) return stored;
  const linked = (await getAccount())?.minecraft?.player_uuid;
  return linked && sameUuid(linked, playerUuid) ? linkedProfileSession(linked) : null;
}

/**
 * Starts the upload again from Profile after its session ended, as New skin or New drink would:
 * it continues an unused slot, else the cooldown decides. Only for the same player and realm,
 * and never for a staff code, which Profile can't start.
 */
export async function renewUpload<R>(
  noun: StartNoun,
  session: UploadSession,
  start: (profileToken: string) => Promise<R>,
): Promise<R> {
  const profile = session.staff ? null : await profileOf(session.player_uuid);
  if (!profile || (session.realm_id && profile.realm_id && session.realm_id !== profile.realm_id)) {
    throw sessionEnded(noun, session.staff);
  }
  try {
    return await start(profile.session_token);
  } catch (err) {
    if (err instanceof StartRefusedError) throw new Error(refusalText(noun, err.reason, err.nextAt));
    if (statusOf(err) === 401) throw sessionEnded(noun);
    throw err;
  }
}

/** Runs an upload request; if its session has ended, renews the session and runs it once more. */
export async function withRenewal<T>(
  token: string,
  renew: () => Promise<string>,
  run: (token: string) => Promise<T>,
): Promise<T> {
  try {
    return await run(token);
  } catch (err) {
    if (statusOf(err) !== 401) throw err;
    return run(await renew());
  }
}
