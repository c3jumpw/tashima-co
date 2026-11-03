/*
 * Multi-step inquiry form.
 * Reads its questions from <script type="application/json" id="inquiry-config"> and
 * renders into the element with [data-inquiry]. Submits JSON to /api/inquiry.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-inquiry]');
  var cfgEl = document.getElementById('inquiry-config');
  if (!root || !cfgEl) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var KEY = 'inquiry:' + cfg.site;
  var lastPointer = 0;

  var store = {
    get: function () { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (e) { return null; } },
    set: function (v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
    clear: function () { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  };
  var saved = store.get();
  var answers = (saved && saved.a) || {};
  var current = (saved && saved.s) || 0;
  var startedAt = (saved && saved.t) || Date.now();

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]); }
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function optVal(o) { return typeof o === 'string' ? o : o.v; }

  // ---- conditions ---------------------------------------------------------
  // optimistic: a condition on a question not answered yet counts as met (used for the step count)
  function test(cond, optimistic) {
    if (!cond) return true;
    if (Array.isArray(cond)) return cond.every(function (c) { return test(c, optimistic); });
    var v = answers[cond.id];
    if (optimistic && (v === undefined || v === '')) return true;
    if (cond.in) return cond.in.indexOf(v) !== -1;
    if (cond.notIn) return v !== undefined && v !== '' && cond.notIn.indexOf(v) === -1;
    if (cond.filled) return !!(v && String(v).trim());
    if (cond.prefixNotIn) {
      var z = String(v || '').trim();
      if (!/^\d{5}$/.test(z)) return false;
      return !cond.prefixNotIn.some(function (p) { return z.indexOf(p) === 0; });
    }
    return true;
  }
  function fieldVisible(f) { return test(f.when); }
  function stepVisible(s) { return test(s.when) && s.fields.some(fieldVisible); }
  function visibleSteps() { return cfg.steps.filter(stepVisible); }
  function expectedCount(index) {
    var steps = visibleSteps(), after = cfg.steps.slice(cfg.steps.indexOf(steps[index]) + 1);
    return index + 1 + after.filter(function (s) { return test(s.when, true) && s.fields.some(function (f) { return test(f.when, true); }); }).length;
  }

  // ---- build --------------------------------------------------------------
  root.classList.add('inq');
  var top = el('div', { class: 'q-top' });
  var count = el('p', { class: 'q-count', 'aria-live': 'polite' });
  var bar = el('div', { class: 'q-bar', 'aria-hidden': 'true' }, '<span></span>');
  top.appendChild(count); top.appendChild(bar);
  var form = el('form', { class: 'q-form', novalidate: true });
  var hp = el('div', { class: 'q-hp', 'aria-hidden': 'true' }, '<label>Leave this empty<input name="company_website" tabindex="-1" autocomplete="off"></label>');
  form.appendChild(hp);
  root.appendChild(top);
  root.appendChild(form);

  var stepEls = {};
  cfg.steps.forEach(function (s) {
    var sec = el('section', { class: 'q-step', 'data-step': s.id, hidden: true });
    var h = el('h3', { class: 'q-title', tabindex: '-1' }, esc(s.title));
    sec.appendChild(h);
    if (s.sub) sec.appendChild(el('p', { class: 'q-sub' }, s.sub));
    s.fields.forEach(function (f) { sec.appendChild(buildField(f)); });
    (s.notices || []).forEach(function (n, i) {
      var box = el('div', { class: 'q-notice q-notice-' + (n.tone || 'info'), 'data-notice': s.id + ':' + i, hidden: true, role: n.tone === 'urgent' ? 'alert' : null }, n.html);
      var anchor = n.after ? sec.querySelector('[data-field="' + n.after + '"]') : null;
      if (anchor) anchor.after(box); else sec.appendChild(box);
    });
    form.appendChild(sec);
    stepEls[s.id] = sec;
  });

  var nav = el('div', { class: 'q-nav' });
  var back = el('button', { type: 'button', class: 'q-back' }, 'Back');
  var next = el('button', { type: 'submit', class: 'q-next' }, 'Continue');
  nav.appendChild(back); nav.appendChild(next);
  form.appendChild(nav);
  var status = el('p', { class: 'q-status', role: 'status', 'aria-live': 'polite' });
  form.appendChild(status);
  if (cfg.footnote) form.appendChild(el('p', { class: 'q-footnote' }, cfg.footnote));

  var done = el('div', { class: 'q-done', hidden: true, tabindex: '-1' });
  root.appendChild(done);

  function buildField(f) {
    var wrap;
    if (f.type === 'cards' || f.type === 'chips') {
      wrap = el('fieldset', { class: 'q-field q-' + f.type, 'data-field': f.id });
      wrap.appendChild(el('legend', null, esc(f.label) + (f.required === false ? ' <span class="q-opt">(optional)</span>' : '')));
      if (f.hint) wrap.appendChild(el('p', { class: 'q-hint' }, esc(f.hint)));
      var list = el('div', { class: 'q-options' });
      f.options.forEach(function (o, i) {
        var v = optVal(o), id = 'q-' + f.id + '-' + i;
        var lab = el('label', { class: 'q-option', for: id });
        var input = el('input', { type: 'radio', name: f.id, id: id, value: v });
        if (answers[f.id] === v) input.checked = true;
        lab.appendChild(input);
        var body = '<span class="q-option-body"><span class="q-option-label">' + esc(v) + '</span>' + (o.d ? '<span class="q-option-desc">' + esc(o.d) + '</span>' : '') + '</span>';
        lab.insertAdjacentHTML('beforeend', body);
        list.appendChild(lab);
      });
      wrap.appendChild(list);
    } else {
      wrap = el('div', { class: 'q-field q-input', 'data-field': f.id });
      var iid = 'q-' + f.id;
      wrap.appendChild(el('label', { for: iid }, esc(f.label) + (f.required === false ? ' <span class="q-opt">(optional)</span>' : '')));
      var attrs = { id: iid, name: f.id, autocomplete: f.autocomplete || 'off', placeholder: f.placeholder || null };
      var input;
      if (f.type === 'textarea') { input = el('textarea', attrs); }
      else {
        attrs.type = f.type === 'zip' ? 'text' : f.type;
        if (f.type === 'zip') { attrs.inputmode = 'numeric'; attrs.maxlength = '5'; attrs.autocomplete = 'postal-code'; }
        input = el('input', attrs);
      }
      if (answers[f.id]) input.value = answers[f.id];
      wrap.appendChild(input);
    }
    wrap.appendChild(el('p', { class: 'q-error', id: 'q-err-' + f.id, hidden: true }));
    return wrap;
  }

  // ---- state & rendering --------------------------------------------------
  function save() { store.set({ a: answers, s: current, t: startedAt }); }

  function refresh() {
    cfg.steps.forEach(function (s) {
      var sec = stepEls[s.id];
      s.fields.forEach(function (f) {
        var w = sec.querySelector('[data-field="' + f.id + '"]');
        var vis = fieldVisible(f);
        w.hidden = !vis;
      });
      (s.notices || []).forEach(function (n, i) {
        sec.querySelector('[data-notice="' + s.id + ':' + i + '"]').hidden = !test(n.when);
      });
    });
  }

  function show(index, focus) {
    var steps = visibleSteps();
    if (index >= steps.length) index = steps.length - 1;
    if (index < 0) index = 0;
    current = index;
    cfg.steps.forEach(function (s) { stepEls[s.id].hidden = true; });
    var s = steps[index];
    stepEls[s.id].hidden = false;
    var total = expectedCount(index);
    count.textContent = 'Step ' + (index + 1) + ' of ' + total;
    bar.firstChild.style.width = ((index + 1) / total * 100) + '%';
    back.hidden = index === 0;
    next.textContent = index === steps.length - 1 ? (cfg.submitLabel || 'Send') : 'Continue';
    status.textContent = ''; status.classList.remove('q-err');
    save();
    if (focus) {
      stepEls[s.id].querySelector('.q-title').focus({ preventScroll: true });
      var r = root.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.4) root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function setError(f, msg) {
    var p = document.getElementById('q-err-' + f.id);
    var w = p.parentNode;
    p.textContent = msg || ''; p.hidden = !msg;
    var input = w.querySelector('input:not([type=radio]),textarea') || w.querySelector('input');
    if (input) { if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', p.id); } else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); } }
  }

  function validate(step) {
    var firstBad = null;
    step.fields.forEach(function (f) {
      if (!fieldVisible(f)) return;
      var v = String(answers[f.id] || '').trim(), msg = '';
      if (f.required !== false && !v) msg = f.type === 'cards' || f.type === 'chips' ? 'Choose one to continue.' : 'Add ' + (f.short || f.label.toLowerCase()) + ' to continue.';
      else if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Check the email address; it needs to look like name@example.com.';
      else if (v && f.type === 'tel' && v.replace(/\D/g, '').length < 10) msg = 'Enter a 10-digit phone number, including area code.';
      else if (v && f.type === 'zip' && !/^\d{5}$/.test(v)) msg = 'Enter a 5-digit ZIP code.';
      setError(f, msg);
      if (msg && !firstBad) firstBad = f;
    });
    if (firstBad) {
      var w = stepEls[step.id].querySelector('[data-field="' + firstBad.id + '"]');
      var target = w.querySelector('input:checked') || w.querySelector('input,textarea');
      if (target) target.focus();
    }
    return !firstBad;
  }

  form.addEventListener('pointerdown', function () { lastPointer = Date.now(); });
  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  function onChange(e) {
    var t = e.target;
    if (!t.name || t.name === 'company_website') return;
    answers[t.name] = t.value;
    var f = findField(t.name);
    if (f && !document.getElementById('q-err-' + f.id).hidden) setError(f, '');
    refresh(); save();
    var step = visibleSteps()[current];
    if (e.type === 'change' && t.type === 'radio' && step && step.auto && (step.autoExcept || []).indexOf(t.value) === -1 && Date.now() - lastPointer < 800 && step.fields.filter(fieldVisible).length === 1) {
      setTimeout(function () { if (visibleSteps()[current] === step) go(1); }, 220);
    }
  }
  function findField(id) { for (var i = 0; i < cfg.steps.length; i++) for (var j = 0; j < cfg.steps[i].fields.length; j++) if (cfg.steps[i].fields[j].id === id) return cfg.steps[i].fields[j]; return null; }

  function go(dir) {
    var steps = visibleSteps();
    if (dir > 0 && !validate(steps[current])) return;
    if (dir > 0 && current === steps.length - 1) return submit();
    show(current + dir, true);
  }
  back.addEventListener('click', function () { go(-1); });
  form.addEventListener('submit', function (e) { e.preventDefault(); go(1); });

  // Links elsewhere on the page can preset an answer: data-inquiry-set="need=Free grant list"
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-inquiry-set]');
    if (!a) return;
    var parts = a.getAttribute('data-inquiry-set').split('=');
    answers[parts[0]] = parts.slice(1).join('=');
    var input = form.querySelector('input[name="' + parts[0] + '"][value="' + CSS.escape(answers[parts[0]]) + '"]');
    if (input) input.checked = true;
    refresh(); show(0, false); save();
  });

  // ---- submit -------------------------------------------------------------
  function collect() {
    var fields = [], contact = {};
    visibleSteps().forEach(function (s) {
      s.fields.forEach(function (f) {
        if (!fieldVisible(f)) return;
        var v = String(answers[f.id] || '').trim();
        if (!v) return;
        if (f.contact) contact[f.contact] = v;
        else fields.push({ label: f.summary || f.label, value: v });
      });
    });
    var summary = (cfg.subjectFields || []).map(function (id) { return answers[id]; }).filter(Boolean).join(' / ');
    var priority = (cfg.priority || []).filter(function (p) { return test(p.when); }).map(function (p) { return p.label; })[0] || '';
    return { site: cfg.site, summary: summary, priority: priority, fields: fields, contact: contact, hp: form.company_website.value, elapsed: Date.now() - startedAt };
  }

  function submit() {
    var payload = collect();
    next.disabled = true; back.disabled = true;
    status.classList.remove('q-err');
    status.textContent = 'Sending…';
    fetch(cfg.endpoint || '/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'failed'); return j; }); })
      .then(function () {
        store.clear();
        var first = (payload.contact.name || '').split(' ')[0];
        form.hidden = true; top.hidden = true;
        done.innerHTML = '<h3>' + esc(cfg.done.title.replace('{first}', first || 'there')) + '</h3>' + cfg.done.html +
          '<button type="button" class="q-restart">Start a new request</button>';
        done.hidden = false; done.focus();
        done.querySelector('.q-restart').addEventListener('click', function () {
          answers = {}; current = 0; form.reset(); done.hidden = true; form.hidden = false; top.hidden = false; startedAt = Date.now(); refresh(); show(0, true);
        });
      })
      .catch(function () {
        status.classList.add('q-err');
        status.innerHTML = cfg.fallback;
        next.disabled = false; back.disabled = false;
      });
  }

  refresh();
  show(current, false);
})();
