import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ui } from "@/content/ui";
import { cn } from "@/lib/cn";
import { contrastRatio } from "@/lib/contrast";
import { Checkbox } from "./checkbox";
import { Field, joinIds } from "./field";
import { Input } from "./input";
import { PhoneInput } from "./phone-input";
import { QuantityStepper } from "./quantity-stepper";
import { RadioCards } from "./radio-cards";
import { Select } from "./select";
import { Textarea } from "./textarea";

describe("Field", () => {
  it("une la etiqueta, la ayuda y el error con el control", () => {
    render(
      <Field
        id="nombre"
        label="Tu nombre"
        hint="Como quieres que te llamemos"
        error="Este dato es necesario"
        required
      >
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: /Tu nombre/ });
    expect(input.id).toBe("nombre");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.hasAttribute("required")).toBe(true);
    expect(input.getAttribute("aria-describedby")).toBe("nombre-ayuda nombre-error");
    expect(screen.getByText("Este dato es necesario").closest("[aria-live]")?.id).toBe(
      "nombre-error",
    );
  });

  it("sin error no marca el control y la región de aviso queda vacía", () => {
    const { container } = render(
      <Field id="correo" label="Correo">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Correo" });
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(container.querySelector("#correo-error")?.textContent).toBe("");
  });

  it("hace el shake al enviar con error y lo reinicia en cada envío", () => {
    const view = (shakeKey: number, error?: string) => (
      <Field id="tel" label="Teléfono" error={error} shakeKey={shakeKey}>
        <Input />
      </Field>
    );
    const { rerender } = render(view(0, "Error"));
    const wrapper = () => screen.getByRole("textbox").parentElement!;
    expect(wrapper().className).toBe("");
    rerender(view(1, "Error"));
    expect(wrapper().className).toBe("shake");
    const input = screen.getByRole("textbox");
    rerender(view(2, "Error"));
    expect(wrapper().className).toBe("shake-again");
    // El campo no se vuelve a montar (conserva el foco y el ref).
    expect(screen.getByRole("textbox")).toBe(input);
    rerender(view(3));
    expect(wrapper().className).toBe("");
  });

  it("une el aria-describedby que ya traía el control", () => {
    render(
      <Field id="x" label="X" hint="Ayuda">
        <Input aria-describedby="otra-cosa" />
      </Field>,
    );
    expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBe("otra-cosa x-ayuda");
    expect(joinIds("a b", undefined, "b", "c")).toBe("a b c");
    expect(joinIds(undefined, "")).toBeUndefined();
  });

  it("el borde de los campos tiene 3:1 sobre blanco y soft (WCAG 1.4.11)", () => {
    const css = readFileSync("src/styles/tokens.css", "utf8");
    const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css)![1]!;
    for (const bg of ["paper", "soft"])
      expect(contrastRatio(token("line-control"), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it("también pasa id y aria-* a Textarea y Select", () => {
    render(
      <>
        <Field id="notas" label="Notas" error="x">
          <Textarea />
        </Field>
        <Field id="dep" label="Departamento">
          <Select placeholder="Elige tu departamento">
            <option value="guatemala">Guatemala</option>
          </Select>
        </Field>
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Notas" }).getAttribute("aria-invalid")).toBe(
      "true",
    );
    const select = screen.getByRole("combobox", { name: "Departamento" });
    expect(select.id).toBe("dep");
    expect((select as HTMLSelectElement).options[0]!.textContent).toBe("Elige tu departamento");
  });
});

describe("Checkbox y RadioCards", () => {
  it("la casilla tiene su etiqueta y su error", () => {
    render(<Checkbox id="acepto" label="Acepto que me contacten" error="Este dato es necesario" />);
    const box = screen.getByRole("checkbox", { name: "Acepto que me contacten" });
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect(box.getAttribute("aria-describedby")).toBe("acepto-error");
  });

  it("defaultValue marca su opción", () => {
    render(
      <RadioCards
        id="t"
        name="t"
        legend="Tipo"
        defaultValue="empresa"
        options={[
          { value: "libreria", label: "Librería" },
          { value: "empresa", label: "Empresa" },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Empresa" })).toHaveProperty("checked", true);
  });

  it("las tarjetas son radios de un mismo grupo con leyenda y error", () => {
    const onChange = vi.fn();
    render(
      <RadioCards
        id="tipo"
        name="tipo"
        legend="Tipo de cliente"
        error="Este dato es necesario"
        onChange={onChange}
        options={[
          { value: "libreria", label: "Librería o tienda" },
          { value: "empresa", label: "Empresa", description: "Personalizados con tu logo" },
        ]}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Tipo de cliente" });
    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(group.getAttribute("aria-describedby")).toBe("tipo-error");
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => (r as HTMLInputElement).name)).toEqual(["tipo", "tipo"]);
    fireEvent.click(screen.getByRole("radio", { name: /Empresa/ }));
    expect(onChange).toHaveBeenCalledOnce();
    expect((radios[1] as HTMLInputElement).checked).toBe(true);
  });
});

describe("PhoneInput", () => {
  it("anuncia el prefijo +502 y acomoda el número al salir del campo", () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(
      <Field id="telefono" label="Teléfono" hint="8 dígitos">
        <PhoneInput onChange={onChange} onBlur={onBlur} />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Teléfono" }) as HTMLInputElement;
    expect(input.type).toBe("tel");
    expect(input.inputMode).toBe("tel");
    expect(input.getAttribute("aria-describedby")).toBe("telefono-prefijo telefono-ayuda");
    expect(screen.getByText(ui.phonePrefix).id).toBe("telefono-prefijo");

    fireEvent.change(input, { target: { value: "55551234" } });
    fireEvent.blur(input);
    expect(input.value).toBe("5555 1234");
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it("deja igual un número que no es válido (el esquema lo marca)", () => {
    render(<PhoneInput aria-label="Teléfono" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123" } });
    fireEvent.blur(input);
    expect(input.value).toBe("123");
  });
});

/** QuantityStepper controlado, como lo usa un Controller de React Hook Form. */
function Stepper({ initial = 1, max }: { initial?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <Field id="cantidad" label="Cantidad">
      <QuantityStepper value={value} onChange={setValue} max={max} />
    </Field>
  );
}

describe("QuantityStepper", () => {
  it("un valor que no es número cuenta como el mínimo (sin entrar en bucle)", () => {
    render(<QuantityStepper aria-label="Cantidad" value={Number.NaN} onChange={() => {}} />);
    expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("1");
  });

  it("suma y resta con los botones, sin bajar de 1", () => {
    render(<Stepper />);
    const input = screen.getByRole("spinbutton", { name: "Cantidad" }) as HTMLInputElement;
    const minus = screen.getByRole("button", { name: ui.quantity.decrease });
    // aria-disabled y no disabled: el botón conserva el foco al llegar al límite.
    expect(minus.getAttribute("aria-disabled")).toBe("true");
    expect(minus).toHaveProperty("disabled", false);
    fireEvent.click(minus);
    expect(input.value).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: ui.quantity.increase }));
    expect(input.value).toBe("2");
    expect(input.getAttribute("aria-valuenow")).toBe("2");
    fireEvent.click(minus);
    expect(input.value).toBe("1");
  });

  it("acepta escribir el número y corrige al salir del campo", () => {
    render(<Stepper max={50} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12a" } });
    expect(input.value).toBe("12");
    // Lo escrito no se recorta: el esquema avisa «Para más de 9,999…».
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.blur(input);
    expect(input.value).toBe("999");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("1");
  });

  it("por encima del máximo no anuncia un valor fuera de rango y bloquea «+»", () => {
    render(<Stepper max={50} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "60" } });
    expect(input.hasAttribute("aria-valuenow")).toBe(false);
    expect(input.getAttribute("aria-valuetext")).toBe("60");
    expect(
      screen.getByRole("button", { name: ui.quantity.increase }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("al salir del campo quita los ceros a la izquierda", () => {
    render(<Stepper />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0003" } });
    fireEvent.blur(input);
    expect(input.value).toBe("3");
  });

  it("flechas, Inicio y Fin desde el teclado", () => {
    render(<Stepper initial={5} max={9999} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("6");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("5");
    fireEvent.keyDown(input, { key: "End" });
    expect(input.value).toBe("9999");
    fireEvent.keyDown(input, { key: "Home" });
    expect(input.value).toBe("1");
  });
});

describe("clases sin choques", () => {
  // Sin tailwind-merge (peso en el navegador): si cn quitaría algo, dos clases de la misma utilidad
  // compiten y gana la que va después en el CSS, no la que se escribió (como w-full contra w-24).
  it("ningún control trae dos clases de la misma utilidad", () => {
    render(
      <>
        <Input aria-label="a" />
        <Textarea aria-label="b" />
        <Select aria-label="c" />
        <PhoneInput aria-label="d" />
        <Stepper />
      </>,
    );
    const controls = [
      ...screen.getAllByRole("textbox"),
      screen.getByRole("combobox"),
      screen.getByRole("spinbutton"),
    ];
    for (const control of controls) {
      const classes = control.className.split(" ").filter(Boolean).sort();
      expect(cn(control.className).split(" ").sort(), control.outerHTML.slice(0, 60)).toEqual(
        classes,
      );
    }
  });
});
