/* ═══════════════════════════════════════════
   WOOKING 书阁 — 阅读引擎
   ═══════════════════════════════════════════ */

const BOOKS_META = [
  {
    id: "ash_protocol",
    title: "灰烬准则",
    subtitle: "ASH PROTOCOL",
    genre: "西方幻想",
    emoji: "🔥",
    coverColor: "#1a1a2e",
    accent: "#e94560",
    tagline: "权力的本质不是能力本身，而是对能力的理解",
    description:
      "在一个天赋决定命运的异能大陆上，一个完全没有异能的孤儿，凭借过目不忘的记忆力、对能力规律的逆向工程、以及对人心的精准操控，从帝国图书馆的底层抄写员，一步步成为足以左右大陆格局的棋盘上没有名字的人。",
    dataFile: "data/ash_protocol.json",
  },
  {
    id: "wanxiang",
    title: "万象清算",
    subtitle: "重生后我让天命退位",
    genre: "玄幻仙侠",
    emoji: "⚔️",
    coverColor: "#0f3460",
    accent: "#e94560",
    tagline: "逆天改命，万象归一",
    description:
      "重生回到大比前夜，前世被天命所弃的少年，这一次要让所有欺他、辱他、弃他之人，一一偿还。系统在手，因果逆转，且看少年如何走出一条属于自己的通天之路。",
    dataFile: "data/wanxiang.json",
  },
];

// ─── State ───
let booksData = {};
let currentBook = null;
let currentChapter = null;

