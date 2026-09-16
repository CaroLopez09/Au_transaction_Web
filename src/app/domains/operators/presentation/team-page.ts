import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SessionStore } from '../../../core/auth/session.store';
import { UserFacingError } from '../../../core/http/error-mapping';
import { roleLabel } from '../../../core/permissions/role';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { Drawer } from '../../../shared/ui/drawer';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { fetchRemote, loading, RemoteData, runAction } from '../../../shared/utilities/remote-data';
import {
  ASSIGNABLE_ROLES,
  AssignableRole,
  MIN_PASSWORD_LENGTH,
  Operator,
  OperatorRepository,
} from '../domain/operator';

/**
 * Equipo de la empresa: quién puede entrar al portal y con qué rol (G-13).
 *
 * Hasta ahora los operadores solo existían por semilla o por SQL, así que los datos que el BFF
 * pide para crearlos no tenían dónde escribirse. La baja suspende la cuenta: quien firmó un pago
 * sigue siendo su autor y no puede desaparecer del historial.
 */
@Component({
  selector: 'au-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, Drawer, ConfirmDialog, ReactiveFormsModule],
  templateUrl: './team-page.html',
  styleUrl: './team-page.css',
})
export class TeamPage implements OnInit {
  private readonly repository = inject(OperatorRepository);
  private readonly session = inject(SessionStore);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly roles = ASSIGNABLE_ROLES;
  protected readonly minPassword = MIN_PASSWORD_LENGTH;
  protected readonly canManage = computed(() => this.session.can('operators.manage'));
  protected readonly rows = signal<RemoteData<readonly Operator[]>>(loading());

  protected readonly drawerOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<UserFacingError | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly toSuspend = signal<Operator | null>(null);
  protected readonly suspending = signal(false);
  protected readonly actionError = signal<UserFacingError | null>(null);

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH), Validators.maxLength(100)]],
    role: ['TREASURY_MAKER' as AssignableRole, Validators.required],
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.rows.set(loading());
    this.rows.set(await fetchRemote(this.repository.list()));
  }

  protected label(role: Operator['role'], fallback: string | null): string {
    return role ? roleLabel(role) : (fallback ?? 'Rol no reconocido');
  }

  protected startCreating(): void {
    this.form.reset({ firstName: '', lastName: '', email: '', password: '', role: 'TREASURY_MAKER' });
    this.createError.set(null);
    this.notice.set(null);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (!this.creating()) {
      this.drawerOpen.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    const result = await runAction(this.repository.create(this.form.getRawValue()));
    this.creating.set(false);
    if (!result.ok) {
      this.createError.set(result.error);
      return;
    }
    this.drawerOpen.set(false);
    // La contraseña no vuelve a mostrarse: quien la creó se la entrega a la persona.
    this.notice.set(`${result.value.fullName} ya puede ingresar con ${result.value.email}.`);
    await this.load();
  }

  protected async confirmSuspension(): Promise<void> {
    const target = this.toSuspend();
    if (!target) {
      return;
    }
    this.suspending.set(true);
    this.actionError.set(null);
    const result = await runAction(this.repository.suspend(target.id));
    this.suspending.set(false);
    this.toSuspend.set(null);
    if (!result.ok) {
      this.actionError.set(result.error);
      return;
    }
    this.notice.set(`${target.fullName} ya no puede ingresar.`);
    await this.load();
  }

  /** Nadie se desactiva a sí mismo: el BFF lo rechaza y la UI no ofrece el botón. */
  protected isMe(operator: Operator): boolean {
    return operator.id === this.session.operator()?.userId;
  }

  protected invalid(control: 'firstName' | 'lastName' | 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && field.touched;
  }
}
