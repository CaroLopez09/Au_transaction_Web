# QA del frontend

Registro de verificaciones reales. Cada ronda indica fecha, entorno y resultado; nada se marca como hecho sin la salida
del comando que lo demuestra.

## Ronda 1 — Corte vertical 1 (14-sep-2026)

**Alcance:** ingreso, sesión, shell por rol, Inicio, Vinculación (lectura).
**Entorno:** BFF `AuTransactional` commit `b339152`, perfil `dev`, sin credenciales de Kira; frontend `ng serve`; Chromium
Headless Shell 153 (Playwright 1.63.0).
**Datos:** semilla del BFF. Las 3 organizaciones están en `CREATED`, sin alta en el proveedor y sin beneficiarios; todas
las listas de tesorería vuelven vacías.

### Contrato comprobado con peticiones reales

| Petición | Resultado observado |
|---|---|
| `POST /api/auth/login` (admin, read_only) | `200` con `accessToken`, `expiresIn: 28800`, `role`, `tenantId`, `tenantName` |
| `GET /api/auth/me` | `200 {tenantId, email, role, userId}` |
| `GET /api/onboarding` | `200`, sin `kiraUserId` (ausente por `non_null`) |
| `GET /api/ubos` | `200 {members: [], totalOwnership: 0, …}` |
| `POST /api/onboarding/refresh` sin alta | `422 business_rule_violation "La empresa todavia no esta dada de alta en Kira."` → la UI no ofrece consultar |
| Sin cabecera `Authorization` | `403` sin cuerpo |
| Token inválido | `401 {"code":"unauthorized"}` |
| Credenciales incorrectas | `422 "Credenciales invalidas."` |
| Cuerpo inválido | `400 validation_error` con `details` por campo (mensajes en español del validador) |

### Resultados automáticos

| Verificación | Comando | Resultado |
|---|---|---|
| Build producción | `npm run build` | OK, sin warnings. Inicial 294 kB (83 kB transferidos) |
| Unit | `npm test` | **81/81** (5 archivos) |
| Lint | `npm run lint` | All files pass linting |
| E2E | `AU_E2E_PASSWORD=… npm run e2e` | **10/10** (9 desktop, 1 mobile) |
| Accesibilidad | axe WCAG 2.2 AA en ingreso, ingreso con errores, Inicio y Vinculación a 390 y 1280 px | **0 violaciones** |
| Consola | Playwright en 4 anchos | 0 errores/avisos, 0 respuestas ≥ 400 en el flujo feliz |
| Higiene | `grep` en `src` de `localhost`, claves, `console.log`, `TODO`, `localStorage` | Sin coincidencias en código (solo un comentario que documenta que no se usa `localStorage`) |

### Cobertura E2E

- Ruta protegida sin sesión → `/ingresar?volver=…`.
- Validación de cliente sin llamar al BFF.
- Credenciales incorrectas: mensaje del BFF y contraseña limpiada.
- Retorno al destino tras ingresar; cerrar sesión borra `sessionStorage` y bloquea rutas.
- Token manipulado → `401` real → aviso "Tu sesión terminó" → reingreso al destino.
- `?volver=https://…` ignorado (sin redirección abierta).
- Inicio y Vinculación comparados con `GET /api/onboarding` en vivo; `aria-current` en navegación y en el paso actual.
- Otra organización y rol (`treasury.approver@bankvision.test`): nombre propio y texto "Lo gestiona una persona con rol…".
- Móvil (Pixel 7): menú con `aria-expanded`, navegación y cierre al navegar.

### Auditoría visual (390 / 768 / 1280 / 1600 px)

Pase 1, hallazgos y corrección:

| Hallazgo | Corrección |
|---|---|
| Franja "0 % · Sin identificar · Incompleta" con cero beneficiarios: ruido con forma de métricas | Solo se muestra si hay miembros |
| Inicio repetía "Vinculación: Sin iniciar" bajo el bloque de atención | Fila eliminada |
| 768 px: paneles laterales apilados a ancho completo, largos y vacíos | Dos columnas `auto-fit` en tablet |
| Lema del ingreso partido en 4 líneas | Medida 30ch y tamaño del token `--au-fs-amount` |

