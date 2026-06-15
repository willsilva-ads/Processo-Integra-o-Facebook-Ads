document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initSidebar();
    initScrollAnimations();
    initCardAnimations();
    initCopyButtons();
    initEditableFields();
    initChecklist();
});

/* ============ PARTICLES ============ */
function initParticles() {
    const c = document.getElementById('particles-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    let pts = [];
    function resize() { c.width = innerWidth; c.height = innerHeight; }
    addEventListener('resize', resize); resize();
    class P {
        constructor() {
            this.x = Math.random()*c.width; this.y = Math.random()*c.height;
            this.s = Math.random()*1.8+.4; this.dx = (Math.random()-.5)*.25; this.dy = (Math.random()-.5)*.25;
            this.o = Math.random()*.3+.08; this.h = [220,270,330][Math.random()*3|0];
        }
        update() { this.x+=this.dx; this.y+=this.dy; if(this.x<0||this.x>c.width)this.dx*=-1; if(this.y<0||this.y>c.height)this.dy*=-1; }
        draw() { ctx.beginPath(); ctx.arc(this.x,this.y,this.s,0,Math.PI*2); ctx.fillStyle=`hsla(${this.h},80%,70%,${this.o})`; ctx.fill(); }
    }
    const n = Math.min(45, (c.width*c.height/28000)|0);
    for (let i=0;i<n;i++) pts.push(new P());
    (function loop(){
        ctx.clearRect(0,0,c.width,c.height);
        pts.forEach(p=>{p.update();p.draw()});
        for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
            const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
            if(d<120){ctx.beginPath();ctx.strokeStyle=`hsla(240,60%,70%,${(1-d/120)*.07})`;ctx.lineWidth=.5;ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke()}
        }
        requestAnimationFrame(loop);
    })();
}

/* ============ SIDEBAR ============ */
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const closeBtn = document.getElementById('sidebar-close');
    const overlay = document.getElementById('sidebar-overlay');
    const links = document.querySelectorAll('.sidebar__link');
    const progress = document.getElementById('nav-progress');

    function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

    toggle.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Close on link click (mobile/tablet)
    links.forEach(l => l.addEventListener('click', () => {
        if (window.innerWidth <= 1024) closeSidebar();
    }));

    // Scroll spy
    const sections = [];
    links.forEach(l => {
        const id = l.getAttribute('data-target');
        const el = document.getElementById(id);
        if (el) sections.push({ l, el, id });
    });

    let tick = false;
    function onScroll() {
        if (tick) return; tick = true;
        requestAnimationFrame(() => {
            const sy = scrollY, dh = document.documentElement.scrollHeight, wh = innerHeight;
            const pct = (sy / (dh - wh)) * 100;
            if (progress) progress.style.width = Math.min(pct, 100) + '%';

            let cur = 'hero';
            for (const s of sections) if (s.el.getBoundingClientRect().top <= wh * .35) cur = s.id;
            links.forEach(l => l.classList.toggle('active', l.getAttribute('data-target') === cur));
            tick = false;
        });
    }
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* ============ SCROLL ANIMATIONS ============ */
function initScrollAnimations() {
    const obs = new IntersectionObserver(e => {
        e.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); });
    }, { rootMargin: '0px 0px -60px 0px', threshold: .08 });
    document.querySelectorAll('.process-section').forEach(s => obs.observe(s));
}

function initCardAnimations() {
    const obs = new IntersectionObserver(e => {
        e.forEach(en => {
            if (en.isIntersecting) {
                const d = parseInt(en.target.getAttribute('data-delay') || '0', 10);
                setTimeout(() => en.target.classList.add('anim-visible'), d);
                obs.unobserve(en.target);
            }
        });
    }, { rootMargin: '0px 0px -40px 0px', threshold: .1 });
    document.querySelectorAll('[data-anim]').forEach(el => obs.observe(el));
}

/* ============ COPY ============ */
function initCopyButtons() {
    const heroBtn = document.getElementById('copy-id-btn');
    if (heroBtn) heroBtn.addEventListener('click', () => {
        const el = document.querySelector('.info-chip--id strong');
        if (el) doCopy(el.textContent.trim(), heroBtn);
    });
    document.querySelectorAll('.copy-btn[data-copy-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const el = document.querySelector(`[data-key="${btn.getAttribute('data-copy-target')}"]`);
            if (el) doCopy(el.textContent.trim(), btn);
        });
    });
}
function doCopy(txt, btn) {
    const flash = () => {
        const lb = btn.querySelector('.copy-btn__label'), o = lb.textContent;
        btn.classList.add('copied'); lb.textContent = 'Copiado!';
        setTimeout(() => { btn.classList.remove('copied'); lb.textContent = o; }, 2000);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(flash).catch(flash);
    else { const t=document.createElement('textarea');t.value=txt;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);flash(); }
}

