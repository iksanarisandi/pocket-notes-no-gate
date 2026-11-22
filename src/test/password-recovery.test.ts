import { describe, expect, it } from "vitest";

import { isPasswordRecoveryLink, passwordResetRedirect } from "@/lib/password-recovery";

describe("password recovery helpers", () => {
  it("accepts a recovery link only when the hash identifies a recovery action", () => {
    expect(isPasswordRecoveryLink("#access_token=abc&type=recovery")).toBe(true);
    expect(isPasswordRecoveryLink("#access_token=abc&type=signup")).toBe(false);
    expect(isPasswordRecoveryLink("")).toBe(false);
  });

  it("redirects reset emails to the password reset page on the current origin", () => {
    expect(passwordResetRedirect("https://catat.example")).toBe(
      "https://catat.example/reset-password",
    );
  });
});