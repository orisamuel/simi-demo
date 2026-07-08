/* ============================================================
   סימי — ניהול מצב ופעולות
   כל שינוי במערכת עובר דרך S.act.* — נשמר ב־localStorage
   ============================================================ */
window.S = window.S || {};

(function () {
  const KEY = 'simi-db-v1';

  S.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const db = JSON.parse(raw);
        if (db && db.v === 1) {
          /* דאטה בן יותר מ־3 ימים מתיישן (דדליינים בורחים) — נזרע טרי */
          if (!db.seededAt) db.seededAt = Date.now();
          if (Date.now() - db.seededAt <= 3 * 864e5) { S.db = db; return; }
        }
      }
    } catch (e) { /* נתונים פגומים — נזרע מחדש */ }
    S.db = S.seed();
    S.save();
  };

  S.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.db)); } catch (e) { /* אין אחסון — הדמו ימשיך בזיכרון */ }
  };

  S.resetDemo = function () {
    localStorage.removeItem(KEY);
    S.db = S.seed();
    S.save();
  };

  /* app.js קובע את הרינדור; כאן רק hook */
  S.emit = function () { S.save(); if (S.onChange) S.onChange(); };

  const now = () => new Date().toISOString();
  const nextId = (p) => p + (++S.db.seq);

  function log(t, text, byId) {
    t.activity.push({ at: now(), byId: byId || S.db.currentUserId, text });
  }

  /* קידום לשלב הבא — מדלג על שלבים שסומנו לדילוג חד־פעמי */
  function advance(t) {
    t.steps[t.cur].state = 'done';
    let i = t.cur + 1;
    while (i < t.steps.length && t.steps[i].skipOnce) {
      t.steps[i].state = 'skipped';
      t.steps[i].skipOnce = false;
      i++;
    }
    if (i >= t.steps.length) { /* לא אמור לקרות — 'ניהול לקוח' תמיד אחרון */
      t.closed = true; t.closedAt = now();
      return;
    }
    t.cur = i;
    t.steps[i].state = 'cur';
  }

  S.act = {
    /* ---------- יצירה ---------- */
    createTask(draft) {
      const route = S.computeRoute(draft);
      const steps = S.materializeSteps(route.tokens);
      const me = S.cur();

      if (draft.assigneeId && steps[0] && steps[0].kind === 'work') {
        steps[0].assigneeId = draft.assigneeId;
      }

      const t = {
        id: nextId('q'),
        title: draft.title.trim(),
        brief: (draft.brief || '').trim(),
        clientId: draft.clientId,
        typeId: draft.typeId,
        subId: draft.subId,
        size: draft.size || 'M',
        urgent: !!draft.urgent,
        deadline: draft.deadline,
        createdBy: me.id,
        createdAt: now(),
        steps,
        cur: 0,
        rev: false,
        versions: [],
        feedback: [],
        takeRequest: null,
        appliedRules: route.fired.filter((f) => f.applied).map((f) => f.rule.id),
        addedSlots: draft.addedSlots || [],
        skippedRuleIds: draft.skippedRuleIds || [],
        closed: false,
        smallFixOf: draft.smallFixOf || null,
      };
      t.activity = [];
      log(t, draft.smallFixOf
        ? 'פתח/ה תיקון קטן על בסיס "' + (S.task(draft.smallFixOf)?.title || '') + '"'
        : 'פתח/ה את המשימה' + (t.urgent ? ' (דחוף)' : ''));
      if (draft.assigneeId) log(t, 'שיבץ/ה את ' + S.user(draft.assigneeId).name);

      S.db.tasks.unshift(t);
      S.emit();
      return t;
    },

    /* ---------- שיבוץ ---------- */
    assign(taskId, userId) {
      const t = S.task(taskId);
      const s = t.steps[t.cur];
      if (!s || s.kind !== 'work') return;
      const prev = s.assigneeId;
      s.assigneeId = userId || null;
      if (!userId) {
        s.started = false;
        log(t, 'הוחזרה לשיבוץ' + (prev ? ' (הוסרה מ' + S.user(prev).name + ')' : ''));
      } else {
        log(t, (prev ? 'העביר/ה את המשימה ל' : 'שיבץ/ה את ') + S.user(userId).name);
      }
      S.emit();
    },

    requestTake(taskId) {
      const t = S.task(taskId);
      t.takeRequest = { byId: S.db.currentUserId, at: now() };
      log(t, 'ביקש/ה לקחת את המשימה — ממתין לאישור מנהל/ת');
      S.emit();
    },

    approveTake(taskId) {
      const t = S.task(taskId);
      if (!t.takeRequest) return;
      const uid = t.takeRequest.byId;
      const s = t.steps[t.cur];
      if (s && s.kind === 'work') s.assigneeId = uid;
      t.takeRequest = null;
      log(t, 'אישר/ה את הבקשה — המשימה שובצה ל' + S.user(uid).name);
      S.emit();
    },

    declineTake(taskId) {
      const t = S.task(taskId);
      if (!t.takeRequest) return;
      const uid = t.takeRequest.byId;
      t.takeRequest = null;
      log(t, 'דחה/תה את בקשת השיבוץ של ' + S.user(uid).name);
      S.emit();
    },

    /* ---------- עבודה ---------- */
    startWork(taskId) {
      const t = S.task(taskId);
      const s = t.steps[t.cur];
      if (s && s.kind === 'work') {
        s.started = true;
        log(t, 'התחיל/ה לעבוד');
        S.emit();
      }
    },

    submitVersion(taskId, { note, link, fixIds }) {
      const t = S.task(taskId);
      const n = t.versions.length + 1;
      t.versions.push({ n, byId: S.db.currentUserId, at: now(), note: (note || '').trim(), link: (link || '').trim(), fixes: fixIds || [] });
      (fixIds || []).forEach((fid) => {
        const fb = t.feedback.find((f) => f.id === fid);
        if (fb) fb.resolved = true;
      });
      t.rev = false;
      advance(t);
      const nxt = t.steps[t.cur];
      log(t, 'הגיש/ה גרסה ' + n + ' — עבר ל' + S.stepLabel(nxt).replace('עבודה — ', 'עבודת '));
      S.emit();
    },

    /* ---------- אישורים ---------- */
    approve(taskId) {
      const t = S.task(taskId);
      advance(t);
      const nxt = t.steps[t.cur];
      log(t, 'אישר/ה — עבר ל' + S.stepLabel(nxt).replace('עבודה — ', 'עבודת '));
      S.emit();
    },

    /*
      דחייה לתיקונים.
      returnTo: 'same' (ברירת מחדל) | 'pool' | מזהה משתמש
      directBack: אחרי התיקון — חזרה ישירה למאשר הזה (דילוג על אישורים קודמים)
    */
    reject(taskId, { text, returnTo, directBack }) {
      const t = S.task(taskId);
      const i = t.cur;

      /* שלב העבודה האחרון שלפני המאשר */
      let j = -1;
      for (let k = i - 1; k >= 0; k--) {
        if (t.steps[k].kind === 'work') { j = k; break; }
      }
      if (j < 0) return;

      const fb = {
        id: nextId('fb'),
        byId: S.db.currentUserId,
        at: now(),
        kind: 'reject',
        text: (text || '').trim(),
        directBack: !!directBack,
        resolved: false,
      };
      t.feedback.push(fb);

      /* איפוס השלבים שבין העבודה למאשר */
      for (let k = j + 1; k < t.steps.length; k++) {
        t.steps[k].state = 'pending';
        t.steps[k].skipOnce = false;
      }
      if (directBack) {
        for (let k = j + 1; k < i; k++) {
          if (t.steps[k].kind === 'approval') t.steps[k].skipOnce = true;
        }
      }

      const ws = t.steps[j];
      ws.state = 'cur';
      if (returnTo === 'pool') {
        ws.assigneeId = null; ws.started = false;
      } else if (returnTo && returnTo !== 'same') {
        ws.assigneeId = returnTo; ws.started = false;
      }
      t.cur = j;
      t.rev = true;

      let msg = 'החזיר/ה לתיקונים';
      if (returnTo === 'pool') msg += ' (לשיבוץ מחדש)';
      else if (returnTo && returnTo !== 'same') msg += ' (הועבר ל' + S.user(returnTo).name + ')';
      if (directBack) msg += ' — התיקון יחזור ישירות אליו/ה';
      log(t, msg);
      S.emit();
    },

    /* הערות לקוח ממנהל/ת הלקוח — חזרה לתחילת הסבב */
    clientNotes(taskId, text) {
      const t = S.task(taskId);
      const j = t.steps.findIndex((s) => s.kind === 'work');
      if (j < 0) return;

      t.feedback.push({
        id: nextId('fb'),
        byId: S.db.currentUserId,
        at: now(),
        kind: 'client',
        text: (text || '').trim(),
        directBack: false,
        resolved: false,
      });

      t.steps.forEach((s, k) => {
        s.skipOnce = false;
        if (k < j) s.state = 'done';
        else if (k === j) s.state = 'cur';
        else s.state = 'pending';
      });
      t.cur = j;
      t.rev = true;
      t.closed = false;
      log(t, 'החזיר/ה עם הערות לקוח לתחילת הסבב');
      S.emit();
    },

    /* סגירה סופית משלב ניהול הלקוח */
    closeTask(taskId) {
      const t = S.task(taskId);
      t.steps[t.cur].state = 'done';
      t.closed = true;
      t.closedAt = now();
      log(t, 'אישר/ה וסגר/ה את המשימה');
      S.emit();
    },

    /* מחיקת משימה (נפתחה בטעות) — פותח/ת המשימה או הרשאת ניהול */
    deleteTask(taskId) {
      S.db.tasks = S.db.tasks.filter((t) => t.id !== taskId);
      S.emit();
    },

    dismissHint() {
      S.db.hintDismissed = true;
      S.emit();
    },

    /* ---------- ניהול ---------- */
    updateClient(clientId, patch) {
      Object.assign(S.client(clientId), patch);
      S.emit();
    },

    updateUser(userId, patch) {
      Object.assign(S.user(userId), patch);
      S.emit();
    },

    toggleRule(ruleId) {
      const r = S.rule(ruleId);
      r.active = !r.active;
      S.emit();
    },

    addRule(rule) {
      rule.id = nextId('r');
      rule.priority = S.db.rules.length + 1;
      rule.active = true;
      S.db.rules.push(rule);
      S.emit();
    },

    deleteRule(ruleId) {
      S.db.rules = S.db.rules.filter((r) => r.id !== ruleId);
      S.emit();
    },

    updateSubRoute(typeId, subId, tokens) {
      const sub = S.sub(typeId, subId);
      if (sub) { sub.route = tokens; S.emit(); }
    },

    switchUser(userId) {
      S.db.currentUserId = userId;
      S.emit();
    },

    goto(route) {
      S.db.route = route;
      S.emit();
    },
  };
})();
