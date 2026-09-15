# Contrato frontend ↔ backend (BFF AuTransactional)

> **Estado de implementación (14-sep-2026):** las 46 operaciones de las secciones 1.1–1.10 tienen repositorio HTTP en el front. El asistente de Vinculación conecta además el borrador, el alta KYB, el perfil, los documentos KYB, `POST /api/ubos/sync` y `POST /api/ubos/liveness-links`. Sin conectar a UI: `GET /api/recipients/{id}` y `/{id}/kira`, `GET /api/quotations`, `POST /api/payouts/preview`.

> Fuente de verdad: código de `~/Documentos/AuTransactional` (rama `main`, auditado sobre `ed853d3` + cambios sin commitear,
> hoy commit `b339152`, sin cambios de controladores ni vistas; 14-sep-2026). Cada fila está comprobada contra el controlador, el comando/vista Java y el `@PreAuthorize`.
> Nada de este documento procede de suposiciones: lo que no existe en el backend está en §4 (gaps).
>
> Columnas de la matriz: **Endpoint → Caso de uso (BFF) → Dominio front → Repository (port) → Página → Componente → DTO → Modelo de dominio**.
> Páginas/componentes son la **propuesta** de implementación; se marcan `(MVP)` los del primer corte.

---

## 0. Convenciones transversales verificadas

| Tema | Comportamiento real | Fuente |
|---|---|---|
| Base de rutas | `/api/**`. Sin prefijo de versión. | controladores `interfaces/rest` |
| Autenticación | `Authorization: Bearer <JWT>` HS256 emitido por el BFF, vida `expiresIn` segundos (8 h por defecto). **Sin refresh token, sin logout en servidor.** | `AuthController`, `JwtService`, `application.yaml` |
| Sin cabecera `Authorization` | `403` con **cuerpo vacío** (no `401`). | `SecurityConfig` + `docs/API-GUIA.md §2` |
| Token inválido/caducado | `401 {"code":"unauthorized","message":"Token invalido o expirado."}` | `JwtTenantFilter` |
| Tenant | Sale del JWT (`tenant_id`). **El front nunca envía tenant.** Una sola organización por sesión. | `JwtTenantFilter`, `TenantContext` |
| Errores | `{ code, message, details? }` (ver §3). | `RestExceptionHandler` |
| JSON | `default-property-inclusion: non_null`: **los campos nulos no llegan**. Todo campo opcional en TS. | `application.yaml` |
| Fechas | `Instant` → ISO-8601 UTC. En vistas proyectadas de Kira (`KiraPayoutPage`, `PayoutEventView`, `KiraRecipientView`) llegan como `string` sin normalizar. | vistas Java |
| Importes | `BigDecimal` → número JSON en vistas locales; **`string`** en `PayoutPreviewView` y `KiraPayoutPage`. El front no debe hacer aritmética de dinero con `number`. | vistas Java |
| Moneda | Siempre acompaña al importe (`currency`, `destinationCurrency`…). No hay moneda por defecto en el front. | `Money`, vistas |
| Estados | Enums en MAYÚSCULAS; el BFF ya normaliza lo que llega de Kira. El front compara sin distinguir mayúsculas y tolera valores desconocidos. | `StatusNormalizer`, enums |
| CORS | **No hay configuración CORS.** En desarrollo se usa proxy de Angular (`/api → :8080`); en despliegue, mismo origen tras un reverse proxy. | `SecurityConfig` (ausencia) |
| Idempotencia | El front **no envía** `Idempotency-Key`: el BFF la genera y persiste para Kira (alta KYB, cuenta, destinatario, pago). Ver §2.8. | `KiraApiClient`, `IdempotencyKeyStore` |
| Integración Kira sin credenciales | `503 kira_not_configured` en todo lo que llama a Kira. Hoy es el caso en local (0 variables `KIRA_*`). | `RestExceptionHandler`, `docs/ESTADO.md` |

### Roles reales (`domain/tenant/Role.java`)

| Constante (JWT) | Nombre negocio | Descripción literal del backend |
|---|---|---|
| `ADMIN` | admin | Administrador General de la Empresa Cliente |
| `TREASURY_MAKER` | tesoreria_maker | Registra borradores, destinatarios y cotiza transferencias |
| `TREASURY_APPROVER` | tesoreria_approver | Aprueba y autoriza la ejecución de pagos (Maker-Checker) |
| `COMPLIANCE_INTERNAL` | compliance_internal | Revisa Ficha 360, UBOs, Liveness y responde RFIs |
| `READ_ONLY` | read_only | Solo lectura de saldos, cuentas y movimientos |

Todos tienen `RoleScope.TENANT`. `RoleScope.SYSTEM` existe en el enum pero **ningún rol lo usa** → no hay operador interno multiempresa.

---

## 1. Matriz de trazabilidad

Leyenda de permisos: **Todos** = cualquier usuario autenticado (sin `@PreAuthorize`). `A`=ADMIN, `M`=TREASURY_MAKER, `P`=TREASURY_APPROVER, `C`=COMPLIANCE_INTERNAL, `R`=READ_ONLY.

### 1.1 Sesión — dominio `session` (core/auth)

| # | Endpoint | Caso de uso BFF | Repository (port) | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 1 | `POST /api/auth/login` | `LoginUseCase.login` | `SessionRepository.login` | `LoginPage` (MVP) | `LoginForm` | req `LoginRequestDto{email,password}` · res `LoginResultDto{accessToken,expiresIn,email,role,tenantId,tenantName}` | `Session` | público |
| 2 | `GET /api/auth/me` | `AuthController.me` | `SessionRepository.me` | `AppShell` (MVP, restaurar sesión) | `AccountMenu` | `MeDto{userId,email,tenantId,role}` | `Operator` | Todos |

