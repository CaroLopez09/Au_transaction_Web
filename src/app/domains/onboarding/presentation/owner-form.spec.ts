import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { mapApiError } from '../../../core/http/error-mapping';
import { CountryRepository } from '../../../shared/reference/country';
import { OnboardingFacade, SaveOwnerResult } from '../application/onboarding.facade';
import { BeneficialOwner, SaveBeneficialOwner } from '../domain/beneficial-owner';
import { OwnerForm } from './owner-form';

const fixtureOwner: BeneficialOwner = {
  id: 'ubo-fixture',
  fullName: 'Persona Fixture',
  email: 'persona@fixture.test',
  documentType: 'national_id',
  documentNumber: '1020304050',
  hasOwnership: true,
  ownershipPercentage: 60,
  beneficialOwner: true,
  hasControl: true,
  signer: false,
  politicallyExposed: false,
  countryOfBirth: 'COL',
  roleInCompany: 'Socia',
  liveness: { status: 'PENDING', link: null, expiresAt: null },
};

class FixtureFacade {
  readonly savingOwner = signal(false);
  lastCommand: SaveBeneficialOwner | null = null;
  result: SaveOwnerResult = { ok: true, owner: fixtureOwner };
  async saveOwner(command: SaveBeneficialOwner): Promise<SaveOwnerResult> {
    this.lastCommand = command;
    return this.result;
  }
}

async function render(owner: BeneficialOwner | null) {
  const facade = new FixtureFacade();
  TestBed.configureTestingModule({
    imports: [OwnerForm],
    providers: [
      { provide: OnboardingFacade, useValue: facade },
      // Catálogo no disponible, como hoy en dev sin credenciales del proveedor.
      {
        provide: CountryRepository,
        useValue: { countries: () => throwError(() => new Error('503')) },
      },
    ],
  });
  const fixture: ComponentFixture<OwnerForm> = TestBed.createComponent(OwnerForm);
  fixture.componentRef.setInput('formId', 'fixture-form');
  fixture.componentRef.setInput('owner', owner);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const input = (id: string) => element.querySelector<HTMLInputElement>(`#fixture-form-${id}`)!;
  const choose = (legend: string, answer: 'Sí' | 'No') => {
    const fieldset = [...element.querySelectorAll('fieldset')].find((node) =>
      node.querySelector('legend')?.textContent?.includes(legend),
    )!;
    [...fieldset.querySelectorAll('label')]
      .find((label) => label.textContent?.trim() === answer)!
      .querySelector('input')!
      .click();
  };
  const type = (id: string, value: string) => {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  };
  return { fixture, facade, element, input, choose, type };
}

describe('OwnerForm', () => {
  it('no envía nada si faltan las respuestas obligatorias y las marca', async () => {
    const { fixture, facade, element } = await render(null);
    await fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(facade.lastCommand).toBeNull();
    const errors = [...element.querySelectorAll('.au-field-error')].map((node) => node.textContent?.trim());
    expect(errors).toContain('Escribe el nombre.');
    expect(errors).toContain('Indica si la persona está expuesta políticamente.');
    expect(errors).toContain('Indica el país de nacimiento.');
  });

  it('sin catálogo de países admite el código ISO-3 y construye un alta completa', async () => {
    const { fixture, facade, element, choose, type } = await render(null);
    expect(element.textContent).toContain('El listado de países no está disponible en este entorno');
    type('firstName', 'María');
    type('lastName', 'Pérez');
    choose('¿Tiene participación', 'Sí');
    type('ownershipPercentage', '60');
    choose('¿Ejerce control', 'Sí');
    choose('¿Firma por la empresa', 'No');
    type('countryOfBirth', 'col');
    choose('¿Es una persona expuesta', 'No');
    await fixture.componentInstance.submit();
    expect(facade.lastCommand).toEqual({
      kind: 'register',
      firstName: 'María',
      lastName: 'Pérez',
      roleInCompany: null,
      email: null,
      documentType: null,
      documentNumber: null,
      hasOwnership: true,
      ownershipPercentage: 60,
      hasControl: true,
      isSigner: false,
      politicallyExposed: false,
      countryOfBirth: 'col',
    });
  });

  it('sin participación desactiva el porcentaje y envía 0', async () => {
    const { fixture, facade, input, choose, type } = await render(null);
    type('firstName', 'Ana');
    type('lastName', 'Ruiz');
    choose('¿Tiene participación', 'No');
    await fixture.whenStable();
    expect(input('ownershipPercentage').disabled).toBe(true);
    choose('¿Ejerce control', 'Sí');
    choose('¿Firma por la empresa', 'Sí');
    type('countryOfBirth', 'MEX');
    choose('¿Es una persona expuesta', 'No');
    await fixture.componentInstance.submit();
    expect(facade.lastCommand?.ownershipPercentage).toBe(0);
    expect(facade.lastCommand?.hasOwnership).toBe(false);
  });

  it('en edición precarga los datos, no ofrece cambiar el nombre y envía una actualización', async () => {
    const { fixture, facade, element, input } = await render(fixtureOwner);
    expect(element.querySelector('#fixture-form-firstName')).toBeNull();
    expect(element.textContent).toContain('El nombre y el cargo no se pueden cambiar después del alta.');
    expect(input('ownershipPercentage').value).toBe('60');
    await fixture.componentInstance.submit();
    expect(facade.lastCommand).toMatchObject({ kind: 'update', id: 'ubo-fixture', fullName: 'Persona Fixture' });
  });

  it('pinta junto a cada campo los errores de validación del BFF', async () => {
    const { fixture, facade, element } = await render(fixtureOwner);
    facade.result = {
      ok: false,
      error: mapApiError({
        status: 400,
        code: 'validation_error',
        message: 'Datos invalidos.',
        details: { countryOfBirth: 'el tamaño debe estar entre 3 y 3' },
      }),
    };
    await fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(element.querySelector('#fixture-form-countryOfBirth-error')?.textContent).toContain(
      'el tamaño debe estar entre 3 y 3',
    );
    expect(element.querySelector('.error-summary')?.textContent).toContain('Revisa los datos');
  });
});
