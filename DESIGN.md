---
name: AU Transactional
description: Portal de vinculación, tesorería y cumplimiento para empresas clientes de AU, sobre el BFF AuTransactional.
colors:
  ink-deep: "#101116"
  primary: "#282B3D"
  primary-hover: "#1B1D2A"
  text-body: "#424556"
  text-warm: "#5F5141"
  text-muted: "#6B6E7E"
  border-control: "#7A7D8C"
  hairline: "#E6E6D8"
  canvas: "#FFFFFD"
  canvas-ledger: "#F7F8E8"
  surface-sunken: "#F5F5F5"
  mint: "#93DDC6"
  mint-soft: "#C7F5E5"
  attention: "#F6FEAA"
  critical: "#E73726"
  critical-text: "#B42A1C"
  success-text: "#1E6B56"
  wave-from: "#85FFD9"
  wave-to: "#F7FFAF"
typography:
  display-amount:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title-page:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title-section:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body-strong:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  data:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  caption:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "36px"
  button-critical:
    backgroundColor: "{colors.critical-text}"
    textColor: "{colors.canvas}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "40px"
  panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.md}"
    padding: "24px"
  ledger-strip:
    backgroundColor: "{colors.canvas-ledger}"
    textColor: "{colors.text-warm}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  nav-rail:
    backgroundColor: "{colors.ink-deep}"
    textColor: "{colors.canvas}"
    width: "248px"
  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.sm}"
  badge-attention:
    backgroundColor: "{colors.attention}"
    textColor: "{colors.text-warm}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-success:
    backgroundColor: "{colors.mint-soft}"
    textColor: "{colors.success-text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-critical:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.critical-text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-neutral:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.text-body}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: AU Transactional

> Fuente de marca: `AU Brand.pdf` (logotipo, área de seguridad, submarca, paleta principal, paleta UI, Figtree, gráfica complementaria de ondas).
> Todo color que no está en el Brand está marcado **(derivado)** con el motivo. Contrastes calculados con la fórmula WCAG 2.2.

## Overview

**Creative North Star: "El libro mayor sereno"**

AU Transactional es la mesa de trabajo donde una empresa mueve dinero real y responde a cumplimiento. La interfaz se comporta como un buen libro contable: fondo claro que respira, tinta profunda, cifras alineadas y una sola señal de color cuando algo exige una decisión. La modernidad no viene de efectos, sino de tipografía ligera en las cifras grandes, espacio generoso y una navegación oscura de marca que ancla todo lo demás.

La identidad AU aparece en tres gestos precisos, no en decoración: el **menta** como línea y como indicador de selección sobre oscuro (igual que las reglas del Brand), el **amarillo acento** como el único "te toca a ti" de la pantalla, y las **ondas de líneas finas** de la gráfica complementaria en superficies amplias y tranquilas (login, estados vacíos). El rojo del Brand no decora: significa riesgo, bloqueo o acción irreversible.

Densidad media (5/10), variación de diseño contenida (7/10 en composición, no en componentes), movimiento bajo (4/10) y siempre con propósito de estado. Modo **Operate**: la herramienta desaparece dentro de la tarea.

**Key Characteristics:**
- Una sola familia (Figtree) y cifras tabulares en todo importe.
- Navegación `ink-deep` con logotipo oficial; contenido en `canvas` casi blanco.
- Hairlines en lugar de sombras; sombra solo en capas flotantes.
- Estados con palabra + tono, nunca solo color.
- Nada de glassmorphism, gradientes en componentes ni tarjetas KPI repetidas.

## Colors

Tinta azul-grafito sobre blanco cálido, con menta y amarillo del Brand como señales y rojo reservado al riesgo.

