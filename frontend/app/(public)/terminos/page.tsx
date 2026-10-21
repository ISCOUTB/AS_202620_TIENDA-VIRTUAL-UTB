import type { Metadata } from "next";
import Link from "next/link";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdMigas } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Términos de uso",
  description:
    "Condiciones de uso de la Tienda Virtual de la cafetería de la Universidad Tecnológica de Bolívar: cuentas, reservas, precios, recogida y responsabilidad.",
  alternates: { canonical: "/terminos" },
};

const ACTUALIZADO = "21 de octubre de 2026";

export default function PaginaTerminos() {
  return (
    <>
      <JsonLd
        datos={jsonLdMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Términos de uso", ruta: "/terminos" },
        ])}
      />

      <header className="sabana">
        <div className="contenedor pb-14 pt-10 lg:pb-16">
          <Etiqueta tono="claro">Documento legal</Etiqueta>
          <h1 className="mt-4 text-[clamp(2.25rem,1.5rem+4vw,4rem)] text-superficie">
            Términos de uso
          </h1>
          <p className="lead mt-4 max-w-[52ch] text-cyan-claro">
            Qué puedes esperar de la tienda, qué esperamos de ti y cómo se
            resuelve lo que salga mal.
          </p>
          <p className="mt-6 font-cuerpo text-[0.8125rem] text-cyan-claro">
            Última actualización: {ACTUALIZADO} · Versión 1.0
          </p>
        </div>
      </header>

      <div className="bg-tinta">
        <article className="contenedor mx-0 max-w-[74ch] py-12 lg:py-16">
          <div className="prosa">
            <p>
              Estos términos regulan el uso de la <strong>Tienda Virtual
              UTB</strong>, el canal digital de la cafetería de la Universidad
              Tecnológica de Bolívar (en adelante, «la cafetería»). Al crear una
              cuenta o al usar el sitio aceptas estas condiciones. Si no estás
              de acuerdo, puedes seguir consultando el menú sin cuenta.
            </p>

            <h2>1. Qué es este servicio</h2>
            <p>
              La tienda permite <strong>consultar el menú, reservar unidades y
              acordar una hora de recogida</strong> en los puntos de la
              cafetería del campus. No es una tienda abierta al público: es un
              servicio interno para la comunidad universitaria.
            </p>
            <p>
              El sitio <strong>no procesa pagos en línea</strong>. El pago se
              hace en el mostrador, al recoger el pedido. El pago electrónico
              está previsto como una etapa posterior y, cuando exista, se
              anunciará aquí con sus propias condiciones.
            </p>

            <h2>2. Estado del servicio</h2>
            <p>
              La plataforma está en construcción por etapas. Algunas funciones
              pueden mostrarse en <strong>modo demostración</strong>, con datos
              de prueba y sin efecto en el inventario real. Cuando una función
              opera en ese modo, la interfaz lo indica de forma visible. No se
              genera ningún compromiso de compra a partir de una reserva
              simulada.
            </p>

            <h2>3. Quién puede usar la tienda</h2>
            <ul>
              <li>
                Estudiantes, docentes y personal administrativo de la
                Universidad Tecnológica de Bolívar.
              </li>
              <li>
                Personas con un correo institucional válido. El correo es el
                identificador de la cuenta.
              </li>
              <li>
                Mayores de edad, o menores con autorización de su representante
                legal conforme a la legislación colombiana.
              </li>
            </ul>

            <h2>4. Tu cuenta y tu pase</h2>
            <p>
              Eres responsable de la veracidad de los datos que registras y de
              la custodia de tu contraseña. No compartas tu cuenta: los pedidos
              quedan asociados a ella y se entregan a quien los reclame en el
              mostrador presentando el nombre registrado.
            </p>
            <p>
              Si detectas un uso no autorizado de tu cuenta, escríbenos de
              inmediato a la dirección de contacto del final de este documento.
              Podemos suspender una cuenta ante un uso fraudulento o ante un
              incumplimiento reiterado de estos términos.
            </p>

            <h2>5. Reservas, existencias y recogida</h2>
            <ul>
              <li>
                Una reserva <strong>aparta unidades</strong> del inventario
                disponible en el momento en que la confirmas.
              </li>
              <li>
                La <strong>hora de recogida</strong> que eliges es una
                referencia de coordinación con el mostrador, no una garantía de
                entrega a esa hora exacta.
              </li>
              <li>
                Si un producto se agota antes de que pases, te avisamos y no se
                te cobra. Puedes aceptar un reemplazo o cancelar esa línea.
              </li>
              <li>
                Las reservas no reclamadas dentro del horario de la cafetería
                pueden liberarse al cierre del día.
              </li>
            </ul>

            <h2>6. Precios y disponibilidad</h2>
            <p>
              Los precios se expresan en pesos colombianos (COP) e incluyen los
              impuestos aplicables. Los productos marcados como{" "}
              <strong>«precio de referencia»</strong> todavía no tienen tarifa
              confirmada por la tienda; el valor definitivo se informa en el
              mostrador antes de pagar.
            </p>
            <p>
              La información de existencias refleja el inventario del sistema en
              el momento de la consulta. Puede haber diferencias por mermas,
              conteos pendientes o ventas simultáneas en el punto físico.
            </p>

            <h2>7. Uso aceptable</h2>
            <p>No está permitido:</p>
            <ul>
              <li>
                Automatizar peticiones para agotar inventario o revender
                productos de la cafetería.
              </li>
              <li>
                Suplantar la identidad de otra persona o crear cuentas con datos
                falsos.
              </li>
              <li>
                Intentar acceder a información de otras cuentas, alterar
                precios, existencias o registros de pedidos.
              </li>
              <li>
                Usar el sitio para fines distintos del servicio de cafetería.
              </li>
            </ul>
            <p>
              El incumplimiento puede llevar a la suspensión de la cuenta y, si
              corresponde, a las acciones disciplinarias o legales del caso.
            </p>

            <h2>8. Propiedad intelectual</h2>
            <p>
              La marca, el nombre y los signos distintivos de la Universidad
              Tecnológica de Bolívar pertenecen a la institución. El diseño, los
              textos y el código de esta tienda se usan con autorización en el
              marco del proyecto. Las fotografías de la cafetería son del
              equipo del proyecto y no pueden reproducirse sin permiso.
            </p>

            <h2>9. Límite de responsabilidad</h2>
            <p>
              Hacemos lo razonable para que la información sea exacta y el
              servicio esté disponible, pero no garantizamos ausencia total de
              interrupciones, errores de inventario o fallas de conectividad.
              La cafetería responde por el producto entregado en el mostrador,
              no por daños indirectos derivados del uso del sitio.
            </p>
            <p>
              Nada en estos términos limita los derechos que la ley colombiana
              reconoce a los consumidores.
            </p>

            <h2>10. Cambios</h2>
            <p>
              Podemos actualizar estos términos para reflejar cambios del
              servicio o de la ley. Publicaremos la versión vigente en esta
              página con su fecha. Los cambios sustanciales se anuncian en la
              tienda antes de entrar en vigor.
            </p>

            <h2>11. Ley aplicable y contacto</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Colombia.
              Cualquier controversia se somete a los jueces competentes de
              Cartagena de Indias, sin perjuicio de las vías de protección al
              consumidor.
            </p>
            <p>
              Para asuntos de estos términos:{" "}
              <strong>cafeteria@utb.edu.co</strong> · Universidad Tecnológica de
              Bolívar, Campus Casa Lemaitre, Cartagena de Indias.
            </p>
            <p>
              Consulta también la{" "}
              <Link href="/privacidad">política de privacidad</Link>, que explica
              cómo tratamos tus datos personales.
            </p>
          </div>
        </article>
      </div>
    </>
  );
}
