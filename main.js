/* ============================================================
   CPTTM 青年競賽數碼館 — 互動功能
   - 開場動畫（打字機 + logo loading）
   - 主題切換（Light / Dark，記住偏好）
   - 返回頁首
   - 成果數字 + Hero 數字動畫（count-up）
     * Hero 三個數字：等開場動畫結束後才跑一次
     * 成果數字：進入視口才跑
   - 分類篩選（不重載）+ 收藏比賽 + 標籤篩選
   - 展開收起詳情（每張卡完全獨立）
   - 屆次按鈕（滾到對應年份並高亮）
   - 歷屆回顧開關
   - 慢速漣漪（點擊後播完）
   - 時間軸滾動淡入
   - 捲動 pop 彈出（卡片 / 數字 / 標題）
   - 兩項並排比較
   - 技能方向探索（URL 參數）
   - 捲動到指定區域
   - 分類按鈕支援方向鍵（←→ Home End）

   註：新增比賽（例如「港澳青少年網絡技能競賽」）
   不需修改本檔。所有查詢皆動態取得 .filter-btn
   與 .competition-card，新分類 data-filter="network"
   與新卡片 data-category="network" 會自動被涵蓋。
   ============================================================ */

   (function () {
    "use strict";
  
    var FAV_KEY = "cpttm30_favorites";
    var THEME_KEY = "cpttm30_theme";
    var INTRO_KEY = "cpttm30_intro_seen";
    var COMPARE_KEY = "cpttm30_compare";
  
    var heroCountUpQueue = [];
    var heroCountUpReady = false;
  
    var RIPPLE_SEL =
      ".btn, .filter-btn, .more-btn, .compare-btn, " +
      ".close-btn, .fav-filter-btn, .edition-btn";
  
    /* ---------- 小工具 ---------- */
    function $(sel, ctx) {
      return (ctx || document).querySelector(sel);
    }
    function $$(sel, ctx) {
      return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    }
    function safeStorageGet(key) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }
    function safeStorageSet(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
    function safeStorageGetRaw(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    function safeStorageSetRaw(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {}
    }
    function prefersReducedMotion() {
      return !!(window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function prefersDarkScheme() {
      return !!(window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    function scrollToEl(el) {
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start"
      });
    }
    function announce(msg) {
      var el = document.getElementById("a11yStatus");
      if (el) el.textContent = msg || "";
    }
  
    /* ---------- 數字動畫佇列控制 ---------- */
    function runHeroCountUp() {
      heroCountUpReady = true;
      var queue = heroCountUpQueue.slice();
      heroCountUpQueue = [];
      queue.forEach(function (fn) { fn(); });
    }
    function queueHeroCountUp(fn) {
      if (heroCountUpReady) {
        fn();
      } else {
        heroCountUpQueue.push(fn);
      }
    }
  
    /* ---------- 0. 開場動畫（打字機 + logo loading） ---------- */
    function initIntro() {
      var intro = document.getElementById("intro");
      if (!intro) {
        /* 沒有開場動畫（例如 competitions.html）→ 立刻放行數字動畫 */
        runHeroCountUp();
        return;
      }
  
      var type1 = document.getElementById("introType1");
      var type2 = document.getElementById("introType2");
      var skipBtn = document.getElementById("introSkip");
      var text1 = "攜手同行三十載";
      var text2 = "CPTTM青年競賽數碼館";
  
      var finished = false;
      var timers = [];
  
      function clearTimers() {
        timers.forEach(function (t) { window.clearTimeout(t); });
        timers = [];
      }
  
      function finishIntro() {
        if (finished) return;
        finished = true;
        clearTimers();
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
        intro.classList.add("is-done");
        runHeroCountUp();                     /* ← 開場結束，跑 Hero 數字動畫 */
        window.setTimeout(function () {
          if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
        }, 720);
        try { sessionStorage.setItem(INTRO_KEY, "1"); } catch (e) {}
      }
  
      function onKey(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          finishIntro();
        }
      }
  
      /* 已看過 / 尊重減少動態 → 直接移除，不播 */
      var seen = false;
      try { seen = sessionStorage.getItem(INTRO_KEY) === "1"; } catch (e) {}
      if (seen || prefersReducedMotion()) {
        if (intro.parentNode) intro.parentNode.removeChild(intro);
        runHeroCountUp();                     /* ← 沒播開場，直接跑數字動畫 */
        return;
      }
  
      /* 鎖定捲動，避免動畫時背景滑動 */
      document.body.style.overflow = "hidden";
  
      if (skipBtn) skipBtn.addEventListener("click", finishIntro);
      document.addEventListener("keydown", onKey);
  
      var speed = 90;      /* 每個字 90ms */
      var idx1 = 0, idx2 = 0;
  
      function type1Tick() {
        if (finished) return;
        if (idx1 <= text1.length) {
          type1.textContent = text1.slice(0, idx1);
          idx1++;
          timers.push(window.setTimeout(type1Tick, speed));
        } else {
          timers.push(window.setTimeout(type2Tick, 220));
        }
      }
      function type2Tick() {
        if (finished) return;
        if (idx2 <= text2.length) {
          type2.textContent = text2.slice(0, idx2);
          idx2++;
          timers.push(window.setTimeout(type2Tick, speed));
        } else {
          timers.push(window.setTimeout(finishIntro, 900));
        }
      }
  
      timers.push(window.setTimeout(type1Tick, 320));
    }
  
    /* ---------- 1. 主題切換 ---------- */
    function initTheme() {
      var btn = $("#themeToggle");
      var root = document.documentElement;
  
      function current() {
        var t = root.getAttribute("data-theme");
        return t === "dark" ? "dark" : "light";
      }
  
      function apply(theme) {
        root.setAttribute("data-theme", theme);
        safeStorageSetRaw(THEME_KEY, theme);
  
        if (!btn) return;
        var isDark = theme === "dark";
        btn.setAttribute("aria-pressed", String(isDark));
        btn.setAttribute("aria-label", isDark ? "切換至淺色模式" : "切換至深色模式");
      }
  
      if (!root.getAttribute("data-theme")) {
        var saved = safeStorageGetRaw(THEME_KEY);
        apply(saved === "dark" ? "dark"
             : (saved === "light" ? "light"
             : (prefersDarkScheme() ? "dark" : "light")));
      } else {
        apply(current());
      }
  
      if (btn) {
        btn.addEventListener("click", function () {
          apply(current() === "dark" ? "light" : "dark");
        });
      }
    }
  
    /* ---------- 2. 返回頁首 ---------- */
    function initBackToTop() {
      var btn = $("#backToTop");
      if (!btn) return;
  
      var toggle = function () {
        btn.hidden = window.scrollY < 320;
      };
  
      window.addEventListener("scroll", toggle, { passive: true });
      toggle();
  
      btn.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
      });
    }
  
    /* ---------- 3. 數字動畫 ----------
       Hero 三個數字：等 initIntro 呼叫 runHeroCountUp() 才跑（只跑一次）
       成果數字：進入視口才跑
    */
    function initCountUp() {
      var statTargets = $$(".stat-card[data-count]");
      var heroTargets = $$(".hero-meta strong[data-count]");
  
      var animate = function (el) {
        var target = parseInt(el.getAttribute("data-count"), 10);
        if (isNaN(target)) return;
  
        var isStatCard = el.classList.contains("stat-card");
        var numEl = isStatCard ? $(".num", el) : el;
        if (!numEl) return;
  
        if (prefersReducedMotion()) {
          numEl.textContent = target.toLocaleString("en-US");
          return;
        }
  
        var duration = 1400;
        var start = null;
  
        var tick = function (now) {
          if (start === null) start = now;
          var p = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - p, 4);
          numEl.textContent = Math.round(target * eased).toLocaleString("en-US");
          if (p < 1) window.requestAnimationFrame(tick);
        };
  
        window.requestAnimationFrame(tick);
      };
  
      /* Hero 三個數字：排入佇列，等開場動畫結束才跑 */
      heroTargets.forEach(function (el) {
        queueHeroCountUp(function () { animate(el); });
      });
  
      /* 成果數字：進入視口才跑 */
      if (!statTargets.length) return;
  
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animate(entry.target);
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.35 });
        statTargets.forEach(function (s) { io.observe(s); });
      } else {
        statTargets.forEach(animate);
      }
    }
  
    /* ---------- 4. 展開收起詳情（每張卡完全獨立） ---------- */
    function initDetails() {
      $$(".competition-card").forEach(function (card) {
        var moreBtn = $(".more-btn", card);
        var detailsEl = $(".details", card);
        if (!moreBtn || !detailsEl) return;
  
        var moreLabel = $("span", moreBtn);
  
        function setOpen(open) {
          moreBtn.setAttribute("aria-expanded", String(open));
          detailsEl.hidden = !open;
          if (moreLabel) moreLabel.textContent = open ? "收起" : "了解更多";
        }
  
        moreBtn.addEventListener("click", function () {
          var isOpen = moreBtn.getAttribute("aria-expanded") === "true";
          setOpen(!isOpen);
        });
  
        var closeBtn = $(".close-btn", detailsEl);
        if (closeBtn) {
          closeBtn.addEventListener("click", function () {
            setOpen(false);
            moreBtn.focus();
          });
        }
      });
    }
  
    /* ---------- 5. 分類篩選 + 收藏篩選 + 標籤篩選 ---------- */
    function initFilter() {
      var filterBar = $(".filter-bar");
      var cards = $$(".competition-card");
      if (!filterBar || !cards.length) return;
  
      var filterButtons = $$(".filter-btn", filterBar);
      var favFilterBtn = $("#favFilterBtn");
      var favCountEl = $("#favCount");
      var hintEl = $("#filterHint");
      var emptyState = $("#emptyState");
      var grid = $("#competitionGrid");
  
      var currentCategory = "all";
      var onlyFav = false;
      var currentTag = "";
      var favorites = safeStorageGet(FAV_KEY);
  
      function isFav(id) { return favorites.indexOf(id) !== -1; }
      function setFav(id, on) {
        var i = favorites.indexOf(id);
        if (on && i === -1) favorites.push(id);
        if (!on && i !== -1) favorites.splice(i, 1);
        safeStorageSet(FAV_KEY, favorites);
        updateFavCount();
      }
      function updateFavCount() {
        if (favCountEl) favCountEl.textContent = String(favorites.length);
        if (favFilterBtn) {
          favFilterBtn.setAttribute("aria-pressed", String(onlyFav));
          favFilterBtn.classList.toggle("is-active", onlyFav);
        }
      }
  
      function applyFilter(category, favOnly, tag, options) {
        options = options || {};
        currentCategory = category;
        onlyFav = !!favOnly;
        currentTag = tag || "";
  
        filterButtons.forEach(function (btn) {
          var active = btn.getAttribute("data-filter") === category;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });
  
        updateFavCount();
  
        var visibleCount = 0;
  
        cards.forEach(function (card) {
          var cats = (card.getAttribute("data-category") || "").split(/\s+/);
          var id = card.getAttribute("data-id");
          var matchCat = category === "all" || cats.indexOf(category) !== -1;
          var matchFav = !onlyFav || isFav(id);
  
          var matchTag = true;
          if (currentTag) {
            var tags = $$(".tag-row li", card).map(function (t) {
              return t.textContent.trim();
            });
            matchTag = tags.indexOf(currentTag) !== -1;
          }
  
          var show = matchCat && matchFav && matchTag;
          card.hidden = !show;
  
          if (show) {
            visibleCount++;
            if (options.animate && !prefersReducedMotion()) {
              card.style.animation = "none";
              void card.offsetWidth;
              card.style.animation = "";
            }
          }
        });
  
        if (emptyState) emptyState.hidden = visibleCount !== 0;
  
        if (hintEl) {
          var parts = [];
          if (onlyFav) parts.push("只看收藏");
          if (category !== "all") {
            var activeBtn = filterButtons.filter(function (b) {
              return b.getAttribute("data-filter") === category;
            })[0];
            if (activeBtn) parts.push(activeBtn.textContent.trim());
          }
          if (currentTag) parts.push("標籤：" + currentTag);
          if (!parts.length) parts.push("全部比賽");
          hintEl.textContent = parts.join(" · ") + "（" + visibleCount + " 項）";
        }
      }
  
      filterButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          applyFilter(btn.getAttribute("data-filter"), onlyFav, currentTag, { animate: true });
        });
      });
  
      /* 分類按鈕支援方向鍵（無障礙） */
      filterButtons.forEach(function (btn, idx) {
        btn.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            next = filterButtons[(idx + 1) % filterButtons.length];
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            next = filterButtons[(idx - 1 + filterButtons.length) % filterButtons.length];
          } else if (e.key === "Home") {
            next = filterButtons[0];
          } else if (e.key === "End") {
            next = filterButtons[filterButtons.length - 1];
          }
          if (next) {
            e.preventDefault();
            next.focus();
            applyFilter(next.getAttribute("data-filter"), onlyFav, currentTag, { animate: true });
          }
        });
      });
  
      if (favFilterBtn) {
        favFilterBtn.addEventListener("click", function () {
          applyFilter(currentCategory, !onlyFav, currentTag, { animate: true });
        });
      }
  
      $$(".fav-btn").forEach(function (btn) {
        var id = btn.getAttribute("data-fav");
        if (!id) return;
  
        var on = isFav(id);
        btn.setAttribute("aria-pressed", String(on));
        btn.classList.toggle("is-fav", on);
  
        btn.addEventListener("click", function () {
          var next = !isFav(id);
          setFav(id, next);
          btn.setAttribute("aria-pressed", String(next));
          btn.classList.toggle("is-fav", next);
  
          if (onlyFav) {
            applyFilter(currentCategory, true, currentTag, { animate: true });
          }
        });
      });
  
      var params = new URLSearchParams(window.location.search);
      var cat = params.get("category");
      var validCats = filterButtons.map(function (b) {
        return b.getAttribute("data-filter");
      });
      var useCat = cat && validCats.indexOf(cat) !== -1 ? cat : "all";
  
      applyFilter(useCat, false, "", { animate: false });
  
      if (useCat !== "all" && grid) {
        window.requestAnimationFrame(function () {
          scrollToEl(document.getElementById("competitions"));
        });
      }
  
      /* --- 技能標籤雲（第二層篩選） --- */
      buildTagCloud(cards, function (tag) {
        if (tag === currentTag) {
          applyFilter(currentCategory, onlyFav, "", { animate: true });
          announce("已取消標籤篩選");
        } else {
          applyFilter(currentCategory, onlyFav, tag, { animate: true });
          announce("已套用標籤：" + tag);
        }
      });
    }
  
    /* ---------- 5b. 技能標籤雲 ---------- */
    function buildTagCloud(cards, onPick) {
      var cloud = document.getElementById("tagCloudList");
      if (!cloud) return;
  
      var map = {};
      cards.forEach(function (card) {
        $$(".tag-row li", card).forEach(function (li) {
          var t = li.textContent.trim();
          if (!t) return;
          map[t] = (map[t] || 0) + 1;
        });
      });
  
      var tags = Object.keys(map).sort(function (a, b) {
        return map[b] - map[a] || a.localeCompare(b, "zh-Hant");
      });
  
      cloud.innerHTML = "";
      tags.forEach(function (tag) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "tag-cloud-item";
        b.setAttribute("data-tag", tag);
        b.setAttribute("aria-pressed", "false");
        b.innerHTML = "<span>" + tag + "</span><em>" + map[tag] + "</em>";
        b.addEventListener("click", function () {
          var pressed = b.getAttribute("aria-pressed") === "true";
          $$(".tag-cloud-item", cloud).forEach(function (x) {
            x.setAttribute("aria-pressed", "false");
            x.classList.remove("is-active");
          });
          if (!pressed) {
            b.setAttribute("aria-pressed", "true");
            b.classList.add("is-active");
            onPick(tag);
          } else {
            onPick("");
          }
        });
        cloud.appendChild(b);
      });
    }
  
    /* ---------- 6. 屆次按鈕 ---------- */
    function initEditions() {
      var editionBtns = $$(".edition-btn");
      if (!editionBtns.length) return;
  
      editionBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var edition = btn.getAttribute("data-edition");
          var targetSection = document.getElementById("history-" + edition);
          if (!targetSection) return;
  
          scrollToEl(targetSection);
  
          $$(".history-section.is-highlight").forEach(function (el) {
            el.classList.remove("is-highlight");
          });
          targetSection.classList.add("is-highlight");
          window.setTimeout(function () {
            targetSection.classList.remove("is-highlight");
          }, 2200);
  
          $$(".edition-btn[aria-current]").forEach(function (b) {
            b.removeAttribute("aria-current");
          });
          btn.setAttribute("aria-current", "true");
  
          announce("前往 " + btn.textContent.trim() + " 歷屆回顧");
        });
      });
    }
  
    /* ---------- 6b. 歷屆回顧開關 ---------- */
    function initHistoryToggle() {
      var wrapper = document.getElementById("historyWrapper");
      var openBtns = $$("[data-open-history]");
      var closeBtn = document.getElementById("historyCloseBtn");
      var fCard = document.querySelector('.competition-card[data-id="F"]');
  
      function open() {
        if (!wrapper) return;
        wrapper.hidden = false;
  
        if (fCard) {
          var moreBtn = $(".more-btn", fCard);
          var detailsEl = $(".details", fCard);
          if (detailsEl && !detailsEl.hidden) {
            detailsEl.hidden = true;
            if (moreBtn) {
              moreBtn.setAttribute("aria-expanded", "false");
              var label = $("span", moreBtn);
              if (label) label.textContent = "了解更多";
            }
          }
        }
        window.requestAnimationFrame(function () {
          scrollToEl(wrapper);
        });
        announce("已打開歷屆回顧");
      }
  
      function close() {
        if (!wrapper) return;
        wrapper.hidden = true;
        if (fCard) {
          var moreBtn = $(".more-btn", fCard);
          if (moreBtn) moreBtn.focus();
          scrollToEl(fCard);
        }
        announce("已收起歷屆回顧");
      }
  
      openBtns.forEach(function (btn) {
        btn.addEventListener("click", open);
      });
      if (closeBtn) closeBtn.addEventListener("click", close);
  
      if (wrapper) {
        wrapper.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && !wrapper.hidden) {
            e.preventDefault();
            close();
          }
        });
      }
    }
  
    /* ---------- 7. 捲動到指定區域 ---------- */
    function initScrollTargets() {
      $$("[data-scroll-target]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var sel = btn.getAttribute("data-scroll-target");
          if (!sel) return;
          scrollToEl(document.querySelector(sel));
        });
      });
    }
  
    /* ---------- 8. 慢速漣漪 ---------- */
    function initRipple() {
      if (prefersReducedMotion()) return;
  
      document.addEventListener("click", function (e) {
        var btn = e.target && e.target.closest
          ? e.target.closest(RIPPLE_SEL)
          : null;
        if (!btn) return;
        if (btn.disabled) return;
  
        btn.classList.remove("rippling");
        void btn.offsetWidth;
        btn.classList.add("rippling");
      });
  
      document.addEventListener("animationend", function (e) {
        if (e.animationName === "ripple" &&
            e.target && e.target.classList) {
          e.target.classList.remove("rippling");
        }
      });
    }
  
    /* ---------- 9. 時間軸滾動觸發（一項一項出現） ---------- */
    function initTimelineFade() {
      var items = $$(".tl-item");
      if (!items.length) return;
  
      function revealAll() {
        items.forEach(function (el) { el.classList.add("is-visible"); });
      }
  
      /* 尊重減少動態 / 不支援 IO → 直接顯示 */
      if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
        revealAll();
        return;
      }
  
      /* 安全網：8 秒內沒顯示完，強制全部顯示，避免卡住 */
      window.setTimeout(revealAll, 8000);
  
      var io = new IntersectionObserver(function (entries) {
        /* 只處理進入視口的項目，並按文件順序排序 */
        var visible = entries
          .filter(function (e) { return e.isIntersecting; })
          .sort(function (a, b) {
            return items.indexOf(a.target) - items.indexOf(b.target);
          });
  
        visible.forEach(function (entry, idx) {
          /* 同一批進來的項目錯落 120ms，讓「一項一項」更有感 */
          var delay = Math.min(idx * 120, 480);
          window.setTimeout(function () {
            entry.target.classList.add("is-visible");
          }, delay);
          io.unobserve(entry.target);
        });
      }, {
        /* 讓項目在視口偏下方才觸發，造成「滾到才出現」 */
        threshold: 0.25,
        rootMargin: "0px 0px -18% 0px"
      });
  
      items.forEach(function (el) { io.observe(el); });
    }
  
    /* ---------- 10. 捲動時「啵」彈出 ---------- */
    function initPopReveal() {
      if (prefersReducedMotion()) return;
      if (!("IntersectionObserver" in window)) return;
  
      var targets = $$(
        ".hero-meta, " +
        ".section-head, " +
        ".stat-card, " +
        ".skill-card, " +
        ".future-card, " +
        ".history-section, " +
        ".about-points li"
      );
      if (!targets.length) return;
  
      targets.forEach(function (el) { el.classList.add("pop-target"); });
  
      var MAX_DELAY = 420;
  
      var io = new IntersectionObserver(function (entries) {
        var visible = entries.filter(function (e) { return e.isIntersecting; });
  
        visible.forEach(function (entry, idx) {
          var el = entry.target;
          var delay = Math.min(idx * 70, MAX_DELAY);
          el.style.animationDelay = delay + "ms";
          el.classList.add("is-popped");
          io.unobserve(el);
  
          el.addEventListener("animationend", function handler(evt) {
            if (evt.animationName === "popIn") {
              el.classList.remove("is-popped");
              el.classList.remove("pop-target");
              el.style.animationDelay = "";
              el.removeEventListener("animationend", handler);
            }
          });
        });
      }, {
        threshold: 0.14,
        rootMargin: "0px 0px -40px 0px"
      });
  
      targets.forEach(function (el) { io.observe(el); });
    }
  
    /* ---------- 10b. 兩項並排比較 ---------- */
    function initCompare() {
      var panel    = document.getElementById("comparePanel");
      var slots    = document.getElementById("compareSlots");
      var clearBtn = document.getElementById("compareClearBtn");
      var closeBtn = document.getElementById("compareCloseBtn");
      var cards    = $$(".competition-card");
      if (!panel || !slots || !cards.length) return;
  
      var compare = safeStorageGet(COMPARE_KEY) || [];
  
      function cardById(id) {
        return cards.filter(function (c) {
          return c.getAttribute("data-id") === id;
        })[0];
      }
  
      function updateButtons() {
        $$(".compare-btn").forEach(function (btn) {
          var id = btn.getAttribute("data-compare");
          var on = compare.indexOf(id) !== -1;
          btn.setAttribute("aria-pressed", String(on));
          btn.classList.toggle("is-active", on);
          var label = $(".compare-label", btn);
          if (label) label.textContent = on ? "已加入" : "加入比較";
        });
      }
  
      function renderPanel() {
        if (!compare.length) {
          panel.hidden = true;
          slots.innerHTML = "";
          return;
        }
        panel.hidden = false;
        slots.innerHTML = "";
  
        compare.forEach(function (id) {
          var card = cardById(id);
          if (!card) return;
  
          var title = ($("h3", card) || {}).textContent || id;
          var imgEl = $(".card-media img", card);
          var img   = imgEl ? imgEl.getAttribute("src") : "";
          var badge = ($(".card-badge", card) || {}).textContent || "";
          var fit   = ($(".card-fit", card) || {}).textContent || "";
  
          var box = document.createElement("article");
          box.className = "compare-slot";
          box.innerHTML =
            '<div class="compare-slot-head">' +
              '<img src="' + img + '" alt="" loading="lazy">' +
              '<div>' +
                '<span class="compare-badge">' + badge + '</span>' +
                '<h3>' + title + '</h3>' +
              '</div>' +
            '</div>' +
            '<p class="compare-fit">' + fit + '</p>' +
            '<button type="button" class="close-btn" data-remove="' + id + '">移除</button>';
          slots.appendChild(box);
        });
  
        /* 中間的 VS */
        if (compare.length === 2) {
          var vs = document.createElement("div");
          vs.className = "compare-vs";
          vs.setAttribute("aria-hidden", "true");
          vs.textContent = "VS";
          slots.insertBefore(vs, slots.children[1]);
        }
  
        $$("[data-remove]", slots).forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-remove");
            compare = compare.filter(function (x) { return x !== id; });
            safeStorageSet(COMPARE_KEY, compare);
            updateButtons();
            renderPanel();
            announce("已從比較移除");
          });
        });
      }
  
      $$(".compare-btn").forEach(function (btn) {
        var id = btn.getAttribute("data-compare");
        if (!id) return;
  
        btn.addEventListener("click", function () {
          var i = compare.indexOf(id);
          if (i !== -1) {
            compare.splice(i, 1);
            announce("已從比較移除");
          } else {
            if (compare.length >= 2) {
              announce("最多只能比較兩項，請先移除一項");
              return;
            }
            compare.push(id);
            announce("已加入比較");
          }
          safeStorageSet(COMPARE_KEY, compare);
          updateButtons();
          renderPanel();
        });
      });
  
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          compare = [];
          safeStorageSet(COMPARE_KEY, compare);
          updateButtons();
          renderPanel();
          announce("已清除比較");
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          panel.hidden = true;
          announce("已收起比較面板");
        });
      }
  
      updateButtons();
      renderPanel();
    }
  
    /* ---------- 11. 啟動 ---------- */
    function init() {
      initCountUp();        /* ← 先收集 Hero 數字動畫，排入佇列 */
      initIntro();          /* ← 再播開場動畫（結束時觸發數字動畫） */
      initTheme();
      initBackToTop();
      initDetails();
      initFilter();
      initEditions();
      initHistoryToggle();
      initScrollTargets();
      initRipple();
      initTimelineFade();
      initPopReveal();
      initCompare();
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  
  })();