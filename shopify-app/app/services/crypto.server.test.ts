import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ORIGINAL_KEY = process.env.SECRETS_KEY;

describe("crypto.server", () => {
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.SECRETS_KEY;
    else process.env.SECRETS_KEY = ORIGINAL_KEY;
  });

  it("round-trips a secret", async () => {
    process.env.SECRETS_KEY =
      "0521a0156ea36edded0c39e7af8607bce5f27f8184cb567f490818d3d66d31fa";
    const { encryptSecret, decryptSecret } = await import("./crypto.server");

    const blob = encryptSecret("super-secret-token");
    expect(blob).not.toContain("super-secret-token");
    expect(blob.split(":")).toHaveLength(3);
    expect(decryptSecret(blob)).toBe("super-secret-token");
  });

  it("produces a different ciphertext each call (random IV)", async () => {
    process.env.SECRETS_KEY =
      "0521a0156ea36edded0c39e7af8607bce5f27f8184cb567f490818d3d66d31fa";
    const { encryptSecret } = await import("./crypto.server");

    expect(encryptSecret("same-plaintext")).not.toBe(encryptSecret("same-plaintext"));
  });

  it("throws a clear error when SECRETS_KEY is missing", async () => {
    delete process.env.SECRETS_KEY;
    const { encryptSecret } = await import("./crypto.server");

    expect(() => encryptSecret("x")).toThrow(/SECRETS_KEY/);
  });

  it("throws a clear error when SECRETS_KEY is the wrong length", async () => {
    process.env.SECRETS_KEY = "tooshort";
    const { encryptSecret } = await import("./crypto.server");

    expect(() => encryptSecret("x")).toThrow(/32-byte/);
  });
});
