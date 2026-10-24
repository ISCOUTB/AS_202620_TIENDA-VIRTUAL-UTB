# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** AS_202620_TIENDA-VIRTUAL-UTB
- **Version:** API 0.5.0 (rama `feat/admin-por-tienda`)
- **Date:** 2026-10-24
- **Prepared by:** TestSprite AI + Claude Code
- **Entorno:** Next.js 15 en modo producción (puerto 3000) y FastAPI (puerto 8000) contra la base E2E `tienda_e2e` con datos de demostración (`preparar_datos.sh`)

---

## 2️⃣ Requirement Validation Summary

### Frontend (77 casos)

#### Cart and order placement

| Caso | Título | Estado final |
|---|---|---|
| TC001 | Sign in and reserve a cart for one store | ✅ Passed |
| TC011 | Reserve separate orders for products from multiple stores | ✅ Passed |
| TC029 | Use the pickup time reminder before reserving | ✅ Passed |

#### Authentication

| Caso | Título | Estado final |
|---|---|---|
| TC002 | Sign in with valid credentials | ✅ Passed |
| TC004 | Search from the landing page to the matching store menu | ✅ Passed |
| TC020 | Create a new shopper account | ✅ Passed |
| TC026 | Browse other stores from a store menu | ✅ Passed |
| TC030 | Sign out from the account page | ✅ Passed |
| TC033 | Show an error for invalid sign-in | ✅ Passed |

#### Admin panel

| Caso | Título | Estado final |
|---|---|---|
| TC003 | Log in as a store admin and filter to the assigned store | ✅ Passed |
| TC014 | Advance an order through the admin queue | ✅ Passed |
| TC019 | Update inventory from the admin panel | ✅ Passed |
| TC021 | Enter supervision mode and review all stores read-only | ✅ Passed |
| TC027 | Manage a product listing from the admin panel | ✅ Passed |
| TC039 | Block buyers from accessing the admin panel | ✅ Passed |

#### Store catalog

| Caso | Título | Estado final |
|---|---|---|
| TC005 | Browse a store menu and review sold-out items | ✅ Passed |
| TC016 | Switch between single and shared menu tabs | ✅ Passed |
| TC035 | See reference pricing labels where applicable | ✅ Passed |
| TC064 | Almuerzo 02 shows an empty menu message | ✅ Passed |
| TC065 | Sold-out products are shown disabled | ✅ Passed |
| TC066 | Prices use Colombian peso format | ✅ Passed |
| TC067 | Low stock shows the last units warning | ✅ Passed |

#### My orders

| Caso | Título | Estado final |
|---|---|---|
| TC006 | Cancel a pending order and restore stock | ✅ Passed |
| TC008 | Review order history in the account area | ✅ Passed |
| TC036 | Prevent cancellation of non-pending orders | ✅ Passed |
| TC077 | Buyer only sees their own orders | ✅ Passed |

#### Product search

| Caso | Título | Estado final |
|---|---|---|
| TC007 | Search for a product and open its matching store | ✅ Passed |
| TC022 | Find products with an accent-insensitive search | ✅ Passed |
| TC038 | Ignore too-short search input | ✅ Passed |
| TC068 | Search with no matches shows no results | ✅ Passed |
| TC069 | Escape clears the search | ✅ Passed |

#### Account page

| Caso | Título | Estado final |
|---|---|---|
| TC009 | Cancel a pending order from the account page | ✅ Passed |
| TC025 | Open the account page and review order history | ✅ Passed |

#### Per-store administration and supervision

| Caso | Título | Estado final |
|---|---|---|
| TC010 | View all stores in supervision mode without edit controls | ✅ Passed |
| TC012 | Restrict a store admin to their assigned store | ✅ Passed |

#### Admin inventory

| Caso | Título | Estado final |
|---|---|---|
| TC013 | Adjust inventory by one unit in the admin panel | ✅ Passed |
| TC017 | Enter supervision mode as a general admin | ✅ Passed |
| TC023 | Save a typed inventory count immediately | ✅ Passed |
| TC032 | Prevent inventory from going below zero | ✅ Passed |
| TC037 | Hide edit controls in supervision mode | ✅ Passed |

#### Admin order queue

| Caso | Título | Estado final |
|---|---|---|
| TC015 | Manage a store order through all fulfillment statuses | ✅ Passed |
| TC024 | Cancel an open order in the queue | ✅ Passed |
| TC034 | Review delivered and canceled orders in the queue | ✅ Passed |

#### Admin product management

