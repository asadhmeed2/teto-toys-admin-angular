import { signal } from '@angular/core';
import { FormArray, FormControl } from '@angular/forms';

/**
 * Reordering for a FormArray of image URLs.
 *
 * Image order is not stored separately anywhere — `products.image_urls` is a JSON
 * array and its element order IS the display order, with index 0 used as the
 * thumbnail across the storefront. So reordering is purely a matter of moving
 * controls within the FormArray; nothing else has to change.
 *
 * Uses native HTML5 drag events rather than Angular CDK to avoid the dependency.
 * Native drag doesn't fire on touch devices, which is exactly why the up/down
 * methods exist — they're the accessible, touch-friendly path, not a nicety.
 *
 * Usage:
 *   protected readonly imageOrder = new ImageListReorder(() => this.imageUrlsArray);
 */
export class ImageListReorder {
  /** Index currently being dragged, or null. Drives the drag styling. */
  readonly draggingIndex = signal<number | null>(null);

  /** Index currently hovered as a drop target, for the insertion indicator. */
  readonly dropTargetIndex = signal<number | null>(null);

  constructor(private readonly getArray: () => FormArray<FormControl<string>>) {}

  /**
   * Moves a control, preserving the control instance so its value, validators and
   * dirty state travel with it — rebuilding from values would lose all of that.
   */
  move(from: number, to: number): void {
    const array = this.getArray();
    if (from === to) return;
    if (from < 0 || to < 0 || from >= array.length || to >= array.length) return;

    const control = array.at(from);
    array.removeAt(from);
    array.insert(to, control);
    array.markAsDirty();
  }

  moveUp(index: number): void {
    this.move(index, index - 1);
  }

  moveDown(index: number): void {
    this.move(index, index + 1);
  }

  isFirst(index: number): boolean {
    return index === 0;
  }

  isLast(index: number): boolean {
    return index === this.getArray().length - 1;
  }

  // ── Native drag and drop ──────────────────────────────────────────────────

  onDragStart(event: DragEvent, index: number): void {
    this.draggingIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Firefox ignores drags unless some data is set.
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    // Without preventDefault the browser refuses the drop entirely.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTargetIndex.set(index);
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    const from = this.draggingIndex();
    if (from !== null) this.move(from, index);
    this.reset();
  }

  onDragEnd(): void {
    this.reset();
  }

  private reset(): void {
    this.draggingIndex.set(null);
    this.dropTargetIndex.set(null);
  }
}
