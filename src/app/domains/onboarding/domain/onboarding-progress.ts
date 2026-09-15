import { OwnershipRoster } from './beneficial-owner';
import { OnboardingStatus } from './onboarding-status';

export type StepState = 'done' | 'current' | 'upcoming' | 'blocked';

export interface OnboardingStep {
  readonly key: 'registration' | 'profile' | 'liveness' | 'verification' | 'product';
  readonly title: string;
  readonly state: StepState;
}

/**
 * Pasos del KYB tal como los recorre el BFF (API-GUIA §4.2–4.3):
 * alta mínima → perfil y beneficiarios hasta disparar la verificación → prueba de vida de UBOs
 * (exige verificación disparada) → KYB aprobado → producto elegible.
 */
export function onboardingSteps(status: OnboardingStatus, roster: OwnershipRoster | null): OnboardingStep[] {
  const registered = status.providerUserId !== null;
  const profileDone = registered && (status.verificationTriggered || status.status !== 'CREATED');
  const livenessDone = roster?.livenessComplete ?? false;
  const verified = status.status === 'VERIFIED';
  const rejected = status.status === 'REJECTED';

  const facts = [
    { key: 'registration', title: 'Alta de la empresa', done: registered },
    { key: 'profile', title: 'Información de la empresa y beneficiarios', done: profileDone },
    { key: 'liveness', title: 'Prueba de vida de los beneficiarios', done: livenessDone },
    { key: 'verification', title: 'Verificación de la empresa', done: verified },
    { key: 'product', title: 'Cuentas en EE. UU. habilitadas', done: status.readyForVirtualAccounts },
  ] as const;

  let currentAssigned = false;
  return facts.map((fact) => {
    if (fact.done) {
      return { key: fact.key, title: fact.title, state: 'done' };
    }
    if (rejected && fact.key === 'verification') {
      currentAssigned = true;
      return { key: fact.key, title: fact.title, state: 'blocked' };
    }
    if (!currentAssigned && !rejected) {
      currentAssigned = true;
      return { key: fact.key, title: fact.title, state: 'current' };
    }
    return { key: fact.key, title: fact.title, state: 'upcoming' };
  });
}