Reglas: credenciales erróneas y usuario inexistente → mismo `422 business_rule_violation "Credenciales invalidas."`. Usuario no `ACTIVE` → `422 "La cuenta esta desactivada."`. Organización `REJECTED` → `422` (no puede iniciar sesión).

### 1.2 Vinculación KYB — dominio `onboarding`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 3 | `GET /api/onboarding` | `SubmitOnboardingService.status` (local, sin Kira) | `OnboardingRepository.status` | `HomePage` (MVP) · `OnboardingStatusPage` (MVP) | `KybStatusPanel`, `EligibilityChecklist` | `OnboardingViewDto` | `OnboardingStatus` | Todos |
| 4 | `POST /api/onboarding` | `…register` | `OnboardingRepository.register` | `OnboardingStartPage` | `RegisterBusinessForm` | req `{businessLegalName,email,sourceOfFunds}` · res `OnboardingViewDto` (201) | `OnboardingStatus` | A, C |
| 5 | `PUT /api/onboarding` | `…completeProfile` | `OnboardingRepository.completeProfile` | `OnboardingProfilePage` | `PendingFieldsForm` (dinámico desde `pendingFields`) | req `{profile: Record<string,unknown>}` | `OnboardingStatus` | A, C |
| 6 | `POST /api/onboarding/refresh` | `…refresh` (llama a Kira) | `OnboardingRepository.refresh` | `OnboardingStatusPage` | `RefreshButton` | — · res `OnboardingViewDto` | `OnboardingStatus` | A, M, P, C |

| 6b | `GET /api/onboarding/draft` | `OnboardingDraftService.get` (local, **nunca** llama a Kira) | `OnboardingRepository.draft` | `OnboardingPage` (asistente) | todos los pasos | res `{draft: object, updatedAt?}` | `SavedDraft` | Todos |
| 6c | `PUT /api/onboarding/draft` | `…save` (local) | `…saveDraft` | `OnboardingPage` | autoguardado 3 s, cambio de paso, «Guardar borrador» | req `{draft: object}` · `{}` lo borra · res igual que GET | `SavedDraft` | A, C |
| 6d | `POST /api/onboarding/documents` | `SubmitOnboardingService` (Kira) | `…attachCompanyDocuments` | `OnboardingPage` › Documentos | `DocumentUploadDrawer` | multipart `files[]`+`types[]` (pareados por orden), `informationType`, `issuingCountry` ISO-3, `number?`, `expiration?` · res `OnboardingViewDto` | `OnboardingStatus` | A, C |
| 6e | `POST /api/ubos/{id}/documents` | `SyncUbosService` (Kira) | `…attachOwnerDocuments` | `OnboardingPage` › Beneficiarios | `DocumentUploadDrawer` | igual que 6d · res `UboViewDto`; `422` si el beneficiario no tiene `email` o si viaja una `selfie` sin `biometricConsent=true` | `BeneficialOwner` | A, C |
| 6f | `GET /api/onboarding/terms` | `SubmitOnboardingService.terms` (local) | `…terms` | `OnboardingPage` › Enviar | `SendStep` | res `{version?, url?, acceptedVersion?}` | `ProviderTerms` | Todos |
| 6g | `POST /api/onboarding/terms` | `…acceptTerms` (Kira: `tos_accepted_version`) | `…acceptTerms` | `OnboardingPage` › Enviar | `SendStep` (casilla obligatoria si hay versión vigente sin aceptar) | req `{version}` · `422` si no es la vigente o no hay expediente | `ProviderTerms` | A, C |

**Borrador (añadido al BFF el 14-sep a petición del producto; Kira no tiene borradores).** Un JSON por organización en `tenants.onboarding_draft` (`json`) + `tenants.onboarding_draft_updated_at` (`datetime(6)`), máx. 64 KB. Rechaza con `422` cualquier cadena que empiece por `data:` (no guarda archivos: los documentos van directo al proveedor y el borrador solo anota nombre y fecha de lo enviado). Audita `tenant.onboarding_draft_saved` solo con los nombres de sección. Las claves de cada sección usan los nombres de campo de Kira (`business_legal_name`, `registered_address.street_line_1`, `source_of_funds`…), y `toProfile` envía a `PUT /api/onboarding` solo los valores no vacíos. Verificado en vivo: GET vacío `{"draft":{}}`; PUT Cumplimiento `200`; Consulta lo lee; `data:` → `422`; PUT Consulta → `403`; `{}` lo borra. En `cert`/`prod` (`ddl-auto: validate`, sin Flyway) hay que crear las columnas a mano antes de desplegar:

```sql
ALTER TABLE tenants
  ADD COLUMN onboarding_draft JSON NULL,
  ADD COLUMN onboarding_draft_updated_at DATETIME(6) NULL;
```

Documentos KYB (6d/6e, leídos en el código del BFF): máx. 10 archivos y 7 MB en total, JPEG/PNG/PDF; los roles `file_*` y los `informationType` del asistente salen de la documentación oficial de Kira (`kyb-catalog.ts`).

Verificado en vivo (14-sep): `POST /api/onboarding/refresh` sin `kiraUserId` → `422 business_rule_violation "La empresa todavia no esta dada de alta en Kira."`.

`OnboardingViewDto`: `tenantId, name, kiraUserId?, status, verificationTriggered, pendingFields: string[], eligibleProducts: {productCode, eligible, missingFields[], unsupportedReason?}[], readyForVirtualAccounts, enhancedDueDiligenceRequired`.
`status ∈ CREATED | VERIFYING | REVIEW | VERIFIED | REJECTED`.
Reglas: `POST` repetido no vuelve a llamar a Kira. `PUT` reenvía la fusión superficial: `associated_persons` debe ir completo. `sourceOfFunds` válidos (documentados en `API-GUIA.md §4.2`, validados por Kira, no por enum del BFF): `business_loans, inter_company_funds, investment_proceeds, owners_capital, sales_of_goods_and_services, tax_refund, third_party_funds, treasury_reserves, company_funds, investments_loans`. El motivo de un `REJECTED` **no** está en la vista.

