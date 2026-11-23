import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

const rule = { max: 3, windowMs: 10_000 };

describe("createRateLimiter (BD-077)", () => {
  it("deja pasar hasta el máximo en la ventana y rechaza el siguiente con el tiempo de espera", () => {
    const limiter = createRateLimiter(rule);
    for (let i = 0; i < 3; i++) expect(limiter.take("ip", 1_000 + i).ok).toBe(true);
    expect(limiter.take("ip", 2_000)).toEqual({ ok: false, retryAfterMs: 9_000 });
    expect(limiter.count("ip", 2_000)).toBe(3);
  });

  it("los intentos viejos salen de la ventana", () => {
    const limiter = createRateLimiter(rule);
    for (let i = 0; i < 3; i++) limiter.take("ip", 0);
    expect(limiter.take("ip", 9_999).ok).toBe(false);
    expect(limiter.take("ip", 10_000).ok).toBe(true);
    expect(limiter.count("ip", 10_000)).toBe(1);
  });

  it("cada clave lleva su propia cuenta", () => {
    const limiter = createRateLimiter(rule);
    for (let i = 0; i < 3; i++) limiter.take("a", 0);
    expect(limiter.take("a", 1).ok).toBe(false);
    expect(limiter.take("b", 1).ok).toBe(true);
  });

  it("release devuelve el cupo una sola vez", () => {
    const limiter = createRateLimiter(rule);
    const first = limiter.take("ip", 0);
    limiter.take("ip", 1);
    limiter.take("ip", 2);
    expect(limiter.take("ip", 3).ok).toBe(false);
    if (!first.ok) throw new Error("el primero debía pasar");
    first.release();
    first.release();
    expect(limiter.count("ip", 3)).toBe(2);
    expect(limiter.take("ip", 4).ok).toBe(true);
    expect(limiter.take("ip", 5).ok).toBe(false);
  });

  it("una ráfaga sin esperas no se salta el límite", () => {
    const limiter = createRateLimiter(rule);
    const results = Array.from({ length: 10 }, () => limiter.take("ip", 500).ok);
    expect(results.filter(Boolean)).toHaveLength(3);
  });

  it("con el tope de claves lleno olvida la usada hace más tiempo", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 10_000 }, 2);
    limiter.take("vieja", 0);
    limiter.take("media", 1);
    limiter.take("vieja", 2); // rechazada: no cuenta, pero tampoco la mueve al final
    limiter.take("nueva", 3);
    expect(limiter.count("vieja", 4)).toBe(0);
    expect(limiter.count("media", 4)).toBe(1);
    expect(limiter.count("nueva", 4)).toBe(1);
  });

  it("reset vacía el contador", () => {
    const limiter = createRateLimiter(rule);
    for (let i = 0; i < 3; i++) limiter.take("ip", 0);
    limiter.reset();
    expect(limiter.take("ip", 1).ok).toBe(true);
  });
});
