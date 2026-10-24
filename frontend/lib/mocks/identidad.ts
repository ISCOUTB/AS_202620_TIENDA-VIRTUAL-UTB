import type { UserOut } from "../api/generated/contract";

/**
 * Usuarios de muestra para diseñar login, sesión y permisos (endpoint
 * `preview`). El backend real asignará los IDs y roles al implementar
 * `POST /identity/*`.
 */
export const USUARIOS_MOCK: UserOut[] = [
  {
    id: 1,
    nombre: "Estudiante Demo",
    email: "demo@utb.edu.co",
    roles: [{ codigo: "comprador", tienda_id: null }],
    creado_en: "2026-09-15T10:30:00Z",
  },
  {
    id: 2,
    nombre: "Administración Cafetería",
    email: "admin@utb.edu.co",
    roles: [
      { codigo: "comprador", tienda_id: null },
      { codigo: "admin_general", tienda_id: null },
    ],
    creado_en: "2026-09-10T08:00:00Z",
  },
];
