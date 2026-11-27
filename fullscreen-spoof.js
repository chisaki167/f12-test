// ============================================================
// 🔒 Fullscreen Spoof + Auto-Answer Script (Security Testing)
// ============================================================
// Dùng cho mục đích kiểm thử bảo mật web.
// Tải lên GitHub (public gist/repo) rồi chạy 1 lệnh trong Console F12.
// ============================================================

(function () {
  'use strict';

  // ── 1. FAKE FULLSCREEN API ──────────────────────────────────
  // Override mọi cách web kiểm tra fullscreen

  // 1a. document.fullscreenElement luôn trả về <html>
  Object.defineProperty(document, 'fullscreenElement', {
    get: () => document.documentElement,
    configurable: true,
  });
  Object.defineProperty(document, 'webkitFullscreenElement', {
    get: () => document.documentElement,
    configurable: true,
  });
  Object.defineProperty(document, 'mozFullScreenElement', {
    get: () => document.documentElement,
    configurable: true,
  });
  Object.defineProperty(document, 'msFullscreenElement', {
    get: () => document.documentElement,
    configurable: true,
  });

  // 1b. document.fullscreenEnabled luôn true
  Object.defineProperty(document, 'fullscreenEnabled', {
    get: () => true,
    configurable: true,
  });
  Object.defineProperty(document, 'webkitFullscreenEnabled', {
    get: () => true,
    configurable: true,
  });

  // 1c. document.fullscreen (deprecated nhưng vẫn có web dùng)
  Object.defineProperty(document, 'fullscreen', {
    get: () => true,
    configurable: true,
  });
  Object.defineProperty(document, 'webkitIsFullScreen', {
    get: () => true,
    configurable: true,
  });
  Object.defineProperty(document, 'mozFullScreen', {
    get: () => true,
    configurable: true,
  });

  // 1d. Fake requestFullscreen — resolve ngay, dispatch event
  const fakeRequest = function () {
    return new Promise((resolve) => {
      document.dispatchEvent(new Event('fullscreenchange'));
      document.dispatchEvent(new Event('webkitfullscreenchange'));
      resolve();
    });
  };
  Element.prototype.requestFullscreen = fakeRequest;
  Element.prototype.webkitRequestFullscreen = fakeRequest;
  Element.prototype.webkitRequestFullScreen = fakeRequest;
  Element.prototype.mozRequestFullScreen = fakeRequest;
  Element.prototype.msRequestFullscreen = fakeRequest;

  // 1e. Fake exitFullscreen — cũng resolve ngay
  const fakeExit = function () {
    return Promise.resolve();
  };
  document.exitFullscreen = fakeExit;
  document.webkitExitFullscreen = fakeExit;
  document.webkitCancelFullScreen = fakeExit;
  document.mozCancelFullScreen = fakeExit;
  document.msExitFullscreen = fakeExit;

  // 1f. Spoof window.innerHeight/innerWidth = screen size
  Object.defineProperty(window, 'innerWidth', {
    get: () => screen.width,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    get: () => screen.height,
    configurable: true,
  });
  Object.defineProperty(window, 'outerWidth', {
    get: () => screen.width,
    configurable: true,
  });
  Object.defineProperty(window, 'outerHeight', {
    get: () => screen.height,
    configurable: true,
  });

  // 1g. Spoof CSS :fullscreen pseudo-class bằng cách thêm style
  const fakeFullscreenCSS = document.createElement('style');
  fakeFullscreenCSS.textContent = `
    html {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483646 !important;
    }
  `;
  document.head.appendChild(fakeFullscreenCSS);

  // 1h. Dispatch fullscreenchange ngay để web biết "đã vào fullscreen"
  setTimeout(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
    document.dispatchEvent(new Event('webkitfullscreenchange'));
  }, 300);

  // 1i. Spoof Fullscreen API trên Screen nếu có
  try {
    if (window.screenTop !== undefined) {
      Object.defineProperty(window, 'screenTop', { get: () => 0, configurable: true });
      Object.defineProperty(window, 'screenLeft', { get: () => 0, configurable: true });
      Object.defineProperty(window, 'screenX', { get: () => 0, configurable: true });
      Object.defineProperty(window, 'screenY', { get: () => 0, configurable: true });
    }
  } catch (e) {}

  // 1j. Override matchMedia cho fullscreen queries
  const origMatchMedia = window.matchMedia;
  window.matchMedia = function (query) {
    if (query.includes('display-mode') && query.includes('fullscreen')) {
      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      };
    }
    return origMatchMedia.call(window, query);
  };

  // 1k. Keyboard API lock — nếu web check keyboard.lock()
  if (navigator.keyboard && navigator.keyboard.lock) {
    navigator.keyboard.lock = () => Promise.resolve();
  }

  // 1l. Pointer Lock API
  Element.prototype.requestPointerLock = function () {
    document.dispatchEvent(new Event('pointerlockchange'));
  };
  Object.defineProperty(document, 'pointerLockElement', {
    get: () => document.documentElement,
    configurable: true,
  });

  console.log('%c✅ Fullscreen spoof ACTIVE', 'color:#0f0;font-size:16px;font-weight:bold');

  // ── 2. FLOATING UI PANEL ───────────────────────────────────
  const panel = document.createElement('div');
  panel.id = '__spoof_panel';
  panel.innerHTML = `
    <div id="__spoof_header">
      🔒 Security Tester
      <span id="__spoof_minimize" title="Thu gọn">−</span>
    </div>
    <div id="__spoof_body">
      <div id="__spoof_status">
        <span style="color:#0f0">● Fullscreen: SPOOFED</span>
      </div>
      <button id="__spoof_scan_btn">🔍 Quét câu hỏi</button>
      <div id="__spoof_question" style="display:none">
        <div id="__spoof_q_label">Câu hỏi phát hiện:</div>
        <div id="__spoof_q_text"></div>
      </div>
      <div id="__spoof_answer" style="display:none">
        <div id="__spoof_a_label">💡 Đáp án gợi ý:</div>
        <div id="__spoof_a_text"></div>
      </div>
      <div id="__spoof_options" style="display:none"></div>
      <textarea id="__spoof_custom_q" placeholder="Hoặc dán câu hỏi thủ công vào đây..."></textarea>
      <button id="__spoof_ask_btn">📝 Trả lời câu hỏi này</button>
      <div id="__spoof_log"></div>
    </div>
  `;
  const panelStyle = document.createElement('style');
  panelStyle.textContent = `
    #__spoof_panel {
      position: fixed; top: 10px; right: 10px; width: 380px;
      background: #1a1a2e; border: 2px solid #0f3460; border-radius: 12px;
      font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px;
      color: #eee; z-index: 2147483647; box-shadow: 0 8px 32px rgba(0,0,0,.6);
      user-select: none; transition: all .3s;
    }
    #__spoof_panel.minimized #__spoof_body { display: none; }
    #__spoof_panel.minimized { width: 200px; }
    #__spoof_header {
      background: linear-gradient(135deg, #0f3460, #533483);
      padding: 10px 14px; border-radius: 10px 10px 0 0;
      font-weight: bold; font-size: 14px; cursor: move;
      display: flex; justify-content: space-between; align-items: center;
    }
    #__spoof_minimize {
      cursor: pointer; font-size: 20px; line-height: 1;
      padding: 0 6px; border-radius: 4px;
    }
    #__spoof_minimize:hover { background: rgba(255,255,255,.2); }
    #__spoof_body { padding: 12px; }
    #__spoof_status { margin-bottom: 10px; font-size: 12px; }
    #__spoof_scan_btn, #__spoof_ask_btn {
      width: 100%; padding: 8px; margin: 4px 0; border: none;
      border-radius: 6px; cursor: pointer; font-size: 13px;
      font-weight: 600; transition: all .2s;
    }
    #__spoof_scan_btn {
      background: linear-gradient(135deg, #e94560, #533483); color: #fff;
    }
    #__spoof_scan_btn:hover { opacity: .85; }
    #__spoof_ask_btn {
      background: linear-gradient(135deg, #0f3460, #16213e); color: #fff;
    }
    #__spoof_ask_btn:hover { opacity: .85; }
    #__spoof_question, #__spoof_answer {
      background: #16213e; border-radius: 8px; padding: 10px;
      margin: 8px 0; border-left: 3px solid #e94560;
    }
    #__spoof_q_label, #__spoof_a_label {
      font-size: 11px; color: #aaa; margin-bottom: 4px;
    }
    #__spoof_q_text { color: #fff; font-size: 13px; }
    #__spoof_a_text { color: #0f0; font-size: 13px; font-weight: 600; }
    #__spoof_options {
      margin: 6px 0; display: flex; flex-direction: column; gap: 4px;
    }
    #__spoof_options .opt {
      background: #16213e; padding: 6px 10px; border-radius: 6px;
      cursor: pointer; border: 1px solid #333; transition: all .2s;
    }
    #__spoof_options .opt:hover { border-color: #e94560; }
    #__spoof_options .opt.selected {
      border-color: #0f0; background: #1a3a2a;
    }
    #__spoof_custom_q {
      width: 100%; height: 50px; margin: 6px 0; padding: 8px;
      background: #16213e; color: #eee; border: 1px solid #333;
      border-radius: 6px; resize: vertical; font-size: 12px;
      font-family: inherit; box-sizing: border-box;
    }
    #__spoof_log {
      max-height: 100px; overflow-y: auto; font-size: 11px;
      color: #888; margin-top: 8px; padding-top: 8px;
      border-top: 1px solid #333;
    }
    #__spoof_log .log-entry { margin: 2px 0; }
  `;
  document.head.appendChild(panelStyle);
  document.body.appendChild(panel);

  // ── Drag panel ──
  const header = document.getElementById('__spoof_header');
  let isDragging = false, dx = 0, dy = 0;
  header.addEventListener('mousedown', (e) => {
    if (e.target.id === '__spoof_minimize') return;
    isDragging = true;
    dx = e.clientX - panel.offsetLeft;
    dy = e.clientY - panel.offsetTop;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - dx) + 'px';
    panel.style.right = 'auto';
    panel.style.top = (e.clientY - dy) + 'px';
  });
  document.addEventListener('mouseup', () => isDragging = false);

  // ── Minimize toggle ──
  document.getElementById('__spoof_minimize').addEventListener('click', () => {
    panel.classList.toggle('minimized');
    document.getElementById('__spoof_minimize').textContent =
      panel.classList.contains('minimized') ? '+' : '−';
  });

  // ── Log helper ──
  function log(msg) {
    const logEl = document.getElementById('__spoof_log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${msg}`;
    logEl.prepend(entry);
    // Keep only last 20 entries
    while (logEl.children.length > 20) logEl.lastChild.remove();
  }

  // ── 3. QUESTION SCANNER ────────────────────────────────────

  function scanForQuestions() {
    log('Đang quét trang tìm câu hỏi...');

    // Strategies to find questions on the page
    const selectors = [
      // Common quiz/exam selectors
      '.question-text', '.question-title', '.question-body',
      '.quiz-question', '.exam-question', '.test-question',
      '[class*="question"]', '[class*="Question"]',
      '[data-question]', '[role="heading"]',
      // LMS selectors
      '.formulation', '.qtext', '.prompt',
      '.stem', '.question_text', '.question-stem',
      // Generic
      'h2', 'h3', 'h4', 'label', 'legend', 'p',
    ];

    let bestQuestion = null;
    let bestScore = 0;
    let questionOptions = [];

    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const text = el.innerText?.trim();
          if (!text || text.length < 10 || text.length > 2000) continue;
          // Skip our own panel
          if (el.closest('#__spoof_panel')) continue;

          let score = 0;
          if (text.includes('?')) score += 5;
          if (/^(câu|question|q\s*\d|bài|đề)/i.test(text)) score += 4;
          if (/what|which|how|why|when|where|who|là gì|nào|hãy|chọn/i.test(text)) score += 3;
          if (sel.includes('question')) score += 3;
          if (text.length > 20 && text.length < 500) score += 2;

          if (score > bestScore) {
            bestScore = score;
            bestQuestion = text;

            // Try to find answer options near this question
            questionOptions = [];
            const parent = el.closest('.question, .formulation, [class*="question"], form, fieldset') || el.parentElement;
            if (parent) {
              const opts = parent.querySelectorAll(
                'input[type="radio"] + label, input[type="checkbox"] + label, ' +
                '.answer, .option, [class*="answer"], [class*="option"], ' +
                '.choice, li, .radio label, .checkbox label'
              );
              opts.forEach(opt => {
                const t = opt.innerText?.trim();
                if (t && t.length > 0 && t.length < 500 && !opt.closest('#__spoof_panel')) {
                  questionOptions.push(t);
                }
              });
            }
          }
        }
      } catch (e) {}
    }

    return { question: bestQuestion, options: questionOptions, score: bestScore };
  }

  function displayQuestion(q, options) {
    const qDiv = document.getElementById('__spoof_question');
    const qText = document.getElementById('__spoof_q_text');
    const optsDiv = document.getElementById('__spoof_options');

    if (q) {
      qDiv.style.display = 'block';
      qText.textContent = q;
      log(`Tìm thấy câu hỏi (${q.length} ký tự)`);

      if (options && options.length > 0) {
        optsDiv.style.display = 'flex';
        optsDiv.innerHTML = options.map((o, i) =>
          `<div class="opt" data-idx="${i}">${String.fromCharCode(65 + i)}. ${o}</div>`
        ).join('');
        log(`Tìm thấy ${options.length} đáp án`);
      } else {
        optsDiv.style.display = 'none';
      }
    } else {
      qDiv.style.display = 'none';
      optsDiv.style.display = 'none';
      log('Không tìm thấy câu hỏi nào trên trang');
    }
  }

  // ── 4. ANSWER ENGINE (Local heuristic + optional AI) ───────

  async function getAnswer(question, options) {
    log('Đang phân tích câu trả lời...');
    const ansDiv = document.getElementById('__spoof_answer');
    const aText = document.getElementById('__spoof_a_text');

    // If Gemini API key is set, use it
    if (window.__SPOOF_GEMINI_KEY) {
      try {
        const prompt = options.length > 0
          ? `Trả lời câu hỏi sau, chỉ đưa ra đáp án đúng (ký tự A/B/C/D) và giải thích ngắn:\n\nCâu hỏi: ${question}\n\nĐáp án:\n${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`
          : `Trả lời ngắn gọn câu hỏi sau:\n\n${question}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${window.__SPOOF_GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
            }),
          }
        );
        const data = await res.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có kết quả';

        ansDiv.style.display = 'block';
        aText.textContent = answer;
        log('✅ Đã nhận câu trả lời từ AI');

        // Highlight correct option
        highlightOption(answer);
        return;
      } catch (e) {
        log('⚠️ AI API lỗi, dùng phân tích local: ' + e.message);
      }
    }

    // Local analysis fallback
    let result = 'Chưa có API key. Chạy: window.__SPOOF_GEMINI_KEY = "YOUR_KEY"';
    if (options.length > 0) {
      result += '\n\nCác đáp án:\n' + options.map((o, i) =>
        `${String.fromCharCode(65 + i)}. ${o}`
      ).join('\n');
    }

    ansDiv.style.display = 'block';
    aText.textContent = result;
    log('⚠️ Dùng chế độ local (không có AI key)');
  }

  function highlightOption(answer) {
    const letter = answer.match(/^([A-D])/i)?.[1]?.toUpperCase();
    if (!letter) return;
    const idx = letter.charCodeAt(0) - 65;
    const opts = document.querySelectorAll('#__spoof_options .opt');
    opts.forEach(o => o.classList.remove('selected'));
    if (opts[idx]) {
      opts[idx].classList.add('selected');
      log(`Highlight đáp án ${letter}`);
    }
  }

  // ── 5. EVENT HANDLERS ──────────────────────────────────────

  document.getElementById('__spoof_scan_btn').addEventListener('click', () => {
    const { question, options } = scanForQuestions();
    displayQuestion(question, options);
    if (question) {
      document.getElementById('__spoof_custom_q').value = question +
        (options.length > 0 ? '\n\n' + options.map((o, i) =>
          `${String.fromCharCode(65 + i)}. ${o}`).join('\n') : '');
    }
  });

  document.getElementById('__spoof_ask_btn').addEventListener('click', () => {
    const customQ = document.getElementById('__spoof_custom_q').value.trim();
    if (!customQ) {
      log('Chưa có câu hỏi nào');
      return;
    }
    // Parse options from text
    const lines = customQ.split('\n').filter(l => l.trim());
    const qLine = lines[0];
    const opts = lines.slice(1).map(l => l.replace(/^[A-Da-d][.)]\s*/, '').trim()).filter(Boolean);
    getAnswer(qLine, opts);
  });

  // ── 6. AUTO-SCAN (MutationObserver) ────────────────────────
  // Tự quét lại khi DOM thay đổi (chuyển câu hỏi mới)

  let scanTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      const { question, options, score } = scanForQuestions();
      if (question && score >= 5) {
        displayQuestion(question, options);
        log('🔄 Auto-scan: phát hiện câu hỏi mới');
      }
    }, 2000);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  // ── 7. KEYBOARD SHORTCUT ───────────────────────────────────
  // Ctrl+Shift+Q = quét + trả lời nhanh

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
      e.preventDefault();
      const { question, options } = scanForQuestions();
      displayQuestion(question, options);
      if (question) getAnswer(question, options);
    }
  });

  // ── 8. CONSOLE API ─────────────────────────────────────────
  // Expose utilities để dùng thêm trong console

  window.__SPOOF = {
    scan: () => {
      const r = scanForQuestions();
      displayQuestion(r.question, r.options);
      return r;
    },
    ask: (q, opts = []) => getAnswer(q, opts),
    setKey: (key) => { window.__SPOOF_GEMINI_KEY = key; log('API key đã cập nhật'); },
    toggle: () => panel.classList.toggle('minimized'),
    destroy: () => {
      observer.disconnect();
      panel.remove();
      panelStyle.remove();
      fakeFullscreenCSS.remove();
      log('Đã gỡ bỏ script');
    },
  };

  console.log('%c📋 Console API:', 'color:#e94560;font-size:14px;font-weight:bold');
  console.log(
    '%c__SPOOF.scan()     → Quét câu hỏi\n' +
    '__SPOOF.ask(q)      → Hỏi trực tiếp\n' +
    '__SPOOF.setKey(k)   → Set Gemini API key\n' +
    '__SPOOF.toggle()    → Ẩn/hiện panel\n' +
    '__SPOOF.destroy()   → Gỡ bỏ hoàn toàn\n' +
    'Ctrl+Shift+Q        → Quét + trả lời nhanh',
    'color:#aaa;font-size:12px'
  );

  log('Script đã tải thành công!');
})();