### Primary
- **Tinta AU** (`primary` #282B3D · Brand "Primary Color"): texto de títulos y cifras, botón primario, fondo del ítem de navegación activo. 13.95:1 sobre `canvas`.
- **Tinta AU presionada** (`primary-hover` #1B1D2A · derivado: `primary` oscurecido ~30 % hacia `ink-deep`): hover/active del botón primario.
- **Noche AU** (`ink-deep` #101116 · Brand "Main Dark"): barra de navegación, login en su mitad de marca, fondo de toasts. Es el único fondo oscuro de la app.

### Secondary
- **Menta AU** (`mint` #93DDC6 · Brand "Main Color" / "Line Color"): regla bajo el encabezado de página, indicador lateral del ítem activo, anillo de foco **sobre fondos oscuros** (12.03:1 sobre `ink-deep`). **Nunca** como texto, icono o borde de control sobre fondos claros (1.57:1).
- **Menta suave** (`mint-soft` #C7F5E5 · Brand "Light Color 2"): fondo de estado positivo, fila seleccionada, paso completado del stepper.

### Tertiary
- **Acento AU** (`attention` #F6FEAA · Brand "Accent Color"): fondo de "requiere tu acción" (badge, franja de aviso de Inicio). Con texto `text-warm` (7.18:1).
- **Rojo AU** (`critical` #E73726 · Brand "Secondary"): iconos y bordes de estados críticos, punto de alerta, borde de input con error. 4.22:1 sobre `canvas`: válido para gráficos/UI (≥3:1) y texto ≥ 18.66 px bold, **no** para texto normal.
- **Rojo AU texto** (`critical-text` #B42A1C · derivado: `critical` oscurecido para AA, 6.38:1): mensajes de error, texto de badge crítico, botón destructivo.
- **Verde libro** (`success-text` #1E6B56 · derivado: tono de `mint` llevado a luminancia AA, 5.35:1 sobre `mint-soft`): texto de estados positivos.

### Neutral
- **Lienzo** (`canvas` #FFFFFD · Brand "Main Light"): fondo de contenido y de paneles.
- **Lienzo libro** (`canvas-ledger` #F7F8E8 · Brand "Light Color 1"): segunda capa neutra: franjas de resumen, cabecera de tabla, zona de instrucciones de depósito.
- **Hundido** (`surface-sunken` #F5F5F5 · Brand "Box Shadow Btn"): fondo de badge neutro, skeletons, controles deshabilitados.
- **Texto** (`text-body` #424556 · Brand "Text/Icons1"): cuerpo, celdas, iconos. 9.46:1.
- **Texto cálido** (`text-warm` #5F5141 · Brand "Text/Icons2"): texto sobre `attention` y `canvas-ledger`, notas de contexto financiero.
- **Texto secundario** (`text-muted` #6B6E7E · derivado de `text-body` aclarado; 5.05:1 sobre `canvas`, 4.70:1 sobre `canvas-ledger`): etiquetas, fechas, metadatos.
- **Borde de control** (`border-control` #7A7D8C · derivado; 4.08:1 sobre `canvas`, 3.80:1 sobre `canvas-ledger`): borde de inputs, checkboxes y selects (WCAG 1.4.11 exige ≥3:1).
- **Hairline** (`hairline` #E6E6D8 · derivado de `canvas-ledger` oscurecido): separadores de filas y paneles. Decorativo: nunca delimita por sí solo un control.
- **Onda** (`wave-from` #85FFD9 → `wave-to` #F7FFAF · gradiente del Brand): exclusivamente en la gráfica de ondas (login, estados vacíos amplios), a opacidad ≤ 35 %.

### Named Rules
**La regla de la única señal.** En una vista hay como máximo un bloque `attention`. Si todo pide atención, nada la recibe: prioriza y el resto va como lista.

**La regla del rojo que significa algo.** `critical` solo aparece si hay riesgo de dinero, un bloqueo o una acción irreversible. Nunca como color de marca, hover o decoración (el Brand prohíbe además el logotipo en rojo).

**La regla de la menta sobre oscuro.** El menta es texto/foco solo sobre `ink-deep` o `primary`. Sobre claros es línea o fondo suave, jamás letra.

**La regla del estado con palabra.** Ningún estado se comunica solo con color: siempre etiqueta textual, y en tablas, además, forma (punto, anillo, línea).

## Typography

**Display Font:** Figtree (con `system-ui, sans-serif`)
**Body Font:** Figtree
**Label/Mono Font:** Figtree con cifras tabulares; identificadores técnicos (ids de Kira, routing) en `ui-monospace` a tamaño `data`.

**Character:** Figtree es geométrica y amable; en peso 300 a tamaño grande da a los importes una calma premium, y en 500 sostiene etiquetas y botones sin gritar. Blinker SemiBold es tipografía de **submarca** del Brand y no se usa en la interfaz.

### Hierarchy
- **Importe destacado** (`display-amount`, 300, 2.125rem/1.1): saldo disponible, total a debitar en la confirmación de pago. Uno por vista.
- **Título de página** (`title-page`, 500, 1.75rem): una vez por página, alineado a la izquierda, con la regla menta debajo.
- **Título de sección** (`title-section`, 500, 1.1875rem): paneles y grupos de formulario.
- **Cuerpo** (`body`, 400, 0.9375rem/1.5): texto corrido, ayudas. Medida máx. 68ch.
- **Dato** (`data`, 400, 0.875rem/1.4): celdas de tabla y listas de definición.
- **Etiqueta** (`label`, 500, 0.8125rem): labels de campo, badges, botones compactos, encabezados de columna (en sentence case, no mayúsculas).
- **Nota** (`caption`, 400, 0.75rem): marcas de tiempo "Actualizado hace 3 min", pies de ayuda.

Escala fija en rem (ratio ≈1.2); nada de tamaños fluidos.

### Named Rules
**La regla de la cifra alineada.** Todo importe, porcentaje o contador usa `font-variant-numeric: tabular-nums`, se alinea a la derecha en tablas y va **siempre** con su moneda del backend en `text-muted` a la derecha del número. No hay moneda por defecto. *(Verificado: `@fontsource-variable/figtree` 5.x expone las features `tnum` y `pnum`, eje `wght` 300–900.)*

**La regla de los pesos del Brand.** Solo 300, 400, 500 y 700. 700 únicamente en el número de un contador de acciones pendientes; nunca en títulos.

## Layout

### Grid y estructura
- Escala de espacio de 4 px (`spacing`): los ritmos habituales son 8 entre elementos relacionados, 16 dentro de un panel, 24 entre paneles, 40–48 entre bandas de página.
- **Escritorio ≥ 1024 px:** navegación fija `nav-rail` 248 px + área de contenido con `max-width` 1200 px y márgenes de 40 px. **Ancho ≥ 1440 px:** el contenido no se estira; en detalles aparece una columna lateral de contexto (resumen, timeline) de 360 px.
- **Tablet 640–1023 px:** navegación colapsa a barra superior con menú; paneles a una columna; tablas se mantienen si caben ≤ 5 columnas.
- **Móvil < 640 px:** barra superior 56 px + navegación en hoja inferior; márgenes 16 px; **las tablas se convierten en listas de filas apiladas** (dato principal + importe a la derecha, metadatos debajo); drawers pasan a hoja a pantalla completa; acciones primarias fijas al pie en flujos de varios pasos.
- Composición asimétrica por defecto: título y contexto a la izquierda, acción principal alineada al título a la derecha. Nada de rejillas de tarjetas iguales.

### Composición de Inicio
Inicio no es un dashboard de KPIs. Es una **lista priorizada de lo que requiere acción** (máx. un bloque `attention`), seguida del estado operativo (vinculación y cuentas) y de la actividad reciente. Cada bloque existe solo si el rol lo puede usar y el backend lo respalda.

### Motion
- Duraciones: 120 ms (hover, presión), 180 ms (aparición de popover, cambio de estado de badge), 240 ms (drawer, paso de stepper). Curva `cubic-bezier(0.2, 0, 0, 1)` de salida; entrada de capas con `cubic-bezier(0.3, 0, 0.8, 0.15)`.
- Usos permitidos: transición entre pasos, apertura/cierre de capas, confirmación de guardado (check que se dibuja), cuenta atrás de cotización (anillo que se vacía), skeleton con brillo lento (1.6 s).
- Prohibido: animaciones de entrada de página orquestadas, parallax, rebotes, movimiento permanente decorativo, ondas animadas.
- `prefers-reduced-motion: reduce` → todas las transiciones a 0 ms salvo opacidad ≤ 120 ms; el skeleton deja de brillar; la cuenta atrás muestra solo números.

### Accesibilidad
- Objetivo WCAG 2.2 AA. Tamaño táctil mínimo 40×40 px (44 en móvil).
- Foco visible siempre: anillo 2 px `primary` + separación 2 px `canvas` sobre claros; anillo 2 px `mint` sobre `ink-deep`.
- Todo `input` con `<label>` visible; errores enlazados con `aria-describedby` y anunciados en región `aria-live="polite"`; el resumen de errores del formulario recibe foco al enviar.
- Diálogos y drawers: foco atrapado (CDK `FocusTrap`), `Esc` cierra, el foco vuelve al disparador.
- Cambios de estado asíncronos (guardado, aprobación) anunciados en `aria-live`.
- Lenguaje: español neutro, verbos concretos ("Aprobar pago", no "Confirmar").

## Elevation & Depth

Plano por defecto. La profundidad se comunica con **capas de color** (`canvas` → `canvas-ledger` → `surface-sunken`) y hairlines, no con sombras.

- **Nivel 0 — página y paneles:** sin sombra; panel delimitado por `1px hairline`.
- **Nivel 1 — popovers, menús, selects abiertos:** `0 4px 16px rgba(16,17,22,0.08), 0 1px 2px rgba(16,17,22,0.06)`.
- **Nivel 2 — drawers y diálogos:** `0 16px 48px rgba(16,17,22,0.16)`; backdrop `rgba(16,17,22,0.40)` con `backdrop-filter: blur(2px)`. Es el **único** blur de la app y se desactiva si el navegador no lo soporta sin perder legibilidad.
- **Toast:** fondo `ink-deep`, texto `canvas`, nivel 1.

**La regla sin vidrio.** Ningún panel de contenido es translúcido.

## Shapes

- `xs` 4 px: checkboxes, marcas de foco interiores.
- `sm` 8 px: inputs, selects, ítems de navegación, celdas seleccionables.
- `md` 12 px: paneles, drawers (solo el borde expuesto), franjas `ledger-strip`.
- `lg` 20 px: bloque de atención de Inicio y panel de instrucciones de depósito (eco de las tarjetas del Brand).
- `pill`: botones y badges (el Brand muestra botones completamente redondeados en "Guardar"/"Siguiente").

**Logotipo:** siempre el asset oficial extraído de `AU Brand.pdf` (versiones fondo oscuro/fondo claro), con su área de seguridad (altura de la base a la línea media de la A). Prohibido deformar, colorear, contornear, rotar o poner elementos encima. **Marca de agua:** el logotipo oficial o las ondas del Brand a opacidad 3–6 % en login y estados vacíos amplios; nunca detrás de tablas o formularios.

## Components

Cada componente interactivo define: default, hover, focus, active, disabled, loading y error.

### Botones
- **Primario** (`button-primary`): la acción principal de la vista, máximo uno visible. *No usar* para acciones destructivas ni en cada fila de tabla.
- **Secundario** (`button-secondary`, borde 1 px `border-control`): alternativas ("Cancelar", "Actualizar").
- **Silencioso** (`button-quiet`): acciones de fila, "Ver detalle", enlaces-acción.
- **Crítico** (`button-critical`): rechazar pago, archivar, borrar documento; siempre tras confirmación.
- **Loading:** el texto cambia a gerundio ("Aprobando…"), spinner de 14 px a la izquierda, ancho fijo, `aria-busy`; el botón queda deshabilitado para impedir doble envío.

### Campos de formulario
- Label arriba (`label`), ayuda debajo (`caption`, `text-muted`), error debajo en `critical-text` con icono.
- Borde `border-control`; foco con anillo `primary`; error con borde `critical` 1.5 px.
- Importes: input alineado a la derecha, moneda como sufijo no editable tomada del backend.
- Formularios largos: **pasos progresivos** con stepper, nunca un formulario gigante. *No usar* placeholder como label.
- **Sí / No obligatorio** (`.au-choice`): radios nativos dentro de `fieldset` + `legend`, **sin valor por defecto** cuando la respuesta tiene consecuencias regulatorias (participación, control, firma, PEP). Un interruptor o checkbox preseleccionado ocultaría que nadie respondió.
- Ayuda que anticipa una regla del backend en vivo (p. ej. «Cuenta como beneficiario final») en `aria-live="polite"`, sin bloquear el envío cuando el backend sí lo acepta.

### Tablas de datos
- Cabecera en `canvas-ledger`, `label` en sentence case; filas 48 px; separador `hairline`; hover `surface-sunken`.
- Importes a la derecha con cifras tabulares; estados como badge; fecha relativa + absoluta en tooltip.
- Filtros y búsqueda arriba a la izquierda; indicar explícitamente cuando el filtro es local sobre las últimas N filas (el backend solo expone `limit`).
- Paginación solo donde el backend pagina (historial Kira).
- < 640 px → lista apilada.

### Badges de estado (`status-badge`)
- `badge-attention` (acción tuya), `badge-success` (completado/operativo), `badge-critical` (fallido/rechazado/detenido: borde 1 px `critical`), `badge-neutral` (informativo, desconocido), **progreso** (`badge-neutral` + punto `primary` animable).
- Texto siempre presente; el valor técnico del backend va en `title` solo para roles de cumplimiento.

### Paneles y franjas
- `panel` para agrupar contenido relacionado. *No* anidar paneles dentro de paneles.
- `ledger-strip` para resúmenes de una línea (saldo + actualización, totales de pago) y avisos contextuales.

### Navegación (`nav-rail`)
- Logotipo oficial (fondo oscuro) arriba con su área de seguridad; debajo organización y rol.
- Ítem: icono 18 px + etiqueta; activo con fondo `primary` y barra izquierda 2 px `mint`.
- Solo ítems permitidos por rol y respaldados por el backend. Sin "Próximamente".

### Revisión de una operación con dinero (implementado en Nuevo pago)
- Franja `canvas-ledger` con radio `lg`: filas etiqueta/importe alineadas a la derecha; el total que sale de la cuenta en `display-amount`, separado por hairline.
- Cuenta atrás de la cotización en pastilla `mint-soft` («Precio vigente 14:32»); al vencer pasa a neutra y el botón principal cambia a «Recotizar». Nunca se deshabilita en silencio: se explica por qué.

### Listados operativos
- Bandeja «Por aprobar» destacada en franja `canvas-ledger` con contador en `attention`; el resto en tabla. Una sola bandeja destacada por página.
- Enlaces de fila con el nombre del titular como texto del enlace; nada de filas enteras clicables en tablas (sí en listas apiladas).

### Diálogos
- Para confirmar acciones sensibles o irreversibles (aprobar/rechazar pago, archivar destinatario, borrar documento, sincronizar UBOs). Título = verbo + objeto; cuerpo con los datos reales afectados; botón de acción repite el verbo.
- *No usar* para formularios largos ni para mostrar detalle. Nunca diálogo sobre diálogo.

### Drawers
- Panel lateral derecho 480 px (hoja completa en móvil) para editar o ver una entidad sin perder el listado: UBO, detalle de destinatario, aprobación de pago.
- Implementación (`shared/ui/drawer.ts`): `<dialog>` modal nativo; el foco entra en el primer campo editable, `Esc` y «Cancelar» cierran salvo durante un guardado, y el foco vuelve al botón que lo abrió. Acciones en pie fijo; el botón de envío usa `form="…"`.
- *No usar* para flujos de varios pasos con dinero (nuevo pago = página dedicada).

### Estados de pantalla
- **Loading:** skeleton con la forma del contenido; nunca spinner central.
- **Empty:** frase que explica por qué está vacío + la acción que lo llena si el rol puede; ondas del Brand como marca de agua en áreas amplias.
- **Error:** qué pasó, qué significa, qué hacer (del `ErrorMappingService`); botón "Reintentar" si aplica.
- **Pendiente de configuración** (`503 kira_not_configured`): badge neutro + "La conexión con el proveedor no está configurada en este entorno". Sin reintento automático.
- **Forbidden:** "Tu rol (X) no permite esta acción" — no se oculta que la acción existe si el usuario llegó a ella por URL.
- **Unknown:** "Estado en validación" + valor técnico disponible para cumplimiento.

### Operaciones con dinero
Flujo **Revisar → Confirmar → Ejecutar → Resultado** en página dedicada. La confirmación muestra solo datos del backend: importe que recibe el destinatario, comisiones (Kira, plataforma, total), total a debitar, cuenta origen, destinatario enmascarado, riel y cuenta atrás de la cotización (`secondsToExpiry`). Al llegar a cero, el botón se deshabilita y aparece "Recotizar".

### Cargador de archivos
Zona de arrastre + botón; valida antes de subir con los límites del backend (máx. 20 archivos, 30 MB c/u, tipos del ítem o PDF/JPEG/PNG/HEIC/WebP); progreso por archivo; reemplazo y borrado con confirmación.

## Do's and Don'ts

### Do
- Deriva toda decisión visual de la paleta y Figtree del Brand; marca como derivado lo que no esté en él.
- Muestra la moneda que envía el backend junto a cada importe.
- Usa `fundsReady`, no `status`, para decir que una cuenta puede operar.
- Da a cada error una acción concreta.
- Oculta acciones por rol por claridad y trata el `403` como caso normal.
- Verifica cada pantalla a 390, 768, 1280 y 1600 px antes de darla por terminada.

### Don't
- No uses tarjetas KPI en rejilla ni métricas que el backend no calcula.
- No uses gradientes, blur o sombras en componentes (el gradiente vive solo en las ondas de marca).
- No pongas texto menta o rojo `critical` sobre fondos claros.
- No recrees el logotipo con texto ni cambies sus colores.
- No muestres "Próximamente" para funciones sin backend: simplemente no existen en la navegación.
- No uses modales para contenido complejo ni modal dentro de modal.
- No animes nada que no comunique un cambio de estado.
- No inventes datos de ejemplo en producción: un vacío se muestra como vacío.
