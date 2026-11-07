// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createHitLog, type HitEntry } from "./hit-log";

vi.mock("@/server/log", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));

const at = new Date("2026-11-07T12:00:00Z");

describe("createHitLog (BD-046)", () => {
  it("suma por clave y escribe todo en un solo lote", async () => {
    const write = vi.fn<(entries: HitEntry[]) => Promise<void>>().mockResolvedValue();
    const hits = createHitLog({ name: "prueba", write, now: () => at });
    hits.record("/a", "https://google.com/");
    hits.record("/a");
    hits.record("/b");
    expect(hits.pending()).toBe(2);
    await hits.flush();
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]![0]).toEqual([
      { key: "/a", count: 2, detail: "https://google.com/", lastAt: at },
      { key: "/b", count: 1, detail: null, lastAt: at },
    ]);
    expect(hits.pending()).toBe(0);
    await hits.flush(); // nada pendiente: no vuelve a escribir
    expect(write).toHaveBeenCalledOnce();
  });

  it("respeta el tope de claves distintas por lote y descarta el resto", async () => {
    const { log } = await import("@/server/log");
    const write = vi.fn<(entries: HitEntry[]) => Promise<void>>().mockResolvedValue();
    const hits = createHitLog({ name: "prueba", write, maxKeys: 2 });
    for (const key of ["/1", "/2", "/3", "/4", "/1"]) hits.record(key);
    await hits.flush();
    expect(write.mock.calls[0]![0].map((e) => [e.key, e.count])).toEqual([
      ["/1", 2],
      ["/2", 1],
    ]);
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ lost: 2 }), expect.any(String));
  });

  it("si la escritura falla, avisa en el log y sigue funcionando", async () => {
    const { log } = await import("@/server/log");
    const write = vi
      .fn<(entries: HitEntry[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error("sin base"))
      .mockResolvedValue();
    const hits = createHitLog({ name: "prueba", write });
    hits.record("/a");
    await hits.flush();
    expect(log.error).toHaveBeenCalled();
    hits.record("/b");
    await hits.flush();
    expect(write.mock.calls[1]![0].map((e) => e.key)).toEqual(["/b"]);
  });

  it("escribe solo cada intervalo", async () => {
    vi.useFakeTimers();
    try {
      const write = vi.fn<(entries: HitEntry[]) => Promise<void>>().mockResolvedValue();
      const hits = createHitLog({ name: "prueba", write, intervalMs: 1_000 });
      hits.record("/a");
      expect(write).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1_000);
      expect(write).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
