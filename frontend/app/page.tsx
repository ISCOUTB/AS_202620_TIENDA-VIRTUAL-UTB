const API_URL = process.env.API_URL ?? "http://localhost:8000";

type Product = {
  id: number;
  nombre: string;
  descripcion: string;
  precio_centavos: number;
  existencias: number;
};

function formatoPrecio(centavos: number): string {
  return (centavos / 100).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

async function cargarCatalogo(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/catalog/products`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`La API respondió ${res.status}`);
  }
  return res.json();
}

export default async function Home() {
  let productos: Product[] = [];
  let error: string | null = null;
  try {
    productos = await cargarCatalogo();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  return (
    <main>
      <p className="eyebrow">Universidad Tecnológica de Bolívar</p>
      <h1>Tienda Virtual UTB</h1>
      <p>Catálogo de la cafetería (datos de ejemplo).</p>

      {error ? (
        <p role="alert">No se pudo cargar el catálogo: {error}</p>
      ) : (
        <ul className="catalogo">
          {productos.map((p) => (
            <li key={p.id}>
              <span className="nombre">{p.nombre}</span>
              <span className="descripcion">{p.descripcion}</span>
              <span className="precio">{formatoPrecio(p.precio_centavos)}</span>
              <span className="existencias">{p.existencias} disponibles</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
