import { describe, expect, it } from "vitest";
import { isAdminOrHr } from "../roles";

describe("isAdminOrHr", () => {
  it("treats ADMIN and HR as admin-level", () => {
    expect(isAdminOrHr("ADMIN")).toBe(true);
    expect(isAdminOrHr("HR")).toBe(true);
  });

  it("treats MANAGER and EMPLOYEE as non-admin", () => {
    expect(isAdminOrHr("MANAGER")).toBe(false);
    expect(isAdminOrHr("EMPLOYEE")).toBe(false);
  });

  it("treats missing/unknown roles as non-admin", () => {
    expect(isAdminOrHr(undefined)).toBe(false);
    expect(isAdminOrHr(null)).toBe(false);
    expect(isAdminOrHr("")).toBe(false);
  });
});
