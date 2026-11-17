/* SIS-H · site.js — comportamento de interface (sem dependências).
   Se este arquivo falhar, tudo continua visível: o HTML/CSS base não depende dele. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Movimento: revelação ao entrar na tela + contadores ----------
     Nada fica escondido sem este arquivo: o CSS só esconde com .motion-ready. */
  const motionOK = !reduceMotion.matches && 'IntersectionObserver' in window;
  if (motionOK) {
    const threshold = parseFloat(getComputedStyle(root).getPropertyValue('--reveal-threshold')) || 0.12;
    const els = [...document.querySelectorAll('[data-reveal], [data-reveal-stagger]')];
    // o que já está na tela ao carregar aparece sem animar (evita "piscar")
    els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-shown'); });
    root.classList.add('motion-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold, rootMargin: '0px 0px -8% 0px' });
    els.filter((el) => !el.classList.contains('is-shown')).forEach((el) => io.observe(el));

    // contadores (+50, +15): sobem uma vez; o número final já está no HTML
    const dur = parseFloat(getComputedStyle(root).getPropertyValue('--dur-count')) || 1400;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const counters = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        counters.unobserve(en.target);
        const el = en.target; const target = parseInt(el.dataset.count, 10); const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          el.textContent = String(Math.round(target * easeOut(p)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = '0'; counters.observe(el); });
  }

  /* ---------- Header: estado compacto ao rolar ---------- */
  const header = document.querySelector('.site-header');
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Menu mobile ---------- */
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  if (btn && nav) {
    const desktop = window.matchMedia('(min-width: 64rem)');
    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      // páginas atrás do painel ficam inertes (foco não escapa)
      document.querySelectorAll('main, footer, .wa-float, .skip-link').forEach((el) => { el.inert = open; });
      nav.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      if (open) nav.querySelector('a')?.focus();
    };
    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); btn.focus(); }
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    desktop.addEventListener('change', () => setOpen(false));
  }

  /* ---------- Módulos: filtro por categoria (sem JS, os chips são âncoras) ---------- */
  const catnav = document.querySelector('.catnav');
  if (catnav) {
    const links = [...catnav.querySelectorAll('a[data-cat]')];
    const sections = [...document.querySelectorAll('.mcat')];
    const show = (cat) => {
      sections.forEach((sec) => { sec.hidden = cat !== 'todos' && sec.dataset.cat !== cat; });
      links.forEach((l) => { if (l.dataset.cat === cat) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    };
    links.forEach((l) => l.addEventListener('click', (e) => {
      e.preventDefault();
      show(l.dataset.cat);
      document.getElementById('lista')?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }));
    // âncora direta de um módulo (ex.: vindo da home): garante que a categoria esteja visível
    const target = location.hash && document.querySelector(location.hash);
    if (target) target.closest('.mcat')?.removeAttribute('hidden');
  }

  /* ---------- Contato: envio pelo WhatsApp (dados só no texto da mensagem, nenhum outro servidor) ---------- */
  document.querySelectorAll('[data-whatsapp-form]').forEach((form) => {
    const phone = form.querySelector('input[name="phone"]').value;
    const get = (id) => (document.getElementById(id)?.value || '').trim();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // nome e mensagem não podem ficar vazios (nem só com espaços)
      ['campo-nome', 'campo-mensagem'].forEach((id) => {
        const el = document.getElementById(id);
        if (el && !el.value.trim()) el.value = '';
      });
      if (!form.reportValidity()) return;
      const dados = [
        `Nome: ${get('campo-nome')}`,
        get('campo-telefone') && `Telefone: ${get('campo-telefone')}`,
        get('campo-email') && `E-mail: ${get('campo-email')}`,
      ].filter(Boolean);
      const text = `${dados.join('\n')}\n\nMensagem: ${get('campo-mensagem')}`;
      const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
      // abre em branco, desvincula o opener e só então navega (equivale a noopener); sem pop-up, abre na mesma aba
      const win = window.open('about:blank', '_blank');
      if (win) { win.opener = null; win.location.href = url; } else { window.location.href = url; }
    });
  });

  /* ---------- Vitrine: abas + autoplay pausável ---------- */
  document.querySelectorAll('[data-showcase]').forEach((section) => {
    const tabs = [...section.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const pauseBtn = section.querySelector('.showcase__pause');
    const interval = parseFloat(getComputedStyle(section).getPropertyValue('--showcase-interval')) * 1000 || 6000;
    let current = 0;
    let timer = null;
    let userPaused = reduceMotion.matches; // sem autoplay com movimento reduzido
    let hovering = false;
    let visible = false;

    const select = (i, focus = false) => {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => {
        const on = k === current;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('is-active', on);
      });
      if (focus) tabs[current].focus();
      // reinicia a barra de progresso
      const bar = tabs[current].querySelector('.showcase__progress');
      if (bar) bar.replaceWith(bar.cloneNode(true));
    };

    const stop = () => { clearInterval(timer); timer = null; section.classList.remove('is-playing'); };
    const start = () => {
      stop();
      if (userPaused || hovering || !visible) return;
      section.classList.add('is-playing');
      select(current); // reinicia o progresso
      timer = setInterval(() => select(current + 1), interval);
    };
    const syncPauseBtn = () => {
      if (!pauseBtn) return;
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.querySelector('.label').textContent = userPaused ? 'Reproduzir' : 'Pausar';
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => { select(i); start(); });
      tab.addEventListener('keydown', (e) => {
        const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (e.key in map) { e.preventDefault(); select(current + map[e.key], true); start(); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); start(); }
        if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); start(); }
      });
    });
    pauseBtn?.addEventListener('click', () => { userPaused = !userPaused; syncPauseBtn(); start(); });
    section.addEventListener('pointerenter', () => { hovering = true; stop(); });
    section.addEventListener('pointerleave', () => { hovering = false; start(); });
    section.addEventListener('focusin', () => { hovering = true; stop(); });
    section.addEventListener('focusout', (e) => { if (!section.contains(e.relatedTarget)) { hovering = false; start(); } });

    if ('IntersectionObserver' in window) {
      const threshold = parseFloat(getComputedStyle(section).getPropertyValue('--showcase-visible-at')) || 0.35;
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? start() : stop(); }, { threshold }).observe(section);
    } else { visible = true; }

    section.classList.add('is-ready');
    syncPauseBtn();
    select(0);
    start();
  });
})();