Pase 2: correcciones confirmadas en captura. Se detiene el pulido (pases acotados).

### Impeccable (`impeccable detect src`)

| Hallazgo | Estado |
|---|---|
| `broken-image` en `au-logo` | **Falso positivo**: `src` enlazado dinámicamente; el logotipo carga en todas las capturas |
| Tamaños fuera de escala (2.25rem, 1.375rem), radio 1 px, gris `#ececea` del skeleton | Corregidos a tokens de `DESIGN.md` |
| `rgb(0,0,0)` en plantillas | Falso positivo del análisis estático (plantillas sin su CSS) |

### Pendiente / no verificado en esta ronda

- Estados `information-pending`, `verifying`, `in-review`, `product-pending`, `ready`, `rejected` y beneficiarios con
  datos: cubiertos por pruebas unitarias de dominio, **no vistos en pantalla** porque la base dev no tiene empresas en
  esos estados y crearlas requiere escribir en el BFF o credenciales de Kira.
- Error de red y `503 kira_not_configured` en pantalla: cubiertos por pruebas unitarias del mapeo, no provocados en E2E.
- Navegadores distintos de Chromium.
- Vencimiento real del JWT a las 8 h (cubierto con reloj inyectado en unit).

## Ronda 2 — Beneficiarios finales: alta y edición (14-sep-2026)

**Alcance:** botón «Registrar beneficiario» y acción «Editar» (roles Administración y Cumplimiento), drawer con
formulario, avisos de grupo, catálogo de países con respaldo ISO-3.
**Entorno:** igual que la ronda 1 (BFF `b339152`, sin credenciales de Kira).
**Datos creados en la base dev (con autorización):** un beneficiario «Beneficiario QA Frontend» en `au-colombia`
(60 %, `COL`, control sí, firma no, PEP no). Se creó por la UI y se verificó con `GET /api/ubos`. No se puede borrar (G-17).

### Contrato comprobado sin crear datos

| Petición | Resultado |
|---|---|
| `GET /api/reference/countries` | `503 kira_not_configured` → formulario con código ISO-3 |
| `POST /api/ubos` vacío | `400` con `details` por nombre de campo del comando |
| `POST /api/ubos` con 150 % y país de 2 letras | `400` (`ownershipPercentage`, `countryOfBirth`) |
| `POST /api/ubos` con `id` inexistente | `422 "El beneficiario final no existe."` |
| `POST /api/ubos` válido como `TREASURY_APPROVER` | `403 forbidden`, nada creado |

### Resultados automáticos

| Verificación | Resultado |
|---|---|
| Build producción | OK, sin warnings. Inicial 303 kB (85 kB transferidos); `onboarding-page` 11 kB transferidos |
| Unit | **92/92** (6 archivos; 5 del formulario renderizado) |
| Lint / Prettier | OK |
| E2E | **14 pasadas, 1 omitida** a propósito: el alta por UI se omite si el registro QA ya existe (existía desde la verificación manual de esta ronda); la edición sí se ejecutó y restableció el valor |
| axe WCAG 2.2 AA | 0 violaciones con el drawer abierto (desktop y Pixel 7) |
| Impeccable detect | Solo los falsos positivos conocidos (`broken-image` del logo, `rgb(0,0,0)` en plantillas) |

### Hallazgos de la ronda y corrección

| Hallazgo | Corrección | Verificado |
|---|---|---|
| Al abrir, el foco iba al botón de cerrar | El drawer enfoca el primer campo editable | E2E `toBeFocused` |
| Tras un envío inválido el foco quedaba en el botón (zoneless: la vista se pinta después del microtask) | `afterNextRender` antes de enfocar el primer error | E2E |
| Tras guardar, el foco caía en `<body>`: `@if` destruye el drawer sin evento `close` | Restaurar foco también al destruir el componente | Script de teclado y E2E |
| Todo UBO nuevo mostraba «Prueba de vida pendiente» en ámbar sin haber enlace | Sin enlace: «Prueba de vida sin solicitar» (neutro); no beneficiario final: sin badge | Captura |
| Hover pegado en las opciones Sí/No en táctil; flechas nativas en el input numérico | `@media (hover: hover)`; spin buttons ocultos | Captura móvil |
| `role="radiogroup"` sin nombre accesible dentro del `fieldset` | Retirado: el `fieldset`/`legend` agrupa; error enlazado con `aria-describedby` | axe |

