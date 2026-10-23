import type { Metadata } from "next";
import Link from "next/link";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdMigas } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacidad",
  description:
    "Cómo trata la Tienda Virtual UTB tus datos personales: qué se recoge, para qué, cuánto se conserva y cómo ejercer tus derechos (Ley 1581 de 2012).",
  alternates: { canonical: "/privacidad" },
};

const ACTUALIZADO = "21 de octubre de 2026";

export default function PaginaPrivacidad() {
  return (
    <>
      <JsonLd
        datos={jsonLdMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Privacidad", ruta: "/privacidad" },
        ])}
      />

      <header className="sabana bajo-nav">
        <div className="contenedor pb-20 pt-6 lg:pb-24 lg:pt-10">
          <Etiqueta tono="claro">Datos personales</Etiqueta>
          <h1 className="titulo mt-3">
            Privacidad
          </h1>
          <p className="lead mt-4 max-w-[52ch] opacity-95">
            Recogemos lo mínimo para que tu pedido exista. Nada de perfiles
            publicitarios ni venta de datos.
          </p>
          <p className="mt-6 text-[0.8125rem] opacity-90">
            Última actualización: {ACTUALIZADO} · Versión 1.0
          </p>
        </div>
      </header>

      <div className="contenedor relative -mt-12 pb-16">
        <article className="max-w-[52rem] rounded-xl bg-tarjeta px-5 py-8 shadow-tarjeta sm:px-10 sm:py-12">
          <div className="prosa">
            <h2>1. Responsable del tratamiento</h2>
            <p>
              Universidad Tecnológica de Bolívar — cafetería del campus.
              Campus Casa Lemaitre, Cartagena de Indias, Bolívar, Colombia.
              Correo de contacto para asuntos de datos personales:{" "}
              <strong>cafeteria@utb.edu.co</strong>.
            </p>
            <p>
              Tratamos los datos conforme a la <strong>Ley 1581 de 2012</strong>,
              el <strong>Decreto 1377 de 2013</strong> y las demás normas que
              los modifiquen o complementen.
            </p>

            <h2>2. Qué datos recogemos</h2>
            <ul>
              <li>
                <strong>Identificación:</strong> nombre, correo institucional y,
                cuando corresponda, número de documento para la entrega en el
                mostrador.
              </li>
              <li>
                <strong>Cuenta:</strong> contraseña almacenada como hash
                irreversible, rol y fecha de creación.
              </li>
              <li>
                <strong>Pedidos:</strong> productos, cantidades, totales, hora
                de recogida y estado del pedido.
              </li>
              <li>
                <strong>Técnicos:</strong> registros de acceso al servidor
                (dirección IP, fecha, ruta) necesarios para seguridad y
                diagnóstico.
              </li>
            </ul>
            <p>
              No recogemos datos sensibles (salud, origen étnico, orientación
              sexual, creencias) ni datos de menores de edad de forma
              deliberada.
            </p>

            <h2>3. Para qué los usamos</h2>
            <ul>
              <li>Crear y administrar tu cuenta y tu pase.</li>
              <li>Registrar, reservar y entregar tus pedidos.</li>
              <li>Coordinar la hora de recogida con el mostrador.</li>
              <li>Avisarte de cambios en un pedido o en la disponibilidad.</li>
              <li>Prevenir fraude y usos indebidos del servicio.</li>
              <li>Cumplir obligaciones legales, contables y de facturación.</li>
            </ul>
            <p>
              <strong>No usamos tus datos para publicidad de terceros</strong>{" "}
              ni los vendemos, alquilamos o cedemos con fines comerciales.
            </p>

            <h2>4. Base legal</h2>
            <p>
              El tratamiento se apoya en tu <strong>consentimiento</strong> al
              crear la cuenta, en la <strong>ejecución del servicio</strong> que
              solicitas al hacer un pedido y en el{" "}
              <strong>cumplimiento de obligaciones legales</strong> de la
              institución.
            </p>

            <h2>5. Cuánto tiempo los conservamos</h2>
            <ul>
              <li>
                <strong>Cuenta:</strong> mientras esté activa. Si la eliminas,
                se borran los datos asociados salvo los que la ley obligue a
                conservar.
              </li>
              <li>
                <strong>Pedidos:</strong> el tiempo necesario para la operación
                y la facturación; luego se conservan de forma agregada o
                anonimizada.
              </li>
              <li>
                <strong>Carrito sin confirmar:</strong> se elimina
                automáticamente a las 24 horas.
              </li>
              <li>
                <strong>Registros técnicos:</strong> hasta 12 meses.
              </li>
            </ul>

            <h2>6. Dónde se guardan</h2>
            <p>
              Los datos se almacenan en servidores administrados para el
              proyecto, con acceso restringido al equipo responsable. Las
              contraseñas nunca se guardan en texto plano.
            </p>
            <p>
              En tu navegador guardamos el carrito y la sesión en{" "}
              <strong>almacenamiento local</strong> para que no pierdas lo que
              elegiste al cambiar de página. Esa información no es accesible
              para otros sitios y puedes borrarla vaciando los datos del
              navegador.
            </p>

            <h2>7. Con quién los compartimos</h2>
            <p>
              Solo con quienes prestan servicios necesarios para operar la
              tienda (alojamiento e infraestructura), bajo obligaciones de
              confidencialidad, y con las autoridades cuando exista un
              requerimiento legal. No hay transferencia internacional de datos
              personales distinta del alojamiento técnico descrito.
            </p>

            <h2>8. Tus derechos</h2>
            <p>Como titular de los datos puedes:</p>
            <ul>
              <li>Conocer, actualizar y rectificar tus datos personales.</li>
              <li>Pedir prueba de la autorización concedida.</li>
              <li>
                Ser informado del uso que se da a tus datos y revocar la
                autorización.
              </li>
              <li>
                Solicitar la supresión cuando el tratamiento no respete la ley o
                la finalidad haya terminado.
              </li>
              <li>
                Acceder de forma gratuita a tus datos y presentar quejas ante la
                Superintendencia de Industria y Comercio.
              </li>
            </ul>
            <p>
              Para ejercerlos escribe a{" "}
              <strong>cafeteria@utb.edu.co</strong> con el asunto «Datos
              personales» indicando tu nombre, correo de registro y la solicitud
              concreta. Respondemos en los términos de la ley: consultas en 10
              días hábiles y reclamos en 15 días hábiles, prorrogables.
            </p>

            <h2>9. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y administrativas razonables: cifrado
              en tránsito, control de acceso por roles, registro de operaciones
              y respaldo de la información. Ningún sistema es infalible; si
              ocurre un incidente que afecte tus datos, te informaremos conforme
              a la normativa aplicable.
            </p>

            <h2>10. Cambios a esta política</h2>
            <p>
              Publicaremos cualquier cambio en esta página con su fecha. Si el
              cambio es sustancial, lo anunciaremos en la tienda antes de
              aplicarlo.
            </p>

            <p>
              Ver también los{" "}
              <Link href="/terminos">términos de uso</Link> del servicio.
            </p>
          </div>
        </article>
      </div>
    </>
  );
}
