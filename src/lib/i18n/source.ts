// Single source-of-truth English dictionary for app-wide translatable strings
// outside the landing page. Onboarding step text is derived from STEPS to avoid
// duplication; static UI strings live in UI_EN below.
//
// At build time, scripts/translate-i18n.mjs walks `buildEnglishSource()` and
// produces src/lib/i18n/generated/<lang>.json — those files are imported by
// the runtime and merged into TRANSLATIONS at provider init.

import { CHAPTERS, STEPS } from "@/lib/onboarding/steps";

export const UI_EN: Record<string, string> = {
  // NavBar profile menu (top bar, authenticated)
  "nav.menu.welcome": "Welcome back",

  // Onboarding shell
  "ob.welcomeBack.badge": "Welcome back",
  "ob.welcomeBack.title": "Welcome back 👋",
  "ob.welcomeBack.titleNamed": "Welcome back, {name} 👋",
  "ob.welcomeBack.subtitle": "Pick up right where you left off — you were on step {step} of {total}.",
  "ob.welcomeBack.resume": "Continue where I left off →",
  "ob.flow.finished.title": "That's everything.",
  "ob.flow.finished.titleNamed": "That's everything, {name}.",
  "ob.flow.finished.subtitle": "We've built your profile — redirecting to your results…",
  "ob.flow.back": "← Back",
  "ob.flow.skip": "Skip for now →",
  "ob.flow.continue": "Continue →",
  "ob.flow.see": "See my matches →",
  "ob.progress.label": "Chapter {chapter} of {total}",
  "ob.progress.count": "{step} / {total}",
  "ob.multi.count": "{selected} of {max} selected.",
  "ob.rank.count": "{selected} of {total} ranked",
  "ob.rank.fullHint": " — tap a card to swap.",
  "ob.rank.endDot": ".",
  "ob.reveal.selectPlaceholder": "Select…",
  "ob.reveal.scalePlaceholder": "Scale",
  "ob.country.cityLabel": "City (optional)",
  "ob.country.cityPlaceholder": "Used for timezone & regional scholarships",
  "ob.country.eduLabel": "Education system",
  "ob.country.eduPlaceholder": "e.g. A-Levels, Abitur, IB…",
  "ob.country.searchPlaceholder": "Search country…",
  "ob.country.empty": "No country matches.",

  // Sign in / Sign up
  "signin.title.signin": "Welcome back",
  "signin.title.signup": "Create your account",
  "signin.subtitle.signin": "Sign in to see your matches and continue where you left off.",
  "signin.subtitle.signup": "Save your profile so you can come back anytime.",
  "signin.google": "Continue with Google",
  "signin.or": "or",
  "signin.field.name": "Name",
  "signin.field.email": "Email",
  "signin.field.password": "Password",
  "signin.placeholder.name": "Jane Doe",
  "signin.placeholder.email": "you@school.edu",
  "signin.placeholder.password": "At least 8 characters",
  "signin.cta.signin": "Sign in",
  "signin.cta.signup": "Create account",
  "signin.toggle.toSignup": "New here?",
  "signin.toggle.toSignin": "Already have an account?",
  "signin.toggle.createAccount": "Create an account",
  "signin.toggle.signinLink": "Sign in",
  "signin.show": "Show password",
  "signin.hide": "Hide password",
  "signin.err.email": "Enter a valid email address.",
  "signin.err.password": "Password must be at least 8 characters.",
  "signin.err.name": "Please tell us your name.",
  "signin.err.generic": "Something went wrong.",
  "signin.err.google": "Google sign-in is unavailable.",

  // Profile
  "profile.complete": "Profile complete",
  "profile.inprogress": "Profile in progress",
  "profile.hello.named": "Hey, {name}!",
  "profile.hello.anon": "Your Profile",
  "profile.subtitle.fallback": "Here's a snapshot of your academic journey and your best-fit universities.",
  "profile.empty.title": "No profile yet",
  "profile.empty.body": "Complete the onboarding questionnaire to see your personalized profile and university matches.",
  "profile.empty.cta": "Start onboarding →",
  "profile.breakdown.title": "Your profile breakdown",
  "profile.breakdown.body": "Every answer you gave, chapter by chapter.",
  "profile.breakdown.chapter": "Chapter",
  "profile.edit": "← Edit your profile",
  "profile.stage.high_school": "High school student",
  "profile.stage.graduated": "Recent graduate",
  "profile.stage.gap_year": "Taking a gap year",
  "profile.stage.transfer": "Transfer student",
  "profile.stage.grad": "Graduate school applicant",
  "profile.stage.other": "Exploring options",

  // Recommendations
  "rec.title": "Your university matches 🎯",
  "rec.subtitle": "Ranked by scholarship fit, then how well each school matches your profile.",
  "rec.refresh": "↻ Refresh",
  "rec.matching.named": "Matching {name}'s profile against thousands of universities…",
  "rec.matching.anon": "Matching your profile against thousands of universities…",
  "rec.error": "We couldn't load your matches just now.",
  "rec.tryAgain": "Try again",
  "rec.paid.loading": "Loading your full safety, target & reach list…",
  "rec.paid.error": "We couldn't load your full list right now.",
  "rec.section.safety": "Safety schools",
  "rec.section.target": "Target schools",
  "rec.section.reach": "Reach schools",
  "rec.upsell.title": "See your full list — safety, target & reach",
  "rec.upsell.body": "Unlock every match sorted into safety, target, and reach schools, with full requirements, deadlines, and filters.",
  "rec.upsell.note": "One-time payment · 30% off for waitlist members",
  "rec.waitlist.title": "Not ready to pay? Join the waitlist 🎓",
  "rec.waitlist.body": "Lock in {discount}% off at launch — plus an extra {refDiscount}% off per friend you refer. Founding Member badge and early access to every new tool included.",
  "rec.waitlist.cta": "Join the waitlist",

  // University card
  "card.bucket.safety": "Safety",
  "card.bucket.target": "Target",
  "card.bucket.reach": "Reach",
  "card.stat.acceptance": "Acceptance rate",
  "card.stat.sat": "Avg SAT",
  "card.stat.act": "Mid ACT",
  "card.stat.cost": "Annual cost",
  "card.stat.tuition": "Out-of-state tuition",
  "card.stat.size": "Size",
  "card.stat.aid": "Financial aid",
  "card.aid.strong": "Strong",
  "card.aid.moderate": "Moderate",
  "card.aid.limited": "Limited",
  "card.size.small": "Small (<5k)",
  "card.size.medium": "Medium (5k–20k)",
  "card.size.large": "Large (20k+)",
  "card.visit": "Visit & apply",

  // On-open enrichment details
  "enrich.show": "Show official details",
  "enrich.hide": "Hide official details",
  "enrich.loading": "Fetching official details…",
  "enrich.error": "Couldn't fetch official details right now.",
  "enrich.notListed": "Not listed",
  "enrich.checkSite": "check official site",
  "enrich.source": "source",
  "enrich.fees": "Tuition fees",
  "enrich.english": "English requirement",
  "enrich.entry": "Entry requirement",
  "enrich.deadlines": "Application deadlines",

  // Unlock
  "unlock.title": "Unlock your full match list",
  "unlock.subtitle": "One ${price} payment. Every match sorted into safety, target, and reach — with the why behind each one.",
  "unlock.perk1": "Every safety school where you're a likely admit",
  "unlock.perk2": "Target schools matched to your grades and goals",
  "unlock.perk3": "Reach schools worth aiming for — with the why",
  "unlock.perk4": "Scholarship & cost details on every match",
  "unlock.already": "✅ You already have full access.",
  "unlock.seeList": "See my full list →",
  "unlock.needAccount": "Need an account?",
  "unlock.signinLink": "Sign in or sign up",
  "unlock.secureNote": "Secure checkout · No card stored · Referral discount applied automatically",
  "unlock.discount": "🎉 {pct}% off applied — pay {discounted} instead of ${price}",
  "unlock.button": "Unlock full list — ${price}",
  "unlock.redirecting": "Redirecting…",
  "unlock.signinPrompt": "Sign in",
  "unlock.signinSuffix": "to unlock.",
  "unlock.alreadyHave": "You already have full access — refreshing…",
  "unlock.notLive": "Payments aren't live yet — check back soon.",
  "unlock.genericError": "Something went wrong. Try again.",
  "unlock.back": "← Back to your profile",

  // Unlock success
  "unlockOk.title": "You're unlocked!",
  "unlockOk.taking": "Taking you to your full match list…",
  "unlockOk.loading": "Loading your full safety, target & reach list…",
  "unlockOk.go": "Go to my matches →",
  "unlockOk.waiting": "Finalizing your payment…",
  "unlockOk.waitingBody": "This usually takes just a couple of seconds. We confirm your payment, then your full list unlocks automatically — no refresh needed.",
  "unlockOk.signedOutTitle": "Sign in to continue",
  "unlockOk.signedOutBody": "Sign in with the same account you used at checkout and your full list will unlock automatically.",
  "unlockOk.signin": "Sign in →",

  // Unlock cancel
  "unlockX.title": "Checkout cancelled",
  "unlockX.body": "No worries — no charge was made. Your free matches are still here whenever you want them.",
  "unlockX.tryAgain": "Try again →",
  "unlockX.back": "← Back to your profile",

  // Waitlist
  "wait.badge": "Founding Member",
  "wait.title.anon": "Get in early",
  "wait.title.named": "{name}, get in early",
  "wait.subtitle": "Join the waitlist and lock in founding-member perks — plus first access to every tool we ship next.",
  "wait.perk1": "{discount}% off the full product at launch",
  "wait.perk2": "+{refDiscount}% off for every friend you refer (stackable — all the way to 50% off!)",
  "wait.perk3": "A Founding Member badge on your profile",
  "wait.perk4": "Early access to every new tool before it goes public",
  "wait.emailLabel": "Email address",
  "wait.emailPh": "you@example.com",
  "wait.whyLabel": "Why are you joining?",
  "wait.whyOptional": "(optional)",
  "wait.whyPh": "Helps us prioritize what to build first…",
  "wait.errInvalid": "Please enter a valid email.",
  "wait.errGeneric": "Something went wrong. Please try again.",
  "wait.submit": "Join the waitlist",
  "wait.submitting": "Joining…",
  "wait.spamNote": "No spam — just one welcome email and a note when early access opens.",
  "wait.features.title": "What you'll get first",
  "wait.features.subtitle": "Waitlist members unlock each of these before anyone else.",
  "wait.f1.title": "Essay Writing Assistant",
  "wait.f1.blurb": "AI-guided personal statements and supplementals.",
  "wait.f2.title": "Extracurricular Management",
  "wait.f2.blurb": "Track and present your activities strategically.",
  "wait.f3.title": "Document Helper",
  "wait.f3.blurb": "Checklists, templates & AI review for your docs.",
  "wait.f4.title": "Application Tracker",
  "wait.f4.blurb": "Deadlines and status for every school in one place.",
  "wait.f5.title": "Auto-Apply Agent",
  "wait.f5.blurb": "Fills and submits your applications for you.",
  "wait.success.alreadyNamed": "You're already on the list, {name}!",
  "wait.success.already": "You're already on the list!",
  "wait.success.newNamed": "You're in, {name}!",
  "wait.success.new": "You're in!",
  "wait.success.bodyAlready": "Your founding-member perks are locked in. We'll email you the moment early access opens.",
  "wait.success.bodyNew": "Check your inbox — we just sent a welcome email with everything you unlocked. We'll be in touch the moment early access opens.",
  "wait.success.cta": "Start your profile",

  // Referrals / invite friends
  "inv.eyebrow": "Invite friends",
  "inv.earnedPct": "You've earned {pct}% off",
  "inv.earn": "Earn 5% off for every friend",
  "inv.body": "+5% per friend who finishes onboarding · up to {max}% off",
  "inv.body.bonus": "{base} · includes your join bonus.",
  "inv.body.plain": "{base}.",
  "inv.joined.one": "{n} friend joined",
  "inv.joined.many": "{n} friends joined",
  "inv.pending.one": "{n} friend signed up — they unlock your 5% once they finish onboarding.",
  "inv.pending.many": "{n} friends signed up — they unlock your 5% once they finish onboarding.",
  "inv.copied": "Copied!",
  "inv.copy": "Copy",
  "inv.share": "Share link",
  "inv.shareText": "Find universities that want someone like you — use my link for 5% off:",
};

