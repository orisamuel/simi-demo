/* ============================================================
   סימי — אתחול האפליקציה
   ============================================================ */
(function () {
  const el = S.el;

  S.load();

  /* רינדור מלא: כותרת, ניווט, מסך, מגירה פתוחה */
  S.render = function () {
    renderHeader();
    renderNav();
    S.renderMain();
    S.refreshDrawer();
    S.applyIcons(document.getElementById('main'));
  };

  S.onChange = S.render;

  /* ---------- כותרת עליונה ---------- */
  function renderHeader() {
    const me = S.cur();
    document.getElementById('curName').textContent = me.name;
    document.getElementById('curRoles').textContent = S.roleNames(me);
    const av = document.getElementById('curAvatar');
    av.textContent = S.initials(me.name);
    av.style.background = me.color;
    av.style.color = '#fff';

    document.getElementById('btnNewTask').hidden = !S.can.create(me);

    /* פעמון התראות */
    const unread = S.unreadCount(me.id);
    const badge = document.getElementById('notifBadge');
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : unread;
    if (!document.getElementById('notifMenu').hidden) buildNotifMenu();
  }

  /* ---------- התראות ---------- */
  const notifBtn = document.getElementById('notifBtn');
  const notifMenu = document.getElementById('notifMenu');

  notifBtn.addEventListener('click', () => {
    const open = !notifMenu.hidden;
    if (open) { closeNotifs(); return; }
    buildNotifMenu();
    notifMenu.hidden = false;
    notifBtn.setAttribute('aria-expanded', 'true');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notifWrap')) closeNotifs();
  });

  function closeNotifs() {
    notifMenu.hidden = true;
    notifBtn.setAttribute('aria-expanded', 'false');
  }

  function buildNotifMenu() {
    const me = S.cur();
    const items = S.notifsOf(me.id);
    notifMenu.innerHTML = '';
    notifMenu.append(el('div', { class: 'notif-head' },
      el('strong', null, 'התראות'),
      items.some((n) => !n.read)
        ? el('button', { class: 'link-toggle', onclick: () => { S.act.readAllNotifs(); } }, 'סימון הכול כנקרא')
        : null));

    if (!items.length) {
      notifMenu.append(el('div', { class: 'notif-empty' }, 'אין התראות — בפרודקשן זה יגיע גם למייל/וואטסאפ'));
      return;
    }
    items.slice(0, 30).forEach((n) => {
      notifMenu.append(el('button', {
        class: 'notif-item' + (n.read ? '' : ' unread'),
        onclick: () => {
          S.act.readNotif(n.id);
          closeNotifs();
          if (n.taskId && S.task(n.taskId)) S.openDrawer(n.taskId);
        },
      },
        el('span', null, n.text),
        el('span', { class: 'n-when' }, S.fmtDateTime(n.at))));
    });
  }

  /* ---------- מחליף משתמש ---------- */
  const switchBtn = document.getElementById('userSwitchBtn');
  const switchMenu = document.getElementById('userSwitchMenu');

  switchBtn.addEventListener('click', () => {
    const open = !switchMenu.hidden;
    if (open) { closeSwitch(); return; }
    buildSwitchMenu();
    switchMenu.hidden = false;
    switchBtn.setAttribute('aria-expanded', 'true');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#userSwitch')) closeSwitch();
  });

  function closeSwitch() {
    switchMenu.hidden = true;
    switchBtn.setAttribute('aria-expanded', 'false');
  }

  function buildSwitchMenu() {
    switchMenu.innerHTML = '';
    switchMenu.append(el('div', { class: 'menu-title' }, 'מצב דמו — מחליפים משתמש כדי לראות את המערכת מכל תפקיד'));
    S.db.users.forEach((u) => {
      switchMenu.append(el('button', {
        class: 'user-opt' + (u.id === S.db.currentUserId ? ' active' : ''),
        role: 'option',
        onclick: () => {
          closeSwitch();
          S.closeDrawer();
          S.act.switchUser(u.id);
          S.toast('עברת ל' + u.name);
        },
      },
        S.avatarEl(u),
        el('span', { class: 'u-meta' },
          el('strong', null, u.name),
          el('small', null, S.roleNames(u)))));
    });
  }

  /* ---------- ניווט ---------- */
  function renderNav() {
    const nav = document.getElementById('mainNav');
    nav.innerHTML = '';
    const items = S.navItems();
    const valid = items.map((n) => n.id);
    const current = valid.includes(S.db.route) ? S.db.route : 'my';

    items.forEach((item) => {
      const btn = el('button', {
        class: 'nav-item' + (item.id === current ? ' active' : ''),
        onclick: () => {
          S.db.route = item.id;
          S.save();
          S.render();
          document.getElementById('sidebar').classList.remove('open');
        },
      });
      btn.innerHTML = S.icon(item.icon) + '<span>' + item.label + '</span>' +
        (item.badge ? '<span class="nav-badge">' + item.badge + '</span>' : '');
      nav.append(el('li', null, btn));
    });
  }

  /* ---------- כפתורים גלובליים ---------- */
  document.getElementById('btnNewTask').addEventListener('click', () => S.openNewTask());
  document.getElementById('brandHome').addEventListener('click', (e) => {
    e.preventDefault();
    S.db.route = 'my';
    S.save();
    S.render();
  });

  document.getElementById('btnResetDemo').addEventListener('click', () => {
    S.confirm('איפוס הדמו', 'כל השינויים שעשית יימחקו והנתונים יחזרו למצב ההתחלתי.', 'איפוס', () => {
      S.closeDrawer();
      S.resetDemo();
      S.render();
      S.toast('הדמו אופס');
    }, true);
  });

  document.getElementById('navBurger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modalScrim').hidden) S.closeModal();
      else if (S.drawerTaskId) S.closeDrawer();
    }
  });

  /* אייקונים סטטיים בכותרת */
  S.applyIcons(document.querySelector('.topbar'));
  S.applyIcons(document.querySelector('.sidebar'));

  /* דיפ־לינק לדמו: ?user=u_omer&view=approvals&task=q8 */
  const qp = new URLSearchParams(location.search);
  const qpUser = qp.get('user');
  const qpView = qp.get('view');
  const qpTask = qp.get('task');
  if (qpUser && S.user(qpUser)) S.db.currentUserId = qpUser;
  if (qpView) S.db.route = qpView;

  S.render();

  if (qpTask && S.task(qpTask)) S.openDrawer(qpTask);
})();
