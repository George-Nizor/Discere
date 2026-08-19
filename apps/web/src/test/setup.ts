import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// A few checks in this package run against Node rather than a document. They share this setup
// file, so the browser teardown only runs where there is a browser.
afterEach(() => {
  if (typeof window === "undefined") return;
  cleanup();
  window.localStorage.clear();
});
