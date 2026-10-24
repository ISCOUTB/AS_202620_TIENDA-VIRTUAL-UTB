/**
 * Lectura de los roles de `UserOut.roles` (API 0.4.0, ADR 0016).
 *
 * Mismas reglas que el backend (`ContextoSeguridad.administra_tienda` y
 * `gestiona_inventario`): `admin_general` vale en todas las tiendas, un rol
 * con `tienda_id` null también, y quien administra una tienda gestiona su
 * inventario. Solo decide qué mostrar: la autoridad es la API.
 */

import type { CodigoRol, UserOut } from "@/lib/api/generated/contract";

type ConRoles = Pick<UserOut, "roles">;

function tiene(usuario: ConRoles, codigo: CodigoRol, tiendaId?: number): boolean {
  return usuario.roles.some(
    (r) =>
      r.codigo === codigo &&
      (tiendaId === undefined || r.tienda_id == null || r.tienda_id === tiendaId),
  );
}

export function esAdminGeneral(usuario: ConRoles): boolean {
  return tiene(usuario, "admin_general");
}

/**
 * Escribir en una tienda (productos, precios): solo su admin. El admin general
 * supervisa y no escribe (ADR 0017); la API responde 403 con la misma regla.
 */
export function administraTienda(usuario: ConRoles, tiendaId: number): boolean {
  return tiene(usuario, "admin_tienda", tiendaId);
}

/** Mover stock y atender la cola de pedidos de la tienda. */
export function gestionaInventario(usuario: ConRoles, tiendaId: number): boolean {
  return administraTienda(usuario, tiendaId) || tiene(usuario, "responsable_inventario", tiendaId);
}

/** Ver lo de la tienda en el panel: quien la gestiona o el admin general. */
export function supervisaTienda(usuario: ConRoles, tiendaId: number): boolean {
  return esAdminGeneral(usuario) || gestionaInventario(usuario, tiendaId);
}

/** true si el usuario gestiona alguna tienda: puede entrar a `/admin`. */
export function esGestor(usuario: ConRoles): boolean {
  return usuario.roles.some((r) => r.codigo !== "comprador");
}

/** Tiendas que gestiona; "todas" para admin general o un rol sin tienda. */
export function tiendasGestionadas(usuario: ConRoles): "todas" | number[] {
  const gestion = usuario.roles.filter((r) => r.codigo !== "comprador");
  if (gestion.some((r) => r.codigo === "admin_general" || r.tienda_id == null)) return "todas";
  return [...new Set(gestion.map((r) => r.tienda_id as number))].sort((a, b) => a - b);
}

/** Rótulo del carnet: el rol de mayor alcance. */
export function etiquetaRol(usuario: ConRoles): string {
  if (esAdminGeneral(usuario)) return "Administración";
  if (tiene(usuario, "admin_tienda")) return "Admin. de tienda";
  if (tiene(usuario, "responsable_inventario")) return "Inventario";
  return "Estudiante";
}
