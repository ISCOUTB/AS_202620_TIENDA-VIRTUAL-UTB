# COPY — Voz, mensajes y metadatos

> Documento de trabajo del texto. Toda frase visible del sitio tiene que poder
> rastrearse hasta aquí o hasta el componente que la renderiza. Si el copy
> cambia en el código, se actualiza aquí.

## 1. Voz

**Quién habla.** La cafetería del campus, en primera persona del plural para lo
institucional («te avisamos», «preparamos») y en segunda del singular para el
estudiante («apartas», «recoges»).

**Cómo suena.** Directa, concreta y sin solemnidad. Preferimos un dato a un
adjetivo. Si algo no está listo, se dice.

| Sí | No |
|---|---|
| «Quedan 4 unidades.» | «¡Date prisa, casi se acaba!» |
| «Cerrado · abre mañana a las 7:00 a. m.» | «¡Estamos descansando!» |
| «El sabor se elige al recoger.» | «Personaliza tu experiencia.» |
| «El precio se confirma en el mostrador.» | «Precio especial para ti.» |
| «No se creó ningún pedido.» | «¡Casi lo tienes!» |

**Reglas**

1. Nada de signos de admiración dobles ni mayúsculas para enfatizar.
2. Los precios siempre con formato `$3.500` (punto de miles, sin decimales).
3. Las horas con formato «8:00 p. m.».
4. «Pase» es el nombre del acceso del estudiante. «Cuenta» es el término
   técnico; en la interfaz se prefiere «pase».
5. Nunca se promete una hora de entrega exacta: se acuerda una **franja de
   recogida**.
6. No se usa «cliente» para el estudiante. Es «estudiante», «la comunidad» o
   «tú».

## 2. Mensajes clave

- **Propuesta:** cinco puntos de la cafetería, un solo pase.
- **Beneficio:** apartas sin fila y recoges cuando puedas.
- **Prueba:** existencias reales y precios confirmados se muestran como son.
- **Frontera:** se paga en el mostrador; en línea solo se reserva.

## 3. Titulares por sección

| Sección | Titular | Apoyo |
|---|---|---|
| Hero | Cinco puntos. Un solo pase. | Antojos, Punto Fit, Alegría y los dos almuerzos del campus. Consulta qué hay hoy, aparta lo tuyo y recógelo entre clases sin hacer fila. |
| Directorio | Directorio completo | Cinco puntos |
| El lugar | El lugar | Cafetería UTB |
| Tiendas | Lo que hay, tienda por tienda. | Cada punto tiene su carta y su horario. |
| Cómo funciona | Tres pasos y ya estás en el mostrador. | — |
| Tu pase | La cuenta | Carnet digital |
| Preguntas | Lo que suelen preguntar. | — |
| Cierre | ¿Almorzamos? | Entra y aparta lo tuyo en menos de un minuto. |
| Auth | Tu pase de cafetería. | Un solo acceso para las cinco tiendas. |
| Cuenta | Hola, {nombre}. | — |
| Admin | Inventario y precios. | Una sola vista para los cinco puntos. |
| Legal | Términos de uso / Privacidad | Qué puedes esperar de la tienda y cómo tratamos tus datos. |

## 4. Llamadas a la acción

| Contexto | Texto | Variante |
|---|---|---|
| Hero | Entrar con tu correo | ámbar |
| Hero (secundario) | Ver el menú | contorno |
| Navegación (móvil) | Inicio · Tiendas · Pedido · Pase | nav inferior flotante |
| Pasos | Crear mi pase | claro |
| Cierre | Entrar | ámbar |
| Cierre (secundario) | Crear cuenta | contorno |
| Tienda | Entrar para apartar | contorno |
| Producto | Añadir / Añadido ✓ | contorno / ámbar |
| Barra | Ver pedido | ámbar |
| Panel | Confirmar reserva | ámbar |
| Panel sin sesión | Entrar y confirmar | ámbar |
| Panel demo | Entendido | sólido |

Regla: un solo CTA ámbar por pantalla visible. Si hay dos, el segundo es
contorno.

## 5. Microcopy de estado

