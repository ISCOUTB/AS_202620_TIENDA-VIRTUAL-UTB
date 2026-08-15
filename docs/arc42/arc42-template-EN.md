---
date: July 2025
title: "![arc42](images/arc42-logo.png) Template"
---

# 

**About arc42**

arc42, the template for documentation of software and system
architecture.

Template Version 9.0-EN. (based upon AsciiDoc version), July 2025

Created, maintained and © by Dr. Peter Hruschka, Dr. Gernot Starke and
contributors. See <https://arc42.org>.

# Introduction and Goals {#section-introduction-and-goals}

## Requirements Overview {#_requirements_overview}

Tienda Virtual UTB is a web system that centralizes the catalog and the
basic purchase process for the cafeteria of Universidad Tecnológica de
Bolívar. Today this information is managed manually and is dispersed,
which forces buyers to visit a point of sale to find out whether a
product is available.

In scope for the current phase:

- Browsing and searching the product catalog.
- Managing a shopping cart.
- Creating and consulting orders.
- Catalog administration (products, prices) by authorized staff.
- Basic inventory tracking (available stock).

Explicitly out of scope for this phase (see [Architecture
Constraints](#section-architecture-constraints)):

- Online payment gateway integration — orders are created in the
  system, but payment is coordinated outside of it.
- Native mobile application.
- Third-party sales.
- National shipping.
- AI-based product recommendations.
- Simultaneous integration with multiple payment gateways.
- Real data source integration — the system runs on mocked/seed
  catalog, inventory and order data, not on a live feed from the
  cafeteria or the university.

## Quality Goals {#_quality_goals}

| # | Quality Goal | Motivation |
| --- | --- | --- |
| 1 | Security | Only authenticated users should access the system, and each role (buyer, store admin, inventory manager) should only be able to perform the operations that correspond to it. |
| 2 | Usability | Buying a product should take few steps; adding authentication and role checks must not turn the purchase flow into a tedious process. |
| 3 | Performance | Stock changes triggered by a purchase should be reflected quickly enough that two buyers do not both believe the same unit of an out-of-stock product is available. |
| 4 | Availability | The catalog should stay reachable during peak consultation times (e.g. lunch hour), since that is when most of the community is expected to use it. |

These four goals are the same ones expanded into the utility tree and
quality scenarios in `docs/arbol-utilidad.md` and
`docs/escenarios-calidad.md`.

## Stakeholders {#_stakeholders}

| Role | Who | Expectations |
| --- | --- | --- |
| Buyer (*Comprador*) | Students, professors, staff and alumni of UTB | Quickly find out what is available, buy with few steps, and check the status of their order. |
| Store administrator (*Administrador*) | Authorized cafeteria staff | Register/update products and prices, and manage order status. |
| Inventory manager (*Responsable de inventario*) | Authorized cafeteria staff | Consult and update available stock so it matches what buyers see in the catalog. |

# Architecture Constraints {#section-architecture-constraints}

| Constraint | Type | Justification |
| --- | --- | --- |
| Fixed stack: FastAPI (backend), Next.js (frontend), PostgreSQL (database) | Technical | Early team decision to keep the same stack across every course deliverable and avoid re-architecting the project each evidence. |
| Mocked/seed data only, no real integration with the cafeteria or university systems in this phase | Scope | There is no confirmed access to a real inventory/sales system of the cafeteria yet; mocked data lets the team validate catalog, cart and inventory flows without depending on that integration. |
| No online payment gateway in this phase | Scope | Gateway availability and institutional restrictions are not confirmed yet (see `docs/disponibilidad.md`); the catalog/order flow is prioritized first. |
| Own authentication, no institutional SSO | Organizational | Access to the university's institutional authentication infrastructure has not been confirmed at this point. |
| Deployment environment still to be confirmed | Infrastructure | Depends on which free/academic service ends up being authorized; left open so it does not block the rest of this deliverable. |
| No native mobile app, third-party sales, national shipping, AI recommendations, or multiple simultaneous payment gateways | Scope | Explicit exclusions from `docs/problema.md` to keep the initial scope manageable for a 4-person team within the course schedule. |

# Context and Scope {#section-context-and-scope}

## Business Context {#_business_context}

See the C4 context diagram in
[`docs/c4/context.md`](../c4/context.md).

- **Buyer** — browses/searches the catalog, manages a cart, creates
  and consults their own orders.
- **Store administrator** — registers/updates products and prices,
  and manages order status.
- **Inventory manager** — consults and updates available stock.

There are no external domain interfaces in this phase: no payment
provider and no institutional authentication system are integrated
yet (see Architecture Constraints above).

## Technical Context {#_technical_context}

| Channel | Technology | Notes |
| --- | --- | --- |
| Web client | Next.js | Used by buyers, administrators and inventory managers through role-based views. |
| API | FastAPI (REST over HTTP) | Exposes catalog, cart, order and inventory operations to the Next.js client. |
| Data storage | PostgreSQL | Currently seeded with mocked catalog, inventory and order data; not yet fed by a real cafeteria system. |

No external systems (payment gateway, institutional SSO) are part of
the technical context yet; they are anticipated extension points, not
current dependencies.

# Solution Strategy {#section-solution-strategy}

# Building Block View {#section-building-block-view}

## Whitebox Overall System {#_whitebox_overall_system}

***\<Overview Diagram\>***

Motivation

:   *\<text explanation\>*

Contained Building Blocks

:   *\<Description of contained building block (black boxes)\>*

Important Interfaces

:   *\<Description of important interfaces\>*

### \<Name black box 1\> {#_name_black_box_1}

*\<Purpose/Responsibility\>*

*\<Interface(s)\>*

*\<(Optional) Quality/Performance Characteristics\>*

*\<(Optional) Directory/File Location\>*

*\<(Optional) Fulfilled Requirements\>*

*\<(optional) Open Issues/Problems/Risks\>*

### \<Name black box 2\> {#_name_black_box_2}

*\<black box template\>*

### \<Name black box n\> {#_name_black_box_n}

*\<black box template\>*

### \<Name interface 1\> {#_name_interface_1}

...​

### \<Name interface m\> {#_name_interface_m}

## Level 2 {#_level_2}

### White Box *\<building block 1\>* {#_white_box_building_block_1}

*\<white box template\>*

### White Box *\<building block 2\>* {#_white_box_building_block_2}

*\<white box template\>*

...​

### White Box *\<building block m\>* {#_white_box_building_block_m}

*\<white box template\>*

## Level 3 {#_level_3}

### White Box \<\_building block x.1\_\> {#_white_box_building_block_x_1}

*\<white box template\>*

### White Box \<\_building block x.2\_\> {#_white_box_building_block_x_2}

*\<white box template\>*

### White Box \<\_building block y.1\_\> {#_white_box_building_block_y_1}

*\<white box template\>*

# Runtime View {#section-runtime-view}

## \<Runtime Scenario 1\> {#_runtime_scenario_1}

-   *\<insert runtime diagram or textual description of the scenario\>*

-   *\<insert description of the notable aspects of the interactions
    between the building block instances depicted in this diagram.\>*

## \<Runtime Scenario 2\> {#_runtime_scenario_2}

## ...​

## \<Runtime Scenario n\> {#_runtime_scenario_n}

# Deployment View {#section-deployment-view}

## Infrastructure Level 1 {#_infrastructure_level_1}

***\<Overview Diagram\>***

Motivation

:   *\<explanation in text form\>*

Quality and/or Performance Features

:   *\<explanation in text form\>*

Mapping of Building Blocks to Infrastructure

:   *\<description of the mapping\>*

## Infrastructure Level 2 {#_infrastructure_level_2}

### *\<Infrastructure Element 1\>* {#_infrastructure_element_1}

*\<diagram + explanation\>*

### *\<Infrastructure Element 2\>* {#_infrastructure_element_2}

*\<diagram + explanation\>*

...​

### *\<Infrastructure Element n\>* {#_infrastructure_element_n}

*\<diagram + explanation\>*

# Cross-cutting Concepts {#section-concepts}

## *\<Concept 1\>* {#_concept_1}

*\<explanation\>*

## *\<Concept 2\>* {#_concept_2}

*\<explanation\>*

...​

## *\<Concept n\>* {#_concept_n}

*\<explanation\>*

# Architecture Decisions {#section-design-decisions}

# Quality Requirements {#section-quality-scenarios}

## Quality Requirements Overview {#_quality_requirements_overview}

## Quality Scenarios {#_quality_scenarios}

# Risks and Technical Debts {#section-technical-risks}

# Glossary {#section-glossary}

| Term | Definition |
| --- | --- |
| *\<Term-1\>* | *\<definition-1\>* |
| *\<Term-2\>* | *\<definition-2\>* |