### 1.3 Beneficiarios finales — dominio `onboarding` (subdominio `beneficial-owners`)

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 7 | `GET /api/ubos` | `SyncUbosService.list` (local) | `BeneficialOwnerRepository.list` | `BeneficialOwnersPage` (MVP lectura) | `OwnershipSummary`, `OwnerList` | `UboRosterDto{members: UboViewDto[], totalOwnership, hasBeneficialOwner, livenessComplete}` | `OwnershipRoster` | Todos |
| 8 | `POST /api/ubos` | `…save` (local; sin `id` crea) | `…save` | `BeneficialOwnersPage` | `OwnerDrawerForm` | req `SaveUboDto` · res `UboViewDto` | `BeneficialOwner` | A, C |
| 9 | `POST /api/ubos/sync` | `…syncToKira` | `…sync` | `BeneficialOwnersPage` | `SyncOwnersAction` (confirmación) | res `OnboardingViewDto` | `OnboardingStatus` | A, C |
| 10 | `POST /api/ubos/liveness-links` | `…requestLivenessLinks` | `…requestLivenessLinks` | `BeneficialOwnersPage` | `LivenessLinkCell` | req `{successUrl?,rejectUrl?,biometricConsent: true}` (casilla de consentimiento; sin ella `422`) · res `UboRosterDto` | `OwnershipRoster` | A, C |

`UboViewDto`: `id, personReferenceId?, fullName, documentType?, documentNumber?, hasOwnership, ownershipPercentage, beneficialOwner, hasControl, signer, politicallyExposed, countryOfBirth, roleInCompany?, livenessStatus (PENDING|COMPLETED|EXPIRED|FAILED), livenessLink?, livenessExpiresAt?`.
`SaveUboDto` (validación Bean real): `firstName*`, `lastName*`, `hasOwnership*`, `ownershipPercentage* 0–100`, `hasControl*`, `isSigner*`, `politicallyExposed*`, `countryOfBirth* ISO-3 (3 caracteres)`, opcionales `id, documentType, documentNumber, roleInCompany, email` (el correo sí se actualiza en edición y es obligatorio para subir documentos del beneficiario).
Verificado en vivo (14-sep): cuerpo vacío → `400 validation_error` con `details` por nombre de campo del comando (`isSigner`, `countryOfBirth`…); `id` inexistente → `422 "El beneficiario final no existe."`; `READ_ONLY` con cuerpo válido → `403 forbidden` (con cuerpo inválido recibe antes el `400`: la validación precede a la autorización). En edición el servicio **solo** aplica documento, participación, control, firma, PEP y país (`SyncUbosService.save`); nombre, apellido y cargo se ignoran (G-21). Un beneficiario nuevo nace con `livenessStatus: PENDING` y sin enlace; `beneficialOwner` = `hasOwnership` y participación ≥ 5 %. Cargo vacío → `"Beneficiario Final"`.
Reglas: `sync` falla antes de llamar a Kira si no hay beneficiario final. Liveness exige verificación disparada. El enlace dura 7 días; la redirección **no** confirma el resultado.

### 1.4 Cuentas virtuales — dominio `accounts`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 11 | `GET /api/virtual-accounts` | `OpenVirtualAccountService.list` | `VirtualAccountRepository.list` | `AccountsPage` · `HomePage` (MVP) | `AccountList`, `FundsReadinessBadge` | `VirtualAccountViewDto[]` | `VirtualAccount` | Todos |
| 12 | `GET /api/virtual-accounts/{id}` | `…get` | `…get` | `AccountDetailPage` | `DepositInstructions`, `BalancePanel` | `VirtualAccountViewDto` | `VirtualAccount` | Todos |
| 13 | `POST /api/virtual-accounts` | `…open` | `…open` | `AccountsPage` | `OpenAccountDrawer` | req `{description? ≤255, mode? (fiat|crypto), currency? ≤10}` · res 201 | `VirtualAccount` | A, M, C |
| 14 | `POST /api/virtual-accounts/{id}/refresh` | `…refresh` | `…refresh` | `AccountDetailPage` | `RefreshButton` | res `VirtualAccountViewDto` | `VirtualAccount` | A, M, P, C |
| 15 | `POST /api/virtual-accounts/{id}/balance` | `…refreshBalance` | `…refreshBalance` | `AccountDetailPage` | `BalancePanel` | res `VirtualAccountViewDto` | `VirtualAccount` | A, M, P, C |
| 16 | `POST /api/virtual-accounts/{id}/simulate-deposit` | `…simulateDeposit` (solo sandbox) | `…simulateDeposit` | `AccountDetailPage` | `SandboxDepositDrawer` (solo si entorno sandbox) | req `{amount* ≥0.01, paymentType? wire|ach}` | `VirtualAccount` | A, M |

`VirtualAccountViewDto`: `id, kiraAccountId?, status (PENDING|ACTIVE|INACTIVE|FAILED), mode (FIAT|CRYPTO), bank?, bankName?, description?, accountNumber?, routingNumber?, currency?, availableBalance?, balanceRefreshedAt?, balanceStale, fundsReady, activationDelayed, createdAt`.
Reglas: **`fundsReady` es la única señal de operatividad; `ACTIVE` no basta.** `activationDelayed=true` → ofrecer escalar, no seguir esperando. Abrir exige KYB `VERIFIED` y producto elegible. `balanceStale=true` → saldo cacheado no fiable, pedir `balance`. Modo inmutable.

