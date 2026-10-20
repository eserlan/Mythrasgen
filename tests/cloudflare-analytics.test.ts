import { describe, expect, test } from "bun:test";
import { cloudflareAnalytics } from "../vite.config";

const tags = (token?: string) => (cloudflareAnalytics(token).transformIndexHtml as () => unknown[])();

describe("Cloudflare Web Analytics", () => {
  test("injects nothing without a token", () => {
    expect(tags(undefined)).toEqual([]);
    expect(tags("  ")).toEqual([]);
  });

  test("injects the deferred beacon with the token", () => {
    const [tag] = tags(" abc123 ") as { tag: string; attrs: Record<string, unknown>; injectTo: string }[];
    expect(tag).toMatchObject({ tag: "script", injectTo: "body" });
    expect(tag!.attrs.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    expect(tag!.attrs.defer).toBe(true);
    expect(JSON.parse(tag!.attrs["data-cf-beacon"] as string)).toEqual({ token: "abc123" });
  });
});
