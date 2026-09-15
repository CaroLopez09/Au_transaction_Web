# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Angular 22 (CLI disponible en el entorno), TypeScript strict, sin librería de componentes; indicado por el encargo del usuario ("Angular moderno"). Backend: BFF Spring Boot `~/Documentos/AuTransactional`.

## Users
Operadores humanos de **una empresa cliente** de AU, cada uno con un único rol dentro de su organización: Administrador, Tesorería (maker), Tesorería (aprobador), Cumplimiento interno y Solo lectura. Trabajan en escritorio en horario laboral y ocasionalmente desde el móvil para aprobar o consultar. No hay usuarios internos multiempresa en el backend actual (gap G-01).

## Product Purpose
Permitir que una empresa se vincule (KYB, beneficiarios, prueba de vida), opere cuentas virtuales en bancos de EE. UU., reciba depósitos y envíe pagos con control maker-checker, y responda solicitudes de información de cumplimiento, todo a través del BFF propio sin exponer credenciales del proveedor (KiraFin). Éxito: cada operador sabe qué le toca hacer, lo hace sin errores y ningún pago sale sin una segunda persona.

## Positioning
Portal de tesorería B2B con marca AU donde la segregación de funciones, la vigencia de la cotización y la operatividad real de la cuenta (`fundsReady`) son visibles y bloquean acciones inválidas, en lugar de dejarlas fallar en el proveedor.

## Operating Context
- Una organización por sesión (el tenant viaja en el JWT); sin cambio de organización.
- Flujo KYB en bucle: el formulario se dibuja desde `pendingFields` hasta `VERIFIED`.
- Pagos: preparar (maker) → cotizar (TTL 15 min) → aprobar (otra persona) → seguimiento por eventos.
- RFIs generadas por Kira pueden detener pagos o depósitos.
- Hoy el entorno local no tiene credenciales de Kira: las operaciones que llaman al proveedor responden `503 kira_not_configured`.

## Capabilities and Constraints
Contrato completo y gaps en `docs/frontend-backend-contract.md`. Restricciones clave: sin refresh/logout de servidor; sin CORS (mismo origen); listas locales solo con `limit`; destinatarios no editables; sin notificaciones, auditoría ni administración expuestas. Idioma de la interfaz: español.

## Brand Commitments
`AU Brand.pdf` es vinculante: logotipo oficial con área de seguridad y usos prohibidos, Figtree (Light/Regular/Medium/Bold) como tipografía UI, paleta principal (#101116, #FFFFFD, #93DDC6, #F6FEAA, #E73726), paleta UI (#282B3D, #E73726, #93DDC6, #F7F8E8, #C7F5E5, #F5F5F5, #424556, #5F5141), gráfica complementaria de ondas de líneas finas. Dirección pedida: premium, sobria, precisa, confiable; nunca plantilla admin, SaaS genérico ni UI "generada por IA". Design variance 7/10, motion 4/10, densidad 5/10.

## Evidence on Hand
- Marca: `~/Documentos/AuTransactional/docs/AU Brand.pdf` (logotipo solo en PDF; no hay SVG/PNG suelto).
- Datos reales en dev: semilla del BFF con 3 organizaciones (`juriscop`, `bankvision`, `au-colombia`) en estado `CREATED` y un operador por rol. El contenido de cuentas, depósitos y pagos de la base dev **no se ha verificado** (`ESTADO.md` menciona un depósito proyectado desde un webhook real); se comprobará con el BFF arrancado.
- No hay testimonios, métricas ni clientes que puedan mostrarse. No inventar.

## Product Principles
1. Lo que el backend no respalda no aparece: ni datos simulados ni "próximamente".
2. Mostrar la verdad operativa (fondos listos, cotización vigente, quién creó el pago) antes que el estado nominal.
3. Una acción sensible siempre se revisa antes de ejecutarse y nunca se envía dos veces.
4. Cada error dice qué pasó, qué significa y qué hacer.
5. La navegación es la del rol, no la de la organización.

## Accessibility & Inclusion
WCAG 2.2 AA, operación completa por teclado, `prefers-reduced-motion` respetado.
