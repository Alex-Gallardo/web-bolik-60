import { describe, expect, it } from "vitest";
import { imageAltSchema, isDescriptiveAlt, isGenericImageName } from "./image-names";

describe("nombres de imagen genéricos (BD-097)", () => {
  it.each([
    "IMG_4521.jpg",
    "IMG-20241103-WA0007.jpeg",
    "DSC01234.JPG",
    "DSCN0042.jpg",
    "PXL_20241103_150102.jpg",
    "WhatsApp Image 2024-11-03 at 10.12.33.jpeg",
    "Screenshot 2024-11-03.png",
    "Captura de pantalla 2024-11-03.png",
    "foto1.jpg",
    "Foto (2).JPG",
    "imagen.png",
    "Imágenes 3.png",
    "1234.jpg",
    "untitled.png",
    "copia.jpg",
    // Con guion bajo y en español (revisión de BD-097).
    "Screenshot_20241103-101530.png",
    "WhatsApp_Image_2024-11-03_at_10.12.33.jpeg",
    "captura_de_pantalla_2024-11-03.png",
    "Imagen de WhatsApp 2024-11-03 a las 10.12.33.jpeg",
    "IMG_E4521.JPG",
    "_DSC0042.jpg",
    "SAM_1234.jpg",
    "P1010001.JPG",
    "screenshot.png",
  ])("«%s» es genérico", (name) => {
    expect(isGenericImageName(name)).toBe(true);
  });

  it.each([
    "bolik-ultra_azul_punta.jpg",
    "bolik-ultra-azul-principal.png",
    "crayones-de-cera-12-estuche.jpg",
    "imagen-corporativa-planta.jpg",
    "foto-planta-mixco.jpg",
    // Códigos de modelo y palabras que empiezan igual que un prefijo de cámara o captura.
    "p1000_azul_principal.jpg",
    "P2000-negro.jpg",
    "sam3_rojo.jpg",
    "Captura-x12-colores.jpg",
    "comfort-284_azul_principal.jpg",
    "imagenes-de-marca-bolik.png",
  ])("«%s» es descriptivo", (name) => {
    expect(isGenericImageName(name)).toBe(false);
  });
});

describe("texto alternativo (BD-097, docs/10 §8)", () => {
  it("rechaza nombres de archivo y textos genéricos", () => {
    for (const alt of ["bolik-ultra.jpg", "IMG_4521", "foto", "Imagen 2", "  "])
      expect(isDescriptiveAlt(alt), alt).toBe(false);
    expect(isDescriptiveAlt("Bolik Ultra azul con la tapa puesta")).toBe(true);
  });

  it("el esquema exige 1–200 caracteres descriptivos y usa los mensajes que recibe", () => {
    const schema = imageAltSchema({ required: "Falta", generic: "Describe la foto" });
    expect(schema.parse("  Punta del Bolik Ultra  ")).toBe("Punta del Bolik Ultra");
    expect(schema.safeParse("").error?.issues[0]?.message).toBe("Falta");
    expect(schema.safeParse("IMG_4521.jpg").error?.issues[0]?.message).toBe("Describe la foto");
    expect(schema.safeParse("a".repeat(201)).success).toBe(false);
    expect(imageAltSchema().safeParse("foto 1").success).toBe(false);
  });
});
