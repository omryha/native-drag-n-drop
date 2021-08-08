import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, Inject, AfterViewInit, ContentChild, Input, OnDestroy } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import * as RxOperators from 'rxjs/operators';
import { FreeDraggingHandleDirective } from './free-dragging-handle.directive';

@Directive({
  selector: '[appFreeDragging]'
})
export class FreeDraggingDirective implements AfterViewInit, OnDestroy {
  private element: HTMLElement;
  private subscriptions: Subscription[] = [];
  private readonly DEFAULT_DRAGGING_BOUNDARY_QUERY = "body";
  @Input() boundaryQuery = this.DEFAULT_DRAGGING_BOUNDARY_QUERY;
  draggingBoundaryElement: HTMLElement | HTMLBodyElement;

  @ContentChild(FreeDraggingHandleDirective) handle: FreeDraggingHandleDirective;
  handleElement: HTMLElement;

  constructor(private elementRef: ElementRef, @Inject(DOCUMENT) private document: any) {
    this.element = this.elementRef.nativeElement as HTMLElement;
  }

  ngAfterViewInit(): void {
    this.draggingBoundaryElement = (this.document as Document).querySelector(this.boundaryQuery);

    if (!this.draggingBoundaryElement) {
      throw new Error('Could not find any element with query: ' + this.boundaryQuery);
    } else {
      this.element = this.elementRef.nativeElement as HTMLElement;
      this.handleElement = this?.elementRef?.nativeElement || this.element;
      this.initDrag();
    }
  }

  initDrag(): void {
    const dragStart$ = fromEvent<MouseEvent>(this.handleElement, "mousedown");
    const dragEnd$ = fromEvent<MouseEvent>(this.document, "mouseup");
    const drag$ = fromEvent<MouseEvent>(this.document, "mousemove").pipe(
      RxOperators.takeUntil(dragEnd$)
    );

    let initialX: number,
      initialY: number,
      currentX = 0,
      currentY = 0;

    let dragSub: Subscription;

    const minBoundX = this.draggingBoundaryElement.offsetLeft;
    const minBoundY = this.draggingBoundaryElement.offsetTop;

    const maxBoundX =
      minBoundX +
      this.draggingBoundaryElement.offsetWidth -
      this.element.offsetWidth;
    const maxBoundY =
      minBoundY +
      this.draggingBoundaryElement.offsetHeight -
      this.element.offsetHeight;

    const dragStartSub = dragStart$.subscribe((event: MouseEvent) => {
      initialX = event.clientX - currentX;
      initialY = event.clientY - currentY;
      this.element.classList.add("free-dragging");

      dragSub = drag$.subscribe((event: MouseEvent) => {
        event.preventDefault();

        const x = event.clientX - initialX;
        const y = event.clientY - initialY;

        currentX = Math.max(minBoundX, Math.min(x, maxBoundX));
        currentY = Math.max(minBoundY, Math.min(y, maxBoundY));

        this.element.style.transform =
          "translate3d(" + currentX + "px, " + currentY + "px, 0)";
      });
    });

    const dragEndSub = dragEnd$.subscribe(() => {
      initialX = currentX;
      initialY = currentY;
      this.element.classList.remove("free-dragging");
      if (dragSub) {
        dragSub.unsubscribe();
      }
    });

    this.subscriptions.push.apply(this.subscriptions, [
      dragStartSub,
      dragSub,
      dragEndSub,
    ]);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s?.unsubscribe());
  }

}

