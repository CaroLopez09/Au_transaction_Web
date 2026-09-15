import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RepresentativeSection, representativeGaps } from '../../domain/onboarding-draft';
import { StepGaps } from './step-gaps';

@Component({
  selector: 'au-representative-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StepGaps],
  template: `
    <form [formGroup]="form" (submit)="$event.preventDefault()">
      <fieldset class="group">
        <legend>Representante legal</legend>
        <p class="intro">La persona que actúa en nombre de la empresa ante el proveedor.</p>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="representative_first_name">Nombre</label>
            <input
              id="representative_first_name"
              class="au-input"
              formControlName="representative_first_name"
              autocomplete="given-name"
            />
          </div>
          <div class="au-field">
            <label class="au-label" for="representative_last_name">Apellido</label>
            <input
              id="representative_last_name"
              class="au-input"
              formControlName="representative_last_name"
              autocomplete="family-name"
            />
          </div>
        </div>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="representative_title">Cargo</label>
            <input
              id="representative_title"
              class="au-input"
              formControlName="representative_title"
              autocomplete="organization-title"
            />
          </div>
          <div class="au-field">
            <label class="au-label" for="representative_date_of_birth">Fecha de nacimiento</label>
            <input
              id="representative_date_of_birth"
              class="au-input short"
              type="date"
              formControlName="representative_date_of_birth"
            />
          </div>
        </div>
      </fieldset>
    </form>
    <au-step-gaps [gaps]="gaps()" [pending]="pending()" />
  `,
  styleUrl: './wizard-step.css',
})
export class RepresentativeStep {
  readonly value = input.required<RepresentativeSection>();
  readonly readonly = input(false);
  readonly pending = input<readonly string[]>([]);
  readonly changed = output<RepresentativeSection>();

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    representative_first_name: [''],
    representative_last_name: [''],
    representative_title: [''],
    representative_date_of_birth: [''],
  });
  protected readonly gaps = computed(() => representativeGaps(this.value()));

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
