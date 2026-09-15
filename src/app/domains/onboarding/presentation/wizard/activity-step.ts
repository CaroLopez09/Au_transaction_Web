import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ACCOUNT_PURPOSES, MONTHLY_VOLUMES, SOURCES_OF_FUNDS, TRANSACTION_COUNTS } from '../../domain/kyb-catalog';
import { ActivitySection, activityGaps } from '../../domain/onboarding-draft';
import { StepGaps } from './step-gaps';

@Component({
  selector: 'au-activity-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StepGaps],
  template: `
    <form [formGroup]="form" (submit)="$event.preventDefault()">
      <fieldset class="group">
        <legend>Uso de la cuenta</legend>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="account_purpose">Propósito de la cuenta</label>
            <select id="account_purpose" class="au-input" formControlName="account_purpose">
              <option value="">Selecciona</option>
              @for (option of purposes; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
          <div class="au-field">
            <label class="au-label" for="source_of_funds">Origen de los fondos</label>
            <select
              id="source_of_funds"
              class="au-input"
              formControlName="source_of_funds"
              aria-describedby="source-help"
            >
              <option value="">Selecciona</option>
              @for (option of sources; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            <p class="au-help" id="source-help">Sin este dato el proveedor no inicia la verificación.</p>
          </div>
        </div>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="expected_monthly_volume">Volumen mensual esperado</label>
            <select id="expected_monthly_volume" class="au-input" formControlName="expected_monthly_volume">
              <option value="">Selecciona</option>
              @for (option of volumes; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
          <div class="au-field">
            <label class="au-label" for="expected_transaction_count">Transacciones al mes</label>
            <select id="expected_transaction_count" class="au-input" formControlName="expected_transaction_count">
              <option value="">Selecciona</option>
              @for (option of counts; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>Riesgo</legend>
        @for (question of questions; track question.key) {
          <fieldset class="au-field">
            <legend class="au-label">{{ question.label }}</legend>
            <div class="au-choice">
              <label><input type="radio" [formControlName]="question.key" [value]="question.yes" />Sí</label>
              <label><input type="radio" [formControlName]="question.key" [value]="question.no" />No</label>
            </div>
          </fieldset>
        }
      </fieldset>
    </form>
    <au-step-gaps [gaps]="gaps()" [pending]="pending()" />
  `,
  styleUrl: './wizard-step.css',
})
export class ActivityStep {
  readonly value = input.required<ActivitySection>();
  readonly readonly = input(false);
  readonly pending = input<readonly string[]>([]);
  readonly changed = output<ActivitySection>();

  protected readonly purposes = ACCOUNT_PURPOSES;
  protected readonly sources = SOURCES_OF_FUNDS;
  protected readonly volumes = MONTHLY_VOLUMES;
  protected readonly counts = TRANSACTION_COUNTS;
  /** Valores tal como los define el proveedor: "Yes"/"No" o booleano. */
  protected readonly questions = [
    { key: 'high_risk_industries', label: '¿La empresa opera en industrias de alto riesgo?', yes: 'Yes', no: 'No' },
    {
      key: 'is_nbfi_vasp',
      label: '¿Es una institución financiera no bancaria o un proveedor de servicios de activos virtuales?',
      yes: 'Yes',
      no: 'No',
    },
    { key: 'business_legal_history', label: '¿La empresa tiene antecedentes legales?', yes: 'Yes', no: 'No' },
    {
      key: 'has_material_intermediary_ownership',
      label: '¿Parte de la propiedad se tiene a través de sociedades intermedias?',
      yes: 'true',
      no: 'false',
    },
  ] as const;

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    account_purpose: [''],
    source_of_funds: [''],
    expected_monthly_volume: [''],
    expected_transaction_count: [''],
    high_risk_industries: [''],
    is_nbfi_vasp: [''],
    business_legal_history: [''],
    has_material_intermediary_ownership: [''],
  });
  protected readonly gaps = computed(() => activityGaps(this.value()));

  constructor() {
    effect(() => {
      const value = this.value();
      untracked(() => {
        if (JSON.stringify(this.form.getRawValue()) !== JSON.stringify(value)) {
          this.form.setValue(value, { emitEvent: false });
        }
      });
    });
    effect(() => (this.readonly() ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false })));
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.changed.emit(this.form.getRawValue()));
  }
}