### 1.5 Depósitos — dominio `deposits`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 17 | `GET /api/deposits?limit=50` | `RecordDepositService.list` | `DepositRepository.list` | `DepositsPage` · `HomePage` (MVP, recientes) | `DepositTable` | `DepositViewDto[]` | `Deposit` | Todos |
| 18 | `GET /api/virtual-accounts/{id}/deposits?limit=50` | `…listByAccount` | `…listByAccount` | `AccountDetailPage` | `DepositTable` | `DepositViewDto[]` | `Deposit` | Todos |
| 19 | `POST /api/virtual-accounts/{id}/deposits/sync` | `…syncFromKira` | `…syncFromAccount` | `AccountDetailPage` | `SyncButton` | `DepositViewDto[]` | `Deposit` | A, M, P, C |

`DepositViewDto`: `id, kiraDepositId?, virtualAccountId, grossAmount, feeAmount?, netAmount?, currency, senderName?, senderAccount?, rail? (ACH|WIRE|WALLET), status (PENDING|COMPLETED|FAILED|REFUNDED), microdeposit, creditsBalance, createdAt, updatedAt?`.
Límite: único parámetro `limit` (sin página, sin filtros, sin orden). Filtros de la UI son locales sobre lo recibido.

### 1.6 Destinatarios — dominio `recipients`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 20 | `GET /api/recipients` | `RegisterRecipientService.list` | `RecipientRepository.list` | `RecipientsPage` | `RecipientTable` | `RecipientViewDto[]` | `Recipient` | Todos |
| 21 | `GET /api/recipients/kira` | `…listInKira` | `…listInProvider` | `RecipientsReconciliationPage` | `ProviderRecipientTable` | `KiraRecipientViewDto[]` | `ProviderRecipient` | Todos |
| 22 | `GET /api/recipients/{id}/kira` | `…getInKira` | `…getInProvider` | `RecipientDetailDrawer` | — | `KiraRecipientViewDto` | `ProviderRecipient` | Todos |
| 23 | `GET /api/recipients/{id}` | `…get` | `…get` | `RecipientDetailDrawer` | `MaskedDestination` | `RecipientViewDto` | `Recipient` | Todos |
| 24 | `POST /api/recipients` | `…register` | `…register` | `NewRecipientPage` | `RailStep`, `HolderStep`, `DestinationStep` | req `RegisterRecipientDto` · res 201 `RecipientViewDto` | `Recipient` | A, M |
| 25 | `POST /api/recipients/{id}/archive` | `…archive` | `…archive` | `RecipientDetailDrawer` | `ArchiveRecipientDialog` | req opcional `{replacedByRecipientId?}` | `Recipient` | A, M |

`RecipientViewDto`: `id, kiraRecipientId?, name, rail (ACH|WIRE|WALLET), network?, bankName?, maskedDestination, status (ACTIVE|ARCHIVED), registeredInKira, alreadyExisted, replacedByRecipientId?, bankAddress?, createdAt`.
`RegisterRecipientDto`: `rail*`, `business`, `firstName?`, `lastName?`, `companyName?`, `email? (formato)`, `phone? ≤16`, `address?{streetName,city,state,postalCode,country ISO-2}`, ACH/WIRE: `routingNumber? (9 dígitos)`, `swiftCode?`, `accountNumber?`, `accountKind? (checking|savings)`, `bankName?`, `bankAddressText?`, `bankAddress?`; WALLET: `token?`, `network? (solana|polygon|tron)`, `walletAddress?`, `docType?`, `docNumber?`.
Reglas: **no hay edición ni borrado** (Kira no lo expone): corregir = alta de reemplazo + archivar. Un destinatario = un riel. `alreadyExisted=true` → Kira devolvió 202.

### 1.7 Cotizaciones — dominio `quotations`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 26 | `GET /api/quotations?limit=50` | `CreateQuoteService.list` | `QuotationRepository.list` | `NewPayoutPage` (historial breve) | — | `QuotationViewDto[]` | `Quotation` | Todos |
| 27 | `GET /api/quotations/{id}` | `…get` | `…get` | `NewPayoutPage` | `QuoteSummary` | `QuotationViewDto` | `Quotation` | Todos |
| 28 | `POST /api/quotations` | `…create` | `…create` | `NewPayoutPage` (paso Cotizar) | `QuoteForm`, `QuoteCountdown` | req `{virtualAccountId*, recipientId*, amount* ≥0.01, rail?, targetCurrency?}` · res 201 | `Quotation` | A, M |

Implementación: el front **siempre** cotiza antes de crear el pago (`quotationId` obligatorio en la UI) aunque el BFF permita pagos sin cotización (decisión abierta `ESTADO.md §5.2`); la vista previa (`POST /api/payouts/preview`) no se usa porque la cotización ya da el desglose que cierra el precio. La vigencia se ancla a `secondsToExpiry` recibido, no al reloj local.

`QuotationViewDto`: `id, kiraQuoteId?, virtualAccountId, recipientId, rail (ACH_STANDARD|ACH_SAME_DAY|WIRE_DOMESTIC|TRON|SOLANA|POLYGON), originAmount, destinationAmount, destinationCurrency, exchangeRate?, kiraFee, platformFee, totalFee, totalDebitAmount, balanceSufficient, fallbackRate, status (ACTIVE|EXPIRED|EXECUTED), expiresAt, secondsToExpiry`.
Reglas: TTL 15 min fijado por Kira. `amount` = lo que **recibe** el destinatario. Al llegar a 0 el botón de continuar se deshabilita y se ofrece recotizar. El riel debe corresponder al `rail` del destinatario (ACH→ACH_*, WIRE→WIRE_DOMESTIC, WALLET→red).

