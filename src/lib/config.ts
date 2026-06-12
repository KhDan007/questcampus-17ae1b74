// Pricing — single source of truth. Never hardcode these in JSX.
// Mirrors MVP_SPEC §6.
export const PRICE_MVP = 15; // $15/month subscription — unlocks full matches AND full personal-statement essays
export const PRICE_FULL = 15; // future — includes essay, EC mgmt, doc helper, etc.
export const PRICE_COUNSELOR_ANCHOR = 1500; // private counselor comparison anchor
export const WAITLIST_BASE_DISCOUNT = 30; // % off at launch for waitlist users
export const REFERRAL_EXTRA_DISCOUNT = 5; // % off per referral, stackable

// Live student count — update when real users exist (currently 0).
export const STUDENTS_STARTED = 0;

export const fmtUsd = (n: number) => `$${n.toLocaleString("en-US")}`;
