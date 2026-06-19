import { buildTelegramUrl } from "@/lib/telegram";
import type { OnboardingUser } from "@/components/onboarding/types";

/**
 * Mock do lead corrente — mesma forma que o `mocks/user.ts` do app prod
 * (mockGetUser), só que reduzida ao que o OnboardingModal precisa.
 */
export function mockGetOnboardingUser(): OnboardingUser {
  return {
    firstName: "Diego",
    telegramUrl: buildTelegramUrl("6a16457d978ba54070095b90"),
  };
}
