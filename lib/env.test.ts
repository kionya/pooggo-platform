import { describe, it, expect } from "vitest";
import { findMissingEnv, assertRequiredEnv, REQUIRED_ENV } from "./env";

describe("findMissingEnv", () => {
  it("returns keys that are absent", () => {
    expect(findMissingEnv({ AUTH_SECRET: "x" }, ["AUTH_SECRET", "POSTGRES_PRISMA_URL"])).toEqual([
      "POSTGRES_PRISMA_URL",
    ]);
  });

  it("treats empty / whitespace-only values as missing", () => {
    expect(findMissingEnv({ AUTH_SECRET: "", B: "   " }, ["AUTH_SECRET", "B"])).toEqual(["AUTH_SECRET", "B"]);
  });

  it("returns empty array when all keys are present", () => {
    expect(findMissingEnv({ A: "1", B: "2" }, ["A", "B"])).toEqual([]);
  });

  it("defaults to REQUIRED_ENV when no keys given", () => {
    const full = Object.fromEntries(REQUIRED_ENV.map((k) => [k, "v"]));
    expect(findMissingEnv(full)).toEqual([]);
    expect(findMissingEnv({})).toEqual([...REQUIRED_ENV]);
  });
});

describe("assertRequiredEnv", () => {
  it("throws an error naming every missing key", () => {
    expect(() => assertRequiredEnv({ AUTH_SECRET: "x" }, ["AUTH_SECRET", "POSTGRES_PRISMA_URL"])).toThrow(
      /POSTGRES_PRISMA_URL/,
    );
  });

  it("does not throw when all required keys are present", () => {
    const full = Object.fromEntries(REQUIRED_ENV.map((k) => [k, "v"]));
    expect(() => assertRequiredEnv(full)).not.toThrow();
  });

  it("includes AUTH_SECRET in REQUIRED_ENV", () => {
    expect(REQUIRED_ENV).toContain("AUTH_SECRET");
  });
});
