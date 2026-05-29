import { describe, expect, it } from "vitest";

import { getErrorMessage } from "@/lib/errors";

describe("getErrorMessage", () => {
  it("returns the message from Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a string message from plain objects", () => {
    expect(getErrorMessage({ message: "boom" })).toBe("boom");
  });

  it("returns the fallback for objects with non-string messages", () => {
    expect(getErrorMessage({ message: 123 }, "fallback")).toBe("fallback");
  });

  it("returns the fallback for null, undefined, and bare strings", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getErrorMessage("boom", "fallback")).toBe("fallback");
  });

  it("defaults the fallback to Unknown error", () => {
    expect(getErrorMessage(null)).toBe("Unknown error");
  });

  it("honors a custom fallback", () => {
    expect(getErrorMessage(null, "custom fallback")).toBe("custom fallback");
  });
});
