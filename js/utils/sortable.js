export function makeSortable(container, {
  itemSelector = '[data-id]',
  handleSelector = null,
  onReorder,
} = {}) {
  if (!container) return () => {};
  let pressTimer = null;
  let activeCard = null;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let didDrag = false;

  const cards = () => [...container.querySelectorAll(itemSelector)];

  const cleanupDocument = () => {
    document.removeEventListener('pointermove', onDocumentMove);
    document.removeEventListener('pointerup', onDocumentUp);
    document.removeEventListener('pointercancel', onDocumentUp);
  };

  const beginDrag = (card, event) => {
    if (activeCard) return;
    activeCard = card;
    activePointerId = event.pointerId;
    didDrag = false;
    startX = event.clientX;
    startY = event.clientY;
    card.classList.add('dragging');
    card.style.pointerEvents = 'none';
    document.body.classList.add('sorting');
    event.preventDefault();
  };

  function onDocumentMove(event) {
    if (!activeCard) {
      if (pressTimer && (Math.abs(event.clientX - startX) > 8 || Math.abs(event.clientY - startY) > 8)) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      return;
    }
    event.preventDefault();
    didDrag = true;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const target = under?.closest(itemSelector);
    if (!target || target === activeCard || !container.contains(target)) return;
    const rect = target.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height * 0.55
      || (Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * 0.2
        && event.clientX > rect.left + rect.width / 2);
    container.insertBefore(activeCard, after ? target.nextSibling : target);
  }

  function onDocumentUp() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    cleanupDocument();
    if (!activeCard) return;
    const card = activeCard;
    activeCard = null;
    card.classList.remove('dragging');
    card.style.pointerEvents = '';
    document.body.classList.remove('sorting');
    try { card.releasePointerCapture?.(activePointerId); } catch {}
    if (didDrag) {
      const suppress = event => {
        event.stopPropagation();
        event.preventDefault();
      };
      document.addEventListener('click', suppress, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', suppress, { capture: true }), 400);
      const ids = cards().map(node => node.dataset.id).filter(Boolean);
      onReorder?.(ids);
    }
    didDrag = false;
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const card = event.target.closest(itemSelector);
    if (!card || !container.contains(card)) return;
    if (event.target.closest('button') && !event.target.closest(handleSelector || '__never__')) return;
    startX = event.clientX;
    startY = event.clientY;
    const handle = handleSelector ? event.target.closest(handleSelector) : null;
    cleanupDocument();
    document.addEventListener('pointermove', onDocumentMove, { passive: false });
    document.addEventListener('pointerup', onDocumentUp);
    document.addEventListener('pointercancel', onDocumentUp);
    if (handle) {
      beginDrag(card, event);
      return;
    }
    pressTimer = setTimeout(() => {
      pressTimer = null;
      beginDrag(card, event);
    }, 450);
  }

  container.addEventListener('pointerdown', onPointerDown);
  return () => {
    cleanupDocument();
    if (pressTimer) clearTimeout(pressTimer);
    container.removeEventListener('pointerdown', onPointerDown);
    document.body.classList.remove('sorting');
  };
}
