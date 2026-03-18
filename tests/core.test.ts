import { describe, it, expect } from "vitest";
import { Chimeralm } from "../src/core.js";
describe("Chimeralm", () => {
  it("init", () => { expect(new Chimeralm().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Chimeralm(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Chimeralm(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
