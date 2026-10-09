import type { Locale } from "../lib/i18n";

/**
 * Folo (https://folo.is) feed ownership claims. In Folo, subscribe to the feed, choose "Claim"
 * and the "RSS tag" method, then copy the two numbers here under that feed's locale. The feed
 * then carries <follow_challenge>; after Folo confirms the claim the entry may be removed.
 */
export const foloClaims: Partial<Record<Locale, { feedId: string; userId: string }>> = {};