// ─── Theme ───
function initTheme() {
  const saved = localStorage.getItem("novel-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeBtn(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("novel-theme", next);
  updateThemeBtn(next);
}

function updateThemeBtn(theme) {
  const t = theme === "dark" ? "☀️" : "🌙";
  document.getElementById("themeBtn").textContent = t;
  const btn2 = document.getElementById("themeBtn2");
  if (btn2) btn2.textContent = t;
}

// ─── Data Loading ───
async function loadBook(bookId) {
  if (booksData[bookId]) return booksData[bookId];
  const meta = BOOKS_META.find((b) => b.id === bookId);
  if (!meta) return null;
  const resp = await fetch(meta.dataFile);
  const data = await resp.json();
  booksData[bookId] = data;
  return data;
}

// ─── Router ───
const router = {
  _pages: ["pageHome", "pageDetail", "pageReader"],

  _show(pageId) {
    this._pages.forEach((id) => {
      document.getElementById(id).style.display = id === pageId ? "" : "none";
    });
    window.scrollTo(0, 0);
  },

  home() {
    this._show("pageHome");
    currentBook = null;
    currentChapter = null;
    document.title = "WOOKING 书阁";
    history.pushState({ page: "home" }, "", "#");
  },

  async detail(bookId) {
    this._show("pageDetail");
    const data = await loadBook(bookId);
    if (!data) return this.home();
    currentBook = data;
    currentChapter = null;
    document.title = `${data.title} — WOOKING 书阁`;
    renderDetail(data);
    history.pushState({ page: "detail", bookId }, "", `#${bookId}`);
  },

  async read(bookId, chId) {
    this._show("pageReader");
    const data = await loadBook(bookId);
    if (!data) return this.home();
    currentBook = data;
    const ch = data.chapters.find((c) => c.id === chId);
    if (!ch) return this.detail(bookId);
    currentChapter = ch;
    document.title = `${ch.title} — ${data.title}`;
    renderReader(data, ch);
    saveProgress(bookId, chId);
    history.pushState(
      { page: "read", bookId, chId },
      "",
      `#${bookId}/ch${chId}`
    );
  },
};

// ─── Render: Home ───
function renderHome() {
  const grid = document.getElementById("bookGrid");
  grid.innerHTML = BOOKS_META.map((b) => {
    const saved = getProgress(b.id);
    const data = booksData[b.id];
    const chCount = data ? data.chapters.length : "…";
    return `
      <div class="book-card" onclick="router.detail('${b.id}')">
        <div class="book-cover" style="background:${b.coverColor}">
          ${b.emoji}
        </div>
        <div class="book-info">
          <h3>${b.title}</h3>
          <div class="book-meta">${b.genre} · ${b.subtitle}</div>
          <div class="book-tagline">${b.tagline}</div>
          <div class="book-stats">
            <span>📚 ${typeof chCount === 'number' ? chCount + '章' : '加载中…'}</span>
            ${saved ? `<span>📖 已读至第${saved}章</span>` : ""}
          </div>
        </div>
      </div>`;
  }).join("");
}

// ─── Render: Detail ───
function renderDetail(data) {
  const meta = BOOKS_META.find((b) => b.id === data.id);
  const header = document.getElementById("detailHeader");
  const saved = getProgress(data.id);

  header.innerHTML = `
    <div class="detail-cover" style="background:${meta.coverColor}">
      ${meta.emoji}
    </div>
    <div class="detail-info">
      <h1>${data.title}</h1>
      <div class="subtitle">${data.subtitle} · ${data.genre}</div>
      <div class="detail-desc">${data.description}</div>
      <div class="detail-actions">
        <button class="btn-primary" onclick="router.read('${data.id}', ${
    saved || data.chapters[0].id
  })">${saved ? "继续阅读" : "开始阅读"}</button>
        <button class="btn-ghost" onclick="router.read('${data.id}', ${
    data.chapters[0].id
  })">从头开始</button>
      </div>
    </div>`;

  renderChapterList(data.chapters, data.id);
}

function renderChapterList(chapters, bookId, filter = "") {
  const list = document.getElementById("chapterList");
  const filtered = filter
    ? chapters.filter((c) => c.title.includes(filter))
    : chapters;
  const readSet = new Set(getReadChapters(bookId));

  list.innerHTML = filtered
    .map(
      (c) => `
    <div class="chapter-item ${readSet.has(c.id) ? "read" : ""}"
         onclick="router.read('${bookId}', ${c.id})">
      ${c.title}
    </div>`
    )
    .join("");
}

function filterChapters(query) {
  if (!currentBook) return;
  renderChapterList(currentBook.chapters, currentBook.id, query);
}

// ─── Render: Reader ───
function renderReader(book, ch) {
  document.getElementById("readerBarTitle").textContent = ch.title;
  document.getElementById("readerTitle").textContent = ch.title;

  // Parse content into paragraphs
  const paragraphs = ch.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const html = paragraphs
    .map((p) => {
      const isDialogue =
        p.includes("「") || p.includes("：") || p.startsWith(""");
      return `<p class="${isDialogue ? "dialogue" : ""}">${escapeHtml(p)}</p>`;
    })
    .join("");

  document.getElementById("readerText").innerHTML = html;

  // Nav buttons
  const idx = book.chapters.findIndex((c) => c.id === ch.id);
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= book.chapters.length - 1;

  // Mark as read
  markRead(book.id, ch.id);

  // Reset scroll
  window.scrollTo(0, 0);
}

const reader = {
  prev() {
    if (!currentBook || !currentChapter) return;
    const idx = currentBook.chapters.findIndex(
      (c) => c.id === currentChapter.id
    );
    if (idx > 0) router.read(currentBook.id, currentBook.chapters[idx - 1].id);
  },
  next() {
    if (!currentBook || !currentChapter) return;
    const idx = currentBook.chapters.findIndex(
      (c) => c.id === currentChapter.id
    );
    if (idx < currentBook.chapters.length - 1)
      router.read(currentBook.id, currentBook.chapters[idx + 1].id);
  },
};

// ─── Progress Tracking ───
function saveProgress(bookId, chId) {
  localStorage.setItem(`novel-progress-${bookId}`, chId);
}

function getProgress(bookId) {
  const v = localStorage.getItem(`novel-progress-${bookId}`);
  return v ? parseInt(v) : null;
}

function markRead(bookId, chId) {
  const key = `novel-read-${bookId}`;
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  if (!arr.includes(chId)) {
    arr.push(chId);
    localStorage.setItem(key, JSON.stringify(arr));
  }
}

function getReadChapters(bookId) {
  return JSON.parse(
    localStorage.getItem(`novel-read-${bookId}`) || "[]"
  );
}

// ─── Helpers ───
function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

// ─── Scroll Progress ───
function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  document.documentElement.style.setProperty("--progress", pct + "%");

  const btn = document.getElementById("scrollTop");
  btn.classList.toggle("show", scrollTop > 300);
}

// ─── Keyboard Navigation ───
document.addEventListener("keydown", (e) => {
  if (!currentChapter) return;
  if (e.key === "ArrowLeft" || e.key === "a") reader.prev();
  if (e.key === "ArrowRight" || e.key === "d") reader.next();
});

// ─── Hash Router ───
function handleHash() {
  const hash = location.hash.slice(1);
  if (!hash || hash === "home") return router.home();
  const parts = hash.split("/ch");
  if (parts.length === 2) {
    return router.read(parts[0], parseInt(parts[1]));
  }
  return router.detail(hash);
}

// ─── Init ───
async function init() {
  initTheme();
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("popstate", handleHash);

  // Load all books data
  await Promise.all(BOOKS_META.map((b) => loadBook(b.id)));

  renderHome();
  handleHash();
}

init();
