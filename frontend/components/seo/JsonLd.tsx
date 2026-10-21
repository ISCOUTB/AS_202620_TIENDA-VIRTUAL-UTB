/**
 * Inserta un bloque JSON-LD.
 *
 * El contenido lo generan las funciones de lib/seo.ts a partir de las mismas
 * fuentes que renderiza la página, así que los datos estructurados nunca se
 * desincronizan del HTML visible.
 *
 * `JSON.stringify` no escapa `<`. Aunque hoy el contenido no incluye entrada
 * del usuario, se escapa igualmente: es la forma recomendada de cerrar el paso
 * a un `</script>` accidental si mañana un dato viene del backend, y deja el
 * uso de `dangerouslySetInnerHTML` documentado y acotado.
 */
export function JsonLd({ datos }: { datos: Record<string, unknown> }) {
  const json = JSON.stringify(datos).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // El JSON se genera a partir de constantes del proyecto y se escapa el
      // único carácter con el que se podría romper la etiqueta.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
