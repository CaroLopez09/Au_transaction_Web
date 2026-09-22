# AU Transactional Web — Diagnóstico y arquitectura

> Estado (15-sep-2026): alineado con la documentación nueva de Kira y con la arquitectura de referencia: MFA, avisos, eventos, auditoría, consola de operaciones, términos y consentimiento biométrico, doble firma y recotización. Unitarias 155/155, E2E 33/33 (1 omitida por diseño).
> Estado anterior (14-sep-2026): diagnóstico aprobado. Implementadas las 7 áreas de navegación. Verificado contra el BFF real: sesión, Inicio, Vinculación y beneficiarios, y estados vacíos/bloqueados de tesorería y RFIs. Los flujos con datos de tesorería y RFIs se verificaron con fixtures de contrato, a falta de credenciales del proveedor. Pendiente: escritura KYB (2b). Verificación en [`frontend-qa.md`](frontend-qa.md).
> Contrato detallado, RBAC, errores y gaps: [`frontend-backend-contract.md`](frontend-backend-contract.md).
> Sistema visual: [`../DESIGN.md`](../DESIGN.md).

---

## 1. Backend audit

| Hecho | Evidencia |
|---|---|
| Repo `~/Documentos/AuTransactional`, rama `main`. Auditado sobre `ed853d3` + cambios sin commitear; esos cambios se commitearon después como `b339152 reconciliacion` (workers, `IdempotencyKeyStore`, docs) sin alterar el contrato REST. | `git log`, `git diff --stat ed853d3 HEAD` |
| `docs/ESTADO.md` dice rama `depuracion-bff`; la rama real es `main` → documento desfasado en ese punto. | `ESTADO.md §1` |
| 283 pruebas verdes según `ESTADO.md` (no re-ejecutadas en esta auditoría). | `ESTADO.md` |
| Sin credenciales de Kira en el entorno local (0 variables `KIRA_*`). El BFF corre en `:8080` (perfil `dev`) contra MySQL local; los cambios pendientes quedaron commiteados en `b339152 reconciliacion` sin tocar controladores ni vistas. | `env`, `git log`, `/actuator/health` |

Principio declarado por el propio backend: *"El BFF es una capa delgada sobre Kira"* — añade sesión y roles por empresa, traducción de ids, maker-checker, validación temprana y espejo local.

## 2. Stack detectado

| Capa | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 4.1.1 (webmvc, security, data-jpa, validation, cache, actuator), springdoc-openapi 3.1.1 |
| Persistencia | MySQL (dev/prod), H2 (tests), Hibernate `ddl-auto: update` en dev / `validate` en prod, sin Flyway |
| Auth | JWT HS256 propio (`com.auth0:java-jwt` 4.5.0), stateless, CSRF desactivado |
| Integración | KiraFin (`api.balampay.com`), versión `2026-04-14` (cotización en `2026-06-01`) |
| Ejecución local | `./mvnw spring-boot:run`, puerto **8080** (por defecto), perfil `dev`, semilla de 3 organizaciones × 5 roles, contraseña `BFF_DEV_SEED_PASSWORD` |
| Frontend (entorno) | Node 22.22.3, npm 12.0.1, **Angular CLI 22.1.x** disponible, Playwright 1.63.0 disponible |

## 3. Arquitectura detectada

Hexagonal por capas en el backend: `domain` (agregados, enums de estado tolerantes, `Money`) → `application` (servicios de caso de uso, vistas y comandos como `record`) → `infrastructure` (JPA, cliente Kira, seguridad, workers de reconciliación) → `interfaces` (REST, webhook). Las **vistas** (`*View`) son la proyección estable pensada para el front: el front consume vistas, nunca la forma de Kira (excepto `RfiView.items` y `PayoutPreviewView.fees`, que se pasan crudos a propósito).

## 4. Mapa de dominios

| Dominio backend | Agregados | Dominio front |
|---|---|---|
| `tenant` | Tenant, OperatorUser, Ubo/UboRoster, EligibleProduct | `session` (core), `onboarding` |
| `account` | VirtualAccount, Deposit | `accounts`, `deposits` |
| `treasury` | Recipient, Quotation, Payout | `recipients`, `quotations`, `payouts` |
| `compliance` | Rfi, AuditLog (solo escritura) | `rfis` |
| `reference` | Country (Kira, cache) | `shared/reference` |

