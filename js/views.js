/* ============================================================
   סימי — מסכים
   ============================================================ */
window.S = window.S || {};

(function () {
  const el = S.el;

  /* ---------- הגדרת ניווט ---------- */
  const APPROVER_ROLES = ['creativeManager', 'partner', 'studioManager', 'videoManager', 'accountManager', 'accountLead', 'vpCreative'];

  S.navItems = function () {
    const me = S.cur();
    const items = [
      { id: 'my', label: 'המשימות שלי', icon: 'home', badge: S.tasksAssignedTo(me.id).length },
    ];
    if (me.roles.some((r) => APPROVER_ROLES.includes(r))) {
      items.push({ id: 'approvals', label: 'ממתין לאישורי', icon: 'stamp', badge: S.tasksAwaiting(me.id).length });
    }
    items.push({ id: 'clients', label: 'לוח לקוחות', icon: 'briefcase', badge: 0 });
    if (S.can.assign(me)) {
      items.push({ id: 'workload', label: 'ניהול עבודה', icon: 'users', badge: S.tasksInPool().length + S.pendingTakeRequests().length });
    }
    items.push({ id: 'kanban', label: 'קנבן', icon: 'kanban', badge: 0 });
    if (S.can.admin(me)) {
      items.push({ id: 'admin', label: 'ניהול המערכת', icon: 'settings', badge: 0 });
    }
    return items;
  };

  /* ---------- ראוטר ---------- */
  const VIEWS = {};

  S.renderMain = function () {
    const main = document.getElementById('main');
    const me = S.cur();
    let route = S.db.route;
    const valid = S.navItems().map((n) => n.id);
    if (!valid.includes(route)) route = 'my';
    main.innerHTML = '';
    main.append(VIEWS[route](me));
  };

  const pageHead = (title, sub, tools) =>
    el('div', { class: 'page-head' },
      el('div', null, el('h1', null, title), sub ? el('p', { class: 'sub' }, sub) : null),
      tools ? el('div', { class: 'page-tools' }, tools) : null);

  const sectionTitle = (icon, text, count) =>
    el('h2', { class: 'section-title' },
      el('span', { html: S.icon(icon) }), text,
      count != null ? el('span', { class: 'count' }, '(' + count + ')') : null);

  const grid = (tasks, opts) => tasks.length
    ? el('div', { class: 'card-grid' }, tasks.map((t) => S.taskCard(t, opts)))
    : S.empty('אין כאן משימות כרגע');

  const byDeadline = (a, b) => (b.urgent - a.urgent) || (new Date(a.deadline) - new Date(b.deadline));

  /* ============================================================
     המשימות שלי
     ============================================================ */
  VIEWS.my = function (me) {
    const box = el('div');

    /* באנר היכרות לבודקים — כולל קפיצה לתרחישים חיים */
    if (!S.db.hintDismissed) {
      const scenario = (label, icon, onclick) =>
        el('button', { class: 'btn btn-outline btn-sm', html: S.icon(icon) + '<span>' + label + '</span>', onclick });

      box.append(el('div', { class: 'hint-banner' },
        el('span', { class: 'hint-ic', html: S.icon('sparkles') }),
        el('div', { style: 'flex:1;min-width:0' },
          el('div', null,
            el('strong', null, 'ברוכים הבאים לדמו של סימי! '),
            'כל הנתונים מדומים ונשמרים רק בדפדפן שלכם — כל מי שפותח את הלינק מקבל עותק נפרד משלו. הטריק המרכזי: מחליפים משתמש בכפתור שלמעלה כדי לחוות את המערכת מכל תפקיד, וכשמשימה "אצל מישהו אחר" יש כפתור לקפוץ אליו ולהמשיך. "איפוס הדמו" בתחתית התפריט מחזיר הכול להתחלה.'),
          el('div', { class: 'hint-actions' },
            el('span', { class: 'ha-label' }, 'קפיצה לרגע מעניין:'),
            scenario('לאשר בתור שותפה', 'stamp', () => {
              S.act.switchUser('u_yael');
              const t = S.db.tasks.find((x) => !x.closed && S.canActOnStep(x, x.steps[x.cur], 'u_yael'));
              if (t) S.openDrawer(t.id); else S.act.goto('approvals');
            }),
            scenario('לתקן עבודה שנדחתה', 'undo', () => {
              const t = S.db.tasks.find((x) => S.statusOf(x) === 'fixing');
              if (!t) return S.toast('אין כרגע משימות בתיקונים — נסו להחזיר אחת', 'err');
              S.act.switchUser(t.steps[t.cur].assigneeId || 'u_yoni');
              S.openDrawer(t.id);
            }),
            scenario('לשבץ עבודה בגרירה', 'users', () => {
              S.act.switchUser('u_roi');
              S.act.goto('workload');
            }))),
        el('button', { class: 'btn-close', html: S.icon('x'), 'aria-label': 'סגירת ההסבר', onclick: () => S.act.dismissHint() })));
    }

    box.append(pageHead('שלום, ' + me.name.split(' ')[0], 'ככה נראה היום שלך בסימי'));

    /* כרטיסים עם פעולה מהירה — בלי לפתוח את המגירה */
    const mine = S.tasksAssignedTo(me.id).sort(byDeadline);
    box.append(sectionTitle('pen', 'בעבודה אצלי', mine.length),
      mine.length ? el('div', { class: 'card-grid' }, mine.map((t) => {
        const s = t.steps[t.cur];
        const action = !s.started
          ? { label: 'התחלת עבודה', icon: 'play', onclick: () => { S.act.startWork(t.id); S.toast('יצאנו לדרך'); } }
          : { label: 'הגשת גרסה ' + (t.versions.length + 1), icon: 'upload', onclick: () => S.openSubmitModal(t.id) };
        return S.taskCard(t, { action });
      })) : S.empty('אין כאן משימות כרגע'));

    const awaiting = S.tasksAwaiting(me.id).sort(byDeadline);
    if (awaiting.length) {
      box.append(sectionTitle('stamp', 'ממתין לאישורי', awaiting.length),
        el('div', { class: 'card-grid' }, awaiting.map((t) => S.taskCard(t, {
          action: {
            label: t.steps[t.cur].kind === 'account' ? 'סגירה מול הלקוח' : 'לבדיקה ואישור',
            icon: 'stamp',
            onclick: () => S.openDrawer(t.id),
          },
        }))));
    }

    /* זמינות לקחת — לפי המחלקות שלי */
    const myDepts = S.userDepts(me);
    if (myDepts.length) {
      const pool = S.tasksInPool().filter((t) => {
        const s = t.steps[t.cur];
        return myDepts.includes(s.dept);
      }).sort(byDeadline);
      if (pool.length) {
        box.append(sectionTitle('hand', 'פנויות לשיבוץ — אפשר לבקש לקחת', pool.length), grid(pool));
      }
    }

    const created = S.db.tasks.filter((t) => t.createdBy === me.id && !t.closed).sort(byDeadline);
    if (created.length) {
      box.append(sectionTitle('send', 'משימות שפתחתי', created.length), grid(created));
    }

    return box;
  };

  /* ============================================================
     ממתין לאישורי
     ============================================================ */
  VIEWS.approvals = function (me) {
    const box = el('div');
    box.append(pageHead('ממתין לאישורי', 'תוצרים שעצרו אצלך — כל אישור מזיז את המשימה הלאה במסלול'));

    const all = S.tasksAwaiting(me.id).sort(byDeadline);
    const approvals = all.filter((t) => t.steps[t.cur].kind === 'approval');
    const account = all.filter((t) => t.steps[t.cur].kind === 'account');

    const row = (t) => {
      const client = S.client(t.clientId);
      const lastV = t.versions[t.versions.length - 1];
      return el('div', { class: 'list-row', onclick: () => S.openDrawer(t.id) },
        el('div', { class: 'r-main' },
          el('div', { class: 'r-title' }, t.title),
          el('div', { class: 'r-sub' },
            client.name, '·', S.typeTag(t),
            lastV ? '· גרסה ' + lastV.n + ' של ' + S.user(lastV.byId).name : null)),
        el('div', { class: 'r-side' },
          t.urgent ? S.urgentChip() : null,
          S.dueEl(t),
          S.statusChip(t)));
    };

    box.append(sectionTitle('stamp', 'לאישור שלך', approvals.length));
    box.append(approvals.length ? el('div', { class: 'list' }, approvals.map(row)) : S.empty('אין תוצרים שממתינים לאישורך — נקי!', 'thumbs-up'));

    if (account.length || S.clientsOf(me.id).length) {
      box.append(sectionTitle('briefcase', 'אצלך מול הלקוח', account.length));
      box.append(account.length ? el('div', { class: 'list' }, account.map(row)) : S.empty('אין תוצרים שממתינים אצלך מול הלקוח'));
    }

    return box;
  };

  /* ============================================================
     לוח לקוחות
     ============================================================ */
  VIEWS.clients = function (me) {
    const box = el('div');
    box.append(pageHead('לוח לקוחות', 'כל מה שרץ עכשיו, לקוח־לקוח',
      S.toggleEl('הצגת סגורות', showClosed, (v) => { showClosed = v; S.renderMain(); })));

    S.db.clients.forEach((c) => {
      let active = S.db.tasks.filter((t) => t.clientId === c.id && !t.closed).sort(byDeadline);
      const closedTasks = S.db.tasks.filter((t) => t.clientId === c.id && t.closed);
      const closedCount = closedTasks.length;
      if (showClosed) active = active.concat(closedTasks);

      const head = el('div', { class: 'client-head' },
        el('h2', null, c.name),
        c.isNew ? el('span', { class: 'chip newclient', html: S.icon('sparkles') + 'לקוח חדש — סבב מלא על הכול' }) : null,
        el('div', { class: 'team' },
          el('span', { class: 'chip outline' }, 'קריאייטיב: ' + S.user(c.creativeManagerId).name),
          el('span', { class: 'chip outline' }, 'שותף/ה: ' + S.user(c.partnerId).name),
          el('span', { class: 'chip outline' }, 'ניהול לקוח: ' + S.user(c.accountManagerId).name)),
        el('span', { style: 'font-size:12px;color:var(--ink-faint);margin-right:auto' },
          active.length + ' פעילות' + (closedCount ? ' · ' + closedCount + ' סגורות' : '')));

      /* קיבוץ לפי פרויקטים */
      const content = el('div');
      if (!active.length) {
        content.append(S.empty('אין משימות פעילות ל' + c.name));
      } else {
        const inProj = new Set();
        S.db.projects.filter((p) => p.clientId === c.id).forEach((p) => {
          const pts = active.filter((t) => t.projectId === p.id);
          if (!pts.length) return;
          pts.forEach((t) => inProj.add(t.id));
          content.append(
            el('div', { class: 'proj-head', html: S.icon('folder') + S.esc(p.name) + ' <span class="count">(' + pts.length + ')</span>' }),
            el('div', { class: 'card-grid' }, pts.map((t) => S.taskCard(t, { hideClient: true }))));
        });
        const rest = active.filter((t) => !inProj.has(t.id));
        if (rest.length) {
          if (inProj.size) content.append(el('div', { class: 'proj-head plain' }, 'ללא פרויקט'));
          content.append(el('div', { class: 'card-grid' }, rest.map((t) => S.taskCard(t, { hideClient: true }))));
        }
      }

      box.append(el('div', { class: 'client-block' }, head, content));
    });

    return box;
  };

  /* ============================================================
     ניהול עבודה — עומסים ושיבוץ בגרירה
     ============================================================ */
  let wlDept = '';

  VIEWS.workload = function (me) {
    const box = el('div');
    box.append(pageHead('ניהול עבודה', 'מי עובד על מה — גוררים משימה בין עמודות כדי לשבץ או להעביר'));

    /* סינון לפי מחלקה — פחות גלילה אופקית */
    const deptChips = el('div', { class: 'filters' }, el('span', { class: 'f-label' }, 'מחלקה:'));
    [['', 'הכול'], ...Object.entries(S.DEPTS).map(([d, def]) => [d, def.name])].forEach(([d, label]) => {
      deptChips.append(el('button', {
        class: 'chip-filter' + (wlDept === d ? ' on' : ''),
        onclick: () => { wlDept = d; S.renderMain(); },
      }, label));
    });
    box.append(deptChips);

    const board = el('div', { class: 'board' });

    /* משימות בשלב עבודה בלבד — הן הניתנות לשיבוץ */
    let workTasks = S.db.tasks.filter((t) => !t.closed && t.steps[t.cur].kind === 'work');
    if (wlDept) workTasks = workTasks.filter((t) => t.steps[t.cur].dept === wlDept);

    /* --- עמודת שיבוץ --- */
    const pool = workTasks.filter((t) => !t.steps[t.cur].assigneeId).sort(byDeadline);
    board.append(makeDropCol({
      key: 'pool',
      head: el('div', { class: 'board-col-head' },
        el('span', { class: 'dot', style: 'background:var(--st-pool)' }),
        'בשיבוץ',
        el('span', { class: 'count' }, pool.length)),
      tasks: pool,
      accepts: () => true,
      onDrop: (t) => { S.act.assign(t.id, null); },
      extra: (t) => {
        if (!t.takeRequest) return null;
        const req = S.user(t.takeRequest.byId);
        return el('div', { class: 'take-req' },
          el('div', { style: 'display:flex;align-items:center;gap:7px' },
            S.avatarEl(req, 'sm'), el('strong', null, req.name), 'רוצה לקחת'),
          el('div', { class: 'tr-actions' },
            el('button', { class: 'btn btn-ok btn-sm', onclick: (e) => { e.stopPropagation(); S.act.approveTake(t.id); S.toast('שובץ ל' + req.name); } }, 'אישור'),
            el('button', { class: 'btn btn-ghost btn-sm', onclick: (e) => { e.stopPropagation(); S.act.declineTake(t.id); } }, 'דחייה')));
      },
    }));

    /* --- עמודה לכל עובד/ת ביצוע (עומס משוקלל לפי גודל: S=1, M=2, L=3) --- */
    S.productionUsers()
      .filter((u) => !wlDept || S.userDepts(u).includes(wlDept))
      .forEach((u) => {
        const mine = workTasks.filter((t) => t.steps[t.cur].assigneeId === u.id).sort(byDeadline);
        const depts = S.userDepts(u);
        const pts = mine.reduce((sum, t) => sum + (S.sizeWeight[t.size] || 1), 0);
        board.append(makeDropCol({
          key: u.id,
          head: el('div', { class: 'worker-col-head' },
            S.avatarEl(u),
            el('span', { class: 'w-meta' },
              el('strong', null, u.name),
              el('small', null, depts.map((d) => S.DEPTS[d].name).join(' · '))),
            el('span', { class: 'load' + (pts >= 6 ? ' hot' : ''), title: 'עומס משוקלל (S=1, M=2, L=3)' + (pts >= 6 ? ' — עומס גבוה' : '') }, mine.length + ' · ' + pts + ' נק׳')),
          tasks: mine,
          accepts: (t) => depts.includes(t.steps[t.cur].dept),
          onDrop: (t) => { S.act.assign(t.id, u.id); S.toast('שובץ ל' + u.name); },
        }));
      });

    box.append(board);
    return box;
  };

  function makeDropCol({ key, head, tasks, accepts, onDrop, extra }) {
    const bodyEl = el('div', { class: 'board-col-body' });
    tasks.forEach((t) => {
      const card = S.taskCard(t, { draggable: true, hideClient: false, chip: false });
      /* שיבוץ מהיר — עובד גם בטאץ' (אין גרירה בנייד) */
      card.append(el('button', {
        class: 'quick-assign', html: S.icon('user-plus'), title: 'שיבוץ / העברה',
        onclick: (e) => { e.stopPropagation(); S.openAssignModal(t.id); },
      }));
      bodyEl.append(card);
      if (extra) { const x = extra(t); if (x) bodyEl.append(x); }
    });
    if (!tasks.length) bodyEl.append(el('div', { style: 'font-size:12px;color:var(--ink-faint);text-align:center;padding:14px 6px' }, 'אפשר לגרור לכאן'));

    const col = el('div', { class: 'board-col', dataset: { key } }, head, bodyEl);

    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      const id = S.dragTaskId;
      const t = id && S.task(id);
      if (!t) return;
      const ok = accepts(t);
      col.classList.toggle('droppable-ok', ok);
      col.classList.toggle('droppable-no', !ok);
      e.dataTransfer.dropEffect = ok ? 'move' : 'none';
    });
    col.addEventListener('dragleave', () => col.classList.remove('droppable-ok', 'droppable-no'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('droppable-ok', 'droppable-no');
      const id = e.dataTransfer.getData('text/plain');
      const t = S.task(id);
      if (!t) return;
      if (!accepts(t)) {
        const dept = S.DEPTS[t.steps[t.cur].dept].name;
        return S.toast('אי אפשר — המשימה בשלב ' + dept, 'err');
      }
      onDrop(t);
    });
    return col;
  }

  let showClosed = false;

  /* ============================================================
     קנבן
     ============================================================ */
  const kanbanFilter = { clientId: '', typeId: '', onlyMine: false, q: '' };

  VIEWS.kanban = function (me) {
    const box = el('div');
    box.append(pageHead('קנבן', 'תמונת מצב לפי סטטוסים'));

    /* פילטרים */
    const clientSel = S.select([['', 'כל הלקוחות'], ...S.db.clients.map((c) => [c.id, c.name])], kanbanFilter.clientId, (v) => { kanbanFilter.clientId = v; S.renderMain(); });
    const typeSel = S.select([['', 'כל הסוגים'], ...S.db.types.map((tp) => [tp.id, tp.name])], kanbanFilter.typeId, (v) => { kanbanFilter.typeId = v; S.renderMain(); });

    const search = el('input', {
      id: 'kanbanQ', type: 'search', placeholder: 'חיפוש משימה…', value: kanbanFilter.q,
      oninput: (e) => {
        kanbanFilter.q = e.target.value;
        S.renderMain();
        const n = document.getElementById('kanbanQ');
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      },
    });

    const filters = el('div', { class: 'filters' },
      el('span', { class: 'f-label' }, 'סינון:'), search, clientSel, typeSel);

    if (S.clientsOf(me.id).length) {
      filters.append(S.toggleEl('רק הלקוחות שלי', kanbanFilter.onlyMine, (v) => { kanbanFilter.onlyMine = v; S.renderMain(); }));
    }
    box.append(filters);

    let tasks = S.db.tasks.slice();
    if (kanbanFilter.clientId) tasks = tasks.filter((t) => t.clientId === kanbanFilter.clientId);
    if (kanbanFilter.typeId) tasks = tasks.filter((t) => t.typeId === kanbanFilter.typeId);
    if (kanbanFilter.q.trim()) {
      const q = kanbanFilter.q.trim();
      tasks = tasks.filter((t) => {
        const sub = S.sub(t.typeId, t.subId);
        return (t.title + ' ' + S.client(t.clientId).name + ' ' + (sub ? sub.name : '')).includes(q);
      });
    }
    if (kanbanFilter.onlyMine) {
      const myClients = S.clientsOf(me.id).map((c) => c.id);
      tasks = tasks.filter((t) => myClients.includes(t.clientId));
    }

    const COLS = [
      { key: ['pool'], name: 'בשיבוץ', color: 'var(--st-pool)' },
      { key: ['assigned', 'working'], name: 'בעבודה', color: 'var(--st-working)' },
      { key: ['fixing'], name: 'בתיקונים', color: 'var(--st-fixing)' },
      { key: ['approval', 'partner'], name: 'באישורים', color: 'var(--st-approval)' },
      { key: ['account'], name: 'בניהול לקוח', color: 'var(--st-account)' },
      { key: ['closed'], name: 'סגורות', color: 'var(--st-closed)' },
    ];

    const board = el('div', { class: 'board' });
    COLS.forEach((c) => {
      const isClosed = c.key.includes('closed');
      let colTasks = tasks.filter((t) => c.key.includes(S.statusOf(t)));
      colTasks = isClosed
        ? colTasks.sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0))
        : colTasks.sort(byDeadline);
      const hidden = isClosed ? Math.max(0, colTasks.length - 8) : 0;
      if (hidden) colTasks = colTasks.slice(0, 8);
      const bodyEl = el('div', { class: 'board-col-body' },
        colTasks.length ? colTasks.map((t) => S.taskCard(t, { chip: c.key.length > 1 })) : el('div', { style: 'font-size:12px;color:var(--ink-faint);text-align:center;padding:14px 6px' }, '—'),
        hidden ? el('div', { style: 'font-size:12px;color:var(--ink-faint);text-align:center;padding:8px' }, 'ועוד ' + hidden + ' סגורות ישנות יותר') : null);
      board.append(el('div', { class: 'board-col' },
        el('div', { class: 'board-col-head' },
          el('span', { class: 'dot', style: 'background:' + c.color }),
          c.name,
          el('span', { class: 'count' }, colTasks.length)),
        bodyEl));
    });

    box.append(board);
    return box;
  };

  /* ============================================================
     ניהול המערכת
     ============================================================ */
  let adminTab = 'clients';

  VIEWS.admin = function (me) {
    const box = el('div');
    box.append(pageHead('ניהול המערכת', 'לקוחות, אנשים, כללים ומסלולי תוצרים'));

    const TABS = [['clients', 'לקוחות'], ['users', 'צוות'], ['rules', 'מנוע הכללים'], ['types', 'סוגי תוצרים ומסלולים']];
    const tabs = el('div', { class: 'tabs' }, TABS.map(([id, label]) =>
      el('button', { class: 'tab' + (adminTab === id ? ' on' : ''), onclick: () => { adminTab = id; S.renderMain(); } }, label)));
    box.append(tabs);

    if (adminTab === 'clients') box.append(adminClients());
    if (adminTab === 'users') box.append(adminUsers());
    if (adminTab === 'rules') box.append(adminRules());
    if (adminTab === 'types') box.append(adminTypes());

    return box;
  };

  function usersWithRole(roles) {
    return S.db.users.filter((u) => u.roles.some((r) => roles.includes(r)));
  }

  function adminClients() {
    const box = el('div');
    S.db.clients.forEach((c) => {
      const cdSel = S.select(usersWithRole(['creativeManager', 'vpCreative']).map((u) => [u.id, u.name]), c.creativeManagerId, (v) => S.act.updateClient(c.id, { creativeManagerId: v }));
      const pSel = S.select(usersWithRole(['partner']).map((u) => [u.id, u.name]), c.partnerId, (v) => S.act.updateClient(c.id, { partnerId: v }));
      const amSel = S.select(usersWithRole(['accountManager', 'accountLead']).map((u) => [u.id, u.name]), c.accountManagerId, (v) => S.act.updateClient(c.id, { accountManagerId: v }));

      box.append(el('div', { class: 'admin-card' },
        el('div', { class: 'ac-head' },
          el('h3', null, c.name, c.isNew ? el('span', { class: 'chip newclient', html: S.icon('sparkles') + 'לקוח חדש' }) : null),
          S.toggleEl('לקוח חדש (חודש ראשון)', c.isNew, (v) => S.act.updateClient(c.id, { isNew: v }))),
        el('p', { class: 'ac-desc' }, 'מי מאשר עבור הלקוח — לפי זה נקבעים שלבי האישור במסלול'),
        el('div', { class: 'admin-grid' },
          S.field('מנהל/ת קריאייטיב', cdSel),
          S.field('שותף/ה', pSel),
          S.field('מנהל/ת לקוח', amSel))));
    });
    return box;
  }

  function adminUsers() {
    const box = el('div');
    box.append(el('p', { class: 'ac-desc', style: 'margin-bottom:12px' },
      'ממלא/ת מקום מקבל/ת את כל האישורים של המשתמש (חופשה/מילואים) — שניהם רואים ויכולים לאשר.'));
    S.db.users.forEach((u) => {
      const subSel = S.select([
        ['', 'ללא ממלא/ת מקום'],
        ...S.db.users.filter((x) => x.id !== u.id).map((x) => [x.id, x.name]),
      ], u.substituteId || '', (v) => S.act.updateUser(u.id, { substituteId: v || null }));

      box.append(el('div', { class: 'admin-card' },
        el('div', { class: 'ac-head' },
          el('h3', null, S.avatarEl(u), u.name,
            u.substituteId ? el('span', { class: 'chip newclient', html: S.icon('user-swap') + 'מ״מ פעיל: ' + S.esc(S.user(u.substituteId).name) }) : null),
          el('div', { style: 'display:flex;gap:18px;flex-wrap:wrap' },
            S.toggleEl('סמכות שיבוץ', u.canAssign, (v) => S.act.updateUser(u.id, { canAssign: v })),
            S.toggleEl('הרשאת ניהול', u.isAdmin, (v) => S.act.updateUser(u.id, { isAdmin: v })))),
        el('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between' },
          el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
            u.roles.map((r) => el('span', { class: 'chip outline' }, S.ROLES[r].name))),
          S.field('ממלא/ת מקום', subSel))));
    });
    return box;
  }

  function adminRules() {
    const box = el('div');
    box.append(el('div', { style: 'margin-bottom:14px' },
      el('button', { class: 'btn btn-primary', html: S.icon('plus') + '<span>כלל חדש</span>', onclick: openNewRuleModal })));

    S.db.rules.forEach((r) => {
      const whenChips = [];
      const w = r.when || {};
      if (w.clientNew) whenChips.push(chipC('הלקוח בחודש הראשון'));
      if (w.smallFix) whenChips.push(chipC('תיקון קטן לתוצר מאושר'));
      if (w.clientIds) w.clientIds.forEach((cid) => whenChips.push(chipC('לקוח: ' + (S.client(cid) ? S.client(cid).name : cid))));
      if (w.typeIds) w.typeIds.forEach((tid) => whenChips.push(chipC('סוג: ' + (S.type(tid) ? S.type(tid).name : tid))));
      if (w.subIds) w.subIds.forEach((sid) => {
        const tp = S.db.types.find((t) => t.subs.some((sb) => sb.id === sid));
        const sb = tp && tp.subs.find((x) => x.id === sid);
        whenChips.push(chipC('תת־סוג: ' + (sb ? sb.name : sid)));
      });
      if (w.sizes) whenChips.push(chipC('גודל: ' + w.sizes.join(', ')));

      const thenChips = [];
      if (r.then.route === 'full') thenChips.push(chipT('מסלול אישורים מלא'));
      if (r.then.route === 'short') thenChips.push(chipT('ישירות לניהול הלקוח'));
      if (r.then.requirePartner) thenChips.push(chipT('חובה אישור שותף/ה'));

      box.append(el('div', { class: 'admin-card' + (r.active ? '' : ' inactive-rule') },
        el('div', { class: 'ac-head' },
          el('h3', { html: S.icon('zap') }, ' ' + r.name),
          el('div', { style: 'display:flex;gap:10px;align-items:center' },
            S.toggleEl('פעיל', r.active, () => S.act.toggleRule(r.id)),
            el('button', { class: 'btn btn-ghost btn-sm', html: S.icon('x'), title: 'מחיקת הכלל', onclick: () => S.confirm('מחיקת כלל', 'למחוק את "' + r.name + '"?', 'מחיקה', () => S.act.deleteRule(r.id), true) }))),
        el('p', { class: 'ac-desc' }, r.desc),
        el('div', { class: 'rule-cond' },
          el('span', { class: 'lbl' }, 'כאשר:'), whenChips,
          el('span', { class: 'rule-arrow', html: S.icon('arrow-left') }),
          el('span', { class: 'lbl' }, 'אז:'), thenChips),
        el('div', { class: 'rule-lock', html: r.lock === 'am-discretion'
          ? S.icon('unlock') + 'ניתן לביטול בשיקול דעת מנהל/ת הלקוח בעת פתיחת משימה'
          : S.icon('lock') + 'עקיפה ידנית אפשרית רק לחומרה (הוספת אישורים)' })));
    });
    return box;
  }

  const chipC = (txt) => el('span', { class: 'chip outline' }, txt);
  const chipT = (txt) => el('span', { class: 'chip st-approval' }, txt);

  function openNewRuleModal() {
    const name = el('input', { type: 'text', placeholder: 'למשל: קמפיינים גדולים למגדל — סבב מלא' });
    const desc = el('input', { type: 'text', placeholder: 'משפט שמסביר את הכלל למי שיפגוש אותו' });

    const allSubs = S.db.types.flatMap((tp) => tp.subs.map((sb) => [sb.id, tp.name + ' · ' + sb.name]));
    const COND_DEFS = {
      clientNew: { label: 'הלקוח בחודש הראשון', opts: null },
      smallFix:  { label: 'תיקון קטן לתוצר מאושר', opts: null },
      client:    { label: 'לקוח מסוים', opts: S.db.clients.map((c) => [c.id, c.name]) },
      type:      { label: 'סוג תוצר', opts: S.db.types.map((tp) => [tp.id, tp.name]) },
      sub:       { label: 'תת־סוג', opts: allSubs },
      size:      { label: 'גודל משימה', opts: [['S', 'S'], ['M', 'M'], ['L', 'L']] },
    };

    /* שורות תנאים — כולם צריכים להתקיים יחד (וגם) */
    const rows = [];
    const rowsBox = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });

    function addRow(type = 'clientNew') {
      const row = { type, valSel: null };
      const valWrap = el('span', { style: 'flex:1;display:flex' });
      function rebuildVal() {
        valWrap.innerHTML = '';
        const def = COND_DEFS[row.type];
        if (def.opts) {
          row.valSel = S.select(def.opts, def.opts[0][0], null);
          row.valSel.style.flex = '1';
          valWrap.append(row.valSel);
        } else row.valSel = null;
      }
      const typeSel = S.select(Object.entries(COND_DEFS).map(([k, d]) => [k, d.label]), type, (v) => { row.type = v; rebuildVal(); });
      rebuildVal();
      const rowEl = el('div', { style: 'display:flex;gap:8px;align-items:center' },
        rows.length ? el('span', { class: 'chip st-approval' }, 'וגם') : null,
        typeSel, valWrap,
        el('button', {
          class: 'btn btn-ghost btn-sm', html: S.icon('x'), title: 'הסרת התנאי',
          onclick: () => { rows.splice(rows.indexOf(row), 1); rowEl.remove(); },
        }));
      rows.push(row);
      rowsBox.append(rowEl);
    }
    addRow();

    const thenSel = S.select([
      ['full', 'המשימה תעבור מסלול אישורים מלא'],
      ['short', 'המשימה תעבור ישירות לניהול הלקוח'],
      ['partner', 'חובה אישור שותף/ה'],
    ], 'full', null);

    const lockSel = S.select([
      ['stricter-only', 'קשיח — עקיפה רק לחומרה'],
      ['am-discretion', 'שיקול דעת מנהל/ת הלקוח'],
    ], 'stricter-only', null);

    S.openModal('כלל חדש', [
      S.field('שם הכלל', name, { required: true }),
      S.field('הסבר קצר', desc),
      S.field('תנאים — הכלל חל כשכולם מתקיימים יחד', el('div', null, rowsBox,
        el('button', { class: 'btn btn-outline btn-sm', style: 'margin-top:8px', html: S.icon('plus') + '<span>עוד תנאי</span>', onclick: () => addRow('client') }))),
      S.field('תוצאה', thenSel),
      S.field('נעילה', lockSel),
    ], [
      el('button', {
        class: 'btn btn-primary', onclick: () => {
          if (!name.value.trim()) return S.toast('צריך שם לכלל', 'err');
          if (!rows.length) return S.toast('צריך לפחות תנאי אחד', 'err');
          const when = {};
          const push = (key, v) => { when[key] = when[key] || []; if (!when[key].includes(v)) when[key].push(v); };
          rows.forEach((row) => {
            if (row.type === 'clientNew') when.clientNew = true;
            if (row.type === 'smallFix') when.smallFix = true;
            if (row.type === 'client') push('clientIds', row.valSel.value);
            if (row.type === 'type') push('typeIds', row.valSel.value);
            if (row.type === 'sub') push('subIds', row.valSel.value);
            if (row.type === 'size') push('sizes', row.valSel.value);
          });
          const then = thenSel.value === 'partner' ? { requirePartner: true } : { route: thenSel.value };
          S.act.addRule({ name: name.value.trim(), desc: desc.value.trim(), when, then, lock: lockSel.value });
          S.closeModal();
          S.toast('הכלל נוסף ופעיל');
        },
      }, 'הוספת הכלל'),
      el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
    ]);
  }

  function adminTypes() {
    const box = el('div');
    box.append(el('p', { class: 'ac-desc', style: 'margin-bottom:12px' },
      'המסלול הבסיסי של כל תת־סוג. כללי המערכת (למשל "לקוח חדש") יכולים להרחיב או לקצר אותו בזמן פתיחת משימה.'));

    S.db.types.forEach((tp) => {
      const card = el('div', { class: 'admin-card' },
        el('div', { class: 'ac-head' }, el('h3', { html: S.icon(tp.icon) }, ' ' + tp.name)));

      tp.subs.forEach((sb) => {
        const routeEl = el('div', { class: 'route-edit' });

        sb.route.forEach((tk, i) => {
          if (tk === 'acct') {
            routeEl.append(el('span', { class: 're-step', html: S.icon('briefcase') + 'ניהול לקוח' }));
            return;
          }
          const isWork = tk.startsWith('w:');
          const label = isWork ? S.DEPTS[tk.slice(2)].name : S.SLOTS[tk.slice(2)].name;
          const icon = isWork ? S.DEPTS[tk.slice(2)].icon : 'stamp';
          const step = el('span', { class: 're-step', html: S.icon(icon) + S.esc(label) });

          const workCount = sb.route.filter((x) => x.startsWith('w:')).length;
          const removable = !isWork || workCount > 1;
          if (removable) {
            step.append(el('button', {
              class: 're-x', html: S.icon('x'), title: 'הסרת השלב',
              onclick: () => {
                const next = sb.route.filter((_, k) => k !== i);
                S.act.updateSubRoute(tp.id, sb.id, next);
              },
            }));
          }
          routeEl.append(step);
        });

        /* הוספת שלב */
        const addOpts = [
          ...Object.entries(S.SLOTS).filter(([slot]) => !sb.route.includes('a:' + slot)).map(([slot, def]) => ['a:' + slot, '+ ' + def.name]),
          ...Object.entries(S.DEPTS).filter(([d]) => !sb.route.includes('w:' + d)).map(([d, def]) => ['w:' + d, '+ עבודת ' + def.name]),
        ];
        if (addOpts.length) {
          const addSel = S.select(addOpts, '', (v) => {
            if (!v) return;
            let next;
            if (v.startsWith('w:')) {
              /* שלב עבודה נכנס אחרי שלבי העבודה הקיימים */
              const lastW = sb.route.reduce((acc, tk, i2) => (tk.startsWith('w:') ? i2 : acc), -1);
              next = [...sb.route];
              next.splice(lastW + 1, 0, v);
            } else {
              /* אישור — לפי הסדר הקאנוני, לפני ניהול לקוח */
              const order = { studio: 1, video: 2, creative: 3, partner: 4 };
              next = sb.route.filter((tk) => tk !== 'acct');
              let idx = next.length;
              for (let i2 = 0; i2 < next.length; i2++) {
                if (next[i2].startsWith('a:') && order[next[i2].slice(2)] > order[v.slice(2)]) { idx = i2; break; }
              }
              next.splice(idx, 0, v);
              next.push('acct');
            }
            S.act.updateSubRoute(tp.id, sb.id, next);
          }, { placeholder: '+ הוספת שלב' });
          routeEl.append(addSel);
        }

        card.append(el('div', { class: 'subtype-row' },
          el('span', { class: 'st-name' }, sb.name),
          routeEl));
      });

      box.append(card);
    });
    return box;
  }
})();
