import { describe, expect, it } from "vitest";
import {
  administraTienda,
  esAdminGeneral,
  esGestor,
  etiquetaRol,
  gestionaInventario,
  supervisaTienda,
  tiendasGestionadas,
} from "@/lib/roles";
import type { RolAsignado } from "@/lib/api/generated/contract";

const usuario = (...roles: RolAsignado[]) => ({ roles });
const comprador: RolAsignado = { codigo: "comprador", tienda_id: null };

describe("roles", () => {
  it("un comprador no gestiona nada", () => {
    const u = usuario(comprador);
    expect(esGestor(u)).toBe(false);
    expect(gestionaInventario(u, 1)).toBe(false);
    expect(tiendasGestionadas(u)).toEqual([]);
    expect(etiquetaRol(u)).toBe("Estudiante");
  });

  it("el admin general ve todas las tiendas pero no escribe en ninguna", () => {
    const u = usuario(comprador, { codigo: "admin_general", tienda_id: null });
    expect(esAdminGeneral(u)).toBe(true);
    expect(esGestor(u)).toBe(true);
    expect(supervisaTienda(u, 7)).toBe(true);
    expect(administraTienda(u, 7)).toBe(false);
    expect(gestionaInventario(u, 7)).toBe(false);
    expect(tiendasGestionadas(u)).toBe("todas");
    expect(etiquetaRol(u)).toBe("Administración");
  });

  it("los roles de tienda valen solo en su tienda, y el admin gestiona inventario", () => {
    const u = usuario(
      comprador,
      { codigo: "admin_tienda", tienda_id: 1 },
      { codigo: "responsable_inventario", tienda_id: 2 },
    );
    expect(administraTienda(u, 1)).toBe(true);
    expect(administraTienda(u, 2)).toBe(false);
    expect(gestionaInventario(u, 1)).toBe(true);
    expect(gestionaInventario(u, 2)).toBe(true);
    expect(gestionaInventario(u, 3)).toBe(false);
    expect(supervisaTienda(u, 2)).toBe(true);
    expect(supervisaTienda(u, 3)).toBe(false);
    expect(tiendasGestionadas(u)).toEqual([1, 2]);
    expect(etiquetaRol(u)).toBe("Admin. de tienda");
  });

  it("un rol de tienda sin tienda_id vale en todas", () => {
    const u = usuario({ codigo: "responsable_inventario", tienda_id: null });
    expect(gestionaInventario(u, 9)).toBe(true);
    expect(administraTienda(u, 9)).toBe(false);
    expect(tiendasGestionadas(u)).toBe("todas");
  });
});
