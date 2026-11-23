import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/env", () => ({ env: { SESSION_SECRET: "x".repeat(32) } }));
vi.mock("@/server/log", () => ({ log: { warn: vi.fn() } }));

const { clientIp, hashIp, ipKey, isVisitorIp, normalizeIp } = await import("./request-ip");

const from = (values: Record<string, string>) => new Headers(values);

describe("IP de la petición (BD-073)", () => {
  it("toma la última de X-Forwarded-For (la que agrega IIS) y si no, X-Real-IP", () => {
    // Lo que el visitante mande en la cabecera queda antes: no le sirve para cambiar de IP.
    expect(clientIp(from({ "x-forwarded-for": "1.2.3.4, 190.56.1.2" }))).toBe("190.56.1.2");
    expect(clientIp(from({ "x-forwarded-for": "190.56.1.2" }))).toBe("190.56.1.2");
    expect(clientIp(from({ "x-real-ip": " 190.56.1.3 " }))).toBe("190.56.1.3");
    expect(clientIp(from({}))).toBe("desconocida");
  });

  it("quita el puerto que puede agregar ARR y el prefijo IPv4 de IPv6", () => {
    expect(normalizeIp("190.56.1.2:51234")).toBe("190.56.1.2");
    expect(normalizeIp("[2001:DB8::1]:443")).toBe("2001:db8::1");
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
    expect(normalizeIp("::ffff:190.56.1.2")).toBe("190.56.1.2");
    expect(clientIp(from({ "x-forwarded-for": "1.2.3.4, 190.56.1.2:51234" }))).toBe("190.56.1.2");
  });

  it("guarda un hash de 64 caracteres, igual para la misma IP y distinto con otra clave", () => {
    const a = hashIp("190.56.1.2", "clave-uno-de-32-caracteres-xxxxx");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("190.56.1.2", "clave-uno-de-32-caracteres-xxxxx")).toBe(a);
    expect(hashIp("190.56.1.2", "clave-dos-de-32-caracteres-xxxxx")).not.toBe(a);
    expect(a).not.toContain("190");
  });
});

describe("clave de los límites por IP (BD-077)", () => {
  it("IPv4 entera; IPv6 recortada a su prefijo /64", () => {
    expect(ipKey("190.56.1.2")).toBe("190.56.1.2");
    expect(ipKey("2001:db8:85a3:0042:1000:8a2e:0370:7334")).toBe("2001:db8:85a3:42::/64");
    expect(ipKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipKey("2001:db8:1:2::abcd")).toBe("2001:db8:1:2::/64");
    expect(ipKey("::1")).toBe("0:0:0:0::/64");
  });

  it("dos direcciones del mismo /64 comparten clave; de otro /64, no", () => {
    expect(ipKey("2001:db8:aa:bb::1")).toBe(ipKey("2001:db8:aa:bb:ffff:1:2:3"));
    expect(ipKey("2001:db8:aa:bb::1")).not.toBe(ipKey("2001:db8:aa:bc::1"));
  });

  it("sin cabecera o con la IP del propio servidor no es la IP de un visitante", () => {
    for (const ip of ["desconocida", "127.0.0.1", "127.1.2.3", "::1"])
      expect(isVisitorIp(ip)).toBe(false);
    for (const ip of ["190.56.1.2", "10.0.0.7", "2001:db8::1"]) expect(isVisitorIp(ip)).toBe(true);
  });
});
