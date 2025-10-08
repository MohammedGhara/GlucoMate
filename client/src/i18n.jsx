import { createContext, useContext, useEffect, useMemo, useState } from "react";

const dict = {
  en: {
    brand: "GlucoMate",
    home_title: "Manage diabetes, simply.",
    home_sub: "Track glucose, A1C, meds and blood pressure. Get reminders and clear guidance.",
    get_started: "Get Started",
    demo: "Live Demo",
    nav_home: "Home",
    nav_dashboard: "Dashboard",
    nav_readings: "Readings",
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    email: "Email",
    password: "Password",
    name: "Full name",
    submit: "Submit",
    add_reading: "Add Reading",
    glucose: "Glucose (mg/dL)",
    a1c: "A1C (%)",
    weight: "Weight (kg)",
    systolic: "Systolic",
    diastolic: "Diastolic",
    save: "Save",
    chart_title: "Glucose (last 14 days)",
    welcome: "Welcome",
    lang: "Language",
  },
  he: {
    brand: "GlucoMate",
    home_title: "ניהול סוכרת — פשוט.",
    home_sub: "עקוב אחרי גלוקוז, A1C, תרופות ולחץ דם. קבל תזכורות והכוונה ברורה.",
    get_started: "התחלה מהירה",
    demo: "דמו חי",
    nav_home: "ראשי",
    nav_dashboard: "לוח בקרה",
    nav_readings: "מדידות",
    login: "התחברות",
    signup: "הרשמה",
    logout: "התנתקות",
    email: "אימייל",
    password: "סיסמה",
    name: "שם מלא",
    submit: "שליחה",
    add_reading: "הוספת מדידה",
    glucose: "גלוקוז (mg/dL)",
    a1c: "A1C (%)",
    weight: "משקל (ק״ג)",
    systolic: "סיסטולי",
    diastolic: "דיאסטולי",
    save: "שמור",
    chart_title: "גרף גלוקוז (14 ימים)",
    welcome: "ברוך הבא",
    lang: "שפה",
  },
  ar: {
    brand: "GlucoMate",
    home_title: "إدارة السكري بسهولة.",
    home_sub: "تتبع الغلوكوز و A1C والأدوية والضغط. تذكيرات ونصائح بسيطة.",
    get_started: "ابدأ الآن",
    demo: "تجربة",
    nav_home: "الرئيسية",
    nav_dashboard: "لوحة التحكم",
    nav_readings: "القياسات",
    login: "تسجيل الدخول",
    signup: "إنشاء حساب",
    logout: "تسجيل الخروج",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم الكامل",
    submit: "إرسال",
    add_reading: "إضافة قياس",
    glucose: "غلوكوز (mg/dL)",
    a1c: "A1C (%)",
    weight: "الوزن (كغ)",
    systolic: "انقباضي",
    diastolic: "انبساطي",
    save: "حفظ",
    chart_title: "منحنى الغلوكوز (14 يومًا)",
    welcome: "أهلًا بك",
    lang: "اللغة",
  },
};

const I18nCtx = createContext();

export function I18nProvider({ children }) {
  // default = English
  const [lang, setLang] = useState("en");

  // auto-switch document direction (ltr/en, rtl/he+ar)
  useEffect(() => {
    const rtl = lang === "he" || lang === "ar";
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useMemo(() => (k) => dict[lang][k] ?? k, [lang]);

  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nCtx.Provider>
  );
}

export const useI18n = () => useContext(I18nCtx);
