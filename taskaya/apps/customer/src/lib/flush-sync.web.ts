// الويب: بيطبّق تحديث React فورًا (مطلوب لـ View Transitions عشان المتصفح ميعلقش)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOM = require('react-dom') as { flushSync: (fn: () => void) => void };
export const flushSync = (fn: () => void) => ReactDOM.flushSync(fn);
