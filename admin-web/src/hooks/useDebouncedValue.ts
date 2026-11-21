"use client";

import { useEffect, useRef, useState } from "react";

export function useDebouncedValue<T>(
  value: T,
  delayMs = 400,
  onChange?: (nextValue: T) => void,
): T {
  const [debounced, setDebounced] = useState<T>(value);
  const prevRef = useRef<T>(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (Object.is(prevRef.current, value)) {
      return;
    }
    const timer = window.setTimeout(() => {
      prevRef.current = value;
      setDebounced(value);
      onChangeRef.current?.(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
