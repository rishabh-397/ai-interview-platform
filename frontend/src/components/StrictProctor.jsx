import { useEffect, useRef } from 'react';

export default function StrictProctor({ enabled = true, onViolation }) {
  const lastViolation = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const reportViolation = (type) => {
      const now = Date.now();

      // Prevent one action from generating many violations
      if (now - lastViolation.current < 500) return;

      lastViolation.current = now;

      console.warn('PROCTOR VIOLATION:', type);

      if (onViolation) {
        onViolation(type);
      }
    };

    const blockClipboard = (event) => {
      event.preventDefault();

      const typeMap = {
        copy: 'COPY_ATTEMPT',
        paste: 'PASTE_ATTEMPT',
        cut: 'CUT_ATTEMPT',
      };

      reportViolation(typeMap[event.type] || 'CLIPBOARD_ATTEMPT');
    };

    const blockContextMenu = (event) => {
      event.preventDefault();
      reportViolation('RIGHT_CLICK_ATTEMPT');
    };

    const blockDragDrop = (event) => {
      event.preventDefault();
      reportViolation('DRAG_DROP_ATTEMPT');
    };

    const blockKeyboard = (event) => {
      const key = event.key.toLowerCase();

      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && ['c', 'v', 'x'].includes(key)) {
        event.preventDefault();

        const violations = {
          c: 'COPY_ATTEMPT',
          v: 'PASTE_ATTEMPT',
          x: 'CUT_ATTEMPT',
        };

        reportViolation(violations[key]);
      }

      // Block common browser shortcuts
      if (
        event.ctrlKey &&
        ['u', 's', 'p'].includes(key)
      ) {
        event.preventDefault();
        reportViolation('BROWSER_SHORTCUT_ATTEMPT');
      }

      // F12 / DevTools shortcuts
      if (
        event.key === 'F12' ||
        (event.ctrlKey &&
          event.shiftKey &&
          ['i', 'j', 'c'].includes(key))
      ) {
        event.preventDefault();
        reportViolation('DEVTOOLS_SHORTCUT_ATTEMPT');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('TAB_SWITCH');
      }
    };

    const handleBlur = () => {
      reportViolation('WINDOW_BLUR');
    };

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('copy', blockClipboard, true);
    document.addEventListener('paste', blockClipboard, true);
    document.addEventListener('cut', blockClipboard, true);

    document.addEventListener('contextmenu', blockContextMenu, true);

    document.addEventListener('dragstart', blockDragDrop, true);
    document.addEventListener('drop', blockDragDrop, true);

    document.addEventListener('keydown', blockKeyboard, true);

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    window.addEventListener('blur', handleBlur);

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('copy', blockClipboard, true);
      document.removeEventListener('paste', blockClipboard, true);
      document.removeEventListener('cut', blockClipboard, true);

      document.removeEventListener(
        'contextmenu',
        blockContextMenu,
        true
      );

      document.removeEventListener('dragstart', blockDragDrop, true);
      document.removeEventListener('drop', blockDragDrop, true);

      document.removeEventListener('keydown', blockKeyboard, true);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      window.removeEventListener('blur', handleBlur);

      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [enabled, onViolation]);

  return null;
}
