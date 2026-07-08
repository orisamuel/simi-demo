/* ============================================================
   סימי — נתוני דמו
   כל הנתונים מדומים. תאריכים מחושבים יחסית להיום כדי שהדמו
   תמיד ייראה חי.
   ============================================================ */
window.S = window.S || {};

(function () {
  const ago = (days, h = 0) => new Date(Date.now() - days * 864e5 - h * 36e5).toISOString();
  const inDays = (days) => new Date(Date.now() + days * 864e5).toISOString();

  /* ---------- תפקידים ---------- */
  S.ROLES = {
    partner:         { name: 'שותף/ה' },
    vpCreative:      { name: 'סמנכ"ל קריאייטיב' },
    creativeManager: { name: 'ניהול קריאייטיב' },
    studioManager:   { name: 'ניהול סטודיו' },
    videoManager:    { name: 'ניהול וידאו' },
    accountLead:     { name: 'ניהול מחלקת לקוחות' },
    accountManager:  { name: 'ניהול לקוח' },
    copywriter:      { name: 'קופירייטינג', dept: 'copy' },
    designer:        { name: 'עיצוב', dept: 'design' },
    videoEditor:     { name: 'וידאו', dept: 'video' },
    media:           { name: 'מדיה', dept: 'media' },
  };

  S.DEPTS = {
    copy:   { name: 'קופי',   icon: 'file-text' },
    design: { name: 'עיצוב',  icon: 'image' },
    video:  { name: 'וידאו',  icon: 'video' },
    media:  { name: 'מדיה',   icon: 'megaphone' },
  };

  /* שלבי אישור — לפי סדר קאנוני (מהקרוב לעבודה ועד השותף) */
  S.SLOTS = {
    studio:  { name: 'אישור סטודיו',    order: 1 },
    video:   { name: 'אישור וידאו',     order: 2 },
    creative:{ name: 'אישור קריאייטיב', order: 3 },
    partner: { name: 'אישור שותף/ה',    order: 4 },
  };

  /* ---------- Seed ---------- */
  S.seed = function () {
    const users = [
      { id: 'u_yael',  name: 'יעל ברק',     roles: ['partner'],                        isAdmin: true,  canAssign: true,  substituteId: null, color: '#5b3aa0' },
      { id: 'u_asaf',  name: 'אסף מזרחי',   roles: ['partner'],                        isAdmin: true,  canAssign: true,  substituteId: null, color: '#0f6f85' },
      { id: 'u_noa',   name: 'נועה פרידמן', roles: ['vpCreative'],                     isAdmin: true,  canAssign: true,  substituteId: null, color: '#b0483a' },
      { id: 'u_omer',  name: 'עומר שגב',    roles: ['creativeManager', 'copywriter'],  isAdmin: false, canAssign: true,  substituteId: null, color: '#2b5fd9' },
      { id: 'u_dana',  name: 'דנה לוי',     roles: ['creativeManager'],                isAdmin: false, canAssign: true,  substituteId: null, color: '#7d4cc9' },
      { id: 'u_roi',   name: 'רועי כהן',    roles: ['studioManager', 'designer'],      isAdmin: false, canAssign: true,  substituteId: null, color: '#c05a10' },
      { id: 'u_shira', name: 'שירה אלון',   roles: ['videoManager'],                   isAdmin: false, canAssign: true,  substituteId: null, color: '#0f8577' },
      { id: 'u_itay',  name: 'איתי רוזן',   roles: ['copywriter'],                     isAdmin: false, canAssign: false, substituteId: null, color: '#4a6584' },
      { id: 'u_michal',name: 'מיכל אדר',    roles: ['copywriter'],                     isAdmin: false, canAssign: false, substituteId: null, color: '#a34a78' },
      { id: 'u_tamar', name: 'תמר גולן',    roles: ['designer'],                       isAdmin: false, canAssign: false, substituteId: null, color: '#2f8a4c' },
      { id: 'u_yoni',  name: 'יונתן פרץ',   roles: ['designer'],                       isAdmin: false, canAssign: false, substituteId: null, color: '#8a6d00' },
      { id: 'u_eden',  name: 'עדן ברזילי',  roles: ['videoEditor'],                    isAdmin: false, canAssign: false, substituteId: null, color: '#c92a2f' },
      { id: 'u_lior',  name: 'ליאור אזולאי',roles: ['media'],                          isAdmin: false, canAssign: false, substituteId: null, color: '#6d6a60' },
      { id: 'u_hila',  name: 'הילה שטרן',   roles: ['accountManager'],                 isAdmin: false, canAssign: false, substituteId: null, color: '#d1568f' },
      { id: 'u_guy',   name: 'גיא נחום',    roles: ['accountManager'],                 isAdmin: false, canAssign: false, substituteId: null, color: '#3d7a3d' },
      { id: 'u_alon',  name: 'אלון דגן',    roles: ['accountLead', 'accountManager'],  isAdmin: true,  canAssign: true,  substituteId: null, color: '#16150f' },
    ];

    const clients = [
      { id: 'c_migdal',   name: 'מגדל ביטוח',    creativeManagerId: 'u_omer', partnerId: 'u_yael', accountManagerId: 'u_hila', isNew: false },
      { id: 'c_hasalat',  name: 'חסלט',          creativeManagerId: 'u_dana', partnerId: 'u_asaf', accountManagerId: 'u_guy',  isNew: false },
      { id: 'c_dizengof', name: 'דיזנגוף סנטר',  creativeManagerId: 'u_omer', partnerId: 'u_asaf', accountManagerId: 'u_hila', isNew: false },
      { id: 'c_shikun',   name: 'שיכון ובינוי',  creativeManagerId: 'u_dana', partnerId: 'u_yael', accountManagerId: 'u_guy',  isNew: false },
      { id: 'c_almog',    name: 'אלמוג נדל"ן',   creativeManagerId: 'u_dana', partnerId: 'u_yael', accountManagerId: 'u_hila', isNew: true },
    ];

    const projects = [
      { id: 'p1', name: 'השקת האפליקציה', clientId: 'c_migdal' },
      { id: 'p2', name: 'קמפיין החורף',   clientId: 'c_hasalat' },
    ];

    /* מסלול בסיס לכל תת־סוג: w:<מחלקה> | a:<שלב אישור> | acct */
    const types = [
      {
        id: 't_deck', name: 'מצגת', icon: 'presentation', primary: 'creative',
        subs: [
          /* התוכן עובר אישור קריאייטיב לפני שממשיכים לעיצוב */
          { id: 's_deck_strategy', name: 'מצגת אסטרטגיה', route: ['w:copy', 'a:creative', 'w:design', 'a:creative', 'a:partner', 'acct'] },
          { id: 's_deck_sales',    name: 'מצגת מכירות',   route: ['w:copy', 'a:creative', 'w:design', 'a:creative', 'a:partner', 'acct'] },
          { id: 's_deck_update',   name: 'עדכון שקפים',   route: ['w:design', 'a:creative', 'acct'] },
        ],
      },
      {
        id: 't_design', name: 'עיצוב', icon: 'image', primary: 'studio',
        subs: [
          { id: 's_social_post',     name: 'פוסט סושיאל',  route: ['w:design', 'a:studio', 'acct'] },
          { id: 's_campaign_banner', name: 'באנר קמפיין',  route: ['w:design', 'a:studio', 'a:creative', 'acct'] },
          { id: 's_brand_lang',      name: 'שפה גרפית',    route: ['w:design', 'a:studio', 'a:creative', 'a:partner', 'acct'] },
        ],
      },
      {
        id: 't_copy', name: 'קופי', icon: 'file-text', primary: 'creative',
        subs: [
          { id: 's_post_copy', name: 'קופי לפוסט',     route: ['w:copy', 'a:creative', 'acct'] },
          { id: 's_script',    name: 'תסריט',          route: ['w:copy', 'a:creative', 'a:partner', 'acct'] },
          { id: 's_naming',    name: 'סלוגן / ניימינג', route: ['w:copy', 'a:creative', 'a:partner', 'acct'] },
        ],
      },
      {
        id: 't_video', name: 'וידאו', icon: 'video', primary: 'video',
        subs: [
          { id: 's_edited',  name: 'סרטון ערוך',       route: ['w:video', 'a:video', 'a:creative', 'a:partner', 'acct'] },
          { id: 's_runtext', name: 'טקסט רץ לסרטון',   route: ['w:video', 'a:video', 'a:creative', 'a:partner', 'acct'] },
          { id: 's_reel',    name: 'ריל',              route: ['w:video', 'a:video', 'a:creative', 'acct'] },
        ],
      },
      {
        id: 't_media', name: 'מדיה', icon: 'megaphone', primary: 'partner',
        subs: [
          { id: 's_media_plan',  name: 'תוכנית מדיה',  route: ['w:media', 'a:partner', 'acct'] },
          { id: 's_perf_report', name: 'דוח ביצועים',  route: ['w:media', 'acct'] },
        ],
      },
    ];

    const rules = [
      {
        id: 'r_newclient', active: true, priority: 1,
        name: 'לקוח חדש — חודש ראשון',
        desc: 'בחודש הראשון של לקוח חדש, כל תוצר עובר את שרשרת האישורים המלאה — בלי קיצורי דרך.',
        when: { clientNew: true },
        then: { route: 'full' },
        lock: 'stricter-only',
      },
      {
        id: 'r_runtext', active: true, priority: 2,
        name: 'טקסט רץ — מסלול מהיר',
        desc: 'טקסט רץ לסרטון לא צריך סבב אישורים מלא — עובר ישירות לניהול הלקוח.',
        when: { subIds: ['s_runtext'] },
        then: { route: 'short' },
        lock: 'stricter-only',
      },
      {
        id: 'r_smallfix', active: true, priority: 3,
        name: 'תיקון קטן לתוצר מאושר',
        desc: 'תיקון קטן בתוצר שכבר אושר חוזר ישירות לניהול הלקוח — לפי שיקול דעת מנהל/ת הלקוח.',
        when: { smallFix: true },
        then: { route: 'short' },
        lock: 'am-discretion',
      },
      {
        id: 'r_large', active: true, priority: 4,
        name: 'משימה גדולה — שותף חובה',
        desc: 'משימות בהיקף גדול (L) מחייבות אישור שותף, גם אם המסלול הבסיסי לא כולל אותו.',
        when: { sizes: ['L'] },
        then: { requirePartner: true },
        lock: 'stricter-only',
      },
    ];

    /* --- בניית שלבים ידנית לנתוני הדמו --- */
    const W = (dept, o = {}) => ({ kind: 'work', dept, state: 'pending', assigneeId: null, started: false, ...o });
    const A = (slot, o = {}) => ({ kind: 'approval', slot, state: 'pending', ...o });
    const ACC = (o = {}) => ({ kind: 'account', state: 'pending', ...o });

    const tasks = [
      /* 1 — בשיבוץ (עיצוב) */
      {
        id: 'q1', title: 'פוסט סושיאל — מבצע קיץ',
        brief: 'קרוסלה לפייסבוק ואינסטגרם: 3 פריימים, דגש על 30% הנחה על סלטי הבית. חובה לשמור על הגריד החדש.',
        clientId: 'c_hasalat', typeId: 't_design', subId: 's_social_post', size: 'S',
        urgent: false, deadline: inDays(5), createdBy: 'u_guy', createdAt: ago(1, 3),
        steps: [W('design', { state: 'cur' }), A('studio'), ACC()], cur: 0, rev: false,
        versions: [], feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [{ at: ago(1, 3), byId: 'u_guy', text: 'פתח את המשימה' }],
      },

      /* 2 — משובצת, טרם התחילה */
      {
        id: 'q2', projectId: 'p1', title: 'קופי לפוסט — השקת האפליקציה החדשה',
        brief: 'פוסט הכרזה על האפליקציה. טון: צעיר אבל אמין. אורך: עד 60 מילים + הצעת כותרת.',
        clientId: 'c_migdal', typeId: 't_copy', subId: 's_post_copy', size: 'M',
        urgent: false, deadline: inDays(4), createdBy: 'u_hila', createdAt: ago(1, 6),
        steps: [W('copy', { state: 'cur', assigneeId: 'u_itay' }), A('creative'), ACC()], cur: 0, rev: false,
        versions: [], feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(1, 6), byId: 'u_hila', text: 'פתחה את המשימה' },
          { at: ago(0, 20), byId: 'u_omer', text: 'שיבץ את איתי רוזן' },
        ],
      },

      /* 3 — בעבודה */
      {
        id: 'q3', title: 'עדכון שקפים — מצגת רבעונית',
        brief: 'עדכון נתוני הרבעון במצגת הקיימת + 2 שקפים חדשים על שיתופי הפעולה. קישור למצגת בגרסה הקודמת.',
        clientId: 'c_dizengof', typeId: 't_deck', subId: 's_deck_update', size: 'S',
        urgent: false, deadline: inDays(2), createdBy: 'u_hila', createdAt: ago(2, 4),
        steps: [W('design', { state: 'cur', assigneeId: 'u_tamar', started: true }), A('creative'), ACC()], cur: 0, rev: false,
        versions: [], feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(2, 4), byId: 'u_hila', text: 'פתחה את המשימה' },
          { at: ago(2), byId: 'u_omer', text: 'שיבץ את תמר גולן' },
          { at: ago(1, 5), byId: 'u_tamar', text: 'התחילה לעבוד' },
        ],
      },

      /* 4 — טקסט רץ, דחוף, מסלול מקוצר לפי כלל */
      {
        id: 'q4', title: 'טקסט רץ — סרטון תדמית לאתר',
        brief: 'כתוביות לסרטון התדמית (2:40). לפי קובץ התמלול שבתיקייה. פונט לפי ספר המותג.',
        clientId: 'c_shikun', typeId: 't_video', subId: 's_runtext', size: 'S',
        urgent: true, deadline: inDays(1), createdBy: 'u_guy', createdAt: ago(1),
        steps: [W('video', { state: 'cur', assigneeId: 'u_eden', started: true }), ACC()], cur: 0, rev: false,
        versions: [], feedback: [], takeRequest: null, appliedRules: ['r_runtext'], addedSlots: [], closed: false,
        activity: [
          { at: ago(1), byId: 'u_guy', text: 'פתח את המשימה (דחוף)' },
          { at: ago(0, 22), byId: 'u_shira', text: 'שיבצה את עדן ברזילי' },
          { at: ago(0, 8), byId: 'u_eden', text: 'התחיל לעבוד' },
        ],
      },

      /* 5 — ממתין לאישור סטודיו */
      {
        id: 'q5', title: 'פוסט סושיאל — פתיחת סניף תל אביב',
        brief: 'פוסט חגיגי לפתיחת הסניף החדש בשדרות רוטשילד. לשלב את צילומי הסניף מהתיקייה.',
        clientId: 'c_hasalat', typeId: 't_design', subId: 's_social_post', size: 'S',
        urgent: false, deadline: inDays(3), createdBy: 'u_guy', createdAt: ago(3),
        steps: [W('design', { state: 'done', assigneeId: 'u_yoni', started: true }), A('studio', { state: 'cur' }), ACC()], cur: 1, rev: false,
        versions: [{ n: 1, byId: 'u_yoni', at: ago(0, 10), note: 'שתי חלופות — אחת נקייה ואחת צבעונית יותר', link: 'https://example.com/figma-demo', fixes: [] }],
        feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(3), byId: 'u_guy', text: 'פתח את המשימה' },
          { at: ago(2, 20), byId: 'u_roi', text: 'שיבץ את יונתן פרץ' },
          { at: ago(0, 10), byId: 'u_yoni', text: 'הגיש גרסה 1 — עבר לאישור סטודיו' },
        ],
      },

      /* 6 — ממתין לאישור קריאייטיב, גרסה 2 אחרי תיקונים */
      {
        id: 'q6', title: 'תסריט — קמפיין ביטוח רכב לצעירים',
        brief: 'תסריט 30 שניות לדיגיטל. קונספט: "הרכב הראשון". טון: מצחיק, לא מתנשא.',
        clientId: 'c_migdal', typeId: 't_copy', subId: 's_script', size: 'M',
        urgent: false, deadline: inDays(2), createdBy: 'u_omer', createdAt: ago(6),
        steps: [W('copy', { state: 'done', assigneeId: 'u_michal', started: true }), A('creative', { state: 'cur' }), A('partner'), ACC()], cur: 1, rev: false,
        versions: [
          { n: 1, byId: 'u_michal', at: ago(3, 4), note: 'טיוטה ראשונה לפי הקונספט שסגרנו', link: '', fixes: [] },
          { n: 2, byId: 'u_michal', at: ago(0, 6), note: 'סגיר חדש + קיצור הפתיח', link: '', fixes: ['fb_q6_1'] },
        ],
        feedback: [
          { id: 'fb_q6_1', byId: 'u_omer', at: ago(2, 8), kind: 'reject', text: 'הפתיח חזק אבל הסגיר חלש — צריך פאנץ\' שמתחבר לקריאה לפעולה. וגם: לקצר את הפתיח בשתי שניות.', directBack: false, resolved: true },
        ],
        takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(6), byId: 'u_omer', text: 'פתח את המשימה' },
          { at: ago(5, 20), byId: 'u_omer', text: 'שיבץ את מיכל אדר' },
          { at: ago(3, 4), byId: 'u_michal', text: 'הגישה גרסה 1' },
          { at: ago(2, 8), byId: 'u_omer', text: 'החזיר לתיקונים עם הערות' },
          { at: ago(0, 6), byId: 'u_michal', text: 'הגישה גרסה 2 — חזר לאישור קריאייטיב' },
        ],
      },

      /* 7 — ממתין לאישור שותף */
      {
        id: 'q7', title: 'מצגת מכירות — פרויקט המגורים ברמת גן',
        brief: 'מצגת מכירות מלאה לפרויקט החדש: 18 שקפים, כולל הדמיות, מפרט ותוכנית תשלומים.',
        clientId: 'c_shikun', typeId: 't_deck', subId: 's_deck_sales', size: 'L',
        urgent: false, deadline: inDays(6), createdBy: 'u_guy', createdAt: ago(8),
        steps: [
          W('copy', { state: 'done', assigneeId: 'u_itay', started: true, due: ago(4) }),
          A('creative', { state: 'done' }),
          W('design', { state: 'done', assigneeId: 'u_tamar', started: true, due: ago(1) }),
          A('creative', { state: 'done' }),
          A('partner', { state: 'cur' }),
          ACC(),
        ], cur: 4, rev: false,
        versions: [
          { n: 1, byId: 'u_itay', at: ago(5), note: 'שלד תוכן + כותרות לכל השקפים', link: 'https://docs.google.com/presentation/d/demo', fixes: [] },
          { n: 2, byId: 'u_tamar', at: ago(1, 12), note: 'עיצוב מלא על גבי התוכן המאושר', link: 'https://docs.google.com/presentation/d/demo', fixes: [] },
        ],
        feedback: [], takeRequest: null, appliedRules: ['r_large'], addedSlots: [], closed: false,
        activity: [
          { at: ago(8), byId: 'u_guy', text: 'פתח את המשימה' },
          { at: ago(5), byId: 'u_itay', text: 'הגיש גרסה 1 — עבר לאישור תוכן' },
          { at: ago(4, 12), byId: 'u_dana', text: 'אישרה את התוכן — עבר לעיצוב' },
          { at: ago(1, 12), byId: 'u_tamar', text: 'הגישה גרסה 2 — עבר לאישור קריאייטיב' },
          { at: ago(0, 18), byId: 'u_dana', text: 'אישרה — עבר לאישור שותפה' },
        ],
      },

      /* 8 — בתיקונים אחרי דחייה, חזרה ישירה למאשר, באיחור */
      {
        id: 'q8', title: 'באנר קמפיין — סוף עונה',
        brief: 'סט באנרים לגוגל (5 מידות). מסר מרכזי: עד 50% הנחה, שבוע אחרון.',
        clientId: 'c_dizengof', typeId: 't_design', subId: 's_campaign_banner', size: 'M',
        urgent: true, deadline: inDays(-1), createdBy: 'u_hila', createdAt: ago(5),
        steps: [
          W('design', { state: 'cur', assigneeId: 'u_yoni', started: true }),
          A('studio', { state: 'pending', skipOnce: true }),
          A('creative', { state: 'pending' }),
          ACC(),
        ], cur: 0, rev: true,
        versions: [
          { n: 1, byId: 'u_yoni', at: ago(2), note: 'סט ראשון לפי הבריף', link: '', fixes: [] },
        ],
        feedback: [
          { id: 'fb_q8_1', byId: 'u_omer', at: ago(1, 2), kind: 'reject', text: 'הלוגו נבלע ברקע הכהה — צריך גרסה בהירה. ובמידה המרובעת ה־CTA נחתך.', directBack: true, resolved: false },
        ],
        takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(5), byId: 'u_hila', text: 'פתחה את המשימה (דחוף)' },
          { at: ago(2), byId: 'u_yoni', text: 'הגיש גרסה 1' },
          { at: ago(1, 20), byId: 'u_roi', text: 'אישר סטודיו — עבר לאישור קריאייטיב' },
          { at: ago(1, 2), byId: 'u_omer', text: 'החזיר לתיקונים — התיקון יחזור ישירות אליו' },
        ],
      },

      /* 9 — אצל ניהול הלקוח */
      {
        id: 'q9', title: 'סרטון ערוך — סיכום כנס הסוכנים',
        brief: 'אפטר־מובי מכנס הסוכנים השנתי, עד 90 שניות, כולל כתוביות ולוגו סוגר.',
        clientId: 'c_migdal', typeId: 't_video', subId: 's_edited', size: 'M',
        urgent: false, deadline: inDays(1), createdBy: 'u_hila', createdAt: ago(9),
        steps: [
          W('video', { state: 'done', assigneeId: 'u_eden', started: true }),
          A('video', { state: 'done' }),
          A('creative', { state: 'done' }),
          A('partner', { state: 'done' }),
          ACC({ state: 'cur' }),
        ], cur: 4, rev: false,
        versions: [
          { n: 1, byId: 'u_eden', at: ago(2, 6), note: 'גרסה מלאה כולל כתוביות', link: 'https://example.com/video-demo', fixes: [] },
        ],
        feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(9), byId: 'u_hila', text: 'פתחה את המשימה' },
          { at: ago(2, 6), byId: 'u_eden', text: 'הגיש גרסה 1' },
          { at: ago(1, 22), byId: 'u_shira', text: 'אישרה וידאו' },
          { at: ago(1, 8), byId: 'u_omer', text: 'אישר קריאייטיב' },
          { at: ago(0, 12), byId: 'u_yael', text: 'אישרה — עבר לניהול הלקוח' },
        ],
      },

      /* 10 — סגורה */
      {
        id: 'q10', title: 'תוכנית מדיה — רבעון 3',
        brief: 'תוכנית מדיה רבעונית: פילוח תקציב בין מטא, גוגל וטיקטוק + יעדי המרה.',
        clientId: 'c_hasalat', typeId: 't_media', subId: 's_media_plan', size: 'M',
        urgent: false, deadline: ago(4), createdBy: 'u_guy', createdAt: ago(12),
        steps: [
          W('media', { state: 'done', assigneeId: 'u_lior', started: true }),
          A('partner', { state: 'done' }),
          ACC({ state: 'done' }),
        ], cur: 2, rev: false,
        versions: [
          { n: 1, byId: 'u_lior', at: ago(6), note: 'תוכנית מלאה + טבלת תקציבים', link: 'https://docs.google.com/spreadsheets/d/demo', fixes: [] },
        ],
        feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: true, closedAt: ago(3),
        activity: [
          { at: ago(12), byId: 'u_guy', text: 'פתח את המשימה' },
          { at: ago(6), byId: 'u_lior', text: 'הגיש גרסה 1' },
          { at: ago(5), byId: 'u_asaf', text: 'אישר — עבר לניהול הלקוח' },
          { at: ago(3), byId: 'u_guy', text: 'אישר וסגר את המשימה' },
        ],
      },

      /* 11 — סגורה (הבסיס לתיקון הקטן q14) */
      {
        id: 'q11', title: 'באנר — קמפיין חיסכון לכל ילד',
        brief: 'באנר לעמוד הבית של האתר + התאמה למובייל.',
        clientId: 'c_migdal', typeId: 't_design', subId: 's_campaign_banner', size: 'S',
        urgent: false, deadline: ago(6), createdBy: 'u_hila', createdAt: ago(14),
        steps: [
          W('design', { state: 'done', assigneeId: 'u_tamar', started: true }),
          A('studio', { state: 'done' }),
          A('creative', { state: 'done' }),
          ACC({ state: 'done' }),
        ], cur: 3, rev: false,
        versions: [
          { n: 1, byId: 'u_tamar', at: ago(8), note: '', link: '', fixes: [] },
        ],
        feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: true, closedAt: ago(5),
        activity: [
          { at: ago(14), byId: 'u_hila', text: 'פתחה את המשימה' },
          { at: ago(5), byId: 'u_hila', text: 'אישרה וסגרה את המשימה' },
        ],
      },

      /* 12 — לקוח חדש: מסלול מלא לפי כלל */
      {
        id: 'q12', title: 'מצגת אסטרטגיה — כניסה לשוק',
        brief: 'מצגת אסטרטגיית השקה לפעילות החדשה: תובנות קהל, טריטוריה מותגית, קונספט־על ומפת ערוצים.',
        clientId: 'c_almog', typeId: 't_deck', subId: 's_deck_strategy', size: 'L',
        urgent: false, deadline: inDays(10), createdBy: 'u_hila', createdAt: ago(2),
        steps: [
          W('copy', { state: 'cur', assigneeId: 'u_michal', started: true, due: inDays(3) }),
          A('creative'),
          W('design', { due: inDays(8) }),
          A('creative'),
          A('partner'),
          ACC(),
        ], cur: 0, rev: false,
        versions: [], feedback: [], takeRequest: null,
        appliedRules: ['r_newclient', 'r_large'], addedSlots: [], closed: false,
        activity: [
          { at: ago(2), byId: 'u_hila', text: 'פתחה את המשימה' },
          { at: ago(1, 20), byId: 'u_dana', text: 'שיבצה את מיכל אדר' },
          { at: ago(1, 2), byId: 'u_michal', text: 'התחילה לעבוד' },
        ],
      },

      /* 13 — בשיבוץ + בקשת עובד לקחת */
      {
        id: 'q13', title: 'ריל — טרנד הסאונד החדש',
        brief: 'ריל קצר (עד 20 שניות) על בסיס הטרנד — חיבור לחוויית הקניות בסנטר. צילומים קיימים בדרייב.',
        clientId: 'c_dizengof', typeId: 't_video', subId: 's_reel', size: 'S',
        urgent: false, deadline: inDays(4), createdBy: 'u_hila', createdAt: ago(0, 9),
        steps: [W('video', { state: 'cur' }), A('video'), A('creative'), ACC()], cur: 0, rev: false,
        versions: [], feedback: [],
        takeRequest: { byId: 'u_eden', at: ago(0, 5) },
        appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(0, 9), byId: 'u_hila', text: 'פתחה את המשימה' },
          { at: ago(0, 5), byId: 'u_eden', text: 'ביקש לקחת את המשימה — ממתין לאישור' },
        ],
      },

      /* 14 — תיקון קטן לתוצר שאושר: ישר לניהול לקוח */
      {
        id: 'q14', title: 'תיקון קטן: החלפת תאריך בבאנר חיסכון',
        brief: 'המבצע הוארך — להחליף את התאריך ל־31.8 בכל המידות. בלי שינויים נוספים.',
        clientId: 'c_migdal', typeId: 't_design', subId: 's_campaign_banner', size: 'S',
        urgent: false, deadline: inDays(1), createdBy: 'u_hila', createdAt: ago(0, 7),
        steps: [W('design', { state: 'cur', assigneeId: 'u_tamar' }), ACC()], cur: 0, rev: false,
        versions: [], feedback: [], takeRequest: null,
        appliedRules: ['r_smallfix'], addedSlots: [], closed: false, smallFixOf: 'q11',
        activity: [
          { at: ago(0, 7), byId: 'u_hila', text: 'פתחה תיקון קטן על בסיס "באנר — קמפיין חיסכון לכל ילד"' },
          { at: ago(0, 6), byId: 'u_roi', text: 'שיבץ את תמר גולן' },
        ],
      },

      /* 15 — מדיה בעבודה, מסלול קצר בסיסי */
      {
        id: 'q15', title: 'דוח ביצועים — יוני',
        brief: 'דוח חודשי: ביצועי קמפיינים מול יעדים + המלצות לחודש הבא.',
        clientId: 'c_hasalat', typeId: 't_media', subId: 's_perf_report', size: 'S',
        urgent: false, deadline: inDays(2), createdBy: 'u_guy', createdAt: ago(1, 10),
        steps: [W('media', { state: 'cur', assigneeId: 'u_lior', started: true }), ACC()], cur: 0, rev: false,
        versions: [], feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(1, 10), byId: 'u_guy', text: 'פתח את המשימה' },
          { at: ago(0, 20), byId: 'u_lior', text: 'התחיל לעבוד' },
        ],
      },

      /* 16 — עומר עם כובע קופירייטר (לקוח של דנה) */
      {
        id: 'q16', projectId: 'p2', title: 'סלוגן לקמפיין החורף',
        brief: 'סלוגן לקמפיין החורף — 5–8 חלופות. חייב לעבוד גם בשילוט חוצות וגם בדיגיטל.',
        clientId: 'c_hasalat', typeId: 't_copy', subId: 's_naming', size: 'M',
        urgent: false, deadline: inDays(7), createdBy: 'u_dana', createdAt: ago(4),
        steps: [
          W('copy', { state: 'done', assigneeId: 'u_omer', started: true }),
          A('creative', { state: 'cur' }),
          A('partner'),
          ACC(),
        ], cur: 1, rev: false,
        versions: [
          { n: 1, byId: 'u_omer', at: ago(0, 14), note: '7 חלופות, מסודרות לפי סדר העדפה שלי', link: '', fixes: [] },
        ],
        feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
        activity: [
          { at: ago(4), byId: 'u_dana', text: 'פתחה את המשימה' },
          { at: ago(3, 20), byId: 'u_dana', text: 'שיבצה את עומר שגב' },
          { at: ago(0, 14), byId: 'u_omer', text: 'הגיש גרסה 1 — עבר לאישור קריאייטיב' },
        ],
      },
    ];

    /* 17 — משימת אחות בפרויקט ההשקה (מחכה לקופי מהמשימה המקושרת) */
    tasks.push({
      id: 'q17', projectId: 'p1', title: 'עיצוב פוסט — השקת האפליקציה',
      brief: 'העיצוב לפוסט ההשקה — מתבסס על הקופי מהמשימה המקושרת בפרויקט. פורמט: 1080×1350 + סטורי.',
      clientId: 'c_migdal', typeId: 't_design', subId: 's_social_post', size: 'S',
      urgent: false, deadline: inDays(5), createdBy: 'u_hila', createdAt: ago(1, 5),
      steps: [W('design', { state: 'cur', due: inDays(4) }), A('studio'), ACC()], cur: 0, rev: false,
      versions: [], feedback: [], takeRequest: null, appliedRules: [], addedSlots: [], closed: false,
      activity: [{ at: ago(1, 5), byId: 'u_hila', text: 'פתחה את המשימה' }],
    });

    /* התראות פתיחה — שהפעמון לא יהיה ריק */
    const notifs = [
      { id: 'n1', userId: 'u_hila', at: ago(0, 12), text: 'ממתין לך מול הלקוח: "סרטון ערוך — סיכום כנס הסוכנים"', taskId: 'q9', read: false },
      { id: 'n2', userId: 'u_hila', at: ago(1, 2), text: 'עומר שגב החזיר לתיקונים את "באנר קמפיין — סוף עונה"', taskId: 'q8', read: false },
      { id: 'n3', userId: 'u_yael', at: ago(0, 18), text: 'ממתין לאישורך: "מצגת מכירות — פרויקט המגורים ברמת גן"', taskId: 'q7', read: false },
    ];

    return {
      v: 1,
      seededAt: Date.now(),
      hintDismissed: false,
      currentUserId: 'u_hila',
      route: 'my',
      users, clients, projects, types, rules, tasks, notifs,
      seq: 100, /* מונה מזהים */
    };
  };
})();