### 1.8 Pagos (maker-checker) — dominio `payouts`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 29 | `GET /api/payouts?limit=50` | `ExecutePayoutService.list` | `PayoutRepository.list` | `PayoutsPage` · `HomePage` (MVP, pendientes de aprobación) | `PayoutTable`, `ApprovalQueue` | `PayoutViewDto[]` | `Payout` | Todos |
| 30 | `GET /api/payouts/kira?status&page&limit&fromDate&toDate` | `…kiraHistory` | `…providerHistory` | `PayoutHistoryPage` | `ProviderPayoutTable`, `Paginator` | `KiraPayoutPageDto{items[],page,limit,total,totalPages}` | `ProviderPayoutPage` | Todos |
| 31 | `POST /api/payouts/preview` | `…preview` | `…preview` | `NewPayoutPage` | `FeePreview` | req `{virtualAccountId*, recipientId*, amount* ≥0.01, recipientReceivesAmount?}` · res `{amount?,currency?,recipientAmount?,recipientCurrency?,fees}` | `PayoutPreview` | A, M |
| 32 | `GET /api/payouts/{id}` | `…get` | `…get` | `PayoutDetailPage` | `PayoutSummary` | `PayoutViewDto` | `Payout` | Todos |
| 33 | `POST /api/payouts` | `…create` | `…create` | `NewPayoutPage` (paso Confirmar) | `ReviewAndSubmit` | req `{virtualAccountId*, recipientId*, amount* ≥1e-8, currency*, quotationId?}` · res 201 | `Payout` | A, M |
| 34 | `POST /api/payouts/{id}/approve` | `…approveAndSubmit` | `…approve` | `PayoutDetailPage` | `ApprovePayoutPanel` (drawer) | req opcional `{comment?, natureOfPayment?, memo? ≤255, documents? ≤2 {type: invoice|other, file: data URI ≤3 MB}}` | `Payout` | A, P |
| 35 | `POST /api/payouts/{id}/reject` | `…reject` | `…reject` | `PayoutDetailPage` | `RejectPayoutDialog` | req `{reason*}` | `Payout` | A, P |
| 36 | `GET /api/payouts/{id}/events` | `…events` | `…events` | `PayoutDetailPage` | `PayoutTimeline` | `PayoutEventViewDto[]{eventId?,status?,message?,createdAt?}` | `PayoutEvent` | Todos |
| 37 | `POST /api/payouts/{id}/refresh` | `…refreshFromKira` | `…refresh` | `PayoutDetailPage` | `RefreshButton` | `PayoutViewDto` | `Payout` | A, M, P, C |

`PayoutViewDto`: `id, virtualAccountId, recipientId, quotationId?, amount, currency, kiraFee, platformFee, totalFee, totalDebitAmount, approvalState (PENDING_APPROVAL|APPROVED|REJECTED|SUBMITTED), status (NOT_SUBMITTED|CREATED|PENDING|PROCESSING|KYT_PENDING|IN_REVIEW|COMPLETED|FAILED|EXPIRED|UNKNOWN), terminal, makerUserId, approverUserId?, priceLocked, kiraPayoutId?, referenceNumber?, paymentMethod?, errorCode?, blockedByRfiId?, createdAt, updatedAt?`.
`natureOfPayment ∈ vendor|pobo|first_party|spot_3p|spot_1p|related_entities|other`. Filtro `status` del historial Kira ∈ `CREATED|PENDING|PROCESSING|COMPLETED|FAILED|CANCELLED|IN_REVIEW|KYT_PENDING`; `limit` 1–100.
Reglas: el aprobador **no puede** ser el creador (validado en la entidad). Aprobar exige cotización vigente y saldo. El KYB debe estar `VERIFIED` para crear. Un pago sin cotización **hoy se permite** (decisión abierta §5.2 de `ESTADO.md`). `blockedByRfiId` → mostrar "detenido" con enlace al RFI.

### 1.9 Solicitudes de información — dominio `rfis`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 38 | `GET /api/rfis?open=false` | `AnswerRfiService.list` | `RfiRepository.list` | `RfiInboxPage` · `HomePage` (MVP, abiertos) | `RfiInbox` | `RfiViewDto[]` | `Rfi` | Todos |
| 39 | `GET /api/rfis/{id}` | `…get` | `…get` | `RfiDetailPage` | `RfiItemList` | `RfiViewDto` | `Rfi` | Todos |
| 40 | `POST /api/rfis/sync` | `…sync` | `…sync` | `RfiInboxPage` | `SyncButton` | `RfiViewDto[]` | `Rfi` | A, C |
| 41 | `POST /api/rfis/{id}/refresh` | `…refresh` | `…refresh` | `RfiDetailPage` | `RefreshButton` | `RfiViewDto` | `Rfi` | A, C |
| 42 | `PATCH /api/rfis/{id}/items` | `…answer` | `…answer` | `RfiDetailPage` | `RfiAnswerForm` (dinámico por `answer_type`) | req `{items: [{itemId*, answerValue*: string|number|boolean}]}` | `Rfi` | A, C |
| 43 | `POST /api/rfis/{id}/items/{itemId}/documents` | `…uploadDocuments` | `…uploadDocuments` | `RfiDetailPage` | `FileUploader` | multipart, parte `files` repetida | `Rfi` | A, C |
| 44 | `DELETE /api/rfis/{id}/items/{itemId}/documents/{documentId}` | `…removeDocument` | `…removeDocument` | `RfiDetailPage` | `ConfirmDialog` | — | `Rfi` | A, C |
| 45 | `GET /api/rfis/{id}/items/{itemId}/documents/{documentId}/link` | `…documentLink` | `…documentLink` | `RfiDetailPage` | `DocumentLinkButton` | `{downloadUrl, expiresAt}` | `TemporaryLink` | A, C |

