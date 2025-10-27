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

    // Added keys commonly used in Home/CTA/footer
    no_medical_advice: "Educational – not medical advice",
    privacy_first: "Privacy-first",
    multilang: "English • العربية • עברית",
    today: "Today",
    next_med: "Next med",
    last_glucose: "Last glucose",
    streak: "Streak",
    days: "days",
    on_time: "on-time",
    cta_title: "Ready to try GlucoMate?",
    cta_sub: "It takes less than a minute to start. No card required.",
    cta_create_free: "Create free account",
    cta_open_demo: "Open demo",

    // Register/Login helper
    have_account: "Already have an account?",
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

    // Added
    no_medical_advice: "לימודי — לא ייעוץ רפואי",
    privacy_first: "פרטיות קודמת לכל",
    multilang: "English • العربية • עברית",
    today: "היום",
    next_med: "תרופה הבאה",
    last_glucose: "גלוקוז אחרון",
    streak: "רצף",
    days: "ימים",
    on_time: "בזמן",
    cta_title: "מוכן לנסות את GlucoMate?",
    cta_sub: "לוקח פחות מדקה להתחיל. ללא צורך בכרטיס.",
    cta_create_free: "צרו חשבון חינם",
    cta_open_demo: "פתחו דמו",

    have_account: "כבר יש לך חשבון?",
  },

  ar: {
    brand: "GlucoMate",
    home_title: "إدارة السكري بسهولة.",
    home_sub: "تتبع الغلوكوز و A1C والأدوية والضغط. تذكيرات ونصائح بسيطة.",
    get_started: "ابدأ الآن",
    demo: "تجربة مباشرة",
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
    chart_title: "منحنى الغلوكوز (آخر 14 يومًا)",
    welcome: "أهلًا بك",
    lang: "اللغة",

    // Added
    no_medical_advice: "للتعليم فقط — ليس نصيحة طبية",
    privacy_first: "الخصوصية أولًا",
    multilang: "English • العربية • עברית",
    today: "اليوم",
    next_med: "الدواء التالي",
    last_glucose: "آخر قراءة غلوكوز",
    streak: "سلسلة",
    days: "أيام",
    on_time: "في الوقت",
    cta_title: "جاهز لتجربة GlucoMate؟",
    cta_sub: "أقل من دقيقة للبدء. لا حاجة لبطاقة.",
    cta_create_free: "أنشئ حسابًا مجانيًا",
    cta_open_demo: "افتح العرض التجريبي",

    have_account: "لديك حساب بالفعل؟",
  },
};

const I18nCtx = createContext();

export function I18nProvider({ children }) {
  // default = English; persist if you want
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  useEffect(() => {
    const rtl = lang === "he" || lang === "ar";
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    localStorage.setItem("lang", lang);
  }, [lang]);

  // t(key, def?) → current lang → English → def → key
  const t = useMemo(() => {
    return (k, def) =>
      (dict[lang] && dict[lang][k]) ??
      (dict.en && dict.en[k]) ??
      def ??
      k;
  }, [lang]);

  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nCtx.Provider>
  );
}

export const useI18n = () => useContext(I18nCtx);
