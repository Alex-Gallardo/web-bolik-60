import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "./breadcrumbs";

describe("Breadcrumbs (BD-060)", () => {
  it("enlaces hasta la página actual (sin enlace, aria-current) y su BreadcrumbList", () => {
    const { container } = render(
      <Breadcrumbs
        label="Migas de pan"
        crumbs={[
          { name: "Inicio", path: "/" },
          { name: "Catálogo Bolik", path: "/productos" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(nav).getByRole("link", { name: "Inicio" }).getAttribute("href")).toBe("/");
    expect(within(nav).queryByRole("link", { name: "Catálogo Bolik" })).toBeNull();
    expect(within(nav).getByText("Catálogo Bolik").getAttribute("aria-current")).toBe("page");
    const ld = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    );
    expect(ld.itemListElement).toHaveLength(2);
  });
});
