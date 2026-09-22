import path from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoAxeViolations, SEED_OPERATORS, signIn } from './support';

const FIXTURES = path.join(process.cwd(), 'e2e', 'fixtures', 'identity');

/**
 * Prueba end-to-end contra el proveedor biometrico real (BankVision). Requiere que el BFF esté
 * levantado con `BFF_IDENTITY_VERIFICATION_ENABLED=true` y `BIOMETRY_BASE_URL` apuntando al
 * servicio real; si no, `begin()` cae en "La integracion biometrica no esta configurada..." y el
 * primer test se salta en vez de fallar en falso.
 *
 * Las imágenes de `fixtures/identity` son sintéticas (no un rostro real), así que el resultado
 * esperado no es VERIFIED sino el rechazo real del proveedor: lo que valida esta prueba es que el
 * viaje completo (formulario → multipart → BankVision → mensaje real de vuelta) funciona, no que
 * el algoritmo de biometría apruebe fotos falsas.
 */
test.describe('Verificación de identidad biométrica', () => {
  test('una persona recién creada debe verificar su identidad antes de entrar, y ve el motivo real del proveedor si la imagen no sirve', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);

    // 1) Como admin, se da de alta a una persona nueva: por diseño queda "pendiente de validación
    // de identidad" (identity_status = PENDING_DOCUMENTS) hasta que complete este flujo.
    await signIn(page, SEED_OPERATORS.juriscopAdmin, '/equipo');
    await expect(page).toHaveURL(/\/equipo$/);
    await page.getByRole('button', { name: 'Añadir persona' }).click();

    const email = `identidad.e2e.${Date.now()}@juriscop.test`;
    const password = 'Cambiar123456!';
    await page.getByLabel('Nombre').fill('Identidad');
    await page.getByLabel('Apellido').fill('E2E');
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña inicial').fill(password);
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('quedó pendiente de validación de identidad')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/ingresar$/);

    // 2) La persona nueva ingresa: el BFF no le da sesión, le da un reto de identidad de pocos
    // minutos y la UI la manda a /verificar-identidad en vez de al portal.
    await page.goto('/ingresar');
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/verificar-identidad$/);
    await expect(page.getByRole('heading', { name: 'Verifica tu identidad' })).toBeVisible();
    await expectNoAxeViolations(page);

    // 3) Sube las 2 imágenes del documento y acepta el consentimiento; esto habilita la cámara.
    await page.locator('#front').setInputFiles(`${FIXTURES}/document-front.jpg`);
    await page.locator('#back').setInputFiles(`${FIXTURES}/document-back.jpg`);
    await page.getByLabel(/Autorizo el tratamiento/).check();

    // El dispositivo de video simulado de Chromium no contiene un rostro real, así que forzamos
    // el respaldo de captura manual (sin detección automática) para poder tomar la foto en CI:
    // lo que importa aquí es el viaje real cámara → multipart → BankVision, no el heurístico de
    // encuadre en el navegador (eso no se puede probar de forma fiable sin una webcam real).
    await page.evaluate(() => {
      Reflect.deleteProperty(globalThis, 'FaceDetector');
    });
    await page.getByRole('button', { name: 'Activar cámara' }).click();

    const validation = page.waitForResponse(
      (response) => response.url().includes('/verify-identity') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Tomar foto' }).click();
    const response = await validation;

    // El resultado depende de si BankVision detecta o no un rostro real en la selfie sintética:
    // ambos desenlaces prueban que el viaje real funcionó (no una respuesta simulada local).
    if (response.ok()) {
      await expect(page.getByRole('status')).toContainText(/Resultado: (VERIFIED|IN_REVIEW|REJECTED)/);
    } else {
      await expect(page.getByRole('alert')).not.toContainText('No fue posible validar la identidad con el proveedor.');
      await expect(page.getByRole('alert')).toBeVisible();
      // Un 422 esperado del BFF hace que el navegador registre su propio "Failed to load resource":
      // es ruido normal de la petición fallida, no un error de la aplicación.
      const unexpected = errors.filter((message) => !message.includes('the server responded with a status of'));
      expect(unexpected).toEqual([]);
      return;
    }

    expect(errors).toEqual([]);
  });

  test('sin reto de identidad vigente, la página ofrece volver a ingresar', async ({ page }) => {
    await page.goto('/verificar-identidad');
    await expect(page.getByText('La solicitud expiró. Ingresa nuevamente para obtener una nueva.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir a ingresar' })).toBeVisible();
  });
});
