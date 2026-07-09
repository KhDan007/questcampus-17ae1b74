// Shared gate for every "start auto-apply" entry point (chat, the /universities
// card button, the target detail page's CTA). Auto-apply runs entirely in the
// user's own browser via the QuestCampus extension now — there is no
// server-driven worker to enqueue into. This only decides what to ask the
// user for next; each call site decides how to present that.

import { useAuth } from "@/lib/auth/useAuth";
import { useCommonAppProfile } from "@/lib/apply/commonAppProfile";
import { useExtensionInstalled } from "@/lib/extension/detect";

export type AutoApplyGateResult =
  | "signin_required"
  | "extension_required"
  | "profile_incomplete"
  | "ready";

export function useAutoApplyGate(): {
  checked: boolean;
  evaluate: () => AutoApplyGateResult;
} {
  const { isAuthenticated } = useAuth();
  const { installed, checked } = useExtensionInstalled();
  const profile = useCommonAppProfile();

  return {
    checked,
    evaluate: () => {
      if (!isAuthenticated) return "signin_required";
      if (checked && !installed) return "extension_required";
      if (profile && !profile.completeness.complete) return "profile_incomplete";
      return "ready";
    },
  };
}
