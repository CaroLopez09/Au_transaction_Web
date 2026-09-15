import AxeBuilder from '@axe-core/playwright';
import { expect, Page } from '@playwright/test';

/** Operadores creados por DevDataSeeder del BFF: `<rol con puntos>@<organización>.test`. */
export const SEED_OPERATORS = {
  juriscopAdmin: 'admin@juriscop.test',
  bankvisionReadOnly: 'read.only@bankvision.test',
} as const;

export function seedPassword(): string {
  const password = process.env['AU_E2E_PASSWORD'];
  if (!password) {
    throw new Error('Define AU_E2E_PASSWORD con la contraseña de la semilla dev del BFF (BFF_DEV_SEED_PASSWORD).');
  }
  return password;
}

export async function signIn(page: Page, email: string, returnTo?: string): Promise<void> {
  await page.goto(returnTo ? `/ingresar?volver=${encodeURIComponent(returnTo)}` : '/ingresar');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(seedPassword());
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

/** Lee del BFF lo mismo que la UI debe mostrar: la prueba compara contra datos reales, no contra constantes. */
export async function fetchOnboarding(page: Page): Promise<{ name: string; status: string; kiraUserId?: string }> {
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('au.session') ?? '{}').accessToken);
  const response = await page.request.get('/api/onboarding', { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok()).toBe(true);
  return response.json();
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target}`)).toEqual([]);
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}
