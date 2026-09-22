import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

type Guidance =
  | 'idle'
  | 'starting'
  | 'no-camera'
  | 'no-face'
  | 'multiple-faces'
  | 'too-far'
  | 'too-close'
  | 'off-center'
  | 'hold-still'
  | 'ready'
  | 'captured';

const FACE_GUIDANCE_TEXT: Record<Guidance, string> = {
  idle: 'Activa la cámara para tomar tu foto.',
  starting: 'Iniciando cámara…',
  'no-camera': 'No pudimos acceder a la cámara. Revisa los permisos del navegador.',
  'no-face': 'No detectamos tu rostro. Ubícate dentro del óvalo.',
  'multiple-faces': 'Solo debe verse un rostro frente a la cámara.',
  'too-far': 'Acércate un poco más.',
  'too-close': 'Aléjate un poco.',
  'off-center': 'Centra tu rostro dentro del óvalo.',
  'hold-still': 'Perfecto, mantente quieto. Capturando…',
  ready: 'Ubícate dentro del óvalo y toma la foto.',
  captured: '¡Foto capturada!',
};

const DOCUMENT_GUIDANCE_TEXT: Record<Guidance, string> = {
  ...FACE_GUIDANCE_TEXT,
  idle: 'Activa la cámara para fotografiar el documento.',
  ready: 'Encuadra el documento dentro del recuadro y toma la foto.',
};

const STABLE_FRAMES_REQUIRED = 8;
const MIN_FACE_WIDTH_RATIO = 0.28;
const MAX_FACE_WIDTH_RATIO = 0.75;
const MAX_CENTER_OFFSET_X = 0.18;
const MAX_CENTER_OFFSET_Y = 0.2;

// La Shape Detection API es experimental y aun no forma parte de lib.dom.d.ts.
interface DetectedFace {
  readonly boundingBox: DOMRectReadOnly;
}
interface FaceDetectorLike {
  detect: (input: CanvasImageSource) => Promise<DetectedFace[]>;
}
type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;

/**
 * Captura por cámara en vivo, reutilizable para el rostro y para el documento de identidad:
 * - `autoDetect=true` (selfie): guía la posición del rostro en tiempo real con la Shape Detection
 *   API y toma la foto sola cuando está bien encuadrado; sin esa API cae a captura manual.
 * - `autoDetect=false` (documento): solo enciende la cámara trasera y ofrece un botón manual
 *   "Tomar foto", ya que no hay un rostro que guiar.
 */
