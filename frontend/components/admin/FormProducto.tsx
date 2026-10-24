"use client";

import { useState, type FormEvent } from "react";
import type { ProductOut, TiendaOut } from "@/lib/api/generated/contract";
import { ApiError } from "@/lib/api/client";
import { crearProducto, editarProducto } from "@/lib/admin";
import { Boton } from "@/components/ui/Boton";

/**
 * Alta y edición de productos (S7, docs/api/administracion-catalogo.md):
 * `POST /catalog/products` y `PATCH /catalog/products/{id}`. Sin campo de
 * existencias: el alta no recibe unidades (Catálogo no es dueño del stock);
 * se cuentan después en la tabla de inventario.
 *
 * El precio se escribe en pesos y viaja en centavos (× 100), la convención
 * del contrato. Vaciar categoría o presentación las borra (`null`).
 */
export function FormProducto({
  tiendas,
  producto,
  alGuardar,
  alCerrar,
}: Readonly<{
  tiendas: TiendaOut[];
  /** null = producto nuevo. */
  producto: ProductOut | null;
  alGuardar: (producto: ProductOut) => void;
  alCerrar: () => void;
}>) {
  const [tienda, setTienda] = useState(producto?.tienda ?? tiendas[0]?.identificador ?? "");
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [pesos, setPesos] = useState(producto ? String(producto.precio_centavos / 100) : "");
  const [categoria, setCategoria] = useState(producto?.categoria ?? "");
  const [presentacion, setPresentacion] = useState(producto?.presentacion ?? "");
  const [confirmado, setConfirmado] = useState(producto?.precio_confirmado ?? true);
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const precio = Number(pesos);
    if (!Number.isInteger(precio) || precio < 0) {
      setError("El precio va en pesos enteros, sin puntos ni centavos.");
      return;
    }
    const campos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio_centavos: precio * 100,
      categoria: categoria.trim() || null,
      presentacion: presentacion.trim() || null,
      precio_confirmado: confirmado,
      activo,
    };
    setEnviando(true);
    try {
      const guardado = producto
        ? await editarProducto(producto.id, campos)
        : await crearProducto({ tienda, ...campos });
      alGuardar(guardado);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el producto.");
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "mt-1 h-11 w-full rounded-sm border border-borde bg-tarjeta px-3 text-[0.9375rem] text-tinta";

  return (
    <form onSubmit={enviar} className="rounded-tarjeta bg-tarjeta p-5 shadow-tarjeta md:p-6">
      <h3 className="font-display text-xl font-semibold">
        {producto ? `Editar «${producto.nombre}»` : "Producto nuevo"}
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {producto ? null : (
          <label className="text-sm font-semibold">
            Tienda
            <select value={tienda} onChange={(e) => setTienda(e.target.value)} className={campo} required>
              {tiendas.map((t) => (
                <option key={t.id} value={t.identificador}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm font-semibold">
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={120}
            required
            className={campo}
          />
        </label>
        <label className="text-sm font-semibold">
          Precio (pesos)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={pesos}
            onChange={(e) => setPesos(e.target.value)}
            required
            className={`${campo} cifra`}
          />
        </label>
        <label className="text-sm font-semibold">
          Categoría <span className="font-normal text-tenue">(opcional)</span>
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            maxLength={60}
            className={campo}
          />
        </label>
        <label className="text-sm font-semibold">
          Presentación <span className="font-normal text-tenue">(opcional)</span>
          <input
            value={presentacion}
            onChange={(e) => setPresentacion(e.target.value)}
            maxLength={40}
            placeholder="Entero, Medio, Bolsa…"
            className={campo}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Descripción
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={400}
            rows={2}
            className={`${campo} h-auto py-2`}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} className="h-4 w-4" />
          Precio confirmado por la tienda
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
          A la venta
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-sm bg-error-suave px-4 py-2.5 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Boton variante="contorno" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton type="submit" variante="primario" disabled={enviando}>
          {enviando ? "Guardando…" : producto ? "Guardar cambios" : "Crear producto"}
        </Boton>
      </div>
    </form>
  );
}
