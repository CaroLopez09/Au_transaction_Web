# AU Transactional Web

Frontend Angular de AU Transactional: vinculación, tesorería y cumplimiento para operadores de una empresa cliente. Consume
exclusivamente el BFF propio [`AuTransactional`](../AuTransactional); ninguna credencial del proveedor (KiraFin) llega al
navegador.

**Estado:** las 7 áreas están construidas: Inicio, Vinculación (asistente por pasos con borrador guardado en el BFF), Cuentas, Depósitos,
Destinatarios, Pagos (maker-checker) y Solicitudes de información. El envío del KYB al proveedor (alta, perfil, documentos, beneficiarios,
liveness) está construido pero sin probar contra Kira. Sin credenciales de Kira, tesorería y RFIs muestran estados vacíos o
bloqueados reales; sus flujos con datos se verificaron con fixtures de contrato. Alcance y siguientes cortes en [`docs/frontend-architecture.md §18`](docs/frontend-architecture.md#18-roadmap-mvp-según-capacidades-reales).

## Prerequisites

| Herramienta | Versión verificada |
|---|---|
| Node.js | 22.22.3 |
| npm | 12.0.1 |
| Angular CLI | 22.1.x (instalado como dependencia del proyecto) |
| BFF AuTransactional | Arrancado en `http://localhost:8080`, perfil `dev` |

El BFF necesita su propia configuración (MySQL, `DB_PASSWORD`, opcionalmente `KIRA_*`). Ver `AuTransactional/docs/API-GUIA.md §1`.
Sin credenciales de Kira, todo lo que llama al proveedor responde `503 kira_not_configured` y la interfaz lo muestra como
**Pendiente de configuración**.

## Installation

```bash
npm install
npx playwright install chromium   # solo para las pruebas E2E
```

## Development

```bash
npm start            # ng serve → http://localhost:4200
```

`proxy.conf.json` redirige `/api` a `http://localhost:8080`. El BFF no tiene CORS: en despliegue el frontend y `/api`
deben servirse desde el **mismo origen** (reverse proxy). Ver gap G-06.

Usuarios de desarrollo: los crea `DevDataSeeder` del BFF (`<rol con puntos>@<organización>.test`, p. ej.
`admin@juriscop.test`, `read.only@bankvision.test`) con la contraseña `BFF_DEV_SEED_PASSWORD` del BFF.

## Environment variables

El frontend no lee variables de entorno en tiempo de ejecución ni guarda secretos.

| Archivo | Clave | Valor |
|---|---|---|
| `src/environments/environment.ts` (producción) | `apiBaseUrl` | `/api` |
| `src/environments/environment.development.ts` | `apiBaseUrl` | `/api` |

Solo para pruebas E2E:

| Variable | Uso |
|---|---|
| `AU_E2E_PASSWORD` | Contraseña de la semilla dev del BFF (obligatoria) |
| `E2E_BASE_URL` | URL del frontend (por defecto `http://localhost:4200`) |

## Build

```bash
npm run build        # producción → dist/au-transactional-web
```

## Tests

```bash
npm test             # Vitest: mappers, reglas de dominio, permisos, errores, sesión, interceptor
npm run lint         # angular-eslint
npm run format:check # Prettier
```

## Playwright

Requiere el BFF arrancado. Si `npm start` no está corriendo, Playwright lo levanta.

```bash
AU_E2E_PASSWORD='<contraseña semilla dev>' npm run e2e
```

Las pruebas comparan la UI con lo que devuelve el BFF en ese momento (no con datos fijos) e incluyen auditoría axe
WCAG 2.2 AA. **`e2e/beneficial-owners.spec.ts` escribe en la base dev:** mantiene un único beneficiario
«Beneficiario QA Frontend» en `au-colombia` (lo crea solo si no existe y después lo edita y restablece), porque el BFF no
permite borrar beneficiarios. `e2e/treasury-flows.spec.ts` usa **fixtures de contrato** (`e2e/fixtures/`): intercepta `/api`
salvo la sesión y verifica los cuerpos que se enviarían; no escribe nada en el BFF. Resultados y auditorías:
[`docs/frontend-qa.md`](docs/frontend-qa.md).

## Architecture

DDD pragmático por capacidades de negocio y puertos/adaptadores: los componentes no conocen `HttpClient`.

```text
Presentation (pages, components)
  → Application (facade con signals, RemoteData)
    → Domain (modelos, reglas puras, puerto abstracto)
      ← Infrastructure (DTO espejo del JSON, mapper, repositorio HTTP)
```

Detalle y decisiones: [`docs/frontend-architecture.md`](docs/frontend-architecture.md).

## Project structure

```text
src/
  environments/              apiBaseUrl por entorno
  styles/tokens.css          tokens AU (espejo de DESIGN.md)
  styles.css                 base, botones, paneles
  app/
    core/
      auth/                  sesión (store, persistencia en sessionStorage, interceptor, guards, ingreso)
      configuration/         APP_CONFIG
      http/                  ApiError + mapeo a mensajes de usuario
      layout/                shell autenticado y navegación por rol
      permissions/           roles del BFF y capacidades (espejo de @PreAuthorize)
    shared/
      reference/             catálogo de países (puerto + adaptador HTTP)
      ui/                    icon, au-logo, status-badge, page-header, error-state, skeleton, drawer, confirm-dialog, copy-button, money, date-time
      utilities/             RemoteData y acciones, fechas, enmascarado, reloj
    domains/                 cada uno con domain · application · infrastructure · presentation
      home/                  Inicio (señal de atención priorizada)
      onboarding/            vinculación KYB y beneficiarios
      accounts/              cuentas virtuales
      deposits/              depósitos
      recipients/            destinatarios
      payouts/               cotizaciones y pagos maker-checker
      rfis/                  solicitudes de información
e2e/                         Playwright contra el BFF real
public/brand/                logotipo y ondas extraídos de AU Brand.pdf
docs/                        contrato, arquitectura, QA
```

## Design system

[`DESIGN.md`](DESIGN.md) es la fuente de verdad visual (tokens en el frontmatter, reglas de uso y prohibiciones).
`src/styles/tokens.css` lo refleja en CSS. Marca: `AU Brand.pdf` (Figtree, paleta UI y principal, logotipo oficial).
Herramientas de diseño del agente en `.claude/skills` (Impeccable y Taste Skill), sin hooks automáticos.

## Backend integration

- Contrato verificado endpoint a endpoint, RBAC, catálogo de errores y 30 gaps:
  [`docs/frontend-backend-contract.md`](docs/frontend-backend-contract.md).
- JWT del BFF en `Authorization: Bearer`; un `401` o un `403` sin cuerpo terminan la sesión; un `403 forbidden` no.
- El JWT no tiene refresh ni revocación en servidor: cerrar sesión lo descarta en el navegador (G-04).