### Pendiente / no verificado

- Consola: el navegador registra el `503` del catálogo de países. Es el estado real del backend sin credenciales (G-22), no un error del frontend.
- Selector de país con catálogo real: cubierto por código, no visto (requiere Kira).
- Sincronizar UBOs y enlaces de liveness: fuera de este corte (requieren Kira).
- Aviso «la participación supera el 100 %»: cubierto por unit, no provocado en E2E para no dejar datos inválidos en dev.

## Ronda 3 — Cuentas, Depósitos, Destinatarios, Pagos, Solicitudes e Inicio priorizado (14-sep-2026)

**Entorno:** igual (BFF `b339152`, sin credenciales de Kira). Las 3 organizaciones siguen en `CREATED`: el BFF impide
abrir cuentas, cotizar, registrar destinatarios y preparar pagos (validaciones previas a cualquier escritura, leídas en
`OpenVirtualAccountService`, `CreateQuoteService`, `RegisterRecipientService`, `ExecutePayoutService`).

### Cómo se verificó lo que no se puede recorrer en local

| Qué | Contra el BFF real | Con fixtures de contrato |
|---|---|---|
| Navegación de las 7 áreas, estados vacíos, 422 reales (`Pago no encontrado.`, historial sin alta), bloqueos por vinculación, permisos por URL | ✅ `e2e/areas.spec.ts` | — |
| Cotizar → desglose → preparar pago (cuerpo enviado con `quotationId` y moneda de la cotización) | — | ✅ |
| Cotización vencida: solo «Recotizar» | — | ✅ |
| Aprobar pago de otra persona (naturaleza + memo en el cuerpo), estado del proveedor y línea de tiempo | — | ✅ |
| Quien preparó no ve «Revisar y aprobar» | — | ✅ |
| Rechazar con motivo obligatorio | — | ✅ |
| Cuenta operativa: saldo, instrucciones, copiar, depósito con cuenta del ordenante enmascarada | — | ✅ |
| Alta de destinatario: validación por riel, routing de 9 dígitos, dirección obligatoria en banco, redes por token; 0 escrituras | — | ✅ |
| RFI: lote todo-o-nada (cuerpo con texto, booleano y opción), `422 rfi_answer_rejected` pintado por ítem; consulta en solo lectura | — | ✅ |

Los fixtures (`e2e/fixtures/contract-fixtures.ts`) copian la forma de las vistas del BFF y se interceptan en el
navegador; lo no declarado responde 404 para no mezclar datos reales.

### Resultados automáticos

| Verificación | Resultado |
|---|---|
| Build producción | OK, sin warnings. Inicial 324 kB (90 kB transferidos); cada área es un chunk diferido |
| Unit | **109/109** (7 archivos) |
| E2E | **27 pasadas, 1 omitida** (alta del beneficiario QA ya existente) — 18 contra el BFF real, 8 con fixtures, 3 móviles |
| axe WCAG 2.2 AA | 0 violaciones en las 5 áreas nuevas (desktop), Pagos y Solicitudes (Pixel 7), y en los estados con datos de los 6 flujos con fixtures |
| Lint / Prettier | OK |
| Impeccable detect | Solo el falso positivo conocido del logo; sin avisos de tokens |
| Higiene `src` | Sin `localhost`, claves, `console.log`, `TODO` ni `localStorage` |

### Hallazgos y correcciones de la ronda

| Hallazgo | Corrección |
|---|---|
| «Nuevo pago» y «Registrar destinatario» sin vinculación aprobada mostraban tres avisos y un formulario inservible | Un solo estado explicativo con enlace a Vinculación |
| Etiquetas de naturaleza del pago eran interpretaciones propias (`pobo`, `spot_3p` mal traducidas) | Reescritas desde la definición oficial de Kira |
| `choice` en RFI: forma de las opciones desconocida | Verificada en la documentación oficial (`options: string[]`) antes de implementar |
| Importe partido en dos líneas en el drawer de aprobación; vigencia de cotización en segundos | `nowrap`; formato mm:ss |
| Textos «preparado por tú» / «por Ti» | Corregidos |