| Caso | Título | Estado final |
|---|---|---|
| TC018 | Create a new product in the assigned store | ✅ Passed |
| TC028 | Edit an existing product and save the changes | ✅ Passed |
| TC031 | Deactivate a product from the public catalog | ✅ Passed |

#### Per-store administration

| Caso | Título | Estado final |
|---|---|---|
| TC040 | Store admin of Antojos only manages Antojos | ✅ Passed |
| TC041 | Store admin of Punto Fit only manages Punto Fit | ✅ Passed |
| TC042 | Store admin of Alegría only manages Alegría | ✅ Passed |
| TC043 | Store admin of Almuerzo 02 only manages Almuerzo 02 | ✅ Passed |
| TC044 | Store admin of Antojos sees the Antojos order queue | ✅ Passed |
| TC045 | Store admin of Almuerzo 01 advances an order to Entregado | ✅ Passed |
| TC046 | Store admin cannot see products of other stores | ✅ Passed |
| TC047 | Store admin creates a product only in their own store | ✅ Passed |

#### Supervision

| Caso | Título | Estado final |
|---|---|---|
| TC048 | General admin supervision mode shows all five stores | ✅ Passed |
| TC049 | General admin has no edit controls anywhere | ✅ Passed |
| TC050 | General admin sees the queue of any store read-only | ✅ Passed |
| TC051 | General admin sees inactive products in supervision | ✅ Passed |

#### Routes

| Caso | Título | Estado final |
|---|---|---|
| TC052 | /login redirects to the sign-in page | ✅ Passed |
| TC053 | /registro redirects to account creation | ✅ Passed |
| TC054 | /cuenta without session asks to sign in and returns afterwards | ✅ Passed |
| TC055 | /admin without session asks to sign in and returns to the panel | ✅ Passed |
| TC056 | Session persists after reloading | ✅ Passed |
| TC057 | Expired session asks to sign in again and returns | ✅ Passed |
| TC058 | Terms and privacy pages load | ✅ Passed |
| TC059 | Unknown route shows a not-found page | ✅ Passed |

#### Registration

| Caso | Título | Estado final |
|---|---|---|
| TC060 | Registration validates short password | ✅ Passed |
| TC061 | Registration requires accepting terms | ✅ Passed |
| TC062 | Registration rejects an existing email | ✅ Passed |
| TC063 | Registration rejects invalid email | ✅ Passed |

#### Cart

| Caso | Título | Estado final |
|---|---|---|
| TC070 | Cart quantity cannot exceed stock | ✅ Passed |
| TC071 | Removing the last unit removes the item | ✅ Passed |
| TC072 | Cart persists after reload | ✅ Passed |
| TC073 | Ordering without a pickup time shows an error | ✅ Passed |
| TC074 | Reserving reduces the visible stock | ✅ Passed |

#### Navigation

| Caso | Título | Estado final |
|---|---|---|
| TC075 | Mobile bottom navigation | ✅ Manual |
| TC076 | Theme toggle switches light and dark | ✅ Passed |

### API (36 casos)

