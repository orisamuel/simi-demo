/* ============================================================
   סימי — רכיבי UI משותפים
   ============================================================ */
window.S = window.S || {};

(function () {
  /* בונה אלמנטים קצר */
  S.el = function (tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      }
    }
    children.flat(20).forEach((c) => {
      if (c == null || c === false) return;
      node.append(c.nodeType ? c : document.createTextNode(c));
    });
    return node;
  };

  const el = S.el;

  S.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  /* ---------- טוסט ---------- */
  S.toast = function (msg, kind) {
    const box = document.getElementById('toasts');
    const t = el('div', { class: 'toast' + (kind === 'err' ? ' err' : '') });
    t.innerHTML = S.icon(kind === 'err' ? 'alert' : 'check') + S.esc(msg);
    box.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3400);
  };

  /* ---------- מודאל ---------- */
  S.openModal = function (title, bodyNodes, footNodes) {
    const scrim = document.getElementById('modalScrim');
    const modal = document.getElementById('modal');
    modal.innerHTML = '';
    modal.append(
      el('div', { class: 'modal-head' },
        el('h2', null, title),
        el('button', { class: 'btn-close', html: S.icon('x'), 'aria-label': 'סגירה', onclick: S.closeModal })),
      el('div', { class: 'modal-body' }, bodyNodes),
      footNodes ? el('div', { class: 'modal-foot' }, footNodes) : null,
    );
    scrim.hidden = false;
    scrim.onclick = (e) => { if (e.target === scrim) S.closeModal(); };
    const f = modal.querySelector('input, select, textarea, button.btn');
    if (f) f.focus();
  };

  S.closeModal = function () {
    document.getElementById('modalScrim').hidden = true;
  };

  /* אישור פעולה */
  S.confirm = function (title, text, okLabel, onOk, danger) {
    S.openModal(title,
      [el('p', { style: 'font-size:14px;color:var(--ink-soft)' }, text)],
      [
        el('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onclick: () => { S.closeModal(); onOk(); } }, okLabel),
        el('button', { class: 'btn btn-ghost', onclick: S.closeModal }, 'ביטול'),
      ]);
  };

  /* ---------- רכיבים קטנים ---------- */
  S.avatarEl = function (user, size) {
    return el('span', {
      class: 'avatar' + (size ? ' ' + size : ''),
      style: 'background:' + user.color,
      title: user.name,
    }, S.initials(user.name));
  };

  S.statusChip = function (t) {
    const st = S.statusOf(t);
    return el('span', { class: 'chip ' + S.STATUS[st].cls }, S.statusLabel(t));
  };

  S.urgentChip = () => el('span', { class: 'chip urgent', html: S.icon('flame') + 'דחוף' });

  S.dueEl = function (t) {
    const d = S.dueInfo(t);
    return el('span', { class: 'due ' + d.cls, html: S.icon('calendar') + S.esc(d.text) });
  };

  S.typeTag = function (t) {
    const type = S.type(t.typeId);
    const sub = S.sub(t.typeId, t.subId);
    return el('span', { class: 'tag-type', html: S.icon(type.icon) + S.esc(sub ? sub.name : type.name) });
  };

  /* פס מסלול מיני */
  S.miniRoute = function (t) {
    const box = el('span', { class: 'mini-route', title: 'שלב ' + (t.cur + 1) + ' מתוך ' + t.steps.length });
    t.steps.forEach((s, i) => {
      let cls = '';
      if (s.state === 'done') cls = 'done';
      else if (i === t.cur && !t.closed) cls = 'cur';
      else if (s.state === 'skipped') cls = 'skip';
      if (t.closed) cls = 'done';
      box.append(el('i', { class: cls }));
    });
    return box;
  };

  /* ---------- כרטיס משימה ---------- */
  S.taskCard = function (t, opts = {}) {
    const client = S.client(t.clientId);
    const card = el('div', {
      class: 'task-card' + (t.urgent && !t.closed ? ' urgent-card' : ''),
      tabindex: '0',
      role: 'button',
      onclick: () => S.openDrawer(t.id),
      onkeydown: (e) => { if (e.key === 'Enter') S.openDrawer(t.id); },
    });

    card.append(
      el('div', { class: 't-top' },
        el('div', null,
          el('div', { class: 't-title' }, t.title),
          opts.hideClient ? null : el('div', { class: 't-client' }, client.name)),
        opts.chip === false ? null : S.statusChip(t)),
      el('div', { class: 't-meta' },
        S.typeTag(t),
        t.urgent && !t.closed ? S.urgentChip() : null),
      el('div', { class: 't-foot' },
        S.dueEl(t),
        el('span', { style: 'display:flex;align-items:center;gap:7px' },
          S.miniRoute(t),
          currentOwnerAvatar(t))),
    );

    if (opts.draggable) {
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', t.id);
        e.dataTransfer.effectAllowed = 'move';
        S.dragTaskId = t.id;
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => { S.dragTaskId = null; card.classList.remove('dragging'); });
    }
    return card;
  };

  function currentOwnerAvatar(t) {
    if (t.closed) return null;
    const s = t.steps[t.cur];
    const uid = S.stepOwnerId(t, s);
    if (!uid) return null;
    return S.avatarEl(S.user(uid), 'sm');
  }

  /* ---------- ריק ---------- */
  S.empty = function (text, icon) {
    return el('div', { class: 'empty' },
      el('span', { html: S.icon(icon || 'inbox') }),
      el('div', null, text));
  };

  /* ---------- סטפר מסלול מלא (למגירה) ---------- */
  S.routeStepper = function (t) {
    const wrap = el('div', { class: 'route-steps' });
    t.steps.forEach((s, i) => {
      let cls = '';
      if (t.closed || s.state === 'done') cls = 'done';
      else if (i === t.cur) cls = 'cur';
      else if (s.state === 'skipped') cls = 'skipped';

      const ownerId = S.stepOwnerId(t, s);
      const owner = ownerId ? S.user(ownerId) : null;

      const dot = el('span', { class: 'step-dot' });
      if (cls === 'done') dot.innerHTML = S.icon('check');
      else dot.innerHTML = S.icon(S.stepIcon(s));

      const body = el('div', { class: 'step-body' },
        el('span', { class: 'step-label' }, S.stepLabel(s)),
        owner
          ? el('span', { class: 'step-owner' }, S.avatarEl(owner, 'sm'), owner.name)
          : (s.kind === 'work' ? el('span', { class: 'step-owner' }, 'ממתין לשיבוץ') : null),
      );
      if (s.skipOnce) body.append(el('span', { class: 'step-note' }, 'ידולג בסבב הזה — חזרה ישירה למאשר'));
      if (s.state === 'skipped') body.append(el('span', { class: 'step-note' }, 'דולג בסבב הזה'));

      wrap.append(el('div', { class: 'route-step ' + cls }, dot, body));
    });
    return wrap;
  };

  /* ---------- מסלול אינליין (לתצוגה מקדימה) ---------- */
  S.routeInline = function (tokens, addedSlots) {
    const wrap = el('div', { class: 'route-inline' });
    tokens.forEach((tk, i) => {
      if (i > 0) wrap.append(el('span', { class: 'rp-arrow', html: S.icon('chevron-left') }));
      let label, icon, added = false;
      if (tk.startsWith('w:')) { const d = S.DEPTS[tk.slice(2)]; label = d.name; icon = d.icon; }
      else if (tk.startsWith('a:')) {
        const slot = tk.slice(2);
        label = S.SLOTS[slot].name; icon = 'stamp';
        added = (addedSlots || []).includes(slot);
      } else { label = 'ניהול לקוח'; icon = 'briefcase'; }
      wrap.append(el('span', { class: 'rp-step' + (added ? ' added' : ''), html: S.icon(icon) + S.esc(label) }));
    });
    return wrap;
  };

  /* ---------- שדות טופס ---------- */
  S.field = function (label, inputEl, opts = {}) {
    const f = el('div', { class: 'field' });
    if (label) f.append(el('label', null, label, opts.required ? el('span', { class: 'req' }, ' *') : null));
    f.append(inputEl);
    if (opts.hint) f.append(el('span', { class: 'hint' }, opts.hint));
    return f;
  };

  S.select = function (options, value, onchange, opts = {}) {
    const sel = el('select', { onchange: (e) => onchange && onchange(e.target.value) });
    if (opts.placeholder) sel.append(el('option', { value: '', disabled: true, selected: !value }, opts.placeholder));
    options.forEach(([v, label]) => {
      sel.append(el('option', { value: v, selected: v === value }, label));
    });
    return sel;
  };

  S.segmented = function (options, value, onchange) {
    const seg = el('div', { class: 'segmented', role: 'group' });
    options.forEach(([v, label]) => {
      const b = el('button', { type: 'button', class: v === value ? 'on' : '' }, label);
      b.onclick = () => {
        seg.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        onchange(v);
      };
      seg.append(b);
    });
    return seg;
  };

  S.toggleEl = function (label, checked, onchange) {
    const input = el('input', { type: 'checkbox' });
    input.checked = !!checked;
    input.addEventListener('change', () => onchange(input.checked));
    return el('label', { class: 'toggle' }, input, el('span', { class: 'tk' }), el('span', { class: 'tl-label' }, label));
  };
})();