### Pendiente / no verificado

- **Todo flujo de tesorería y RFI contra el proveedor real** (requiere credenciales de Kira y una empresa `VERIFIED`).
  Los fixtures prueban la UI y los cuerpos enviados, no la integración.
- Respuesta de ítems `date` en RFI: se envía `AAAA-MM-DD` (valor del `<input type="date">`); el formato exacto que
  espera el proveedor no está documentado en el repositorio.
- Subida real de documentos multipart y enlace temporal de descarga.
- Pago fallido en el envío al proveedor: `approveAndSubmit` relanza la excepción dentro de `@Transactional`; no se ha
  comprobado si el pago vuelve a `PENDING_APPROVAL` (rollback) o queda `FAILED`. La UI relee el pago tras el error.
- Escritura KYB (alta, perfil dinámico por `pendingFields`, sincronizar UBOs, liveness): construida en la ronda 4.

## Ronda 4 — Vinculación como asistente por pasos con borrador (14-sep-2026)

**Cambio de producto:** la página de Vinculación dejaba de ser útil como listado de estados; ahora es un asistente con
formularios que se pueden dejar a medias. **Backend:** se añadió `GET/PUT /api/onboarding/draft` (no existía; comprobado
antes de escribirlo). BFF completo `./mvnw test` → 314 pruebas, 0 fallos.

### Contrato comprobado con peticiones reales

| Petición | Resultado |
|---|---|
| `GET /api/onboarding/draft` sin borrador | `200 {"draft":{}}` |
| `PUT` como Cumplimiento / leer como Consulta | `200` / devuelve lo guardado |
| `PUT` con un valor `data:…` | `422` (no se guardan archivos) |
| `PUT` como Consulta | `403 forbidden` |
| `PUT {"draft":{}}` | `200`, borrador eliminado |

### Resultados automáticos

| Verificación | Resultado |
|---|---|
| Unit | **118/118** (8 archivos): `toProfile`, `normalizeDraft`, faltantes por paso, `ownersGaps`, límites de archivos, `toDocumentsForm` |
| E2E | **31 pasadas, 1 omitida** — nuevo `onboarding-wizard.spec.ts`: guardar → recargar → retomar; cambiar de paso guarda sin pulsar; pasos que dependen del expediente explican el bloqueo; Consulta ve el borrador deshabilitado; móvil sin desbordes. La suite vacía el borrador al empezar y al terminar |
| axe WCAG 2.2 AA | 0 violaciones en Empresa, Actividad, Enviar, Documentos, Beneficiarios (desktop y Pixel 7) |
| Build / Lint / Prettier | OK |
| Impeccable detect | Solo el falso positivo conocido del logo |

### Hallazgos y correcciones de la ronda

| Hallazgo | Corrección |
|---|---|
| A 390 px el pie (Anterior · Guardar borrador · Siguiente) se salía de la pantalla | Relleno lateral menor y ajuste de línea; comprobado con `toBeInViewport` |
| En Beneficiarios cada persona parecía listada dos veces | La segunda lista lleva el título «Documentos de identidad» |
| Los E2E anteriores buscaban la página de estados («Beneficiarios finales», «Alta de la empresa») | Actualizados al asistente (`?paso=beneficiarios`) |

### Pendiente / no verificado

- **Alta KYB, perfil, documentos, sincronización y liveness contra Kira**: construidos sobre el contrato leído en el BFF,
  pero sin credenciales solo se ha comprobado que la UI no los ofrece antes de tiempo. El recorrido real queda para cuando
  haya una cuenta del proveedor.
- Formato exacto que Kira acepta en `date_of_birth`/`formation_date` (se envía `AAAA-MM-DD`) y nombres de campo del
  representante legal en el perfil: tomados de la documentación, no probados.
- Industria y países de operación no se piden (G-27, G-28).

## Ronda 5 — Alineación con Kira y controles de la arquitectura (15-sep-2026)

Alcance: estados nuevos de Kira (KYT, `CANCELLED`, `FROZEN`, RFIs retirados), idempotencia desde el
cliente, MFA TOTP, avisos/eventos/auditoría, consola de operaciones, permisos de consulta al
proveedor (G-09), términos y consentimiento biométrico, EIN solo para EE. UU., doble firma por
límite, recotización de un pago pendiente y código para soporte (`X-Request-Id`) en los errores.

