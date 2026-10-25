/* ============================================================
   NODE AI · общий движок курса (подключается на каждом слое)
   <link rel="stylesheet" href="../nodeai.css">
   <script src="../nodeai.js" defer></script>

   Даёт window.NODEAI:
     .complete(n) / .read()          — прогресс (общий ключ с хабом layer_00)
     .askModel(opts)                 — ЕДИНСТВЕННАЯ точка подмены на реальную модель
     .mountBuilder(root, cfg)        — конструктор запроса: сборка + отправка + уточнение
     .enhanceQuiz(quiz, cfg)         — тест: выбор, разбор ответов, запись прогресса
     .starfield(canvas)              — фон со звёздами, реагирующими на курсор
============================================================ */
(function () {
  "use strict";

  var KEY = "aceon.nodeai.progress";
  var TOTAL = 5;

  function rm() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  var NODEAI = {
    PROGRESS_KEY: KEY,
    TOTAL: TOTAL,

    /* ── конфиг реальной модели (используется позже) ── */
    MODEL: "gpt-5.1-mini",
    SYSTEM_PROMPT:
      "Ты — обучающий ассистент NODE AI в курсе A.C.EON. " +
      "Учи человека формулировать запросы к нейросетям на простых примерах. " +
      "Отвечай коротко, по-русски, без жаргона и дружелюбно. " +
      "Если запрос слабый — мягко покажи, чего в нём не хватает.",

    /* ── ПРОГРЕСС ── */
    read: function () {
      try {
        var a = JSON.parse(localStorage.getItem(KEY) || "[]");
        return Array.isArray(a) ? a.filter(function (n) { return n >= 1 && n <= TOTAL; }) : [];
      } catch (e) { return []; }
    },
    complete: function (n) {
      try {
        var d = this.read();
        if (d.indexOf(n) === -1) {
          d.push(n);
          localStorage.setItem(KEY, JSON.stringify(d.sort(function (a, b) { return a - b; })));
        }
      } catch (e) {}
      return this.read();
    },

    /* ── ЕДИНСТВЕННАЯ ТОЧКА ПОДМЕНЫ НА РЕАЛЬНУЮ МОДЕЛЬ ──
       Сейчас: кэш → иначе имитация (fallback). Позже раскомментируешь fetch. */
    askModel: function (opts) {
      var self = this;
      return new Promise(function (resolve) {
        var cache = opts.cache || {};
        if (opts.cacheKey && cache[opts.cacheKey]) {
          resolve({ text: cache[opts.cacheKey], real: true });
          return;
        }
        /* ─── РЕАЛЬНАЯ МОДЕЛЬ (включишь позже; ключ держим на своём сервере) ───
        fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: self.MODEL,
            messages: [
              { role: "system", content: self.SYSTEM_PROMPT },
              { role: "user",   content: opts.promptText }
            ],
            max_tokens: 320
          })
        }).then(function (r) { return r.json(); })
          .then(function (data) { resolve({ text: data.choices[0].message.content.trim(), real: true }); });
        return;
        ──────────────────────────────────────────────────────────────────── */
        resolve({ text: opts.fallback ? opts.fallback() : "…", real: false });
      });
    },

    /* ── печать текста ── */
    typeOut: function (el, text, done) {
      el.classList.add("cur");
      clearInterval(el._typing);
      if (rm()) { el.textContent = text; el.classList.remove("cur"); done && done(); return; }
      var i = 0, step = Math.max(1, Math.round(text.length / 120));
      el._typing = setInterval(function () {
        i += step;
        el.textContent = text.slice(0, i);
        if (i >= text.length) {
          clearInterval(el._typing);
          el.textContent = text;
          el.classList.remove("cur");
          done && done();
        }
      }, 16);
    },

    /* ── КОНСТРУКТОР ЗАПРОСА ──
       cfg: {
         groups:  ['goal','context','format'],   // порядок групп чипов
         compose: function(keys, {bare, refine}) -> string,   // имитация ответа
         cache:   {},                             // сюда позже кладёшь предсген. ответы
         refine:  [{label:'короче', suffix:'...'}],           // кнопки уточнения (необяз.)
         tips: {ok, bare, refine}                 // подписи под ответом (необяз.)
       } */
    mountBuilder: function (root, cfg) {
      if (!root) return;
      var self = this;
      var chips = root.querySelectorAll(".chip");
      var out = root.querySelector("[data-out]");
      var replyWrap = root.querySelector("[data-reply]");
      var body = root.querySelector("[data-body]");
      var tip = root.querySelector("[data-tip]");
      var modelEl = root.querySelector("[data-model]");
      var sendBtn = root.querySelector("[data-send]");
      var bareBtn = root.querySelector("[data-bare]");
      var refineWrap = root.querySelector("[data-refine]");
      if (!out || !sendBtn || !body) return;

      var tips = cfg.tips || {};
      var sel = {}, keys = {};

      function assemble() {
        var parts = [];
        cfg.groups.forEach(function (g) { if (sel[g]) parts.push(sel[g]); });
        return parts;
      }
      function render() { out.textContent = assemble().join("\n"); }

      Array.prototype.forEach.call(chips, function (chip) {
        var g = chip.dataset.group;
        if (chip.classList.contains("is-active")) { sel[g] = chip.dataset.value; keys[g] = chip.dataset.key; }
        chip.addEventListener("click", function () {
          sel[g] = chip.dataset.value; keys[g] = chip.dataset.key;
          Array.prototype.forEach.call(root.querySelectorAll('.chip[data-group="' + g + '"]'), function (c) {
            c.classList.toggle("is-active", c === chip);
          });
          render();
        });
      });
      render();

      var lastPrompt = "";
      function run(bare, refineItem) {
        sendBtn.disabled = true;
        if (bareBtn) bareBtn.disabled = true;
        replyWrap.classList.add("on");
        if (tip) tip.hidden = true;
        if (refineWrap) refineWrap.innerHTML = "";
        body.textContent = "";
        body.classList.add("cur");

        var promptText;
        if (refineItem) { promptText = lastPrompt + " " + refineItem.suffix; }
        else if (bare) { promptText = sel[cfg.groups[0]] || ""; }
        else { promptText = assemble().join(" "); }
        lastPrompt = promptText;

        var cacheKey = null;
        if (!refineItem) {
          cacheKey = bare
            ? ("bare:" + keys[cfg.groups[0]])
            : cfg.groups.map(function (g) { return keys[g]; }).join("|");
        }

        setTimeout(function () {
          self.askModel({
            cacheKey: cacheKey, promptText: promptText, cache: cfg.cache,
            fallback: function () { return cfg.compose(keys, { bare: bare, refine: refineItem ? refineItem.suffix : null }); }
          }).then(function (res) {
            if (modelEl) modelEl.textContent = res.real ? self.MODEL : "demo · имитация";
            self.typeOut(body, res.text, function () {
              if (tip) {
                if (bare) {
                  tip.textContent = tips.bare || "▲ Тот же запрос, но голый — ответ общий, потому что модель гадала.";
                  tip.className = "reply-tip weak"; tip.hidden = false;
                } else if (refineItem) {
                  tip.textContent = tips.refine || "↻ Ты уточнил запрос — и ответ подстроился. Это и есть петля диалога.";
                  tip.className = "reply-tip"; tip.hidden = false;
                } else {
                  tip.textContent = tips.ok || "✓ Вид ответа поменялся вслед за твоим выбором. Так работает управление запросом.";
                  tip.className = "reply-tip"; tip.hidden = false;
                }
              }
              if (refineWrap && cfg.refine && cfg.refine.length && !bare) {
                cfg.refine.forEach(function (r) {
                  var b = document.createElement("button");
                  b.className = "refine-btn"; b.type = "button"; b.textContent = "↻ " + r.label;
                  b.addEventListener("click", function () { run(false, r); });
                  refineWrap.appendChild(b);
                });
              }
              sendBtn.disabled = false;
              if (bareBtn) bareBtn.disabled = false;
            });
          });
        }, rm() ? 0 : 340);
      }

      sendBtn.addEventListener("click", function () { run(false, null); });
      if (bareBtn) bareBtn.addEventListener("click", function () { run(true, null); });
    },

    /* ── ТЕСТ ──
       cfg: {
         resultEl, layer, total,
         explains: ['разбор Q1', 'разбор Q2', ...],   // по одному на вопрос
         messages: { pass:fn(s,t), partial:fn(s,t), fail:fn(s,t) }   // необяз.
       } */
    enhanceQuiz: function (quiz, cfg) {
      if (!quiz) return;
      var self = this;
      var result = cfg.resultEl;
      var questions = quiz.querySelectorAll(".quiz-question");
      var total = cfg.total || questions.length;
      var msgs = cfg.messages || {};

      Array.prototype.forEach.call(quiz.querySelectorAll(".answer"), function (answer) {
        answer.addEventListener("click", function () {
          var q = answer.closest(".quiz-question");
          Array.prototype.forEach.call(q.querySelectorAll(".answer"), function (it) {
            it.classList.remove("is-selected", "is-correct", "is-wrong");
          });
          answer.classList.add("is-selected");
          if (result) result.textContent = "";
        });
      });

      var btn = quiz.querySelector("[data-check]") || document.getElementById(cfg.checkId);
      if (!btn) return;
      btn.addEventListener("click", function () {
        var score = 0;
        Array.prototype.forEach.call(questions, function (q, i) {
          var correct = q.dataset.answer;
          var chosen = q.querySelector(".answer.is-selected");
          Array.prototype.forEach.call(q.querySelectorAll(".answer"), function (a) {
            a.classList.remove("is-correct", "is-wrong");
            if (a.dataset.choice === correct) a.classList.add("is-correct");
          });
          if (chosen && chosen.dataset.choice === correct) score += 1;
          else if (chosen) chosen.classList.add("is-wrong");

          /* разбор под вопросом */
          if (cfg.explains && cfg.explains[i]) {
            var ex = q.querySelector(".quiz-explain");
            if (!ex) {
              ex = document.createElement("p");
              ex.className = "quiz-explain";
              q.appendChild(ex);
            }
            ex.textContent = "→ " + cfg.explains[i];
            ex.hidden = false;
          }
        });

        if (score === total) {
          if (cfg.layer) self.complete(cfg.layer);
          if (result) result.textContent = msgs.pass ? msgs.pass(score, total)
            : ("Сигнал чистый: " + score + "/" + total + ". Слой пройден — на карте он отмечен.");
        } else if (score > 0) {
          if (result) result.textContent = msgs.partial ? msgs.partial(score, total)
            : ("Принято частично: " + score + "/" + total + ". Посмотри зелёные ответы и разбор, потом повтори.");
        } else {
          if (result) result.textContent = msgs.fail ? msgs.fail(score, total)
            : ("Связь шумит: " + score + "/" + total + ". Ничего страшного, глянь разбор и попробуй ещё.");
        }
      });
    },

    /* ── ЗВЁЗДНЫЙ ФОН, реагирующий на курсор ── */
    starfield: function (canvas) {
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      var reduce = rm();
      var W = 0, H = 0, stars = [], frame = 0;
      var mouse = { x: -9999, y: -9999, on: false };

      function col(ch, a) {
        if (ch === "green") return "rgba(24, 226, 140, " + a + ")";
        if (ch === "amber") return "rgba(242, 207, 98, " + a + ")";
        return "rgba(69, 170, 255, " + a + ")";
      }
      function resize() {
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.floor(W * ratio); canvas.height = Math.floor(H * ratio);
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        var count = Math.max(72, Math.min(150, Math.floor((W * H) / 10500)));
        stars = [];
        for (var i = 0; i < count; i++) {
          var ch = i % 13 === 0 ? "green" : i % 9 === 0 ? "amber" : "blue";
          stars.push({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * 1.35 + 0.35,
            vx: (Math.random() - 0.5) * 0.075, vy: (Math.random() - 0.5) * 0.055,
            alpha: Math.random() * 0.4 + 0.14, ch: ch, boost: 0
          });
        }
        draw();
      }
      function draw() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < stars.length; i++) {
          var a = stars[i];
          for (var j = i + 1; j < stars.length; j++) {
            var b = stars[j];
            var dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 92 && (i + j + frame) % 12 === 0) {
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = "rgba(96, 186, 255, " + (0.11 * (1 - d / 92)) + ")";
              ctx.lineWidth = 1; ctx.stroke();
            }
          }
        }
        if (mouse.on) {
          var R = 150;
          for (var k = 0; k < stars.length; k++) {
            var s = stars[k];
            var mdx = s.x - mouse.x, mdy = s.y - mouse.y, md = Math.sqrt(mdx * mdx + mdy * mdy);
            if (md < R) {
              var t = 1 - md / R;
              ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(s.x, s.y);
              ctx.strokeStyle = col(s.ch, 0.22 * t); ctx.lineWidth = 1; ctx.stroke();
              s.boost = t;
            } else s.boost = 0;
          }
        }
        for (var m = 0; m < stars.length; m++) {
          var st = stars[m];
          var rr = st.r + st.boost * 1.3;
          ctx.beginPath(); ctx.arc(st.x, st.y, rr, 0, Math.PI * 2);
          ctx.fillStyle = col(st.ch, Math.min(0.9, st.alpha + st.boost * 0.5));
          ctx.fill();
        }
      }
      function tick() {
        frame++;
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.x += s.vx; s.y += s.vy;
          if (s.x < -4) s.x = W + 4; if (s.x > W + 4) s.x = -4;
          if (s.y < -4) s.y = H + 4; if (s.y > H + 4) s.y = -4;
        }
        draw();
        if (!reduce) requestAnimationFrame(tick);
      }
      window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; }, { passive: true });
      window.addEventListener("mouseleave", function () { mouse.on = false; });
      window.addEventListener("resize", resize, { passive: true });
      resize();
      if (!reduce) requestAnimationFrame(tick);
    }
  };

  window.NODEAI = NODEAI;
})();
