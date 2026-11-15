import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';

const dict = {
  ar: {
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    noAccount: 'ليس لديك حساب؟',
    haveAccount: 'لديك حساب بالفعل؟',
    greeting: 'أهلاً',
    tagline: 'كل خدماتك. في مكان واحد.',
    categories: 'الأقسام',
    logout: 'تسجيل الخروج',
    requiredFields: 'من فضلك أكمل كل الحقول',
    checkEmail: 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده.',
    sendCode: 'إرسال الكود',
    verifyTitle: 'تأكيد رقم الموبايل',
    codeSentTo: 'أرسلنا كودًا من 6 أرقام إلى',
    code: 'الكود',
    confirm: 'تأكيد',
    resend: 'إعادة إرسال الكود',
    resendIn: 'إعادة الإرسال بعد',
    changeNumber: 'تعديل الرقم',
    invalidPhone: 'رقم الموبايل غير صحيح (مثال: 01012345678)',
    invalidCode: 'أدخل الكود المكوّن من 6 أرقام',
    wrongCode: 'الكود غير صحيح أو انتهت صلاحيته',
    sendFailed: 'تعذر إرسال الكود، حاول مرة أخرى',
    verifying: 'جاري التحقق...',
    verified: 'تم التأكيد',
    noAccountFound: 'لا يوجد حساب بهذا الرقم، أنشئ حسابًا جديدًا',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordTooShort: 'كلمة المرور يجب ألا تقل عن 8 أحرف',
    passwordMismatch: 'كلمتا المرور غير متطابقتين',
    wrongCredentials: 'رقم الموبايل أو كلمة المرور غير صحيحة',
  },
  en: {
    login: 'Log in',
    register: 'Create account',
    email: 'Email',
    password: 'Password',
    fullName: 'Full name',
    phone: 'Phone number',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    greeting: 'Hello',
    tagline: 'All Your Services. One Place.',
    categories: 'Categories',
    logout: 'Log out',
    requiredFields: 'Please fill in all fields',
    checkEmail: 'Account created. Check your email to confirm it.',
    sendCode: 'Send code',
    verifyTitle: 'Verify your phone',
    codeSentTo: 'We sent a 6-digit code to',
    code: 'Code',
    confirm: 'Confirm',
    resend: 'Resend code',
    resendIn: 'Resend in',
    changeNumber: 'Change number',
    invalidPhone: 'Invalid phone number (e.g. 01012345678)',
    invalidCode: 'Enter the 6-digit code',
    wrongCode: 'The code is wrong or has expired',
    sendFailed: 'Could not send the code, please try again',
    verifying: 'Verifying...',
    verified: 'Verified',
    noAccountFound: 'No account found for this number, please create one',
    confirmPassword: 'Confirm password',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordMismatch: 'Passwords do not match',
    wrongCredentials: 'Wrong phone number or password',
  },
};

export type Lang = 'ar' | 'en';
export const lang: Lang = getLocales()[0]?.languageCode === 'en' ? 'en' : 'ar';
export const isRTL = lang === 'ar';

if (I18nManager.isRTL !== isRTL) {
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
}

export const t = (key: keyof typeof dict.ar) => dict[lang][key];

export const tr = (ar: string, en: string) => (lang === 'ar' ? ar : en);
