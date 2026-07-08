/* ============================================================
   סימי — מנוע הכללים, הרשאות וגזירת סטטוסים
   ============================================================ */
window.S = window.S || {};

(function () {
  /* ---------- שליפות בסיס ---------- */
  S.user = (id) => S.db.users.find((u) => u.id === id);
  S.client = (id) => S.db.clients.find((c) => c.id === id);
  S.type = (id) => S.db.types.find((t) => t.id === id);
  S.sub = (typeId, subId) => (S.type(typeId)?.subs || []).find((s) => s.id === subId);
  S.task = (id) => S.db.tasks.find((t) => t.id === id);
  S.rule = (id) => S.db.rules.find((r) => r.id === id);
  S.cur = () => S.user(S.db.currentUserId);

  S.initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('');

  S.roleNames = (u) => u.roles.map((r) => S.ROLES[r]?.name || r).join(' · ');

  /* המחלקות שהמשתמש עובד בהן בפועל (ככובע "עובד") */
  S.userDepts = (u) => u.roles.map((r) => S.ROLES[r]?.dept).filter(Boolean);

  /* ---------- הרשאות ---------- */
  S.can = {
    create(u) {
      return u.isAdmin || u.roles.some((r) =>
        ['accountManager', 'accountLead', 'creativeManager', 'vpCreative', 'partner'].includes(r));
    },
    assign(u) { return !!u.canAssign || !!u.isAdmin; },
    admin(u) { return !!u.isAdmin; },
  };

  /* מי מאשר בשלב נתון (לפי הלקוח של המשימה) */
  S.stepOwnerId = function (task, step) {
    const c = S.client(task.clientId);
    if (step.kind === 'work') return step.assigneeId;
    if (step.kind === 'account') return c.accountManagerId;
    if (step.kind === 'approval') {
      if (step.slot === 'creative') return c.creativeManagerId;
      if (step.slot === 'partner') return c.partnerId;
      if (step.slot === 'studio') return (S.db.users.find((u) => u.roles.includes('studioManager')) || {}).id;
      if (step.slot === 'video') return (S.db.users.find((u) => u.roles.includes('videoManager')) || {}).id;
    }
    return null;
  };

  S.stepLabel = function (step) {
    if (step.kind === 'work') return 'עבודה — ' + (S.DEPTS[step.dept]?.name || step.dept);
    if (step.kind === 'approval') return S.SLOTS[step.slot]?.name || step.slot;
    if (step.kind === 'account') return 'ניהול לקוח';
    return '';
  };

  S.stepIcon = function (step) {
    if (step.kind === 'work') return S.DEPTS[step.dept]?.icon || 'pen';
    if (step.kind === 'approval') return 'stamp';
    if (step.kind === 'account') return 'briefcase';
    return 'info';
  };

  /* ---------- סטטוס ---------- */
  /* מפתחות: pool / assigned / working / fixing / approval / partner / account / closed */
  S.statusOf = function (t) {
    if (t.closed) return 'closed';
    const s = t.steps[t.cur];
    if (!s) return 'closed';
    if (s.kind === 'work') {
      if (!s.assigneeId) return 'pool';
      if (t.rev) return 'fixing';
      if (!s.started) return 'assigned';
      return 'working';
    }
    if (s.kind === 'approval') return s.slot === 'partner' ? 'partner' : 'approval';
    if (s.kind === 'account') return 'account';
    return 'closed';
  };

  S.STATUS = {
    pool:     { name: 'בשיבוץ',            cls: 'st-pool',     color: 'var(--st-pool)' },
    assigned: { name: 'משובצת',            cls: 'st-assigned', color: 'var(--st-assigned)' },
    working:  { name: 'בעבודה',            cls: 'st-working',  color: 'var(--st-working)' },
    fixing:   { name: 'בתיקונים',          cls: 'st-fixing',   color: 'var(--st-fixing)' },
    approval: { name: 'ממתינה לאישור',     cls: 'st-approval', color: 'var(--st-approval)' },
    partner:  { name: 'אצל השותף/ה',       cls: 'st-partner',  color: 'var(--st-partner)' },
    account:  { name: 'בניהול לקוח',       cls: 'st-account',  color: 'var(--st-account)' },
    closed:   { name: 'סגורה',             cls: 'st-closed',   color: 'var(--st-closed)' },
  };

  /* תווית סטטוס מדויקת יותר להצגה (כולל שם שלב האישור) */
  S.statusLabel = function (t) {
    const st = S.statusOf(t);
    if (st === 'approval') {
      const s = t.steps[t.cur];
      return 'ממתינה ל' + (S.SLOTS[s.slot]?.name || 'אישור');
    }
    return S.STATUS[st].name;
  };

  /* ============================================================
     מנוע הכללים — חישוב מסלול
     ============================================================ */

  const SLOT_ORDER = { studio: 1, video: 2, creative: 3, partner: 4 };

  /* האם כלל חל על טיוטת משימה */
  function ruleMatches(rule, draft) {
    if (!rule.active) return false;
    const w = rule.when || {};
    const client = S.client(draft.clientId);
    if (w.clientNew && !(client && client.isNew)) return false;
    if (w.subIds && !w.subIds.includes(draft.subId)) return false;
    if (w.typeIds && !w.typeIds.includes(draft.typeId)) return false;
    if (w.sizes && !w.sizes.includes(draft.size)) return false;
    if (w.smallFix && !draft.smallFix) return false;
    return true;
  }

  /* מסלול מלא קאנוני לסוג תוצר: שלבי עבודה + כל האישורים הרלוונטיים */
  function fullChain(baseTokens, typeId) {
    const type = S.type(typeId);
    const works = baseTokens.filter((tk) => tk.startsWith('w:'));
    const slots = new Set(['creative', 'partner']);
    if (type.primary && type.primary !== 'creative' && type.primary !== 'partner') slots.add(type.primary);
    /* אם המסלול הבסיסי כלל אישורים נוספים — נשמור אותם */
    baseTokens.filter((tk) => tk.startsWith('a:')).forEach((tk) => slots.add(tk.slice(2)));
    const approvals = [...slots].sort((a, b) => SLOT_ORDER[a] - SLOT_ORDER[b]).map((s) => 'a:' + s);
    return [...works, ...approvals, 'acct'];
  }

  function shortChain(baseTokens) {
    return [...baseTokens.filter((tk) => tk.startsWith('w:')), 'acct'];
  }

  /*
    computeRoute(draft) →
      { tokens, fired: [{rule, applied, note}], base }
    draft: { clientId, typeId, subId, size, smallFix, skippedRuleIds[], addedSlots[] }
    - skippedRuleIds: כללים בשיקול דעת מנהל/ת לקוח שבוטלו ידנית
    - addedSlots: אישורים שהתווספו ידנית (עקיפה לחומרה)
  */
  S.computeRoute = function (draft) {
    const sub = S.sub(draft.typeId, draft.subId);
    if (!sub) return { tokens: [], fired: [], base: [] };
    const base = [...sub.route];
    let tokens = [...base];

    const matched = S.db.rules
      .filter((r) => ruleMatches(r, draft))
      .sort((a, b) => a.priority - b.priority);

    const fired = [];
    let level = 'default'; /* default < short < full — המחמיר גובר */

    /* שלב 1: כללי מסלול (full/short). מחמיר גובר על מקל. */
    matched.forEach((r) => {
      const skipped = r.lock === 'am-discretion' && (draft.skippedRuleIds || []).includes(r.id);
      if (r.then.route === 'full') {
        fired.push({ rule: r, applied: true, note: 'הרחיב למסלול אישורים מלא' });
        level = 'full';
      } else if (r.then.route === 'short') {
        if (skipped) {
          fired.push({ rule: r, applied: false, note: 'בוטל ידנית — המשימה תעבור את המסלול הרגיל' });
        } else if (level === 'full') {
          fired.push({ rule: r, applied: false, note: 'לא הופעל — כלל מחמיר יותר גובר' });
        } else {
          fired.push({ rule: r, applied: true, note: 'קיצר את המסלול ישירות לניהול הלקוח' });
          level = 'short';
        }
      }
    });

    if (level === 'full') tokens = fullChain(base, draft.typeId);
    else if (level === 'short') tokens = shortChain(base);

    /* שלב 2: כללי תוספת (requirePartner וכד') */
    matched.forEach((r) => {
      if (r.then.requirePartner) {
        if (level === 'short') {
          /* קיצור גובר רק אם הוא לא סותר חובת שותף — חובה גוברת */
          fired.push({ rule: r, applied: true, note: 'הוסיף אישור שותף/ה חובה' });
          tokens = insertSlot(tokens, 'partner');
        } else if (!tokens.includes('a:partner')) {
          fired.push({ rule: r, applied: true, note: 'הוסיף אישור שותף/ה חובה' });
          tokens = insertSlot(tokens, 'partner');
        } else {
          fired.push({ rule: r, applied: true, note: 'אישור שותף/ה כבר קיים במסלול' });
        }
      }
    });

    /* שלב 3: עקיפות ידניות — הוספה בלבד (לחומרה) */
    (draft.addedSlots || []).forEach((slot) => {
      if (!tokens.includes('a:' + slot)) tokens = insertSlot(tokens, slot);
    });

    return { tokens, fired, base };
  };

  function insertSlot(tokens, slot) {
    const out = tokens.filter((tk) => tk !== 'acct' && tk !== 'a:' + slot);
    const newTok = 'a:' + slot;
    /* הכנסה לפי הסדר הקאנוני של האישורים */
    let idx = out.length;
    for (let i = 0; i < out.length; i++) {
      if (out[i].startsWith('a:')) {
        const s = out[i].slice(2);
        if (SLOT_ORDER[s] > SLOT_ORDER[slot]) { idx = i; break; }
      }
    }
    out.splice(idx, 0, newTok);
    out.push('acct');
    return out;
  }

  /* המרת טוקנים לאובייקטי שלבים */
  S.materializeSteps = function (tokens) {
    return tokens.map((tk, i) => {
      if (tk.startsWith('w:')) return { kind: 'work', dept: tk.slice(2), state: i === 0 ? 'cur' : 'pending', assigneeId: null, started: false };
      if (tk.startsWith('a:')) return { kind: 'approval', slot: tk.slice(2), state: 'pending' };
      return { kind: 'account', state: 'pending' };
    });
  };

  /* ---------- שאילתות נפוצות ---------- */

  /* המשימות שבעבודה אצל משתמש (שלב עבודה נוכחי משובץ אליו) */
  S.tasksAssignedTo = (uid) => S.db.tasks.filter((t) => {
    if (t.closed) return false;
    const s = t.steps[t.cur];
    return s && s.kind === 'work' && s.assigneeId === uid;
  });

  /* משימות שממתינות לאישור של משתמש (כולל שלב ניהול לקוח) */
  S.tasksAwaiting = (uid) => S.db.tasks.filter((t) => {
    if (t.closed) return false;
    const s = t.steps[t.cur];
    if (!s || s.kind === 'work') return false;
    return S.stepOwnerId(t, s) === uid;
  });

  /* משימות בשיבוץ (שלב עבודה נוכחי ללא עובד) */
  S.tasksInPool = () => S.db.tasks.filter((t) => {
    if (t.closed) return false;
    const s = t.steps[t.cur];
    return s && s.kind === 'work' && !s.assigneeId;
  });

  /* בקשות "רוצה לקחת" שממתינות לאישור */
  S.pendingTakeRequests = () => S.db.tasks.filter((t) => !t.closed && t.takeRequest);

  /* עובדי ביצוע (יש להם מחלקה) */
  S.productionUsers = () => S.db.users.filter((u) => S.userDepts(u).length > 0);

  /* הלקוחות שמשתמש הוא מנהל הלקוח שלהם */
  S.clientsOf = (uid) => S.db.clients.filter((c) => c.accountManagerId === uid);

  /* ---------- עזרי תאריכים ---------- */
  S.fmtDate = function (iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  };

  S.fmtDateTime = function (iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + ' ' +
      d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  /* כמה ימים עד דדליין (שלילי = באיחור) */
  S.daysTo = function (iso) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(iso); d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 864e5);
  };

  S.dueInfo = function (t) {
    if (t.closed) return { text: 'נסגרה ' + S.fmtDate(t.closedAt), cls: '' };
    const days = S.daysTo(t.deadline);
    if (days < 0) return { text: 'באיחור של ' + Math.abs(days) + (Math.abs(days) === 1 ? ' יום' : ' ימים'), cls: 'overdue' };
    if (days === 0) return { text: 'היום', cls: 'soon' };
    if (days === 1) return { text: 'מחר', cls: 'soon' };
    return { text: S.fmtDate(t.deadline), cls: '' };
  };
})();