`RfiViewDto`: `id, kiraRfiId?, status (PENDING|ANSWERED|RESOLVED|NOT_RESOLVED), open, overdue, dueDate?, totalItems, pendingItems, items: Record<string,unknown>[] (forma cruda de Kira: item_id, status, answer_type, answer_spec…), blocking?{type (transfer|virtual_account_deposit), kiraResourceId, payoutId?, payoutStatus?, depositId?, depositStatus?}, createdAt, updatedAt?`.
Esquema de ítem verificado en docs.kirafin.ai (`get-an-rfi`, `reference/rfis/values`, 14-sep): `item_id, ordinal, prompt, answer_type, answer_spec, target_key, subject, status (pending|answered), answer_value, documents[] {document_id, file_name, mime_type, size_bytes, checksum, uploaded_at}, review_note`; `answer_spec` por tipo: texto `max_length, format`; número `min, max, unit`; fecha `min_age`; choice `options: string[]`; identifier `format ∈ ein|ssn|email|e164|url|country_alpha3`; document `mime_types, max_files, document_type`; ubo_link `url` o `applicant_id + person_id`. `nature_of_payment` verificado en `reference/payouts/values`.
Reglas: `PATCH` es **todo o nada**: `422 rfi_answer_rejected` con `details` por `item_id`. Ítems `document` se responden solo subiendo archivos. Límites de archivo reales: máx. 20 archivos, 30 MB c/u (servidor: 30 MB/archivo, 100 MB/petición); tipos PDF, JPEG, PNG, HEIC, WebP salvo que el ítem diga otra cosa. No se puede borrar el último archivo de un ítem respondido. El enlace temporal caduca en minutos: abrir al momento, no guardarlo.

### 1.10 Catálogos — dominio `shared/reference`

| # | Endpoint | Caso de uso BFF | Repository | Página | Componente | DTO | Modelo | Rol |
|---|---|---|---|---|---|---|---|---|
| 46 | `GET /api/reference/countries` | `ReferenceCatalogService.countries` (cache 24 h, llama a Kira) | `ReferenceRepository.countries` | formularios UBO/destinatario | `CountrySelect` | `CountryViewDto[]{name, alpha3, postalCodeFormat?, subdivisions[{name,code}]}` | `Country` | Todos |

### 1.11 Fuera del alcance del navegador

| # | Endpoint | Motivo |
|---|---|---|
| 47 | `POST /api/webhooks/kira` | Entrada HMAC de Kira. Nunca la llama el front. |
| — | `GET /actuator/health` | Público. Útil solo para diagnóstico de conectividad. |
| — | `/swagger-ui.html`, `/v3/api-docs` | Solo dev/cert; apagado en prod. |

---

## 2. Matriz RBAC derivada (acciones de UI)

| Acción de UI | A | M | P | C | R |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver estado KYB, UBOs, cuentas, depósitos, destinatarios, cotizaciones, pagos, RFIs | ✓ | ✓ | ✓ | ✓ | ✓ |
| Alta KYB / completar perfil / guardar UBO / sincronizar UBOs / enlaces liveness | ✓ | | | ✓ | |
| Abrir cuenta virtual | ✓ | ✓ | | ✓ | |
| Simular depósito (sandbox) | ✓ | ✓ | | | |
| Registrar / archivar destinatario | ✓ | ✓ | | | |
| Vista previa, cotizar, crear pago | ✓ | ✓ | | | |
| Aprobar / rechazar pago (y nunca el propio) | ✓ | | ✓ | | |
| Sincronizar / responder RFI, subir y borrar documentos | ✓ | | | ✓ | |
| Refrescar desde Kira (onboarding, cuenta, saldo, depósitos, pago) | ✓ | ✓ | ✓ | ✓ | |
| Descargar documento de RFI (enlace temporal, auditado) | ✓ | | | ✓ | |

Capacidades del front: `provider.refresh` y `rfis.manage` (G-09, cerrado el 15-sep).

La UI oculta o deshabilita acciones por rol **por claridad**, no por seguridad: el `@PreAuthorize` del BFF es la barrera real y la UI debe tratar un `403 forbidden` como caso normal.

---

## 3. Catálogo de errores → mensaje de UI (`ErrorMappingService`)

| HTTP | `code` | Qué pasó (UI) | Acción ofrecida |
|---|---|---|---|
| 401 | `unauthorized` | Tu sesión terminó. | Volver a iniciar sesión (conservando la ruta). |
| 403 | *(cuerpo vacío)* | Sesión ausente. | Ir a login. |
| 403 | `forbidden` | Tu rol no permite esta acción. | Ninguna; explicar qué rol la tiene. |
| 400 | `validation_error` (+`details` campo→mensaje) | Revisa los campos marcados. | Pintar `details` junto a cada campo. |
| 404 | `not_found` | No encontramos lo que buscas. | Volver al listado. |
| 413 | `file_too_large` | El archivo supera 30 MB. | Elegir otro archivo. |
| 422 | `business_rule_violation` | Mensaje del BFF (ya es accionable y en español). | Según contexto (p. ej. recotizar). |
| 422 | `rfi_answer_rejected` (+`details` por `item_id`) | Ninguna respuesta se guardó. | Corregir los ítems marcados y reenviar el lote. |
| 422 | `kira_<code>` | El proveedor rechazó la operación. | Mostrar mensaje, sin detalles técnicos. |
| 502 | `kira_<code>` | El proveedor no responde. | Reintentar más tarde. |
| 503 | `kira_not_configured` | La conexión con el proveedor no está configurada en este entorno. | Estado honesto "Pendiente de configuración"; sin reintento automático. |
| 500 | `internal_error` | Algo falló de nuestro lado. | Reintentar; si persiste, contactar soporte. |
| 0 | *(red)* | Sin conexión con el servidor. | Reintentar. |