@Component({
  selector: 'au-camera-capture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="camera-capture">
      @if (!active()) {
        <button type="button" class="au-button au-button--secondary" (click)="start()">
          {{ guidance() === 'captured' ? 'Tomar otra foto' : activateLabel() }}
        </button>
        @if (guidance() === 'no-camera') {
          <p class="hint error" role="alert">{{ text() }}</p>
        }
      } @else {
        <div class="stage">
          <video #video autoplay playsinline muted [class.mirrored]="facingMode() === 'user'"></video>
          <div [class]="autoDetect() ? 'oval-guide' : 'rect-guide'" [class.ok]="guidance() === 'hold-still'"></div>
        </div>
        <p class="hint" role="status">{{ text() }}</p>
        <div class="actions">
          @if (!autoDetect() || !supportsAutoDetection) {
            <button type="button" class="au-button au-button--primary" (click)="capture()">Tomar foto</button>
          }
          <button type="button" class="au-button au-button--ghost" (click)="stop()">Cancelar</button>
        </div>
      }
      <canvas #canvas hidden></canvas>
    </div>
  `,
  styles: `
    .camera-capture { display: grid; gap: .5rem; justify-items: center; }
    .stage { position: relative; width: 100%; max-width: 22rem; aspect-ratio: 4 / 3; border-radius: var(--au-radius-md, .5rem); overflow: hidden; background: #111; }
    video { width: 100%; height: 100%; object-fit: cover; }
    video.mirrored { transform: scaleX(-1); }
    .oval-guide { position: absolute; inset: 10% 28%; border: 3px solid rgba(255, 255, 255, .75); border-radius: 50%; transition: border-color .2s ease; }
    .rect-guide { position: absolute; inset: 12% 8%; border: 3px dashed rgba(255, 255, 255, .75); border-radius: var(--au-radius-sm, .25rem); transition: border-color .2s ease; }
    .oval-guide.ok, .rect-guide.ok { border-color: var(--au-success, #216e39); }
    .hint { margin: 0; font-size: .9rem; text-align: center; }
    .hint.error { color: var(--au-critical, #b3261e); }
    .actions { display: flex; gap: .5rem; }
    canvas { display: none; }
  `,
})
export class CameraCapture {
  private readonly injector = inject(Injector);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  /** Cámara frontal ('user', para el rostro) o trasera ('environment', para el documento). */
  readonly facingMode = input<'user' | 'environment'>('user');
  /** Si aplica guiado y auto-captura por posición de rostro (solo tiene sentido para selfies). */
  readonly autoDetect = input(false);
  readonly activateLabel = input('Activar cámara');
  /** Nombre base del archivo emitido, p. ej. "selfie" o "documento-frente". */
  readonly fileNamePrefix = input('captura');

  protected readonly active = signal(false);
  protected readonly guidance = signal<Guidance>('idle');
  protected readonly supportsAutoDetection =
    typeof (globalThis as { FaceDetector?: FaceDetectorCtor }).FaceDetector !== 'undefined';

  readonly captured = output<File>();

  private stream: MediaStream | null = null;
  private detector: FaceDetectorLike | null = null;
  private stableFrames = 0;
  private loopHandle: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected text(): string {
    const dictionary = this.autoDetect() ? FACE_GUIDANCE_TEXT : DOCUMENT_GUIDANCE_TEXT;
    return dictionary[this.guidance()];
  }

  protected async start(): Promise<void> {
    this.guidance.set('starting');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode(), width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch {
      this.guidance.set('no-camera');
      return;
    }
    this.active.set(true);
    afterNextRender(
      () => {
        const videoElement = this.video()?.nativeElement;
        if (!videoElement) return;
        videoElement.srcObject = this.stream;
        void videoElement.play();
        if (this.autoDetect() && this.supportsAutoDetection) {
          const FaceDetectorImpl = (globalThis as { FaceDetector?: FaceDetectorCtor }).FaceDetector!;
          this.detector = new FaceDetectorImpl({ fastMode: true, maxDetectedFaces: 2 });
          this.stableFrames = 0;
          this.loop();
        } else {
          this.guidance.set('ready');
        }
      },
      { injector: this.injector },
    );
  }

  protected stop(): void {
    if (this.loopHandle !== null) {
      cancelAnimationFrame(this.loopHandle);
      this.loopHandle = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.detector = null;
    this.active.set(false);
    if (this.guidance() !== 'captured') this.guidance.set('idle');
  }

  private loop = (): void => {
    if (!this.active()) return;
    this.evaluateFrame().finally(() => {
      if (this.active()) this.loopHandle = requestAnimationFrame(this.loop);
    });
  };

  private async evaluateFrame(): Promise<void> {
    const videoElement = this.video()?.nativeElement;
    if (!videoElement || !this.detector || videoElement.readyState < 2) return;
    let faces: DetectedFace[];
    try {
      faces = await this.detector.detect(videoElement);
    } catch {
      return;
    }
    if (!this.active()) return;
    if (faces.length === 0) {
      this.guidance.set('no-face');
      this.stableFrames = 0;
      return;
    }
    if (faces.length > 1) {
      this.guidance.set('multiple-faces');
      this.stableFrames = 0;
      return;
    }
    const box = faces[0].boundingBox;
    const videoWidth = videoElement.videoWidth || 1;
    const videoHeight = videoElement.videoHeight || 1;
    const widthRatio = box.width / videoWidth;
    const centerX = (box.x + box.width / 2) / videoWidth;
    const centerY = (box.y + box.height / 2) / videoHeight;

    if (widthRatio < MIN_FACE_WIDTH_RATIO) {
      this.guidance.set('too-far');
      this.stableFrames = 0;
      return;
    }
    if (widthRatio > MAX_FACE_WIDTH_RATIO) {
      this.guidance.set('too-close');
      this.stableFrames = 0;
      return;
    }
    if (Math.abs(centerX - 0.5) > MAX_CENTER_OFFSET_X || Math.abs(centerY - 0.5) > MAX_CENTER_OFFSET_Y) {
      this.guidance.set('off-center');
      this.stableFrames = 0;
      return;
    }
    this.guidance.set('hold-still');
    this.stableFrames++;
    if (this.stableFrames >= STABLE_FRAMES_REQUIRED) this.capture();
  }

  protected capture(): void {
    const videoElement = this.video()?.nativeElement;
    if (!videoElement || !videoElement.videoWidth) return;
    const canvasElement = this.canvas().nativeElement;
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    const context = canvasElement.getContext('2d');
    if (!context) return;
    context.drawImage(videoElement, 0, 0);
    canvasElement.toBlob(
      (blob) => {
        if (!blob) return;
        this.guidance.set('captured');
        this.stop();
        this.captured.emit(new File([blob], `${this.fileNamePrefix()}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  }
}
