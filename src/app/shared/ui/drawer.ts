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
import { Icon } from './icon';

/**
 * Panel lateral para editar o ver una entidad sin perder el listado (DESIGN.md > Drawers).
 * Usa <dialog> modal: el fondo queda inerte, el foco no escapa, Esc cierra y el foco vuelve al disparador.
 */
@Component({
  selector: 'au-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <dialog #dialog [attr.aria-labelledby]="titleId" (cancel)="onCancel($event)" (close)="onNativeClose()">
      <header>
        <h2 [id]="titleId">{{ heading() }}</h2>
        <button type="button" class="close" [disabled]="busy()" (click)="closeRequested.emit()">
          <au-icon name="close" [size]="20" />
          <span class="au-visually-hidden">Cerrar</span>
        </button>
      </header>
      <div class="body">
        <ng-content />
      </div>
      <footer><ng-content select="[drawerFooter]" /></footer>
    </dialog>
  `,
  styles: `
    dialog {
      position: fixed;
      inset: 0 0 0 auto;
      width: min(480px, 100vw);
      max-width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: var(--au-radius-md) 0 0 var(--au-radius-md);
      background: var(--au-canvas);
      color: var(--au-text-body);
      box-shadow: var(--au-shadow-2);
      flex-direction: column;
    }
    dialog[open] {
      display: flex;
      animation: slide-in var(--au-dur-slow) var(--au-ease-out);
    }
    dialog::backdrop {
      background: var(--au-backdrop);
      backdrop-filter: blur(2px);
      animation: fade-in var(--au-dur-slow) var(--au-ease-out);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--au-space-4);
      padding: var(--au-space-5) var(--au-space-4) var(--au-space-4) var(--au-space-6);
      border-bottom: 1px solid var(--au-hairline);
    }
    h2 {
      font-size: var(--au-fs-section);
      line-height: 1.3;
    }
    .close {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      flex: none;
      border: 0;
      border-radius: var(--au-radius-sm);
      background: transparent;
      color: var(--au-text-body);
      cursor: pointer;
    }
    .close:hover:not(:disabled) {
      background: var(--au-surface-sunken);
    }
    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--au-space-6);
      overscroll-behavior: contain;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--au-space-2);
      padding: var(--au-space-4) var(--au-space-6);
      border-top: 1px solid var(--au-hairline);
      background: var(--au-canvas);
    }
    footer:empty {
      display: none;
    }
    @keyframes slide-in {
      from {
        transform: translateX(24px);
        opacity: 0;
      }
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
    @media (max-width: 639px) {
      dialog {
        width: 100vw;
        border-radius: 0;
      }
      .body {
        padding: var(--au-space-5) var(--au-space-4);
      }
      footer {
        padding: var(--au-space-3) var(--au-space-4);
      }
      footer > * {
        flex: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      dialog[open],
      dialog::backdrop {
        animation: none;
      }
    }
  `,
})
export class Drawer {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  /** Mientras hay una operación en curso no se puede cerrar (evita perder el resultado). */
  readonly busy = input(false);
  readonly closeRequested = output<void>();

  private static nextId = 0;
  protected readonly titleId = `au-drawer-title-${Drawer.nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private returnFocusTo: HTMLElement | null = null;
  private readonly injector = inject(Injector);

  constructor() {
    // Quien lo abre suele cerrarlo quitándolo del DOM (@if): no llega el evento `close` del <dialog>.
    inject(DestroyRef).onDestroy(() => this.restoreFocus());
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.open() && !element.open) {
        this.returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        element.showModal();
        afterNextRender(() => this.focusFirstField(element), { injector: this.injector });
      } else if (!this.open() && element.open) {
        element.close();
      }
    });
  }

  /** El foco empieza en el primer campo editable, no en el botón de cerrar. */
  private focusFirstField(element: HTMLDialogElement): void {
    element
      .querySelector<HTMLElement>(
        '.body input:not([disabled]):not([type="hidden"]), .body select:not([disabled]), .body textarea:not([disabled])',
      )
      ?.focus();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) {
      this.closeRequested.emit();
    }
  }

  protected onNativeClose(): void {
    this.restoreFocus();
  }

  private restoreFocus(): void {
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    if (target?.isConnected) {
      // Tras desmontar el diálogo el navegador mueve el foco a <body>; se devuelve en la siguiente tarea.
      setTimeout(() => target.focus());
    }
  }
}