| Caso | Título | Estado final |
|---|---|---|
| TC001 | verify_get_catalog_products_endpoint_returns_correct_product_data | ✅ Passed |
| TC002 | verify_get_inventory_endpoint_returns_current_stock_levels | ✅ Passed |
| TC003 | verify_post_orders_endpoint_creates_orders_with_idempotency | ✅ Passed |
| TC004 | verify_post_identity_login_endpoint_authenticates_users | ✅ Passed |
| TC005 | verify_post_identity_register_endpoint_creates_new_user_accounts | ✅ Passed |
| TC006 | verify_get_orders_endpoint_returns_user_order_history | ✅ Passed |
| TC007 | verify_post_orders_orderid_cancel_endpoint_cancels_pending_orders | ✅ Passed |
| TC008 | verify_post_inventory_productid_adjust_endpoint_updates_stock_correctly | ✅ Passed |
| TC009 | verify_post_orders_orderid_estado_endpoint_advances_order_status | ✅ Passed |
| TC010 | verify_post_catalog_products_endpoint_creates_new_product | ✅ Passed |
| TC011 | general_admin_cannot_adjust_stock_and_gets_supervision_403 | ✅ Passed |
| TC012 | general_admin_cannot_create_or_edit_products | ✅ Passed |
| TC013 | general_admin_cannot_advance_or_cancel_store_orders | ✅ Passed |
| TC014 | general_admin_reads_any_store_queue_and_inactive_products | ✅ Passed |
| TC015 | store_admin_manages_only_own_store_stock | ✅ Passed |
| TC016 | store_admin_creates_and_edits_only_in_own_store | ✅ Passed |
| TC017 | store_admin_cannot_see_other_store_orders | ✅ Passed |
| TC018 | store_admin_queue_lists_only_own_store | ✅ Passed |
| TC019 | buyer_cannot_use_admin_endpoints | ✅ Passed |
| TC020 | anonymous_requests_to_protected_endpoints_get_401 | ✅ Passed |
| TC021 | invalid_token_gets_401 | ✅ Passed |
| TC022 | order_status_transitions_follow_the_lifecycle | ✅ Passed |
| TC023 | buyer_cannot_cancel_after_payment | ✅ Passed |
| TC024 | cancel_restores_stock | ✅ Passed |
| TC025 | order_without_idempotency_key_is_rejected | ✅ Passed |
| TC026 | same_idempotency_key_returns_same_orders | ✅ Passed |
| TC027 | multi_store_order_splits_by_store | ✅ Passed |
| TC028 | order_more_than_stock_is_rejected | ✅ Passed |
| TC029 | stock_cannot_go_negative | ✅ Passed |
| TC030 | product_validation_errors | ✅ Passed |
| TC031 | register_validation | ✅ Passed |
| TC032 | login_wrong_password_401 | ✅ Passed |
| TC033 | me_returns_roles_per_store | ✅ Passed |
| TC034 | health_ready_and_metrics | ✅ Passed |
| TC035 | product_detail_and_stores | ✅ Passed |
| TC036 | buyer_order_list_only_own | ✅ Passed |

---

## 3️⃣ Coverage & Matching Metrics

- **Frontend:** 76/77 aprobados por TestSprite + 1 verificado a mano (TC075, viewport móvil) = **77/77**.
- **API:** **36/36** aprobados.

| Tanda | Casos | Primera ejecución | Tras corregir |
|---|---|---|---|
| Frontend t1 (TC001–TC030) | 30 | 28 ✅ · 2 ❌ | 30 ✅ |
| Frontend t2 (TC031–TC060) | 30 | 27 ✅ · 1 ❌ · 2 bloqueados | 30 ✅ |
| Frontend t3 (TC061–TC077 + 5 re-ejecuciones) | 22 | 21 ✅ · 1 bloqueado (TC075) | 21 ✅ + 1 manual |
| API a1 (TC001–TC030) | 30 | 30 ✅ | 30 ✅ |
| API a2 (TC031–TC036) | 6 | 5 ✅ · 1 ❌ | 6 ✅ |

Clasificación de los 7 casos que no pasaron a la primera:

| Caso | Clasificación | Causa | Acción |
|---|---|---|---|
| FE TC021 | **Bug real** | El admin general veía − / + y el campo de stock deshabilitados, sin explicación | `TablaInventario` muestra el número con «solo lectura» (commit `5dce4a7`) |
| FE TC018 | Expectativa de la prueba | Un producto nuevo empieza con 0 unidades («Agotado») | Aserción corregida |
| FE TC035 | Expectativa de la prueba | Buscaba precios «Referencia» en Almuerzo 01, la única tienda con precios confirmados | Caso apunta a Antojos |
| FE TC045 | Expectativa de la prueba | Un pedido entregado sale de la cola abierta; faltaba activar «Ver entregados y cancelados» | Paso añadido |
| FE TC057 | Limitación de la herramienta | El agente no puede editar `localStorage` | Reescrito: flujo real de sesión vencida (`?motivo=expirada`) |
| FE TC075 | Limitación de la herramienta | El navegador remoto no cambia el viewport | Verificado a mano con Chrome sin cabeza a 390×844 |
| API TC034 | Expectativa de la prueba | `/metrics` responde JSON por diseño, no texto Prometheus | Descripción corregida |

---

## 4️⃣ Key Gaps / Risks

- **Sin fallos abiertos.** El único bug real de esta batería (TC021) está corregido y re-verificado.
- **Pantalla de roles:** asignar `admin_tienda` sigue siendo por siembra o SQL; no hay endpoint ni UI (pendiente documentado).
- **Datos compartidos:** los casos corren en paralelo sobre la misma base; se mitiga con productos distintos y comparaciones relativas.
- **Responsive:** el móvil se verificó a mano; TestSprite no puede cambiar el viewport.
- **Producción:** todo se probó en local con datos de demostración; tras desplegar 0.5.0 seguir la verificación del runbook (`docs/despliegue-dokploy.md#subir-050`).
