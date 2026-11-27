import { describe, expect, it } from "vitest";
import { distanceKm, isValidLatLng } from "./geo";

const guatemala = { lat: 14.6349, lng: -90.5069 };
const quetzaltenango = { lat: 14.8347, lng: -91.5181 };

describe("distanceKm", () => {
  it("es 0 para el mismo punto", () => {
    expect(distanceKm(guatemala, guatemala)).toBe(0);
  });

  it("de la capital a Xela, unos 111 km en línea recta", () => {
    expect(distanceKm(guatemala, quetzaltenango)).toBeCloseTo(111, 0);
  });

  it("es simétrica", () => {
    expect(distanceKm(guatemala, quetzaltenango)).toBeCloseTo(
      distanceKm(quetzaltenango, guatemala),
      9,
    );
  });

  it("un grado de latitud son ~111.2 km", () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });

  it("puntos opuestos: media vuelta (sin NaN por redondeo)", () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20015.1, 0);
  });
});

describe("isValidLatLng", () => {
  it("acepta un punto en rango", () => {
    expect(isValidLatLng(guatemala)).toBe(true);
    expect(isValidLatLng({ lat: -90, lng: 180 })).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["sin lng", { lat: 1 }],
    ["NaN", { lat: Number.NaN, lng: 0 }],
    ["infinito", { lat: 0, lng: Number.POSITIVE_INFINITY }],
    ["latitud fuera de rango", { lat: 91, lng: 0 }],
    ["longitud fuera de rango", { lat: 0, lng: -181 }],
  ])("rechaza %s", (_name, point) => {
    expect(isValidLatLng(point as never)).toBe(false);
  });
});
