// ============================================================
// 🔒 Fullscreen Spoof + Auto-Answer Script (Security Testing)
// ============================================================
// Dùng cho mục đích kiểm thử bảo mật web hoctap-4kg.pages.dev
// Tải lên GitHub rồi chạy 1 lệnh trong Console F12.
// ============================================================

(function () {
  'use strict';

  // ── 1. FAKE FULLSCREEN API ──────────────────────────────────

  Object.defineProperty(document, 'fullscreenElement', { get: () => document.documentElement, configurable: true });
  Object.defineProperty(document, 'webkitFullscreenElement', { get: () => document.documentElement, configurable: true });
  Object.defineProperty(document, 'mozFullScreenElement', { get: () => document.documentElement, configurable: true });
  Object.defineProperty(document, 'msFullscreenElement', { get: () => document.documentElement, configurable: true });
  Object.defineProperty(document, 'fullscreenEnabled', { get: () => true, configurable: true });
  Object.defineProperty(document, 'webkitFullscreenEnabled', { get: () => true, configurable: true });
  Object.defineProperty(document, 'fullscreen', { get: () => true, configurable: true });
  Object.defineProperty(document, 'webkitIsFullScreen', { get: () => true, configurable: true });
  Object.defineProperty(document, 'mozFullScreen', { get: () => true, configurable: true });

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

  const fakeExit = () => Promise.resolve();
  document.exitFullscreen = fakeExit;
  document.webkitExitFullscreen = fakeExit;
  document.webkitCancelFullScreen = fakeExit;
  document.mozCancelFullScreen = fakeExit;
  document.msExitFullscreen = fakeExit;

  Object.defineProperty(window, 'innerWidth', { get: () => screen.width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { get: () => screen.height, configurable: true });
  Object.defineProperty(window, 'outerWidth', { get: () => screen.width, configurable: true });
  Object.defineProperty(window, 'outerHeight', { get: () => screen.height, configurable: true });

  try {
    Object.defineProperty(window, 'screenTop', { get: () => 0, configurable: true });
    Object.defineProperty(window, 'screenLeft', { get: () => 0, configurable: true });
    Object.defineProperty(window, 'screenX', { get: () => 0, configurable: true });
    Object.defineProperty(window, 'screenY', { get: () => 0, configurable: true });
  } catch (e) {}

  const origMatchMedia = window.matchMedia;
  window.matchMedia = function (query) {
    if (query.includes('display-mode') && query.includes('fullscreen')) {
      return { matches: true, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true };
    }
    return origMatchMedia.call(window, query);
  };

  if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock = () => Promise.resolve();

  Element.prototype.requestPointerLock = function () { document.dispatchEvent(new Event('pointerlockchange')); };
  Object.defineProperty(document, 'pointerLockElement', { get: () => document.documentElement, configurable: true });

  // 1g. Không khóa position fixed vào html/body vì sẽ gây đơ cuộn chuột (scroll)
  // Chỉ tạo overlay ẩn hoặc kích hoạt fullscreen event


  setTimeout(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
    document.dispatchEvent(new Event('webkitfullscreenchange'));
  }, 300);

  console.log('%c✅ Fullscreen spoof ACTIVE', 'color:#0f0;font-size:16px;font-weight:bold');

  // ── 2. STATE ───────────────────────────────────────────────
  let autoMode = false;         // Chế độ tự động chọn đáp án
  let autoDelay = 1200;         // ms chờ trước khi tự click
  let lastAnswerLetter = null;  // Đáp án cuối từ AI
  let autoTimer = null;

  // ── 3. FLOATING UI PANEL ───────────────────────────────────
  const panel = document.createElement('div');
  panel.id = '__spoof_panel';
  panel.innerHTML = `
    <div id="__spoof_header">
      🔒 Security Tester
      <span id="__spoof_minimize" title="Thu gọn">−</span>
    </div>
    <div id="__spoof_body">
      <div id="__spoof_status">
        <span style="color:#0f0">● FS: SPOOFED</span>
        <span id="__spoof_auto_badge" style="color:#f80;margin-left:8px;display:none">⚡ AUTO ON</span>
      </div>

      <!-- Toggle Auto Mode -->
      <div style="display:flex;gap:6px;margin:6px 0">
        <button id="__spoof_scan_btn" style="flex:1">🔍 Quét</button>
        <button id="__spoof_auto_btn" style="flex:1">⚡ Auto: OFF</button>
      </div>

      <!-- Delay slider -->
      <div id="__spoof_delay_row" style="display:none;margin:4px 0;font-size:11px;color:#aaa">
        Chờ trước khi chọn: <strong id="__spoof_delay_val">1.2s</strong>
        <input type="range" id="__spoof_delay" min="300" max="5000" step="100" value="1200" style="width:100%;margin:4px 0">
      </div>

      <!-- Question display -->
      <div id="__spoof_question" style="display:none">
        <div class="label">📋 Câu hỏi:</div>
        <div id="__spoof_q_text"></div>
      </div>

      <!-- AI Answer display -->
      <div id="__spoof_answer" style="display:none">
        <div class="label">💡 Đáp án AI:</div>
        <div id="__spoof_a_text"></div>
      </div>

      <!-- Options list in panel -->
      <div id="__spoof_options" style="display:none"></div>

      <!-- Manual input -->
      <textarea id="__spoof_custom_q" placeholder="Dán câu hỏi thủ công..."></textarea>
      <div style="display:flex;gap:6px">
        <button id="__spoof_ask_btn" style="flex:1">📝 Hỏi AI</button>
        <button id="__spoof_click_btn" style="flex:1;display:none">👆 Chọn ngay</button>
      </div>

      <div id="__spoof_log"></div>
    </div>
  `;

  const panelStyle = document.createElement('style');
  panelStyle.textContent = `
    #__spoof_panel {
      position: fixed; top: 10px; right: 10px; width: 360px;
      background: #1a1a2e; border: 2px solid #0f3460; border-radius: 12px;
      font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px;
      color: #eee; z-index: 2147483647; box-shadow: 0 8px 32px rgba(0,0,0,.7);
      user-select: none;
    }
    #__spoof_panel.minimized #__spoof_body { display: none; }
    #__spoof_panel.minimized { width: 190px; }
    #__spoof_header {
      background: linear-gradient(135deg, #0f3460, #533483);
      padding: 10px 14px; border-radius: 10px 10px 0 0;
      font-weight: bold; font-size: 14px; cursor: move;
      display: flex; justify-content: space-between; align-items: center;
    }
    #__spoof_minimize { cursor: pointer; font-size: 20px; padding: 0 6px; border-radius: 4px; }
    #__spoof_minimize:hover { background: rgba(255,255,255,.2); }
    #__spoof_body { padding: 10px 12px; }
    #__spoof_status { margin-bottom: 8px; font-size: 12px; }

    #__spoof_panel button {
      padding: 8px 6px; border: none; border-radius: 6px;
      cursor: pointer; font-size: 12px; font-weight: 600; transition: all .2s;
    }
    #__spoof_scan_btn { background: linear-gradient(135deg,#e94560,#533483); color:#fff; }
    #__spoof_scan_btn:hover { opacity:.85; }
    #__spoof_auto_btn { background: #333; color: #aaa; }
    #__spoof_auto_btn.on { background: linear-gradient(135deg,#f80,#e94560); color:#fff; }
    #__spoof_ask_btn { background: linear-gradient(135deg,#0f3460,#16213e); color:#fff; }
    #__spoof_ask_btn:hover { opacity:.85; }
    #__spoof_click_btn { background: linear-gradient(135deg,#2a7a2a,#1a4a1a); color:#0f0; }
    #__spoof_click_btn:hover { opacity:.85; }

    #__spoof_question, #__spoof_answer {
      background: #16213e; border-radius: 8px; padding: 8px 10px;
      margin: 6px 0; border-left: 3px solid #e94560;
    }
    #__spoof_answer { border-left-color: #0f0; }
    .label { font-size: 10px; color: #aaa; margin-bottom: 3px; }
    #__spoof_q_text { color: #fff; font-size: 12px; max-height: 80px; overflow-y: auto; }
    #__spoof_a_text { color: #0f0; font-size: 13px; font-weight: 700; }

    #__spoof_options { margin: 6px 0; display: flex; flex-direction: column; gap: 4px; }
    #__spoof_options .opt {
      background: #16213e; padding: 6px 10px; border-radius: 6px;
      cursor: pointer; border: 1px solid #333; transition: all .15s; font-size: 12px;
      display: flex; align-items: center; gap: 8px;
    }
    #__spoof_options .opt:hover { border-color: #e94560; }
    #__spoof_options .opt.highlighted {
      border-color: #0f0 !important; background: #1a3a2a;
      box-shadow: 0 0 8px rgba(0,255,0,.4);
    }
    #__spoof_options .opt.highlighted::before { content: '✅'; }
    #__spoof_options .opt.auto-clicking {
      border-color: #f80 !important; background: #2a1a0a;
      animation: pulse 0.5s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

    #__spoof_custom_q {
      width: 100%; height: 44px; margin: 6px 0; padding: 7px;
      background: #16213e; color: #eee; border: 1px solid #333;
      border-radius: 6px; resize: vertical; font-size: 11px;
      font-family: inherit; box-sizing: border-box;
    }
    #__spoof_log {
      max-height: 90px; overflow-y: auto; font-size: 10px;
      color: #666; margin-top: 8px; padding-top: 6px;
      border-top: 1px solid #222;
    }
    #__spoof_log .log-entry { margin: 1px 0; }

    /* Highlight overlay on actual page elements */
    .__spoof_correct_highlight {
      outline: 3px solid #0f0 !important;
      box-shadow: 0 0 12px rgba(0,255,0,.5) !important;
      position: relative;
    }
    .__spoof_correct_highlight::after {
      content: ' ✅ ĐÚNG';
      background: #0f0; color: #000; font-size: 11px; font-weight: bold;
      padding: 2px 6px; border-radius: 4px; margin-left: 8px;
    }
  `;
  document.head.appendChild(panelStyle);
  document.body.appendChild(panel);

  // ── Drag ──
  const header = document.getElementById('__spoof_header');
  let isDragging = false, dx = 0, dy = 0;
  header.addEventListener('mousedown', (e) => {
    if (e.target.id === '__spoof_minimize') return;
    isDragging = true; dx = e.clientX - panel.offsetLeft; dy = e.clientY - panel.offsetTop;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - dx) + 'px'; panel.style.right = 'auto';
    panel.style.top = (e.clientY - dy) + 'px';
  });
  document.addEventListener('mouseup', () => isDragging = false);

  document.getElementById('__spoof_minimize').addEventListener('click', () => {
    panel.classList.toggle('minimized');
    document.getElementById('__spoof_minimize').textContent = panel.classList.contains('minimized') ? '+' : '−';
  });

  // ── Log helper ──
  function log(msg) {
    const logEl = document.getElementById('__spoof_log');
    const e = document.createElement('div');
    e.className = 'log-entry';
    e.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(e);
    while (logEl.children.length > 25) logEl.lastChild.remove();
  }

  // ── 4. QUESTION + OPTION SCANNER ──────────────────────────

  // Lưu tham chiếu tới các DOM element đáp án thực trên trang
  let realOptionEls = [];

  function scanForQuestions() {
    log('Đang quét trang...');
    realOptionEls = [];

    const selectors = [
      '.question-text', '.question-title', '.question-body',
      '.quiz-question', '.exam-question', '.test-question',
      '[class*="question"]', '[class*="Question"]',
      '[data-question]', '[role="heading"]',
      '.formulation', '.qtext', '.prompt', '.stem',
      '.question_text', '.question-stem',
      '.content', '.title', 'h1', 'h2', 'h3', 'h4', 'legend', 'p', 'div'
    ];

    let bestQuestion = null, bestScore = 0, questionOptions = [];

    // Tìm xem trang có cấu trúc trắc nghiệm rõ ràng không
    for (const sel of selectors) {
      try {
        for (const el of document.querySelectorAll(sel)) {
          const text = el.innerText?.trim();
          if (!text || text.length < 5 || text.length > 2000) continue;
          if (el.closest('#__spoof_panel')) continue;

          let score = 0;
          if (text.includes('?')) score += 5;
          if (/^(câu|question|q\s*\d|bài|đề|\d+[.:])/i.test(text)) score += 5;
          if (/what|which|how|why|when|where|who|là gì|nào|hãy|chọn|đúng|sai/i.test(text)) score += 3;
          if (sel.includes('question')) score += 3;
          if (text.length > 15 && text.length < 400) score += 2;

          if (score > bestScore) {
            // Tìm container chứa câu hỏi và các đáp án
            const container = el.closest('.question, .quiz-item, .item, .formulation, [class*="question"], form, fieldset, section, li') || el.parentElement?.parentElement || el.parentElement;
            
            let foundOpts = [];
            let foundRealEls = [];

            if (container) {
              // 1. Tìm các input radio / checkbox
              const radioInputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
              if (radioInputs.length >= 2) {
                radioInputs.forEach(inp => {
                  if (inp.closest('#__spoof_panel')) return;
                  const label = inp.closest('label') ||
                    container.querySelector(`label[for="${inp.id}"]`) ||
                    inp.nextElementSibling ||
                    inp.parentElement;
                  const t = label?.innerText?.trim() || inp.value?.trim() || '';
                  if (t) {
                    foundOpts.push(t);
                    foundRealEls.push({ input: inp, label: label || inp });
                  }
                });
              }

              // 2. Nếu không có radio inputs, tìm elements dạng nút/danh sách đáp án A, B, C, D
              if (foundOpts.length < 2) {
                const optEls = container.querySelectorAll(
                  '.answer, .option, [class*="answer"], [class*="option"], [class*="choice"], button, li, [role="button"]'
                );
                optEls.forEach(opt => {
                  if (opt.closest('#__spoof_panel') || opt === el) return;
                  const t = opt.innerText?.trim();
                  if (t && t.length > 0 && t.length < 300) {
                    // Tránh gom nhầm nút submit/next
                    if (!/^(nộp|submit|tiếp|next|quay lại|prev|xác nhận)/i.test(t)) {
                      foundOpts.push(t);
                      foundRealEls.push({ input: null, label: opt });
                    }
                  }
                });
              }
            }

            if (foundOpts.length >= 2) score += 5;

            if (score > bestScore) {
              bestScore = score;
              bestQuestion = text;
              questionOptions = foundOpts;
              realOptionEls = foundRealEls;
            }
          }
        }
      } catch (e) {}
    }

    return { question: bestQuestion, options: questionOptions, score: bestScore };
  }

  function clearPageHighlights() {
    document.querySelectorAll('.__spoof_correct_highlight').forEach(el => {
      el.classList.remove('__spoof_correct_highlight');
    });
  }

  function displayQuestion(q, options) {
    const qDiv = document.getElementById('__spoof_question');
    const qText = document.getElementById('__spoof_q_text');
    const optsDiv = document.getElementById('__spoof_options');

    clearPageHighlights();

    if (q) {
      qDiv.style.display = 'block';
      qText.textContent = q;
      log(`Tìm thấy câu hỏi (${q.length} ký tự)`);

      if (options && options.length > 0) {
        optsDiv.style.display = 'flex';
        optsDiv.innerHTML = options.map((o, i) =>
          `<div class="opt" data-idx="${i}" title="Click để chọn đáp án này">${String.fromCharCode(65 + i)}. ${o}</div>`
        ).join('');

        // Click on panel option → click real element
        optsDiv.querySelectorAll('.opt').forEach(optEl => {
          optEl.addEventListener('click', () => {
            const idx = parseInt(optEl.dataset.idx);
            clickRealOption(idx);
          });
        });

        log(`Tìm thấy ${options.length} đáp án`);
      } else {
        optsDiv.style.display = 'none';
      }
    } else {
      qDiv.style.display = 'none';
      optsDiv.style.display = 'none';
      log('Không tìm thấy câu hỏi nào');
    }
  }

  // ── 5. CLICK REAL OPTION ───────────────────────────────────

  function clickRealOption(idx) {
    if (!realOptionEls[idx]) {
      log(`⚠️ Không tìm thấy element đáp án ${String.fromCharCode(65 + idx)} để click`);
      return false;
    }

    clearPageHighlights();
    const { input, label } = realOptionEls[idx];

    // Highlight panel option
    document.querySelectorAll('#__spoof_options .opt').forEach(o => o.classList.remove('highlighted', 'auto-clicking'));
    const panelOpts = document.querySelectorAll('#__spoof_options .opt');
    if (panelOpts[idx]) panelOpts[idx].classList.add('highlighted');

    // Highlight real page element
    const target = label || input;
    if (target) target.classList.add('__spoof_correct_highlight');

    // Click input nếu có
    if (input) {
      input.click();
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Click label/element
    if (label) {
      label.click();
      label.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      label.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    log(`👆 Đã click đáp án ${String.fromCharCode(65 + idx)}`);
    return true;
  }

  // ── 6. HIGHLIGHT CORRECT OPTION (from AI answer) ──────────

  function highlightCorrectOption(answer, autoClick = false) {
    // Extract letter A/B/C/D from AI response
    const letter = answer.match(/(?:^|\s|đáp án[:\s]*)([A-D])(?:\s|[.):]|$)/i)?.[1]?.toUpperCase()
      || answer.match(/^([A-D])/i)?.[1]?.toUpperCase();

    if (!letter) {
      log('⚠️ Không xác định được đáp án từ AI');
      return;
    }

    lastAnswerLetter = letter;
    const idx = letter.charCodeAt(0) - 65;

    // Highlight in panel
    document.querySelectorAll('#__spoof_options .opt').forEach(o => o.classList.remove('highlighted', 'auto-clicking'));
    const panelOpts = document.querySelectorAll('#__spoof_options .opt');
    if (panelOpts[idx]) panelOpts[idx].classList.add('highlighted');

    // Highlight on real page
    clearPageHighlights();
    const target = realOptionEls[idx]?.label || realOptionEls[idx]?.input;
    if (target) target.classList.add('__spoof_correct_highlight');

    log(`✅ Đáp án đúng: ${letter} — ${autoClick ? 'chuẩn bị auto-click...' : 'highlight xong'}`);

    // Show manual click button
    const clickBtn = document.getElementById('__spoof_click_btn');
    clickBtn.style.display = 'inline-block';
    clickBtn.onclick = () => clickRealOption(idx);

    if (autoClick) {
      clearTimeout(autoTimer);
      if (panelOpts[idx]) panelOpts[idx].classList.add('auto-clicking');
      log(`⏳ Auto-click sau ${autoDelay / 1000}s...`);
      autoTimer = setTimeout(() => {
        clickRealOption(idx);
        if (panelOpts[idx]) panelOpts[idx].classList.remove('auto-clicking');
      }, autoDelay);
    }
  }

  // ── 7. ANSWER ENGINE ──────────────────────────────────────

  async function getAnswer(question, options, autoClick = false) {
    log('Đang hỏi AI...');
    const ansDiv = document.getElementById('__spoof_answer');
    const aText = document.getElementById('__spoof_a_text');

    if (window.__SPOOF_GEMINI_KEY) {
      try {
        const prompt = options.length > 0
          ? `Hãy trả lời **CHỈ** một ký tự duy nhất: A, B, C hoặc D. Không có bất kỳ ký tự, dấu cách hoặc giải thích nào khác.\n\nCâu hỏi: ${question}\n\nLựa chọn:\n${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`
          : `Hãy trả lời **CHỈ** một ký tự duy nhất (A, B, C hoặc D) cho câu hỏi sau.\n\n${question}`;

const res = await fetch(
  `https://googleapis.com{window.__SPOOF_GEMINI_KEY}`,
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
        log('✅ Nhận được câu trả lời từ AI');

        highlightCorrectOption(answer, autoClick || autoMode);
        return answer;
      } catch (e) {
        log('⚠️ AI lỗi: ' + e.message);
      }
    }

    // No API key
    const result = options.length > 0
      ? `Chưa có API key!\nSet: __SPOOF.setKey("YOUR_GEMINI_KEY")\n\nĐáp án:\n${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`
      : 'Chưa có Gemini API key. Chạy: __SPOOF.setKey("YOUR_KEY")';

    ansDiv.style.display = 'block';
    aText.textContent = result;
    aText.style.color = '#f80';
    log('⚠️ Chưa có API key');
  }

  // ── 8. AUTO MODE TOGGLE ───────────────────────────────────

  const autoBtn = document.getElementById('__spoof_auto_btn');
  const autoBadge = document.getElementById('__spoof_auto_badge');
  const delayRow = document.getElementById('__spoof_delay_row');
  const delaySlider = document.getElementById('__spoof_delay');
  const delayVal = document.getElementById('__spoof_delay_val');

  autoBtn.addEventListener('click', () => {
    autoMode = !autoMode;
    autoBtn.textContent = `⚡ Auto: ${autoMode ? 'ON' : 'OFF'}`;
    autoBtn.classList.toggle('on', autoMode);
    autoBadge.style.display = autoMode ? 'inline' : 'none';
    delayRow.style.display = autoMode ? 'block' : 'none';
    log(autoMode ? '⚡ Auto-select BẬT' : '⏹ Auto-select TẮT');
  });

  delaySlider.addEventListener('input', () => {
    autoDelay = parseInt(delaySlider.value);
    delayVal.textContent = (autoDelay / 1000).toFixed(1) + 's';
  });

  // ── 9. EVENT HANDLERS ─────────────────────────────────────

  document.getElementById('__spoof_scan_btn').addEventListener('click', () => {
    const { question, options } = scanForQuestions();
    displayQuestion(question, options);
    if (question) {
      document.getElementById('__spoof_custom_q').value = question +
        (options.length > 0 ? '\n\n' + options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n') : '');
      // Auto-ask nếu có key
      if (window.__SPOOF_GEMINI_KEY) getAnswer(question, options);
    }
  });

  document.getElementById('__spoof_ask_btn').addEventListener('click', () => {
    const customQ = document.getElementById('__spoof_custom_q').value.trim();
    if (!customQ) { log('Chưa có câu hỏi'); return; }
    const lines = customQ.split('\n').filter(l => l.trim());
    const qLine = lines[0];
    const opts = lines.slice(1).map(l => l.replace(/^[A-Da-d][.)]\s*/, '').trim()).filter(Boolean);
    getAnswer(qLine, opts);
  });

  // ── 10. AUTO-SCAN với MutationObserver ─────────────────────

  let scanTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      const { question, options, score } = scanForQuestions();
      if (question && score >= 5) {
        displayQuestion(question, options);
        log('🔄 Phát hiện câu hỏi mới');
        // Nếu auto mode và có key, tự hỏi AI luôn
        if (autoMode && window.__SPOOF_GEMINI_KEY) {
          getAnswer(question, options, true);
        }
      }
    }, 1500);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ── 11. KEYBOARD SHORTCUTS ────────────────────────────────
  // Ctrl+Shift+Q = Quét + hỏi AI
  // Ctrl+Shift+A = Toggle auto mode

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
      e.preventDefault();
      const { question, options } = scanForQuestions();
      displayQuestion(question, options);
      if (question) getAnswer(question, options);
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      autoBtn.click();
    }
  });

  // ── 12. CONSOLE API ───────────────────────────────────────

  window.__SPOOF = {
    scan: () => {
      const r = scanForQuestions();
      displayQuestion(r.question, r.options);
      return r;
    },
    ask: (q, opts = []) => getAnswer(q, opts),
    setKey: (key) => { window.__SPOOF_GEMINI_KEY = key; log('🔑 API key đã cập nhật'); },
    auto: (on) => {
      if (on !== undefined) autoMode = on;
      else autoMode = !autoMode;
      autoBtn.classList.toggle('on', autoMode);
      autoBtn.textContent = `⚡ Auto: ${autoMode ? 'ON' : 'OFF'}`;
      autoBadge.style.display = autoMode ? 'inline' : 'none';
      delayRow.style.display = autoMode ? 'block' : 'none';
      log(autoMode ? '⚡ Auto-select BẬT' : '⏹ Auto-select TẮT');
    },
    click: (idx) => clickRealOption(idx),         // __SPOOF.click(0) = chọn đáp án A
    delay: (ms) => { autoDelay = ms; log(`⏱ Delay: ${ms}ms`); },
    highlight: (letter) => {
      const idx = letter.toUpperCase().charCodeAt(0) - 65;
      clearPageHighlights();
      const target = realOptionEls[idx]?.label || realOptionEls[idx]?.input;
      if (target) target.classList.add('__spoof_correct_highlight');
      const panelOpts = document.querySelectorAll('#__spoof_options .opt');
      panelOpts.forEach(o => o.classList.remove('highlighted'));
      if (panelOpts[idx]) panelOpts[idx].classList.add('highlighted');
      log(`Highlight: ${letter.toUpperCase()}`);
    },
    toggle: () => panel.classList.toggle('minimized'),
    destroy: () => {
      observer.disconnect();
      clearTimeout(autoTimer);
      clearPageHighlights();
      panel.remove(); panelStyle.remove(); fakeFullscreenCSS.remove();
      delete window.__SPOOF;
      console.log('Script đã gỡ bỏ');
    },
  };

  console.log('%c📋 Console API:\n%c__SPOOF.setKey("key")  → Set Gemini key\n__SPOOF.scan()          → Quét câu hỏi\n__SPOOF.auto()          → Toggle auto-select\n__SPOOF.auto(true/false)→ Bật/tắt auto\n__SPOOF.click(0)        → Chọn đáp án A (index)\n__SPOOF.highlight("B")  → Highlight đáp án B\n__SPOOF.delay(2000)     → Đặt delay 2000ms\nCtrl+Shift+Q            → Quét + hỏi AI\nCtrl+Shift+A            → Toggle auto mode',
    'color:#e94560;font-weight:bold', 'color:#aaa;font-size:11px');

  log('✅ Script đã tải thành công!');
})();
