import { afterEach, describe, expect, it } from "vitest";
import { track } from "./track";

type WithDataLayer = { dataLayer?: Record<string, unknown>[] };
const w = () => window as unknown as WithDataLayer;

describe("track (BD-075)", () => {
  afterEach(() => {
    delete w().dataLayer;
  });

  it("deja el evento con sus parámetros en window.dataLayer", () => {
    track("quote_submit", { lines: 2, customer_type: "libreria", department: "guatemala" });
    expect(w().dataLayer).toEqual([
      { event: "quote_submit", lines: 2, customer_type: "libreria", department: "guatemala" },
    ]);
  });

  it("no manda los parámetros sin valor", () => {
    track("quote_submit", { lines: 1, department: undefined });
    expect(w().dataLayer).toEqual([{ event: "quote_submit", lines: 1 }]);
  });

  it("respeta una cola que ya existía (la de GA4, BD-125)", () => {
    w().dataLayer = [{ event: "gtm.js" }];
    track("splash_skip");
    expect(w().dataLayer).toEqual([{ event: "gtm.js" }, { event: "splash_skip" }]);
  });
});
