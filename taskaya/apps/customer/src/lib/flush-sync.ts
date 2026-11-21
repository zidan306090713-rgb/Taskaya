// الموبايل: مفيش flushSync، بننفّذ الكود عادي
export const flushSync = (fn: () => void) => fn();
