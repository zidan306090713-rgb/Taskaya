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
