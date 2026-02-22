import { useEffect } from 'react';
import { useVoice } from '@/features/server/voice/hooks';

const Hotkeys = () => {
  const { toggleMic, toggleSound } = useVoice();

  useEffect(() => {
    const handleEvent = (e: KeyboardEvent) => {

      // only when Ctrl is pressed
      if (!e.ctrlKey) return;

      const key = (e.key || '').toLowerCase();
      const code = e.code || '';

      // ignore when focused on editable elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isEditable =
          target.isContentEditable ||
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT';

        if (isEditable) return;
      }

      // check both key and code (some platforms/browsers differ)
      if (key === 'm' || code === 'KeyM') {
        e.preventDefault();
        try {
          if (toggleMic) void toggleMic();
        } catch (err) {
          console.error('[Hotkeys] toggleMic error', err);
        }
      }

      if (key === 'd' || code === 'KeyD') {
        e.preventDefault();
        try {
          if (toggleSound) void toggleSound();
        } catch (err) {
          console.error('[Hotkeys] toggleSound error', err);
        }
      }
    };

    const opts = { capture: true } as AddEventListenerOptions;

    const onKeyDown = (e: KeyboardEvent) => handleEvent(e);
    const onKeyPress = (e: KeyboardEvent) => handleEvent(e);
    const onKeyUp = (e: KeyboardEvent) => handleEvent(e);

    document.addEventListener('keydown', onKeyDown, opts);
    document.addEventListener('keypress', onKeyPress, opts);
    document.addEventListener('keyup', onKeyUp, opts);
    window.addEventListener('keydown', onKeyDown, opts);

    return () => {
      document.removeEventListener('keydown', onKeyDown, opts);
      document.removeEventListener('keypress', onKeyPress, opts);
      document.removeEventListener('keyup', onKeyUp, opts);
      window.removeEventListener('keydown', onKeyDown, opts);
    };
  }, [toggleMic, toggleSound]);

  return null;
};

export default Hotkeys;
