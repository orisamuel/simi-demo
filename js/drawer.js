/* ============================================================
   סימי — מגירת משימה + מודאלים (יצירה, הגשה, דחייה, הערות)
   ============================================================ */
window.S = window.S || {};

(function () {
  const el = S.el;

  S.drawerTaskId = null;

  S.openDrawer = function (taskId) {
    S.drawerTaskId = taskId;
    renderDrawer();
    document.getElementById('drawerScrim').hidden = false;
    document.getElementById('drawer').hidden = false;
  };

  S.closeDrawer = function () {
    S.drawerTaskId = null;
    document.getElementById('drawerScrim').hidden = true;
    document.getElementById('drawer').hidden = true;
  };

  S.refreshDrawer = function () {
    if (S.drawerTaskId) {
      if (!S.task(S.drawerTaskId)) { S.closeDrawer(); return; }
      renderDrawer();
    }
  };

  /* ============================ המגירה ============================ */

  function renderDrawer() {
    const t = S.task(S.drawerTaskId);
    const me = S.cur();
    const client = S.client(t.clientId);
    const drawer = document.getElementById('drawer');
    drawer.innerHTML = '';

    /* --- כותרת --- */
    const head = el('div', { class: 'drawer-head' },
      el('div', { class: 'd-row1' },
        el('h2', null, t.title),
        el('button', { class: 'btn-close', html: S.icon('x'), 'aria-label': 'סגירה', onclick: S.closeDrawer })),
      el('div', { class: 'd-meta' },
        S.statusChip(t),
        el('span', { class: 'chip outline' }, client.name),
        t.projectId && S.project(t.projectId)
          ? el('span', { class: 'chip outline', html: S.icon('folder') + S.esc(S.project(t.projectId).name) })
          : null,
        client.isNew ? el('span', { class: 'chip newclient', html: S.icon('sparkles') + 'לקוח חדש' }) : null,
        S.typeTag(t),
        el('span', { class: 'chip outline' }, 'גודל ' + t.size),
        t.urgent && !t.closed ? S.urgentChip() : null,
      ),
      el('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-faint)' },
        el('span', { class: 'due ' + S.dueInfo(t).cls, html: S.icon('calendar') + 'דדליין: ' + S.esc(S.fmtDate(t.deadline)) + (S.dueInfo(t).cls === 'overdue' ? ' (באיחור)' : '') }),
        el('span', null, 'נפתחה ע"י ' + S.user(t.createdBy).name + ' · ' + S.fmtDate(t.createdAt)),
      ),
    );

    /* --- גוף --- */
    const body = el('div', { class: 'drawer-body' });

    /* בריף */
    if (t.brief || t.smallFixOf) {
      const box = el('div', { class: 'brief-box' });
      if (t.smallFixOf && S.task(t.smallFixOf)) {
        box.append(el('div', { style: 'margin-bottom:6px;font-weight:600;font-size:12.5px' },
          'תיקון קטן על בסיס: ',
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); S.openDrawer(t.smallFixOf); } }, '"' + S.task(t.smallFixOf).title + '"')));
      }
      box.append(t.brief);
      body.append(el('div', { class: 'drawer-sec' }, el('h3', { html: S.icon('file-text') + 'בריף' }), box));
    }

    /* למה המסלול הזה */
    const whyItems = [];
    (t.appliedRules || []).forEach((rid) => {
      const r = S.rule(rid);
      if (r) whyItems.push(el('div', { class: 'why-item', html: S.icon('zap') + '<strong>' + S.esc(r.name) + '</strong> — <span>' + S.esc(r.desc) + '</span>' }));
    });
    (t.addedSlots || []).forEach((slot) => {
      whyItems.push(el('div', { class: 'why-item', html: S.icon('user-plus') + '<strong>עקיפה ידנית</strong> — <span>נוסף שלב ' + S.esc(S.SLOTS[slot].name) + ' בעת פתיחת המשימה</span>' }));
    });
    if (whyItems.length) {
      body.append(el('div', { class: 'drawer-sec' },
        el('h3', { html: S.icon('wand') + 'למה המסלול הזה?' }),
        el('div', { class: 'why-route' }, whyItems)));
    }

    /* מסלול */
    body.append(el('div', { class: 'drawer-sec' },
      el('h3', { html: S.icon('git-branch') + 'מסלול המשימה' }),
      S.routeStepper(t)));

    /* עוד משימות באותו פרויקט */
    if (t.projectId) {
      const siblings = S.projectTasks(t.projectId).filter((x) => x.id !== t.id);
      if (siblings.length) {
        const listEl = el('div', { class: 'list' });
        siblings.forEach((sib) => {
          listEl.append(el('div', { class: 'list-row', onclick: () => S.openDrawer(sib.id) },
            el('div', { class: 'r-main' },
              el('div', { class: 'r-title' }, sib.title),
              el('div', { class: 'r-sub' }, S.typeTag(sib))),
            el('div', { class: 'r-side' }, S.statusChip(sib))));
        });
        body.append(el('div', { class: 'drawer-sec' },
          el('h3', { html: S.icon('folder') + 'עוד בפרויקט "' + S.esc(S.project(t.projectId).name) + '"' }),
          listEl));
      }
    }

    /* בקשת שיבוץ ממתינה */
    if (t.takeRequest) {
      const req = S.user(t.takeRequest.byId);
      const box = el('div', { class: 'take-req' },
        el('div', { style: 'display:flex;align-items:center;gap:8px' },
          S.avatarEl(req, 'sm'),
          el('strong', null, req.name), ' רוצה לקחת את המשימה'),
      );
      if (S.can.assign(me)) {
        box.append(el('div', { class: 'tr-actions' },
          el('button', { class: 'btn btn-ok btn-sm', onclick: () => { S.act.approveTake(t.id); S.toast('המשימה שובצה ל' + req.name); } }, 'אישור השיבוץ'),
          el('button', { class: 'btn btn-ghost btn-sm', onclick: () => S.act.declineTake(t.id) }, 'דחייה')));
      } else {
        box.append(el('div', { style: 'color:#8a6d00;font-size:11.5px' }, 'ממתין לאישור מנהל/ת'));
      }
      body.append(el('div', { class: 'drawer-sec' }, el('h3', { html: S.icon('hand') + 'בקשת שיבוץ' }), box));
    }

    /* גרסאות והערות */
    const tl = buildTimeline(t);
    if (tl.length) {
      body.append(el('div', { class: 'drawer-sec' },
        el('h3', { html: S.icon('list-checks') + 'גרסאות והערות' }),
        el('div', { class: 'timeline' }, tl)));
    }

    /* יומן פעילות */
    if (t.activity.length) {
      const actBox = el('div', { class: 'activity' });
      [...t.activity].reverse().forEach((a) => {
        actBox.append(el('div', { class: 'act-item' },
          el('span', { class: 'act-when' }, S.fmtDateTime(a.at)),
          el('span', null, S.user(a.byId).name + ' — ' + a.text)));
      });
      actBox.hidden = true;
      const toggle = el('button', { class: 'link-toggle' }, 'הצגת יומן פעילות (' + t.activity.length + ')');
      toggle.onclick = () => {
        actBox.hidden = !actBox.hidden;
        toggle.textContent = actBox.hidden ? 'הצגת יומן פעילות (' + t.activity.length + ')' : 'הסתרת יומן הפעילות';
      };
      body.append(el('div', { class: 'drawer-sec' }, toggle, actBox));
    }

    drawer.append(head, body, buildActions(t, me));
    document.getElementById('drawerScrim').onclick = S.closeDrawer;
  }

  /* --- ציר זמן: גרסאות + הערות, מהחדש לישן --- */
  function buildTimeline(t) {
    const items = [];
    t.versions.forEach((v) => items.push({ at: v.at, node: versionEl(t, v) }));
    t.feedback.forEach((fb) => items.push({ at: fb.at, node: feedbackEl(t, fb) }));
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).map((x) => x.node);
  }

  function versionEl(t, v) {
    const by = S.user(v.byId);
    const box = el('div', { class: 'tl-item tl-version' },
      el('div', { class: 'tl-head' },
        el('span', { class: 'tl-badge' }, 'גרסה ' + v.n),
        el('span', { class: 'tl-who' }, by.name),
        el('span', { class: 'tl-when' }, S.fmtDateTime(v.at))));
    if (v.note) box.append(el('div', { class: 'tl-text' }, v.note));
    if (v.link) box.append(el('div', { class: 'tl-link' },
      el('a', { href: v.link, target: '_blank', rel: 'noopener', html: S.icon('external') + 'פתיחת התוצר' })));
    if (v.fixes && v.fixes.length) {
      const fixes = el('div', { class: 'tl-fixes' });
      v.fixes.forEach((fid) => {
        const fb = t.feedback.find((f) => f.id === fid);
        if (fb) fixes.append(el('div', { class: 'fx', html: S.icon('check') + 'טופל: ' + S.esc(shorten(fb.text, 70)) }));
      });
      box.append(fixes);
    }
    return box;
  }

  function feedbackEl(t, fb) {
    const by = S.user(fb.byId);
    const isClient = fb.kind === 'client';
    const box = el('div', { class: 'tl-item ' + (isClient ? 'tl-client' : 'tl-feedback') },
      el('div', { class: 'tl-head' },
        el('span', { class: 'tl-badge' }, isClient ? 'הערות לקוח' : 'חזרה לתיקונים'),
        el('span', { class: 'tl-who' }, by.name),
        el('span', { class: 'tl-when' }, S.fmtDateTime(fb.at))),
      el('div', { class: 'tl-text' }, fb.text));
    if (fb.directBack) box.append(el('div', { class: 'tl-ret' }, 'אחרי התיקון — חזרה ישירה למאשר, בלי סבב מלא'));
    if (isClient) box.append(el('div', { class: 'tl-ret' }, 'המשימה חזרה לתחילת הסבב'));
    return box;
  }

  const shorten = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

  /* --- פעולות לפי תפקיד ומצב --- */
  function buildActions(t, me) {
    const bar = el('div', { class: 'drawer-actions' });
    const s = t.steps[t.cur];
    const client = S.client(t.clientId);
    const amOfClient = client.accountManagerId === me.id || me.roles.includes('accountLead');

    if (t.closed) {
      if (amOfClient || S.can.create(me)) {
        bar.append(el('button', {
          class: 'btn btn-outline', html: S.icon('pen') + '<span>פתיחת תיקון קטן</span>',
          onclick: () => S.openNewTask({ smallFixOf: t.id }),
        }));
      }
      bar.append(el('span', { style: 'font-size:12.5px;color:var(--ink-faint);align-self:center' }, 'המשימה נסגרה ב־' + S.fmtDate(t.closedAt)));
      return bar;
    }

    /* --- שלב עבודה --- */
    if (s.kind === 'work') {
      if (!s.assigneeId) {
        /* שיבוץ */
        if (S.can.assign(me)) {
          const workers = S.productionUsers().filter((u) => S.userDepts(u).includes(s.dept));
          const sel = S.select(workers.map((u) => [u.id, u.name]), '', null, { placeholder: 'בחירת עובד/ת…' });
          bar.append(
            el('div', { style: 'display:flex;gap:8px;align-items:center' },
              sel,
              el('button', {
                class: 'btn btn-primary', html: S.icon('user-plus') + '<span>שיבוץ</span>',
                onclick: () => {
                  if (!sel.value) return S.toast('צריך לבחור עובד/ת', 'err');
                  S.act.assign(t.id, sel.value);
                  S.toast('שובץ בהצלחה');
                },
              })));
        }
        if (S.userDepts(me).includes(s.dept) && !t.takeRequest) {
          bar.append(el('button', {
            class: 'btn btn-outline', html: S.icon('hand') + '<span>אני רוצה לקחת את המשימה</span>',
            onclick: () => { S.act.requestTake(t.id); S.toast('הבקשה נשלחה לאישור'); },
          }));
        }
      } else if (s.assigneeId === me.id) {
        if (!s.started) {
          bar.append(el('button', {
            class: 'btn btn-primary', html: S.icon('play') + '<span>התחלת עבודה</span>',
            onclick: () => S.act.startWork(t.id),
          }));
        } else {
          bar.append(el('button', {
            class: 'btn btn-primary', html: S.icon('upload') + '<span>הגשת גרסה ' + (t.versions.length + 1) + '</span>',
            onclick: () => openSubmitModal(t),
          }));
        }
      }
      /* העברה לעובד אחר / החזרה לשיבוץ */
      if (s.assigneeId && S.can.assign(me)) {
        bar.append(el('button', {
          class: 'btn btn-ghost', html: S.icon('rotate') + '<span>שינוי שיבוץ</span>',
          onclick: () => openReassignModal(t),
        }));
      }
    }

    /* --- שלב אישור (כולל ממלא/ת מקום) --- */
    if (s.kind === 'approval' && S.canActOnStep(t, s, me.id)) {
      bar.append(
        el('button', {
          class: 'btn btn-primary', html: S.icon('thumbs-up') + '<span>אישור והעברה הלאה</span>',
          onclick: () => { S.act.approve(t.id); S.toast('אושר ועבר לשלב הבא'); },
        }),
        el('button', {
          class: 'btn btn-danger', html: S.icon('undo') + '<span>החזרה לתיקונים</span>',
          onclick: () => openRejectModal(t),
        }));
    }

    /* --- שלב ניהול לקוח (כולל ממלא/ת מקום) --- */
    if (s.kind === 'account' && S.canActOnStep(t, s, me.id)) {
      bar.append(
        el('button', {
          class: 'btn btn-primary', html: S.icon('check') + '<span>אישור וסגירה</span>',
          onclick: () => S.confirm('סגירת משימה', 'המשימה תסומן כסגורה. אפשר יהיה לפתוח עליה תיקון קטן בהמשך.', 'סגירת המשימה', () => { S.act.closeTask(t.id); S.toast('המשימה נסגרה 🎉'); }),
        }),
        el('button', {
          class: 'btn btn-outline', html: S.icon('message-square') + '<span>החזרה עם הערות לקוח</span>',
          onclick: () => openClientNotesModal(t),
        }));
    }

    /* --- הערות לקוח בכל שלב (מנהל/ת הלקוח) --- */
    if (s.kind !== 'account' && amOfClient) {
      bar.append(el('button', {
        class: 'btn btn-ghost', html: S.icon('message-square') + '<span>הערות לקוח — החזרה לתחילת הסבב</span>',
        onclick: () => openClientNotesModal(t),
      }));
    }

    /* עריכת פרטים — פותח/ת, מנהל/ת הלקוח או הרשאת ניהול */
    if (!t.closed && (t.createdBy === me.id || me.isAdmin || amOfClient)) {
      bar.append(el('button', {
        class: 'btn btn-ghost', html: S.icon('pen') + '<span>עריכה</span>',
        onclick: () => openEditModal(t),
      }));
    }

    const canDelete = t.createdBy === me.id || me.isAdmin;
    if (!bar.children.length && !canDelete) {
      bar.append(el('span', { style: 'font-size:12.5px;color:var(--ink-faint)' },
        'אין פעולות זמינות עבורך בשלב הזה — ', el('strong', null, currentWaitText(t))));
    }

    /* מחיקה — לפותח/ת המשימה או הרשאת ניהול */
    if (canDelete) {
      bar.append(el('button', {
        class: 'btn btn-ghost btn-sm', style: 'margin-right:auto;color:var(--danger)',
        html: S.icon('x') + '<span>מחיקה</span>', title: 'מחיקת המשימה לצמיתות',
        onclick: () => S.confirm('מחיקת משימה', 'המשימה "' + t.title + '" תימחק לצמיתות, כולל הגרסאות וההערות שלה.', 'מחיקה', () => {
          S.closeDrawer();
          S.act.deleteTask(t.id);
          S.toast('המשימה נמחקה');
        }, true),
      }));
    }
    return bar;
  }

  function currentWaitText(t) {
    const s = t.steps[t.cur];
    const uid = S.stepOwnerId(t, s);
    if (!uid) return 'המשימה ממתינה לשיבוץ';
    return 'המשימה אצל ' + S.user(uid).name;
  }

  /* ============================ מודאלים ============================ */

  /* --- הגשת גרסה --- */
  function openSubmitModal(t) {
    const note = el('textarea', { placeholder: 'מה כדאי שהמאשר/ת ידעו על הגרסה הזו?' });
    const link = el('input', { type: 'url', placeholder: 'https://… (גוגל סליידס, פיגמה, דרייב)', dir: 'ltr', style: 'text-align:left' });

    const open = t.feedback.filter((f) => !f.resolved);
    const checks = open.map((fb) => {
      const c = el('input', { type: 'checkbox', checked: true });
      c.dataset.fid = fb.id;
      return el('label', { class: 'check' }, c, el('span', null, shorten(fb.text, 90)));
    });

    const bodyNodes = [
      S.field('קישור לתוצר', link, { hint: 'בדמו אפשר להשאיר ריק או להדביק כל קישור' }),
      S.field('הערה למאשר/ת', note),
    ];
    if (open.length) {
      bodyNodes.push(S.field('אילו הערות טופלו בגרסה הזו?', el('div', { style: 'display:flex;flex-direction:column;gap:7px' }, checks),
        { hint: 'ההערות המסומנות יופיעו למאשר/ת כ"טופל" לצד הגרסה החדשה' }));
    }

    S.openModal('הגשת גרסה ' + (t.versions.length + 1), bodyNodes, [
      el('button', {
        class: 'btn btn-primary', html: S.icon('send') + '<span>הגשה והעברה לשלב הבא</span>',
        onclick: () => {
          const fixIds = checks.filter((lb) => lb.querySelector('input').checked).map((lb) => lb.querySelector('input').dataset.fid);
          S.act.submitVersion(t.id, { note: note.value, link: link.value, fixIds });
          S.closeModal();
          S.toast('הגרסה הוגשה ועברה הלאה במסלול');
        },
      }),
      el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
    ]);
  }

  /* --- החזרה לתיקונים --- */
  function openRejectModal(t) {
    const workSteps = t.steps
      .map((s, i) => ({ s, i }))
      .filter((x) => x.s.kind === 'work' && x.i < t.cur);
    let j = workSteps[workSteps.length - 1].i;

    const text = el('textarea', { placeholder: 'מה צריך לתקן? ההערות יופיעו לעובד/ת וילוו את המשימה.' });
    let returnTo = 'same';
    let directBack = false;
    let otherSel = null;

    /* אזור "למי חוזרת" — נבנה מחדש כשמחליפים שלב יעד */
    const retArea = el('div', { style: 'display:flex;flex-direction:column;gap:14px' });
    function rebuildRetArea() {
      const ws = t.steps[j];
      const worker = ws.assigneeId ? S.user(ws.assigneeId) : null;
      returnTo = 'same';
      const others = S.productionUsers().filter((u) => S.userDepts(u).includes(ws.dept) && u.id !== ws.assigneeId);
      otherSel = S.select(others.map((u) => [u.id, u.name]), '', null, { placeholder: 'בחירת עובד/ת…' });
      otherSel.style.display = 'none';

      const retSel = S.select([
        ['same', worker ? 'חזרה ל' + worker.name + ' (ביצע/ה את העבודה)' : 'חזרה לשלב — ללא שיבוץ'],
        ['other', 'העברה לעובד/ת אחר/ת'],
        ['pool', 'החזרה לשיבוץ מחדש'],
      ], 'same', (v) => {
        returnTo = v;
        otherSel.style.display = v === 'other' ? '' : 'none';
      });

      retArea.innerHTML = '';
      retArea.append(S.field('למי חוזרת המשימה?', retSel), otherSel);

      /* "ישר אליי" — רק אם יש אישורים בדרך חזרה אליי */
      const between = t.steps.slice(j + 1, t.cur).filter((x) => x.kind === 'approval');
      directBack = false;
      if (between.length) {
        retArea.append(el('div', null, S.toggleEl(
          'אחרי התיקון — ישר אליי (דילוג על ' + between.map((x) => S.SLOTS[x.slot].name).join(', ') + ')',
          false, (v) => { directBack = v; })));
      }
    }

    const bodyNodes = [S.field('הערות לתיקון', text, { required: true })];

    /* מסלול עם כמה שלבי עבודה — בוחרים לאן חוזרים */
    if (workSteps.length > 1) {
      const stageSel = S.select(workSteps.map(({ s, i }) => [String(i),
        'עבודת ' + S.DEPTS[s.dept].name + (s.assigneeId ? ' — ' + S.user(s.assigneeId).name : ''),
      ]), String(j), (v) => { j = +v; rebuildRetArea(); });
      bodyNodes.push(S.field('לאיזה שלב חוזרת המשימה?', stageSel,
        { hint: 'שלבי עבודה שאחרי שלב היעד ייעשו שוב בהמשך הסבב' }));
    }

    bodyNodes.push(retArea);
    rebuildRetArea();

    S.openModal('החזרה לתיקונים', bodyNodes, [
      el('button', {
        class: 'btn btn-danger', html: S.icon('undo') + '<span>החזרה לתיקונים</span>',
        onclick: () => {
          if (!text.value.trim()) return S.toast('צריך לכתוב מה לתקן', 'err');
          let ret = returnTo;
          if (returnTo === 'other') {
            if (!otherSel.value) return S.toast('צריך לבחור עובד/ת', 'err');
            ret = otherSel.value;
          }
          S.act.reject(t.id, { text: text.value, returnTo: ret, directBack, stepIndex: j });
          S.closeModal();
          S.toast('המשימה חזרה לתיקונים');
        },
      }),
      el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
    ]);
  }

  /* --- הערות לקוח --- */
  function openClientNotesModal(t) {
    const text = el('textarea', { placeholder: 'ההערות שהגיעו מהלקוח…' });
    S.openModal('הערות לקוח', [
      el('p', { style: 'font-size:13px;color:var(--ink-soft)' },
        'ההערות יתועדו על המשימה והיא תחזור לתחילת סבב העבודה — לעובד/ת שביצעו אותה.'),
      S.field('ההערות', text, { required: true }),
    ], [
      el('button', {
        class: 'btn btn-primary', html: S.icon('message-square') + '<span>שליחה והחזרה לסבב</span>',
        onclick: () => {
          if (!text.value.trim()) return S.toast('צריך לכתוב את ההערות', 'err');
          S.act.clientNotes(t.id, text.value);
          S.closeModal();
          S.toast('המשימה חזרה לתחילת הסבב עם הערות הלקוח');
        },
      }),
      el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
    ]);
  }

  /* --- שיבוץ / שינוי שיבוץ (משמש גם ככפתור מהיר בניהול עבודה, עובד גם בטאץ') --- */
  S.openAssignModal = function (taskId) {
    const t = S.task(taskId);
    const s = t.steps[t.cur];
    if (!s || s.kind !== 'work') return;
    const workers = S.productionUsers().filter((u) => S.userDepts(u).includes(s.dept) && u.id !== s.assigneeId);
    const sel = S.select(workers.map((u) => [u.id, u.name]), '', null, { placeholder: 'בחירת עובד/ת…' });
    S.openModal(s.assigneeId ? 'שינוי שיבוץ' : 'שיבוץ המשימה', [
      s.assigneeId ? el('p', { style: 'font-size:13px;color:var(--ink-soft)' }, 'כרגע אצל ' + S.user(s.assigneeId).name) : null,
      S.field('שיבוץ לעובד/ת (' + S.DEPTS[s.dept].name + ')', sel),
    ], [
      el('button', {
        class: 'btn btn-primary', onclick: () => {
          if (!sel.value) return S.toast('צריך לבחור עובד/ת', 'err');
          S.act.assign(t.id, sel.value);
          S.closeModal();
        },
      }, s.assigneeId ? 'העברה' : 'שיבוץ'),
      s.assigneeId ? el('button', {
        class: 'btn btn-outline', onclick: () => { S.act.assign(t.id, null); S.closeModal(); },
      }, 'החזרה לשיבוץ') : null,
      el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
    ]);
  };
  const openReassignModal = (t) => S.openAssignModal(t.id);

  /* --- עריכת פרטי משימה --- */
  function openEditModal(t) {
    const title = el('input', { type: 'text', value: t.title });
    const brief = el('textarea', null, t.brief || '');
    const deadline = el('input', { type: 'date', value: t.deadline.slice(0, 10) });
    let size = t.size;
    const sizeSeg = S.segmented([['S', 'S — קטנה'], ['M', 'M — בינונית'], ['L', 'L — גדולה']], size, (v) => { size = v; });
    let urgent = t.urgent;
    const urgentToggle = S.toggleEl('זה ממש דחוף לי', urgent, (v) => { urgent = v; });

    /* דדליינים לשלבי עבודה שעוד לא הסתיימו */
    const dueInputs = [];
    t.steps.forEach((s, i) => {
      if (s.kind === 'work' && s.state !== 'done') {
        const inp = el('input', { type: 'date', value: s.due ? s.due.slice(0, 10) : '' });
        dueInputs.push([i, inp, S.DEPTS[s.dept].name]);
      }
    });

    const bodyNodes = [
      S.field('שם המשימה', title, { required: true }),
      S.field('בריף', brief),
      el('div', { class: 'form-row' },
        S.field('דדליין סופי', deadline),
        S.field('גודל', sizeSeg, { hint: 'שינוי גודל לא מחשב מסלול מחדש' })),
      el('div', null, urgentToggle),
    ];
    if (dueInputs.length) {
      bodyNodes.push(S.field('דדליין לשלבי העבודה',
        el('div', { class: 'form-row' }, dueInputs.map(([i, inp, name]) => S.field('עבודת ' + name, inp)))));
    }

    S.openModal('עריכת משימה', bodyNodes, [
      el('button', {
        class: 'btn btn-primary', html: S.icon('check') + '<span>שמירה</span>',
        onclick: () => {
          if (!title.value.trim()) return S.toast('צריך שם למשימה', 'err');
          if (!deadline.value) return S.toast('צריך דדליין', 'err');
          const stepDues = {};
          dueInputs.forEach(([i, inp]) => {
            stepDues[i] = inp.value ? new Date(inp.value + 'T12:00:00').toISOString() : null;
          });
          S.act.updateTask(t.id, {
            title: title.value.trim(),
            brief: brief.value.trim(),
            deadline: new Date(deadline.value + 'T12:00:00').toISOString(),
            size, urgent,
            stepDues,
          });
          S.closeModal();
          S.toast('המשימה עודכנה');
        },
      }),
      el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
    ]);
  }

  /* ============================ משימה חדשה ============================ */

  S.openNewTask = function (prefill = {}) {
    const me = S.cur();
    const base = prefill.smallFixOf ? S.task(prefill.smallFixOf) : null;

    const draft = {
      title: base ? 'תיקון קטן: ' + base.title : '',
      clientId: base ? base.clientId : (S.clientsOf(me.id)[0] || S.db.clients[0]).id,
      typeId: base ? base.typeId : '',
      subId: base ? base.subId : '',
      size: base ? 'S' : 'M',
      urgent: false,
      deadline: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
      brief: '',
      assigneeId: '',
      projectId: base ? (base.projectId || '') : '',
      newProjectName: '',
      addedSlots: [],
      skippedRuleIds: [],
      smallFix: !!prefill.smallFixOf,
      smallFixOf: prefill.smallFixOf || null,
    };

    /* דדליינים פר־שלב: ערכים לפי אינדקס טוקן במסלול */
    const dueState = { values: {}, touched: {}, sig: '' };

    const title = el('input', { type: 'text', placeholder: 'למשל: פוסט סושיאל — קמפיין החורף', value: draft.title });
    const brief = el('textarea', { placeholder: 'מה צריך לעשות, איפה החומרים, מה חשוב לדעת…' });
    const deadline = el('input', { type: 'date', value: draft.deadline });

    const clientSel = S.select(S.db.clients.map((c) => [c.id, c.name + (c.isNew ? ' · לקוח חדש' : '')]), draft.clientId, (v) => { draft.clientId = v; draft.projectId = ''; rebuildProject(); refresh(); });

    /* פרויקט (רשות) — מקבץ משימות קשורות */
    const projWrap = el('div');
    const newProjInput = el('input', { type: 'text', placeholder: 'שם הפרויקט החדש…', style: 'margin-top:6px' });
    function rebuildProject() {
      projWrap.innerHTML = '';
      const opts = [['', 'ללא פרויקט'],
        ...S.db.projects.filter((p) => p.clientId === draft.clientId).map((p) => [p.id, p.name]),
        ['__new', '+ פרויקט חדש']];
      const sel = S.select(opts, draft.projectId, (v) => {
        draft.projectId = v === '__new' ? '' : v;
        newProjInput.style.display = v === '__new' ? '' : 'none';
        draft._newProj = v === '__new';
      });
      newProjInput.style.display = draft._newProj ? '' : 'none';
      projWrap.append(S.field('פרויקט (רשות)', sel, { hint: 'משימות באותו פרויקט מקושרות זו לזו' }), newProjInput);
    }
    rebuildProject();

    const typeSel = S.select(S.db.types.map((tp) => [tp.id, tp.name]), draft.typeId, (v) => {
      draft.typeId = v;
      draft.subId = S.type(v).subs[0].id;
      rebuildSubSel();
      refresh();
    }, { placeholder: 'בחירת סוג…' });

    let subSel = S.select([], '', null);
    function rebuildSubSel() {
      const subs = draft.typeId ? S.type(draft.typeId).subs : [];
      const next = S.select(subs.map((sb) => [sb.id, sb.name]), draft.subId, (v) => { draft.subId = v; refresh(); });
      subSel.replaceWith(next);
      subSel = next;
    }

    const sizeSeg = S.segmented([['S', 'S — קטנה'], ['M', 'M — בינונית'], ['L', 'L — גדולה']], draft.size, (v) => { draft.size = v; refresh(); });

    const urgentToggle = S.toggleEl('זה ממש דחוף לי', false, (v) => { draft.urgent = v; });

    /* שיבוץ ראשוני */
    const assignWrap = el('div');
    function rebuildAssign() {
      assignWrap.innerHTML = '';
      if (S.can.assign(me) && draft.typeId && draft.subId) {
        const route = S.computeRoute(draft);
        const first = route.tokens[0];
        if (first && first.startsWith('w:')) {
          const dept = first.slice(2);
          const workers = S.productionUsers().filter((u) => S.userDepts(u).includes(dept));
          const sel = S.select([
            ['', 'ללא שיבוץ — יעבור ללוח השיבוץ'],
            ...workers.map((u) => [u.id, u.name]),
          ], draft.assigneeId, (v) => { draft.assigneeId = v; });
          assignWrap.append(S.field('שיבוץ ל' + S.DEPTS[dept].name + ' (רשות)', sel));
        }
      }
    }

    /* --- תצוגת מסלול חיה --- */
    const preview = el('div', { class: 'route-preview' });
    function refresh() {
      preview.innerHTML = '';
      if (!draft.typeId || !draft.subId) {
        preview.append(el('h4', { html: S.icon('wand') + 'המסלול ייקבע אחרי בחירת סוג התוצר' }));
        rebuildAssign();
        return;
      }
      draft.title = title.value;
      const route = S.computeRoute(draft);

      preview.append(el('h4', { html: S.icon('wand') + 'המסלול שהמשימה תעבור' }));
      preview.append(S.routeInline(route.tokens, draft.addedSlots));

      /* כללים שהופעלו */
      if (route.fired.length) {
        const why = el('div', { class: 'why-route' });
        route.fired.forEach((f) => {
          const row = el('div', { class: 'why-item' });
          row.innerHTML = S.icon(f.applied ? 'zap' : 'info') +
            '<strong>' + S.esc(f.rule.name) + '</strong> — <span>' + S.esc(f.note) + '</span>';
          why.append(row);

          /* כלל בשיקול דעת מנהל/ת לקוח — אפשר לבטל */
          if (f.rule.lock === 'am-discretion') {
            const skipped = draft.skippedRuleIds.includes(f.rule.id);
            why.append(el('div', { style: 'margin-right:20px' }, S.toggleEl(
              skipped ? 'הכלל בוטל — המשימה תעבור את המסלול המלא' : 'להפעיל את הכלל (שיקול דעת מנהל/ת הלקוח)',
              !skipped,
              (v) => {
                if (v) draft.skippedRuleIds = draft.skippedRuleIds.filter((x) => x !== f.rule.id);
                else draft.skippedRuleIds.push(f.rule.id);
                refresh();
              })));
          }
        });
        preview.append(why);
      }

      /* עקיפה ידנית — הוספה בלבד (לחומרה) */
      const missing = Object.keys(S.SLOTS).filter((slot) => !route.tokens.includes('a:' + slot));
      const addable = missing.filter((slot) => ['creative', 'partner'].includes(slot) || S.type(draft.typeId).primary === slot);
      const overrideRow = el('div', { class: 'override-row' }, el('span', { class: 'lbl' }, 'עקיפה ידנית (הוספה בלבד):'));
      addable.forEach((slot) => {
        overrideRow.append(el('button', {
          type: 'button', class: 'btn btn-outline btn-sm', html: S.icon('plus') + '<span>' + S.esc(S.SLOTS[slot].name) + '</span>',
          onclick: () => { draft.addedSlots.push(slot); refresh(); },
        }));
      });
      draft.addedSlots.forEach((slot) => {
        overrideRow.append(el('button', {
          type: 'button', class: 'btn btn-ghost btn-sm', html: S.icon('x') + '<span>ביטול ' + S.esc(S.SLOTS[slot].name) + '</span>',
          onclick: () => { draft.addedSlots = draft.addedSlots.filter((x) => x !== slot); refresh(); },
        }));
      });
      if (addable.length || draft.addedSlots.length) preview.append(overrideRow);

      /* דדליין לכל שלב עבודה — הצעה אוטומטית, ניתן לעריכה */
      const workIdxs = route.tokens.map((tk, i) => (tk.startsWith('w:') ? i : -1)).filter((i) => i >= 0);
      const sig = route.tokens.join('|') + '@' + deadline.value;
      if (dueState.sig !== sig) {
        dueState.sig = sig;
        const total = Math.max(1, S.daysTo(new Date(deadline.value + 'T12:00:00')));
        workIdxs.forEach((tokIdx, k) => {
          if (!dueState.touched[tokIdx]) {
            const days = Math.max(1, Math.round(total * (k + 1) / (workIdxs.length + 1)));
            dueState.values[tokIdx] = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
          }
        });
      }
      if (workIdxs.length) {
        const duesRow = el('div', { class: 'dues-row' }, el('span', { class: 'lbl' }, 'דדליין לשלבי העבודה:'));
        workIdxs.forEach((tokIdx) => {
          const inp = el('input', {
            type: 'date', value: dueState.values[tokIdx] || '',
            onchange: (e) => { dueState.values[tokIdx] = e.target.value; dueState.touched[tokIdx] = true; },
          });
          duesRow.append(el('label', { class: 'due-edit' }, S.DEPTS[route.tokens[tokIdx].slice(2)].name, inp));
        });
        preview.append(duesRow);
      }

      rebuildAssign();
    }

    deadline.addEventListener('change', () => refresh());

    const bodyNodes = [
      S.field('שם המשימה', title, { required: true }),
      el('div', { class: 'form-row' },
        S.field('לקוח', clientSel, { required: true }),
        S.field('סוג תוצר', typeSel, { required: true })),
      el('div', { class: 'form-row' },
        S.field('תת־סוג', subSel),
        S.field('דדליין', deadline, { hint: 'ברירת מחדל: שבוע מהיום' })),
      projWrap,
      el('div', { class: 'form-row' },
        S.field('גודל המשימה', sizeSeg),
        S.field('דחיפות', el('div', { style: 'padding-top:8px' }, urgentToggle))),
      S.field('בריף', brief),
      preview,
      assignWrap,
    ];

    if (draft.smallFixOf) rebuildSubSel();
    refresh();

    S.openModal(draft.smallFixOf ? 'פתיחת תיקון קטן' : 'משימה חדשה', bodyNodes, [
      el('button', {
        class: 'btn btn-primary', html: S.icon('plus') + '<span>פתיחת המשימה</span>',
        onclick: () => {
          draft.title = title.value;
          draft.brief = brief.value;
          draft.deadline = new Date(deadline.value + 'T12:00:00').toISOString();
          if (!draft.title.trim()) return S.toast('צריך לתת שם למשימה', 'err');
          if (!draft.clientId) return S.toast('צריך לבחור לקוח', 'err');
          if (!draft.typeId || !draft.subId) return S.toast('צריך לבחור סוג תוצר', 'err');
          if (!deadline.value) return S.toast('צריך לקבוע דדליין', 'err');
          if (draft._newProj) draft.newProjectName = newProjInput.value;
          const finalRoute = S.computeRoute(draft);
          draft.stepDues = finalRoute.tokens.map((tk, i) =>
            (tk.startsWith('w:') && dueState.values[i]) ? new Date(dueState.values[i] + 'T12:00:00').toISOString() : null);
          const t = S.act.createTask(draft);
          S.closeModal();
          S.toast('המשימה נפתחה' + (draft.assigneeId ? ' ושובצה' : ' והועברה לשיבוץ'));
          S.openDrawer(t.id);
        },
      }),
      el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
    ]);
  };
})();