/* ============ EDITABLE + SAVE ============ */
function initEditableFields() {
    const KEY = 'nativa-meta-ads-process';
    const saveBar = document.getElementById('save-bar');
    const btnSave = document.getElementById('btn-save');
    const btnDiscard = document.getElementById('btn-discard');
    const toast = document.getElementById('save-toast');
    let changes = false;
    const orig = {};
    const saved = (() => { try { const r=localStorage.getItem(KEY); return r?JSON.parse(r):null; } catch{return null;} })();
    const eds = document.querySelectorAll('[contenteditable="true"][data-key]');

    eds.forEach(el => {
        const k = el.getAttribute('data-key');
        orig[k] = el.innerHTML;
        if (saved && saved[k] !== undefined) { el.innerHTML = saved[k]; orig[k] = saved[k]; }
        el.addEventListener('input', () => {
            changes = [...eds].some(e => e.innerHTML !== orig[e.getAttribute('data-key')]);
            saveBar.classList.toggle('show', changes);
        });
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey && !['p','div'].includes(el.tagName.toLowerCase())) { e.preventDefault(); el.blur(); }
        });
    });

    btnSave.addEventListener('click', () => {
        const d = {};
        eds.forEach(el => { const k=el.getAttribute('data-key'); d[k]=el.innerHTML; orig[k]=el.innerHTML; });
        try{localStorage.setItem(KEY,JSON.stringify(d))}catch{}
        changes=false; saveBar.classList.remove('show');
        toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3000);
    });

    btnDiscard.addEventListener('click', () => {
        eds.forEach(el => el.innerHTML = orig[el.getAttribute('data-key')]);
        changes=false; saveBar.classList.remove('show');
    });

    document.addEventListener('keydown', e => {
        if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); if(changes) btnSave.click(); }
    });
}

/* ============ FLOATING CHECKLIST ============ */
function initChecklist() {
    const STORAGE = 'nativa-checklist';
    const toggleBtn = document.getElementById('checklist-toggle');
    const panel = document.getElementById('checklist-panel');
    const items = document.querySelectorAll('.checklist__item');
    const badge = document.getElementById('checklist-badge');
    const fill = document.getElementById('checklist-fill');
    const pctEl = document.getElementById('checklist-pct');
    const total = items.length;

    // Load saved state
    let state = {};
    try { const r = localStorage.getItem(STORAGE); if (r) state = JSON.parse(r); } catch {}

    // Apply saved state
    items.forEach(item => {
        const id = item.getAttribute('data-check');
        if (state[id]) item.classList.add('checked');
    });
    updateProgress();

    // Toggle panel
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    });

    // Close panel on outside click
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
            panel.classList.remove('open');
        }
    });

    // Check/uncheck items
    items.forEach(item => {
        const checkBtn = item.querySelector('.checklist__check');
        const handleToggle = () => {
            item.classList.toggle('checked');
            const id = item.getAttribute('data-check');
            state[id] = item.classList.contains('checked');

            // Save
            try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
            updateProgress();

            // If just checked, add a little celebration bounce
            if (item.classList.contains('checked')) {
                checkBtn.style.transform = 'scale(1.3)';
                setTimeout(() => checkBtn.style.transform = '', 300);
            }
        };

        checkBtn.addEventListener('click', (e) => { e.stopPropagation(); handleToggle(); });
        item.addEventListener('click', handleToggle);
    });

    function updateProgress() {
        const done = document.querySelectorAll('.checklist__item.checked').length;
        const pct = Math.round((done / total) * 100);

        badge.textContent = `${done}/${total}`;
        badge.classList.toggle('done', done === total);
        fill.style.width = pct + '%';
        pctEl.textContent = pct + '%';

        // If all done, celebrate!
        if (done === total) {
            toggleBtn.style.boxShadow = '0 4px 24px rgba(34,197,94,.4)';
        } else {
            toggleBtn.style.boxShadow = '0 4px 20px rgba(79,140,255,.3)';
        }
    }
}