| Situación | Texto |
|---|---|
| Abierto | «Abierto hasta las 8:00 p. m.» |
| Antes de abrir | «Cerrado · abre hoy a las 7:00 a. m.» |
| Cerrado | «Cerrado · abre mañana a las 7:00 a. m.» |
| Agotado | «Agotado» + «Sin unidades» (botón deshabilitado) |
| Precio sin confirmar | «Precio de referencia» |
| Carrito vacío | «Está vacío. Puedes mezclar productos de varias tiendas.» |
| Sin pedidos | «Todavía no tienes pedidos.» |
| Carta vacía | «Este punto todavía no publica su carta.» |
| Modo demo | «Modo demostración. […] esta sesión vive solo en tu navegador.» |
| Reserva simulada | «Reserva simulada. […] no se creó nada en el servidor.» |

## 6. Errores

| Caso | Mensaje |
|---|---|
| Credenciales incorrectas (401) | «Ese correo y esa contraseña no coinciden con ninguna cuenta.» |
| Correo ya registrado (409) | «Ese correo ya tiene una cuenta. Inicia sesión.» |
| Contraseña corta | «La contraseña necesita al menos 8 caracteres.» |
| Correo inválido | «Escribe un correo válido, por ejemplo nombre@utb.edu.co.» |
| Sesión expirada | «Tu sesión expiró. Vuelve a entrar.» |
| Sin hora de recogida | «Elige la hora a la que vas a pasar por el pedido.» |
| API caída | «No se pudo contactar la tienda. Revisa tu conexión.» |
| Sin permisos | «Esta área es de administración.» |

Los mensajes nunca culpan al usuario ni usan la palabra «error» sola. Dicen qué
pasó y qué hacer.

## 7. Metadatos y SEO

| Página | `title` | `description` |
|---|---|---|
| `/` | Cafetería del campus: cinco tiendas, un solo pase | Pide y reserva en las cuatro tiendas de la cafetería de la Universidad Tecnológica de Bolívar: Antojos, Punto Fit, Alegría y los almuerzos del campus. Recoges entre clases. |
| `/tiendas/antojos` | Antojos — Tienda de barrio | La tienda de barrio dentro de la cafetería: mecatos, fritos, galletas y gaseosas. |
| `/tiendas/punto-fit` | Punto Fit — Fresco y ligero | Fruta, granolas, helados de yogur griego, pastas y wraps en el campus. |
| `/tiendas/alegria` | Alegría — Helados y sándwiches | Helados, sándwiches, chocolatinas Jett, jugos y tés. |
| `/tiendas/almuerzo-01` | Almuerzo 01 — Línea oriental | Pollo frito con arepitas, arroces, chow mein y agridulce con precios confirmados. |
| `/tiendas/almuerzo-02` | Almuerzo 02 — Por definir | El segundo punto de almuerzo del campus, abriendo pronto. |
| `/auth/ingresar` | Ingresar | Entra con tu correo institucional para apartar y recoger. *(noindex)* |
| `/auth/crear-cuenta` | Crear mi pase | Crea tu cuenta con el correo institucional. *(noindex)* |
| `/pedidos` | Mis pedidos | Lo que tienes por apartar y tus pedidos con su hora de recogida. *(noindex)* |
| `/cuenta` | Mi pase | Tus datos y tu carnet. *(noindex)* |
| `/terminos` | Términos de uso | Condiciones de uso: cuentas, reservas, precios, recogida y responsabilidad. |
| `/privacidad` | Privacidad | Cómo tratamos tus datos personales (Ley 1581 de 2012). |

Las descripciones de tienda que dependen de precios se mantienen sin cifras
hasta que la tienda los confirme: así el `noindex` y el texto no se
contradicen.

## 8. Texto para anuncios y correo

**Asunto de correo (apertura de Almuerzo 02):**
«Abrimos el segundo punto de almuerzo»

**Cuerpo:**
> Desde el [fecha] hay un nuevo punto de almuerzo en la cafetería. Misma hora
> de recogida, mismo pase. Puedes ver la carta en la tienda y apartar desde el
> primer día.

**Publicación corta (redes institucionales):**
> La cafetería ya se pide desde el celular: eliges, apartas y recoges entre
> clases. Cinco puntos, un solo pase. Sin fila.
