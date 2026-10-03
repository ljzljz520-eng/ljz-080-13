import { useEffect, useRef } from 'react';

/** 定时轮询，页面隐藏时暂停 */
export function usePolling(fn: () => void, intervalMs: number) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  });

  useEffect(() => {
    const run = () => {
      if (!document.hidden) saved.current();
    };
    run();
    const timer = setInterval(run, intervalMs);
    const onVisible = () => {
      if (!document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
}