## 5. Mapa de endpoints

46 operaciones consumibles por el navegador + 1 webhook. Tabla completa con DTOs y roles en [`frontend-backend-contract.md §1`](frontend-backend-contract.md#1-matriz-de-trazabilidad).

| Área | Lectura | Escritura | ¿Llama a Kira? |
|---|---|---|---|
| Sesión | `me` | `login` | No |
| Onboarding | `GET` (local) | `POST`, `PUT`, `refresh` | Escritura sí |
| UBOs | `GET` (local) | `POST` (local), `sync`, `liveness-links` | sync/liveness sí |
| Cuentas | `GET` ×2 (local) | abrir, refresh, balance, simulate | Escritura sí |
| Depósitos | `GET` ×2 (local) | sync | sync sí |
| Destinatarios | `GET` ×2 local, `GET` ×2 Kira | registrar, archivar (local) | registrar sí |
| Cotizaciones | `GET` ×2 (local) | crear | sí |
| Pagos | `GET`, `GET {id}` local; `kira`, `events` Kira | preview, crear (local), aprobar, rechazar (local), refresh | aprobar/preview/refresh sí |
| RFIs | `GET` ×2 (local) | sync, refresh, answer, upload, delete; link | sí |
| Catálogo | países (Kira, cache 24 h) | — | sí |

**Consecuencia práctica hoy:** sin credenciales de Kira, **todas las lecturas locales funcionan** y todo lo demás devuelve `503 kira_not_configured`. El primer corte vertical debe apoyarse en lecturas locales para ser verificable de extremo a extremo con datos reales.

## 6. Autenticación

- `POST /api/auth/login` → `accessToken` + `expiresIn` (s) + `role`, `tenantId`, `tenantName`, `email`.
- `Authorization: Bearer` en cada petición. Sin cabecera → `403` vacío; token malo → `401 unauthorized`.
- Sin refresh ni logout de servidor (G-04, G-05).
- **Verificación en dos pasos (TOTP, 15-sep):** si la cuenta la tiene, el login devuelve un reto (`mfaChallenge`) y la pantalla de ingreso pide el código; si es obligatoria y no está configurada (`mfaSetupRequired`), la alta con QR se hace ahí mismo. La página «Seguridad» la activa y desactiva. El QR se genera en memoria (`qrcode`) y la URI `otpauth://` nunca se guarda.

**Decisión front:** token en memoria (signal) con copia en `sessionStorage` para sobrevivir a recargas de la pestaña; se borra al cerrar la pestaña, al expirar (`expiresIn` calculado a instante absoluto) o ante cualquier `401`. No se usa `localStorage`. Riesgo aceptado y documentado: un XSS podría leer el token igual que desde memoria; la mitigación real es CSP estricta en el despliegue y el gap G-04/G-05 (cookie `HttpOnly`). Ningún secreto de Kira existe en el front.

## 7. Roles y permisos

Cinco roles de empresa (`TENANT`) y `PLATFORM_OPERATOR` (`SYSTEM`, sin empresa: solo ve «Operaciones» y «Seguridad»; `audienceGuard` separa ambas audiencias). Matriz de acciones en [`contract §2`](frontend-backend-contract.md#2-matriz-rbac-derivada-acciones-de-ui). Implementado: `core/permissions/capabilities.ts` (capacidades nombradas, espejo de cada `@PreAuthorize`, probado rol × capacidad), `SessionStore.can(capability)` para plantillas y `capabilityGuard(capability)` (`canMatch`) para rutas de escritura. Una directiva estructural se añadirá cuando haya suficientes acciones condicionadas que la justifiquen. El `403` del BFF sigue siendo la autoridad.

Segregación de funciones visible: un pago cuyo `makerUserId === me.userId` muestra "Lo preparaste tú" y no ofrece aprobar; con dos firmas requeridas (`requiredApprovals`), quien ya firmó ve "falta la aprobación de otra persona". Que quien registró el destinatario no apruebe lo decide el BFF (el autor no viaja al front). Una cotización vencida ofrece «Recotizar» en lugar de aprobar. Las consultas al proveedor (refrescos, saldo) usan la capacidad `provider.refresh` (`ADMIN` o `TREASURY_APPROVER`).

## 8. Estados y reglas → estado UX normalizado

| Recurso | Estado backend | Estado UX | Tono |
|---|---|---|---|
| KYB | `CREATED` + `pendingFields` no vacío | Información pendiente | atención |
| KYB | `CREATED` sin `kiraUserId` | Sin iniciar | atención |
| KYB | `VERIFYING` | Validación en proceso | progreso |
| KYB | `REVIEW` | Revisión de cumplimiento | progreso |
| KYB | `VERIFIED` + `readyForVirtualAccounts=false` | Identidad aprobada, producto pendiente | atención |
| KYB | `VERIFIED` + `readyForVirtualAccounts=true` | Lista para abrir cuenta | éxito |
| KYB | `REJECTED` | No aprobada (razón no disponible, G-08) | crítico |
| Cuenta | `fundsReady=true` | Operativa | éxito |
| Cuenta | `fundsReady=false` y `activationDelayed=false` | Activándose | progreso |
| Cuenta | `activationDelayed=true` | Activación demorada — contactar | atención |
| Cuenta | `INACTIVE` / `FAILED` | Desactivada / Fallida | crítico |
| Depósito | `PENDING` / `COMPLETED` / `FAILED` / `REFUNDED` | En tránsito / Acreditado / Fallido / Devuelto | progreso/éxito/crítico/neutro |
| Cotización | `ACTIVE` + `secondsToExpiry>0` / `EXPIRED` / `EXECUTED` | Vigente (cuenta atrás) / Vencida / Usada | progreso/neutro/neutro |
| Pago (aprobación) | `PENDING_APPROVAL` / `APPROVED` / `REJECTED` / `SUBMITTED` | Por aprobar / Aprobado / Rechazado / Enviado | atención/progreso/crítico/progreso |
| Pago (Kira) | `CREATED`,`PENDING`,`PROCESSING` | En proceso (bloquear reenvío) | progreso |
| Pago (Kira) | `KYT_PENDING` | Validación transaccional | progreso |
| Pago (Kira) | `IN_REVIEW` | Revisión operativa | progreso |
| Pago (Kira) | `COMPLETED` / `FAILED` / `EXPIRED` | Completado (+`referenceNumber`) / Fallido (+`errorCode`) / Vencido | éxito/crítico/neutro |
| Pago | `blockedByRfiId` presente | Detenido por solicitud de información | atención |
| Pago | `UNKNOWN` o valor no reconocido | Estado en validación | neutro |
| RFI | `PENDING`/`ANSWERED`/`RESOLVED`/`NOT_RESOLVED` (+`overdue`) | Te toca responder / Respondida / Resuelta / No resuelta (+Vencida) | atención/progreso/éxito/crítico |
| Liveness | `PENDING`/`COMPLETED`/`EXPIRED`/`FAILED` | Pendiente / Completada / Enlace vencido / Fallida | atención/éxito/neutro/crítico |

Todo mapeo vive en un único `status-presentation` por dominio con rama por defecto `unknown`.

## 9. Configuración

| Variable | Dónde | Valor dev |
|---|---|---|
| `apiBaseUrl` | `src/environments/environment*.ts` | `/api` (relativo; nunca `localhost`) |
| Proxy dev | `proxy.conf.json` | `/api` → `http://localhost:8080` (única URL local, fuera del bundle) |
| Capacidades del entorno | `GET /api/capabilities` (BFF) | `sandbox`, `providerConfigured`, `bank`, `providerApiVersion`, `dualApprovalThreshold`. Ya **no** hay bandera de compilación (G-18, cerrado el 16-sep) |
| Backend | variables del BFF (`DB_PASSWORD`, `KIRA_*`, `BFF_JWT_SECRET`) | fuera del front; se documentan en README |

## 10. Funcionalidades disponibles (respaldadas por el backend)

Sesión y rol con MFA TOTP · equipo de la empresa (alta y suspensión de operadores, `/equipo`) · consola de operaciones (clientes, ficha 360, bandeja de revisión) · avisos, centro de eventos y auditoría · términos y consentimiento biométrico · estado KYB y elegibilidad · alta KYB y perfil dinámico por `pendingFields` · UBOs (alta/edición local, sync, liveness) · cuentas virtuales (listar, detalle, abrir, refrescar, saldo, simular en sandbox) · depósitos (global, por cuenta, sync) · destinatarios (directorio, alta por riel, archivo con reemplazo, conciliación con Kira) · cotización con TTL · vista previa de comisiones · pagos maker-checker (crear, aprobar con naturaleza/memo/documentos, rechazar, eventos, refresco, historial Kira paginado) · RFIs (bandeja, detalle, respuesta tipada todo-o-nada, documentos, enlace temporal) · catálogo de países.

## 11. Funcionalidades NO disponibles

Parámetros de la organización · logout de servidor/refresh (G-04, G-05) · países de operación en el alta KYB (G-28) · edición de destinatario (por diseño de Kira) · instrucciones de pago cripto (fuera de alcance: el piloto no usa cripto) · exportaciones y reportes · remediación KYB desde la consola (es de solo lectura).

## 12. Gaps backend/frontend

30 gaps con impacto, cambio recomendado y prioridad en [`contract §4`](frontend-backend-contract.md#4-gaps-backend--frontend). Cerrados, entre otros, G-01 (consola), G-07 (idempotencia), G-09 (permisos de refresco), G-15, G-17, G-21, G-24 y G-27. Cerrados el 16-sep: G-03 (nombres de maker y aprobadores), G-13 (operadores), G-18 (capacidades del entorno) y G-26 (destinatario de un pago antiguo); G-16 queda parcial (etiquetas sí, esquema de control no). Siguen abiertos G-04/G-05 (sesión), G-14 (paginación) y G-28.

## 13. Riesgos

| Riesgo | Detalle | Mitigación front |
|---|---|---|
| Flujos Kira no probados | Sin credenciales, todo lo transaccional responde 503 en local; ni el BFF lo ha probado contra sandbox | Estados "Pendiente de configuración" honestos; pruebas de flujo con fixtures **aislados en tests**; verificación real cuando existan credenciales |
| Duplicado de pagos por doble envío | G-07 | Botón con estado `submitting` que bloquea reenvío; navegación al detalle tras 201 |
| Formulario KYB técnico | `pendingFields` sin esquema (G-16) | Diccionario de etiquetas versionado; campo sin etiqueta conocida se muestra con su nombre técnico y aviso |
| `items` de RFI con forma de Kira | `Record<string,unknown>` | Mapper defensivo; `answer_type` desconocido → "Tipo de respuesta no soportado todavía" sin romper el resto |
| Importes como `number` y `string` | `BigDecimal` serializado como número JSON puede perder precisión en JS | No operar con importes en el front; formatear desde el valor recibido; nunca sumar monedas distintas |
| Backend con cambios sin commitear | El contrato puede moverse | Contract tests de mappers + regenerar este mapa tras cada commit del BFF |
| Token en `sessionStorage` | XSS | CSP estricta en despliegue, sin `innerHTML` con datos, G-04 |
| `ESTADO.md` desfasado | Rama distinta | Código como fuente de verdad (hecho) |

## 14. Arquitectura Angular propuesta

**Una sola aplicación Angular**, no tres. Motivo: el backend expone una única audiencia —operadores de una empresa cliente con 5 roles— y no existe superficie de operaciones internas (G-01). Las "tres experiencias" de la arquitectura de referencia se traducen en **áreas de navegación filtradas por rol** dentro de un único layout autenticado, más un layout público (login).

```text
src/app/
  core/
    auth/            session.store.ts (signals), auth.interceptor.ts, auth.guard.ts, session.repository.ts
    http/            api-error.ts, error.interceptor.ts, error-mapping.service.ts
    permissions/     capabilities.ts, permission.service.ts, can.directive.ts, role.guard.ts
    configuration/   app-config token desde environments
    layout/          app-shell (nav por rol), public-layout
  shared/
    ui/              status-badge, money, date-time, empty-state, error-state, skeleton, confirm-dialog, drawer, data-table
    reference/       countries (port + adapter + mapper)
    utilities/       remote-data.ts (idle|loading|success|empty|error), status-tone.ts
  domains/
    onboarding/      domain/ application/ infrastructure/ presentation/   (KYB + UBOs)
    accounts/
    deposits/
    recipients/
    quotations/      (se integra en la página de nuevo pago; dominio propio por reglas de TTL/riel)
    payouts/
    rfis/
    operators/       equipo de la empresa (G-13)
    home/            composición de lectura para Inicio (sin dominio propio)
```

Capas por dominio:

```text
presentation (pages, components)  →  application (facade/use case con signals)
        →  domain (modelos, reglas puras, status-presentation, port abstracto)
        ←  infrastructure (DTOs, mappers, HttpRepository que implementa el port)
```

- Los componentes **no** conocen `HttpClient`; los `*HttpRepository` son los únicos que lo usan y se proveen contra el `abstract class *Repository` (port) en las rutas del dominio.
- DTO ≠ modelo: `*.dto.ts` refleja exactamente el JSON (todos los opcionales de §0), `*.mapper.ts` produce modelos con fechas `Date`, estados normalizados con `unknown` y dinero como `{ amount: string; currency: string }`.
- Estado: signals en facades (`RemoteData<T>`); RxJS solo en infraestructura HTTP y para la cuenta atrás de cotización. Sin librería de estado global.
- Angular 22: standalone, zoneless (por defecto en v22, sin `zone.js`), rutas y componentes lazy (`loadComponent`), control flow `@if/@for/@let`, `input()/output()`, Reactive Forms tipados, `withFetch`, interceptores funcionales, `OnPush` en todos los componentes.
- Dependencias: Angular core/router/forms y `@fontsource-variable/figtree`. `@angular/cdk` (focus trap, overlay) se incorporará con el primer diálogo o drawer, no antes. **Sin Angular Material ni frameworks CSS**: el sistema visual AU se implementa con CSS propio sobre tokens. Figtree auto-alojada para no depender de Google Fonts en runtime. Pruebas: Vitest (builder por defecto de Angular 22) + Playwright. ESLint (`angular-eslint`) + Prettier.

## 15. Navegación propuesta

| Área | Ruta | Visible para | Contenido | Respaldo |
|---|---|---|---|---|
| Inicio | `/` | Todos | Qué requiere atención: estado KYB y siguiente paso, pagos por aprobar (si el rol aprueba) o propios en curso, RFIs abiertas, cuentas no operativas, depósitos recientes | `onboarding`, `payouts`, `rfis`, `virtual-accounts`, `deposits` |
| Vinculación | `/vinculacion` | Todos (edición A, C) | Estado KYB, requisitos pendientes, beneficiarios y liveness | §1.2, §1.3 |
| Cuentas | `/cuentas`, `/cuentas/:id` | Todos | Cuentas, operatividad, instrucciones, saldo, depósitos de la cuenta | §1.4, §1.5 |
| Depósitos | `/depositos` | Todos | Movimientos entrantes | §1.5 |
| Destinatarios | `/destinatarios` | Todos (alta A, M) | Directorio, alta por riel, archivo | §1.6 |
| Pagos | `/pagos`, `/pagos/nuevo`, `/pagos/:id`, `/pagos/historial` | Todos (crear A, M; aprobar A, P) | Bandeja maker-checker, nuevo pago (preview→cotización→confirmar), detalle con timeline, historial Kira | §1.7, §1.8 |
| Solicitudes (RFI) | `/solicitudes`, `/solicitudes/:id` | Todos (responder A, C) | Bandeja y respuesta | §1.9 |
| Equipo | `/equipo` | A, C (alta y baja solo A) | Operadores de la empresa, rol, segundo factor y estado | §1.11 |

**No se muestran** (sin backend): parámetros de la organización y exportaciones. No se crean entradas "próximamente".

Layout: barra lateral oscura (`#101116`) en ≥1024 px con el logotipo oficial, organización y rol; en móvil, barra superior + navegación en hoja inferior. Una sola organización por sesión (no hay "cambiar organización": el backend no lo soporta).

## 16. Design System AU propuesto

Ver [`../DESIGN.md`](../DESIGN.md). Resumen: tipografía única Figtree (300/400/500/700) con cifras tabulares en todo importe; lienzo cálido `Light 1 #F7F8E8`; tinta `Primary #282B3D`; navegación en `Main Dark #101116` con `Main Color #93DDC6` como indicador de selección y foco sobre oscuro; `Secondary #E73726` reservado a lo crítico/destructivo con variante de texto derivada que cumple AA; `Accent #F6FEAA` para "requiere tu atención"; ondas de líneas finas del Brand como marca de agua solo en login y estados vacíos amplios.

## 17. Estrategia de testing

| Nivel | Qué | Herramienta |
|---|---|---|
| Unit | Mappers DTO→modelo (con JSON copiado del contrato, incluidos campos ausentes por `non_null`), `status-presentation` (incluido `unknown`), `PermissionService` (matriz §2 completa), `ErrorMappingService` (catálogo §3), validadores de formularios | Vitest |
| Componente | Estados `loading/empty/error/forbidden` de cada página; formularios con `details` del BFF | Vitest + Testing utilities de Angular |
| E2E real | Contra el BFF arrancado en `dev` con la semilla: login por rol, navegación filtrada, Inicio con datos reales, `403` de acción no permitida, `503 kira_not_configured` mostrado honestamente, expiración de sesión | Playwright CLI |
| E2E con fixtures de contrato | Flujos que requieren el proveedor (cotizar, preparar, aprobar, rechazar, cuenta operativa, alta de destinatario, responder RFI): Playwright intercepta `/api` (salvo la sesión) con JSON idéntico a las vistas del BFF y verifica los cuerpos enviados. Ninguna escritura llega al BFF | Playwright (`e2e/fixtures/`) |
| Visual | Capturas 390 / 768 / 1280 / 1600 px de cada pantalla del corte, auditoría Impeccable (`detect` + critique/audit) | Playwright + Impeccable |
| A11y | Navegación por teclado, foco en diálogos/drawers, contraste | Playwright + axe (`@axe-core/playwright`) |

Los fixtures de pruebas viven solo en `*.spec.ts`/`e2e/fixtures` y se nombran `fixture…`; ningún dato de ejemplo en código de producción.

## 18. Roadmap MVP (según capacidades reales)

| Fase | Alcance | Verificable hoy sin Kira |
|---|---|---|
| **0. Fundaciones** | Scaffold Angular 22, tokens y DESIGN.md, shell por rol, login, sesión, interceptores, `ErrorMappingService`, `PermissionService`, componentes base | Sí |
| **1. Corte vertical 1 — Inicio + Vinculación (lectura)** ✅ | `/` y `/vinculacion` con `GET /api/onboarding` y `GET /api/ubos`; textos por rol; "Consultar estado" solo con alta en el proveedor (el BFF responde 422 sin ella) | Sí (datos reales de la semilla) |
| **2a. Beneficiarios (escritura local)** ✅ | Alta y edición de UBO en drawer (`POST /api/ubos`), avisos de grupo, catálogo de países con respaldo ISO-3 | Sí |
| **2b. Vinculación: asistente por pasos** ✅ construido | 7 pasos (Empresa → Actividad y riesgo → Representante legal → Beneficiarios → Enviar al proveedor → Documentos de la empresa → Verificación) con borrador en el BFF (autoguardado, retomar al volver, `?paso=` en la URL); alta KYB + perfil, documentos KYB de empresa y de beneficiarios, sincronizar beneficiarios, enlaces de prueba de vida | Borrador, beneficiarios y navegación: sí. Alta, perfil, documentos, sincronización y liveness: no (503 sin credenciales de Kira) |
| **3. Cuentas y depósitos** ✅ construido | Lista con operatividad, detalle con saldo, instrucciones con copiar, depósitos por cuenta y globales con filtros locales, apertura, consultar estado/saldo, traer depósitos, simular depósito (sandbox) | Estados vacíos y errores reales; flujo con datos solo con fixtures de contrato |
| **4. Destinatarios y pagos** ✅ construido | Directorio, archivo con reemplazo, conciliación con el proveedor, alta por riel; nuevo pago (cotización con cuenta atrás → preparar), bandeja por aprobar, detalle con aprobar (naturaleza, memo, documentos) y rechazar, línea de tiempo, historial paginado del proveedor | Ídem |
| **5. RFIs** ✅ construido | Bandeja abiertas/todas, sincronizar, detalle con formulario por `answer_type`, lote todo-o-nada, documentos (subir, abrir enlace temporal, quitar) | Ídem |
| **Inicio** ✅ | Una señal de atención priorizada: solicitudes abiertas → pagos que esta persona puede aprobar → vinculación | Sí |
| — | Notificaciones, auditoría, administración, consola multiempresa | **No se implementan** hasta cerrar G-01, G-11, G-12, G-13 |