Nota: los mensajes del BFF llegan **sin tildes** (`"Credenciales invalidas."`). Se muestran tal cual para `business_rule_violation` (no reescribimos reglas del backend); ver G-10.

---

## 4. Gaps backend ↔ frontend

| ID | Feature | Requisito frontend | Capacidad backend | Gap | Impacto | Cambio backend recomendado | Prioridad |
|---|---|---|---|---|---|---|---|
| G-01 | ~~Consola multiempresa (clientes, ficha 360, bandeja REVIEW)~~ ✅ Cerrado 15-sep: rol `PLATFORM_OPERATOR` y `/api/platform/*` (clientes, ficha 360, bandeja de revisión), solo lectura. | Operaciones/compliance interno ve todos los clientes | Todos los roles son `TENANT`; no hay `GET` de organizaciones | No existe la experiencia "Consola de operaciones" | Esa experiencia no se construye | Rol `SYSTEM` + endpoints `/api/admin/tenants` con auditoría | Alta (si el piloto la necesita) |
| G-02 | ~~Nombre de organización tras recargar~~ ✅ Cerrado 15-sep: `/api/auth/me` trae `tenantName`. | Mostrar organización en el shell | `tenantName` solo en `login`; `/me` no lo trae | Se obtiene de `GET /api/onboarding.name` | Menor; una llamada extra | Añadir `tenantName` a `/me` | Baja |
| G-03 | Nombre del maker/aprobador | "Creado por Ana" en pagos | Vistas solo traen `makerUserId`/`approverUserId`; no hay endpoint de operadores | Se muestra "tú" si coincide con `/me.userId`; si no, "otro operador" | Trazabilidad visual pobre | `makerName`/`approverName` en `PayoutView` o `GET /api/operators` | Media |
| G-04 | Cierre de sesión | Logout que invalide el token | Stateless, sin revocación; JWT 8 h | Logout solo local (se descarta el token) | Token robado vale hasta expirar | Lista de revocación o tokens cortos + refresh en cookie `HttpOnly` | Media |
| G-05 | Renovación de sesión | Mantener sesión en trabajos largos | Sin refresh token | Al expirar se vuelve a login (con retorno a la ruta) | Interrupción cada 8 h | Refresh token en cookie `HttpOnly` | Baja |
| G-06 | CORS / origen | Front servido aparte en despliegue | Sin CORS | Dev: proxy; prod: mismo origen obligatorio | Restricción de despliegue | Documentar reverse proxy o CORS explícito por entorno | Media |
| G-07 | ~~Idempotencia al crear pago~~ ✅ Cerrado 15-sep: cabecera `Idempotency-Key` por intención en pagos y destinatarios. | Doble clic no crea dos pagos | `POST /api/payouts` genera clave nueva en cada llamada; no acepta clave del cliente | Dos envíos crean dos pagos `PENDING_APPROVAL` (no salen a Kira sin aprobar) | Duplicados en la bandeja | Aceptar `Idempotency-Key` del cliente en `POST /api/payouts` y `/api/recipients` | Alta |
| G-08 | ~~Razón de rechazo KYB~~ ✅ Cerrado 15-sep: `OnboardingView.rejectionReason` (de `reasons[]` del webhook) y se muestra en la etapa «No aprobada». | Mostrar por qué se rechazó | Solo llega por webhook y no se expone en `OnboardingView` | UI dice "No aprobado" sin razón | Remediación a ciegas | Persistir y exponer `rejectionReasons` | Media |
| G-09 | Permisos de refresco | `READ_ONLY` sin llamadas que tocan Kira | **Cerrado (15-sep):** refrescos solo A, M, P, C; enlace de documento RFI solo A, C y auditado (`compliance.rfi_document_link_issued`) | Botones ocultos sin la capacidad | — | — | — |
| G-10 | Mensajes con tildes / i18n | Español correcto | Mensajes del BFF sin tildes | Se muestran tal cual | Cosmético | Mensajes UTF-8 o códigos estables por regla | Baja |
| G-11 | ~~Notificaciones~~ ✅ Cerrado 15-sep: `/api/notifications` y contador en la navegación. | Centro de avisos | No hay endpoint | Sin módulo de notificaciones | — | `GET /api/notifications` sobre `webhooks_log` | Media |
| G-12 | ~~Auditoría~~ ✅ Cerrado 15-sep: `GET /api/audit` y página «Auditoría». | Historial de acciones | `AuditTrail` escribe `audit_log`, no hay lectura | Sin módulo de auditoría | — | `GET /api/audit` paginado | Media |
| G-13 | Administración de operadores | Alta/baja de usuarios y roles | No hay endpoint (`ESTADO.md §4.3`) | Sin módulo de administración | Usuarios solo por semilla/BD | CRUD de operadores con maker-checker | Media |
| G-14 | Paginación y filtros | Tablas con filtros/orden servidor | Listas locales solo `limit`; solo `/payouts/kira` pagina | Filtros solo en cliente sobre ≤`limit` filas | Históricos grandes incompletos | `page`, `status`, `from/to` en listas locales | Media |
| G-15 | ~~Documentos corporativos KYB~~ ✅ Cerrado 14-sep: `POST /api/onboarding/documents` y `POST /api/ubos/{id}/documents`. | Carga de documentos de empresa/UBO | `PUT /api/onboarding` acepta `profile` libre; no hay endpoint de subida KYB | Solo campos que Kira pida vía `pendingFields` | Documentos KYB no gestionables con UX propia | Endpoint de documentos KYB | Media |
| G-16 | Etiquetas de `pendingFields` | Etiquetas humanas y tipo de control | Solo nombres técnicos de Kira (`business_type`) sin tipo ni opciones | Diccionario de etiquetas en el front; control texto por defecto | Formulario técnico | Exponer esquema (tipo, opciones, obligatoriedad) | Alta |
| G-17 | ~~Borrar UBO~~ ✅ Cerrado 15-sep: `DELETE /api/ubos/{id}` mientras el proveedor no conozca a la persona (`knownToKira`). | Quitar un beneficiario mal cargado | No hay `DELETE /api/ubos/{id}` | Sin acción de borrar | Correcciones imposibles desde UI | Endpoint de baja local antes de sync | Media |
| G-18 | Entorno sandbox en el front | Mostrar "Simular depósito" solo en sandbox | `kira.sandbox` no se expone | Se muestra por configuración del front; el BFF responde 422 en prod | Botón visible que falla si se configura mal | Exponer capacidades del entorno (`GET /api/capabilities`) | Baja |
| G-20 | ~~Tipos de documento de UBO~~ ✅ Cerrado 15-sep: selector con los tipos de documento con foto del proveedor. | Selector con los valores válidos | `documentType` es texto libre; solo `national_id` está documentado | Campo de texto con sugerencia `national_id` | Errores de tipeo llegan al proveedor | Exponer catálogo de tipos de documento | Media |
| G-21 | ~~Edición de UBO~~ ✅ Cerrado 15-sep: la edición aplica nombre, apellido y cargo; la vista trae `firstName`/`lastName`. | Corregir nombre, apellido o cargo | `POST /api/ubos` con `id` los exige (`@NotBlank`) pero no los aplica; la vista solo trae `fullName` | Nombre y cargo de solo lectura en edición; el front reenvía el nombre vigente para pasar la validación | Un nombre mal escrito no se puede corregir (y tampoco borrar, G-17) | Aplicar nombre/cargo en edición y exponer `firstName`/`lastName` en `UboView` | Alta |
| G-22 | Catálogo de países sin proveedor | Selector de país siempre disponible | `GET /api/reference/countries` depende de Kira → `503` sin credenciales | El formulario acepta código ISO-3 cuando el catálogo no responde | UX más técnica en entornos sin credenciales; el navegador registra el `503` en consola | Catálogo ISO local de respaldo en el BFF | Baja |
| G-23 | Apertura de cuenta ante fallo del proveedor | Reintentar sin duplicar | `OpenVirtualAccountService.open` guarda la cuenta local (clave de idempotencia) antes de llamar a Kira; si Kira falla, queda una cuenta sin `kiraAccountId` y cada reintento crea otra con UUID nuevo | La UI muestra esas cuentas como «Apertura sin confirmar» y pide contactar a soporte antes de reintentar | Cuentas huérfanas en la base | Reutilizar la cuenta pendiente de la empresa (misma clave) en el reintento | Alta |
| G-24 | ~~Verificación `ubo_link` en RFI~~ ✅ Cerrado 15-sep: `POST /api/rfis/{id}/items/{itemId}/ubo-link` y botón en el detalle. | Generar el enlace del beneficiario | El BFF no expone «mint a beneficiary's verification link» de Kira | Solo se abre `answer_spec.url` si llega; si no, aviso de soporte | Ítems `ubo_link` sin URL no se pueden completar | Endpoint `POST /api/rfis/{id}/items/{itemId}/ubo-link` | Media |
| G-25 | ~~Cuenta del ordenante en depósitos~~ ✅ Cerrado 15-sep: `senderAccount` sale enmascarada del BFF. | Dato bancario enmascarado | `DepositView.senderAccount` llega completo | La UI lo enmascara (`•••• 1234`) | Dato sensible expuesto en la API | Enmascarar en la vista del BFF, como en destinatarios | Media |
| G-27 | ~~Industria de la empresa (`business_industry`)~~ ✅ Cerrado 15-sep: catálogo de 93 industrias NAICS del proveedor en `kyb-catalog.ts`. | Selector de industria en el paso Empresa | Kira pide un slug NAICS; ni el BFF ni la documentación accesible publican la lista | El asistente no pide el campo; si el proveedor lo exige aparece en «Lo pide el proveedor» (`pendingFields`) | Un dato que el operador no puede rellenar desde el portal | Exponer el catálogo de industrias (`GET /api/reference/industries`) | Media |
| G-28 | Países de operación (`transaction_countries`) | Selección múltiple de países | La documentación no aclara si son ISO-2 o ISO-3 y el catálogo del BFF es ISO-3 | No se pide en el asistente | Ídem G-27 | Documentar el formato y validarlo en el BFF | Media |
| G-29 | Esquema del borrador en `cert`/`prod` | Guardar borradores en todos los entornos | Las columnas nuevas solo se crean solas en `dev` (`ddl-auto: update`) | SQL manual en §1.2 | Sin la migración el BFF no arranca en `cert`/`prod` (`validate`) | Adoptar migraciones versionadas (Flyway) | Alta |
| G-30 | Documentos en el borrador | Dejar un documento «a medio subir» | El BFF no almacena archivos; van directo a Kira y solo con el expediente creado | Los pasos de documentos se habilitan tras «Enviar al proveedor»; el borrador anota lo ya enviado | No se pueden adelantar documentos antes del alta | Ninguno (por diseño: no guardar documentos de identidad en el BFF) | Baja |
| G-26 | Destinatarios archivados en pagos | Nombre del destinatario de un pago antiguo | `GET /api/recipients` solo devuelve activos | El detalle de pago muestra «No disponible en el directorio» | Pagos históricos sin nombre de destinatario | Incluir `recipientName` en `PayoutView` | Baja |
| G-19 | Instrucciones cripto de pago | QR, dirección, expiración | No existe en vistas | No se construye | — | Exponer `payment_instructions` | Baja |
