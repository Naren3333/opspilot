import { decryptString, encryptString } from "@/lib/crypto";

describe("crypto helpers", () => {
  it("round-trips encrypted provider secrets", () => {
    const cipher = encryptString("sk-test-secret");
    expect(cipher).not.toContain("sk-test-secret");
    expect(decryptString(cipher)).toBe("sk-test-secret");
  });
});
