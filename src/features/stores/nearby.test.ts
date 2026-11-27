import { describe, expect, it } from "vitest";
import { NEARBY_MAX_KM, nearestDepartment, sortByDistance, type MapDepartment } from "./nearby";

const departments: MapDepartment[] = [
  { slug: "guatemala", name: "Guatemala", lat: 14.6349, lng: -90.5069, storeCount: 10 },
  { slug: "quetzaltenango", name: "Quetzaltenango", lat: 14.8347, lng: -91.5181, storeCount: 5 },
  { slug: "solola", name: "Sololá", lat: 14.7728, lng: -91.1831, storeCount: 2 },
  { slug: "izabal", name: "Izabal", lat: 15.7278, lng: -88.5944, storeCount: 0 },
];

// Parque central de Xela, Puerto Barrios (Izabal) y Ciudad de México.
const xela = { lat: 14.8344, lng: -91.5186 };
const puertoBarrios = { lat: 15.7278, lng: -88.5944 };
const mexico = { lat: 19.4326, lng: -99.1332 };

describe("nearestDepartment", () => {
  it("elige el departamento con tiendas más cercano", () => {
    expect(nearestDepartment(xela, departments, [])).toEqual({
      slug: "quetzaltenango",
      km: expect.any(Number),
    });
    expect(nearestDepartment(xela, departments, [])!.km).toBeLessThan(1);
  });

  it("salta los departamentos sin tiendas", () => {
    // En Puerto Barrios, Izabal está a 0 km pero no tiene tiendas: la capital, a ~250 km, se pasa.
    expect(nearestDepartment(puertoBarrios, departments, [])).toBeUndefined();
    expect(nearestDepartment(puertoBarrios, departments, [], 400)?.slug).toBe("guatemala");
  });

  it("lejos de todo (más de NEARBY_MAX_KM): undefined", () => {
    expect(NEARBY_MAX_KM).toBe(150);
    expect(nearestDepartment(mexico, departments, [])).toBeUndefined();
  });

  it("una tienda verificada acerca su departamento", () => {
    // Desde Xela, Sololá (centro a ~37 km) queda lejos; con una tienda verificada en Xela, gana.
    const store = { slug: "s", department: "solola", name: "S", point: { ...xela } };
    expect(nearestDepartment(xela, departments, [store])?.slug).toBe("solola");
  });

  it("un centro inválido con una tienda verificada se mide a la tienda", () => {
    const broken = [{ ...departments[1]!, lat: Number.NaN }, departments[0]!];
    const store = { slug: "s", department: "quetzaltenango", name: "S", point: { ...xela } };
    expect(nearestDepartment(xela, broken, [store])?.slug).toBe("quetzaltenango");
  });

  it("ignora departamentos con coordenadas inválidas", () => {
    const broken = [{ ...departments[1]!, lat: Number.NaN }, departments[0]!];
    expect(nearestDepartment(xela, broken, [])?.slug).toBe("guatemala");
  });

  it("sin departamentos: undefined", () => {
    expect(nearestDepartment(xela, [], [])).toBeUndefined();
  });
});

describe("sortByDistance", () => {
  const near = {
    slug: "cerca",
    department: "q",
    name: "Cerca",
    point: { lat: 14.835, lng: -91.519 },
  };
  const far = { slug: "lejos", department: "q", name: "Lejos", point: { lat: 14.9, lng: -91.6 } };
  const unknownA = { slug: "a", department: "q", name: "A", point: null };
  const unknownB = { slug: "b", department: "q", name: "B", point: null };

  it("primero las verificadas por distancia; las demás, en su orden", () => {
    expect(sortByDistance(xela, [unknownA, far, unknownB, near]).map((s) => s.slug)).toEqual([
      "cerca",
      "lejos",
      "a",
      "b",
    ]);
  });

  it("sin coordenadas, el orden no cambia", () => {
    expect(sortByDistance(xela, [unknownB, unknownA]).map((s) => s.slug)).toEqual(["b", "a"]);
  });
});