### Contrato comprobado con peticiones reales

- Sandbox de Kira con `juriscop`: vinculación, beneficiarios, RFIs, términos
  (`POST /api/onboarding/terms` → Kira `200`) y la versión única `2026-06-01`.
- Consentimiento: `POST /api/ubos/liveness-links` sin `biometricConsent` → `422`.
- Métricas: `/actuator/metrics` `200` para la plataforma y `403` para una empresa.

### Resultados automáticos

- Unitarias **155/155**, lint limpio, **E2E 33/33** (1 omitida por diseño).
- BFF: **400** pruebas; Bruno **104/104** peticiones y **67/67** tests contra el sandbox.

### Pendiente / no verificado

- Doble firma, recotización y consentimiento en el cajón de documentos: cubiertos por pruebas
  unitarias y del BFF, **sin recorrido E2E** (no hay pagos reales: ningún user del sandbox está
  `VERIFIED`).
- Casilla de términos: sin versión configurada en local no se muestra; se probó con
  `BFF_TERMS_VERSION` definida contra el BFF.

## Ronda 6 — Empatar front y BFF: nombres, equipo y campos pendientes (16-sep-2026)

Alcance: lo que el BFF tenía y el portal no mostraba, y lo que el portal pedía sin ofrecer dónde
escribirlo.

| Hueco | Qué se hizo |
|---|---|
| G-03 | `PayoutView` trae `makerName`, `approverName` y `firstApproverName`. La bandeja dice «Preparado por Ana Restrepo» en vez de «otra persona», y el detalle muestra la firma registrada |
| G-26 | `PayoutView.recipientName` sale del espejo local (también archivados). El directorio queda de respaldo |
| G-13 | Página «Equipo» (`/equipo`) sobre `/api/operators`, que el BFF exponía desde el 15-sep sin pantalla: alta con rol y contraseña inicial, y baja que suspende. Capacidades `operators.view` (A, C) y `operators.manage` (A) |
| G-16 (parcial) | Los `pendingFields` se muestran traducidos junto a su nombre técnico; los que el asistente todavía no captura lo dicen en pantalla |
| G-18 | `GET /api/capabilities` en el BFF (`sandbox`, `providerConfigured`, `bank`, `providerApiVersion`, `dualApprovalThreshold`). El front lo pregunta una vez por sesión y se eliminó la bandera de compilación `sandboxTools`: ya no depende de cómo se compiló |

### Contrato comprobado con peticiones reales

- `GET /api/operators` con `admin@juriscop.test`: 5 operadores de la semilla (uno por rol de empresa), con `role`,
  `roleDescription`, `status`, `active` y `mfaEnabled`; ni hash de contraseña ni secreto TOTP.
- `GET /api/payouts` con la organización de la semilla: `[]` (no hay pagos en dev), así que los
  nombres se verificaron con pruebas del BFF, no con datos reales.
- `GET /api/capabilities` en local: `sandbox: true`, `providerConfigured: true`, `bank: jp_morgan`,
  `providerApiVersion: 2026-06-01`, `dualApprovalThreshold: 10000`.

### Resultados automáticos

- Front: unitarias **178/178**, lint limpio, **E2E 34/34** (1 omitida por diseño).
- BFF: **430** pruebas, 0 fallos.

### Pendiente / no verificado

- Los nombres de maker y aprobadores **no se han visto con un pago real**: en dev no hay ninguno.
- `transaction_countries` (G-28) sigue sin campo: falta saber si el proveedor espera ISO alfa-2 o
  alfa-3. Hasta entonces el asistente lo anuncia como no capturable en vez de aceptar un formato a ciegas.
- Alta de operador probada contra el BFF solo en lectura: no se creó ningún usuario en la base de dev.
- `sandbox: false` (producción) no se ha probado en vivo: el botón de simular depósito desaparece
  según la respuesta del BFF, verificado con prueba unitaria del servicio de capacidades.
- **D6 ya estaba cubierto:** `unsupportedReason` sí se muestra (`productUnavailableReason` en
  `onboarding-copy.ts`), al contrario de lo que decía la revisión del 15-sep.
