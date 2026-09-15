import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Confirmación de una acción sensible o irreversible (DESIGN.md > Diálogos).
 * <dialog> modal centrado; el contenido explica los datos reales afectados.
 */
@Component({
  selector: 'au-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="bodyId"
      (cancel)="onCancel($event)"
      (close)="restoreFocus()"
    >
      <h2 [id]="titleId">{{ heading() }}</h2>
      <div class="body" [id]="bodyId"><ng-content /></div>
      <div class="actions">
        <button type="button" class="au-button au-button--secondary" [disabled]="busy()" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button
          type="button"
          class="au-button"
          [class.au-button--critical]="tone() === 'critical'"
          [class.au-button--primary]="tone() === 'primary'"
          [disabled]="busy() || confirmDisabled()"
          [attr.aria-busy]="busy()"
          (click)="confirmed.emit()"
        >
          {{ busy() ? busyLabel() : confirmLabel() }}
        </button>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(460px, calc(100vw - 32px));
      padding: var(--au-space-6);
      border: 0;
      border-radius: var(--au-radius-md);
      background: var(--au-canvas);
      color: var(--au-text-body);
      box-shadow: var(--au-shadow-2);
    }
    dialog[open] {
      animation: rise var(--au-dur-base) var(--au-ease-out);
    }
    dialog::backdrop {
      background: var(--au-backdrop);
      backdrop-filter: blur(2px);
    }
    h2 {
      font-size: var(--au-fs-section);
      line-height: 1.3;
    }
    .body {
      margin: var(--au-space-3) 0 var(--au-space-6);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--au-space-2);
    }
    @keyframes rise {
      from {
        transform: translateY(8px);
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      dialog[open] {
        animation: none;
      }
    }
  `,
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly busyLabel = input('Procesando…');
  readonly tone = input<'critical' | 'primary'>('critical');
  readonly busy = input(false);
  readonly confirmDisabled = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private static nextId = 0;
  protected readonly titleId = `au-confirm-title-${ConfirmDialog.nextId}`;
  protected readonly bodyId = `au-confirm-body-${ConfirmDialog.nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly injector = inject(Injector);
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.restoreFocus());
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.open() && !element.open) {
        this.returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        element.showModal();
        afterNextRender(
          () =>
            element
              .querySelector<HTMLElement>('.body input, .body textarea, .body select, .actions .au-button--secondary')
              ?.focus(),
          { injector: this.injector },
        );
      } else if (!this.open() && element.open) {
        element.close();
      }
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }

  protected restoreFocus(): void {
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    if (target?.isConnected) {
      setTimeout(() => target.focus());
    }
  }
}
