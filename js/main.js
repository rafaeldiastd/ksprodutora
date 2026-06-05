/* ============================================================
   main.js — KS Produtora Cultural · JS puro (sem frameworks)
   nav · reveal · count-up · rotator · formulário · tweaks
   ============================================================ */
(function () {
  "use strict";

  /* ---------- ano no rodapé ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     Detecção de "relógio congelado"
     Alguns contextos (embed/headless) congelam rAF + IntersectionObserver
     + transições/keyframes. Detectamos uma vez e, se congelado, forçamos
     todas as animações de entrada para o estado final visível.
     ============================================================ */
  var _rafState = null;
  var _rafWaiters = [];
  function onRafKnown(cb) {
    if (_rafState !== null) { cb(_rafState); return; }
    _rafWaiters.push(cb);
    if (_rafWaiters.length > 1) return;
    var fired = false;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () {
        fired = true;
        _rafState = true;
        _rafWaiters.splice(0).forEach(function (f) { f(true); });
      });
    }
    setTimeout(function () {
      if (fired) return;
      _rafState = false;
      document.documentElement.classList.add("anim-frozen");
      _rafWaiters.splice(0).forEach(function (f) { f(false); });
    }, 300);
  }

  /* ============================================================
     Reveal on scroll — adiciona .in quando o elemento entra na viewport
     ============================================================ */
  (function reveal() {
    function all() {
      return Array.prototype.slice.call(document.querySelectorAll(".reveal:not(.in)"));
    }
    function inView(el) {
      return el.getBoundingClientRect().top < (window.innerHeight || 0) * 0.92;
    }
    function sweep() {
      all().forEach(function (el) { if (inView(el)) el.classList.add("in"); });
    }

    onRafKnown(function (works) {
      if (!works) return; // .anim-frozen cuida da visibilidade via CSS
      sweep();
    });

    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
      all().forEach(function (el) { io.observe(el); });
    }
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep, { passive: true });
    sweep();
  })();

  /* ============================================================
     Count-up — anima o número quando entra na viewport (à prova de congelamento)
     ============================================================ */
  (function countup() {
    var els = Array.prototype.slice.call(document.querySelectorAll(".countup"));
    els.forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-to")) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      var dur = parseFloat(el.getAttribute("data-dur")) || 1600;
      var done = false;
      var frozen = false;

      function render(v) {
        el.textContent = prefix + Math.round(v).toLocaleString("pt-BR") + suffix;
      }
      function animate() {
        if (done) return;
        done = true;
        if (frozen) { render(to); return; }
        var start = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          render(to * eased);
          if (p < 1) requestAnimationFrame(tick); else render(to);
        })(start);
      }
      function maybe() {
        var r = el.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) * 0.85 && r.bottom > 0) animate();
      }

      onRafKnown(function (works) {
        frozen = !works;
        if (frozen) { render(to); done = true; return; }
        maybe();
      });

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (en) { if (en.isIntersecting) animate(); });
        }, { threshold: 0.4 });
        io.observe(el);
      }
      window.addEventListener("scroll", maybe, { passive: true });
    });
  })();

  /* ============================================================
     Palavra rotativa do hero
     ============================================================ */
  (function rotator() {
    var el = document.getElementById("rotator");
    if (!el) return;
    var words = ["renascer.", "dançar.", "transformar.", "acontecer."];
    var i = 0;
    setInterval(function () {
      i = (i + 1) % words.length;
      // re-dispara a animação CSS substituindo o nó
      var clone = el.cloneNode(true);
      clone.textContent = words[i];
      el.parentNode.replaceChild(clone, el);
      el = clone;
    }, 2400);
  })();

  /* ============================================================
     NAV — estado sólido ao rolar + menu mobile (burger / sheet)
     ============================================================ */
  (function nav() {
    var nav = document.getElementById("nav");
    var burger = document.getElementById("burger");
    var sheet = document.getElementById("navSheet");
    var open = false;

    function onScroll() {
      if (!nav) return;
      nav.classList.toggle("nav--solid", window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    function setOpen(v) {
      open = v;
      if (burger) {
        burger.classList.toggle("is-open", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      }
      if (sheet) {
        sheet.classList.toggle("is-open", open);
        // delay escalonado nos links, como na versão original
        var links = sheet.querySelectorAll("a:not(.btn)");
        Array.prototype.forEach.call(links, function (a, idx) {
          a.style.transitionDelay = open ? (0.05 + idx * 0.04) + "s" : "0s";
        });
      }
      document.body.style.overflow = open ? "hidden" : "";
    }

    if (burger) burger.addEventListener("click", function () { setOpen(!open); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav-close]"), function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
  })();

  /* ============================================================
     Formulário de contato — estado de sucesso (sem backend)
     ============================================================ */
  (function contactForm() {
    var form = document.getElementById("contatoForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = (form.querySelector('[name="nome"]') || {}).value || "";
      var ok = document.createElement("div");
      ok.className = "contato__ok";
      ok.innerHTML =
        '<span class="contato__ok-mark">✶</span>' +
        '<h3 class="h3">Recebemos sua mensagem!</h3>' +
        '<p class="muted">Obrigado, ' + (nome ? escapeHtml(nome) : "tudo bem") +
        '. Entraremos em contato em breve.</p>' +
        '<button type="button" class="btn btn--ghost"><span>Enviar outra</span></button>';
      var parent = form.parentNode;
      ok.querySelector("button").addEventListener("click", function () {
        form.reset();
        parent.replaceChild(form, ok);
      });
      parent.replaceChild(ok, form);
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
  })();

  /* ============================================================
     TWEAKS — painel flutuante em JS puro + protocolo do host
     ============================================================ */
  (function tweaks() {
    var DEFAULTS = /*EDITMODE-BEGIN*/{
      "brand": "#d81b72",
      "headingFont": "Bricolage Grotesque",
      "motion": true,
      "grain": true
    }/*EDITMODE-END*/;

    var HEADING_FONTS = {
      "Bricolage Grotesque": '"Bricolage Grotesque", "Arial Black", sans-serif',
      "Anton": '"Anton", Impact, sans-serif',
      "Archivo": '"Archivo", system-ui, sans-serif'
    };
    var BRAND_OPTIONS = ["#d81b72", "#e23a5e", "#b5179e", "#7a4bd6", "#e8590c"];

    var state = Object.assign({}, DEFAULTS);

    function lighten(hex) { return "color-mix(in oklab, " + hex + " 64%, white)"; }

    function apply() {
      var r = document.documentElement;
      r.style.setProperty("--magenta", state.brand);
      r.style.setProperty("--magenta-bright", lighten(state.brand));
      r.style.setProperty("--display", HEADING_FONTS[state.headingFont] || HEADING_FONTS["Bricolage Grotesque"]);
      document.body.classList.toggle("no-motion", !state.motion);
      document.body.classList.toggle("has-grain", !!state.grain);
    }
    apply();

    function setTweak(key, val) {
      var edits = {};
      edits[key] = val;
      state[key] = val;
      apply();
      try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: edits }, "*"); } catch (e) {}
    }

    /* ---- estilos do painel ---- */
    var css =
      ".twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;" +
      "max-height:calc(100vh - 32px);display:flex;flex-direction:column;" +
      "background:rgba(250,249,247,.82);color:#29261b;" +
      "-webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);" +
      "border:.5px solid rgba(255,255,255,.6);border-radius:14px;" +
      "box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);" +
      "font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}" +
      ".twk-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 8px 10px 14px;cursor:move;user-select:none}" +
      ".twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}" +
      ".twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}" +
      ".twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}" +
      ".twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;overflow-x:hidden;min-height:0}" +
      ".twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(41,38,27,.45);padding:10px 0 0}" +
      ".twk-sect:first-child{padding-top:0}" +
      ".twk-row{display:flex;flex-direction:column;gap:5px}" +
      ".twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}" +
      ".twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}" +
      ".twk-lbl>span{font-weight:500}" +
      ".twk-field{appearance:none;box-sizing:border-box;width:100%;height:26px;padding:0 8px;border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}" +
      ".twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}" +
      ".twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;background:rgba(0,0,0,.15);transition:background .15s;cursor:pointer;padding:0}" +
      ".twk-toggle[data-on='1']{background:#34c759}" +
      ".twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}" +
      ".twk-toggle[data-on='1'] i{transform:translateX(14px)}" +
      ".twk-chips{display:flex;gap:6px}" +
      ".twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:40px;padding:0;border:0;border-radius:6px;overflow:hidden;cursor:pointer;box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);transition:transform .12s,box-shadow .12s}" +
      ".twk-chip:hover{transform:translateY(-1px)}" +
      ".twk-chip[data-on='1']{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),0 2px 6px rgba(0,0,0,.15)}";
    var styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ---- construção do painel ---- */
    var panel = null;

    function buildPanel() {
      panel = document.createElement("div");
      panel.className = "twk-panel";
      panel.setAttribute("data-omelette-chrome", "");

      var hd = document.createElement("div");
      hd.className = "twk-hd";
      hd.innerHTML = "<b>Tweaks</b>";
      var x = document.createElement("button");
      x.className = "twk-x";
      x.setAttribute("aria-label", "Fechar tweaks");
      x.textContent = "✕";
      x.addEventListener("click", dismiss);
      hd.appendChild(x);
      panel.appendChild(hd);

      var body = document.createElement("div");
      body.className = "twk-body";

      body.appendChild(section("Cor da marca"));
      body.appendChild(colorChips("brand", BRAND_OPTIONS));

      body.appendChild(section("Tipografia"));
      body.appendChild(selectRow("Fonte dos títulos", "headingFont", Object.keys(HEADING_FONTS)));

      body.appendChild(section("Atmosfera"));
      body.appendChild(toggleRow("Movimento (animações)", "motion"));
      body.appendChild(toggleRow("Textura granulada", "grain"));

      panel.appendChild(body);
      document.body.appendChild(panel);

      enableDrag(hd, panel);
    }

    function section(label) {
      var d = document.createElement("div");
      d.className = "twk-sect";
      d.textContent = label;
      return d;
    }

    function colorChips(key, options) {
      var row = document.createElement("div");
      row.className = "twk-row";
      var lbl = document.createElement("div");
      lbl.className = "twk-lbl";
      lbl.innerHTML = "<span>Magenta</span>";
      row.appendChild(lbl);
      var chips = document.createElement("div");
      chips.className = "twk-chips";
      options.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "twk-chip";
        b.style.background = c;
        b.setAttribute("data-on", state[key] === c ? "1" : "0");
        b.addEventListener("click", function () {
          setTweak(key, c);
          Array.prototype.forEach.call(chips.children, function (ch, i) {
            ch.setAttribute("data-on", options[i] === c ? "1" : "0");
          });
        });
        chips.appendChild(b);
      });
      row.appendChild(chips);
      return row;
    }

    function selectRow(label, key, options) {
      var row = document.createElement("div");
      row.className = "twk-row";
      var lbl = document.createElement("div");
      lbl.className = "twk-lbl";
      lbl.innerHTML = "<span>" + label + "</span>";
      row.appendChild(lbl);
      var sel = document.createElement("select");
      sel.className = "twk-field";
      options.forEach(function (o) {
        var op = document.createElement("option");
        op.value = o; op.textContent = o;
        if (state[key] === o) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () { setTweak(key, sel.value); });
      row.appendChild(sel);
      return row;
    }

    function toggleRow(label, key) {
      var row = document.createElement("div");
      row.className = "twk-row twk-row-h";
      var lbl = document.createElement("div");
      lbl.className = "twk-lbl";
      lbl.innerHTML = "<span>" + label + "</span>";
      row.appendChild(lbl);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "twk-toggle";
      btn.setAttribute("data-on", state[key] ? "1" : "0");
      btn.setAttribute("role", "switch");
      btn.innerHTML = "<i></i>";
      btn.addEventListener("click", function () {
        var v = !state[key];
        setTweak(key, v);
        btn.setAttribute("data-on", v ? "1" : "0");
      });
      row.appendChild(btn);
      return row;
    }

    function enableDrag(handle, el) {
      handle.addEventListener("mousedown", function (e) {
        if (e.target.classList.contains("twk-x")) return;
        var r = el.getBoundingClientRect();
        var sx = e.clientX, sy = e.clientY;
        var startRight = window.innerWidth - r.right;
        var startBottom = window.innerHeight - r.bottom;
        function move(ev) {
          var right = Math.max(8, startRight - (ev.clientX - sx));
          var bottom = Math.max(8, startBottom - (ev.clientY - sy));
          el.style.right = right + "px";
          el.style.bottom = bottom + "px";
        }
        function up() {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        }
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      });
    }

    function openPanel() { if (!panel) buildPanel(); panel.style.display = "flex"; }
    function closePanel() { if (panel) panel.style.display = "none"; }
    function dismiss() {
      closePanel();
      try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (e) {}
    }

    /* ---- protocolo do host ---- */
    window.addEventListener("message", function (e) {
      var t = e && e.data && e.data.type;
      if (t === "__activate_edit_mode") openPanel();
      else if (t === "__deactivate_edit_mode") closePanel();
    });
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (e) {}
  })();
})();