// Build a flat English source from CHAPTERS + STEPS.
export function buildStepSource(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of CHAPTERS) out[`chapter.${c.id}.title`] = c.title;
  for (const s of STEPS) {
    out[`step.${s.step}.title`] = s.title;
    if (s.helper) out[`step.${s.step}.helper`] = s.helper;
    if ("affirmation" in s && s.affirmation) out[`step.${s.step}.affirmation`] = s.affirmation;
    if (s.type === "text" && s.placeholder) out[`step.${s.step}.placeholder`] = s.placeholder;
    if ("options" in s) {
      for (const o of s.options) {
        out[`step.${s.step}.opt.${o.value}.label`] = o.label;
        if (o.reveal) {
          if ("placeholder" in o.reveal && o.reveal.placeholder)
            out[`step.${s.step}.opt.${o.value}.reveal.ph`] = o.reveal.placeholder;
          if (o.reveal.kind === "select")
            for (const so of o.reveal.options)
              out[`step.${s.step}.opt.${o.value}.reveal.opt.${so.value}`] = so.label;
          if (o.reveal.kind === "scale-number")
            for (const sc of o.reveal.scales)
              out[`step.${s.step}.opt.${o.value}.reveal.scale.${sc.value}`] = sc.label;
        }
      }
    }
    if (
      "optionalDetail" in s &&
      s.optionalDetail &&
      "placeholder" in s.optionalDetail &&
      s.optionalDetail.placeholder
    )
      out[`step.${s.step}.detail.placeholder`] = s.optionalDetail.placeholder;
  }
  return out;
}

export function buildEnglishSource(): Record<string, string> {
  return { ...UI_EN, ...buildStepSource() };
}
