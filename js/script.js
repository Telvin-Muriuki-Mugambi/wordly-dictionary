console.log("Hello")/* ============================================================
   Wordly — application logic
   Uses the Free Dictionary API: https://dictionaryapi.dev/
   ============================================================ */

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const SAVED_WORDS_KEY = "wordly:saved-words";

/* -------------------- DOM references -------------------- */

const form = document.getElementById("search-form");
const input = document.getElementById("word-input");
const searchStatus = document.getElementById("search-status");

const introState = document.getElementById("intro-state");
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");

const card = document.getElementById("card");
const ribbon = document.getElementById("ribbon");
const wordTitle = document.getElementById("word-title");
const phoneticText = document.getElementById("phonetic-text");
const audioBtn = document.getElementById("audio-btn");
const audioPlayer = document.getElementById("audio-player");
const meaningsEl = document.getElementById("meanings");
const sourceList = document.getElementById("source-list");

const bookmarkBtn = document.getElementById("bookmark-btn");
const bookmarkIcon = document.getElementById("bookmark-icon");
const bookmarkLabel = document.getElementById("bookmark-label");

const savedList = document.getElementById("saved-list");
const savedEmpty = document.getElementById("saved-empty");

const themeToggle = document.getElementById("theme-toggle");
const themeToggleText = document.getElementById("theme-toggle-text");

/* -------------------- State -------------------- */

let currentWord = null;   // the word currently shown on the card
let currentEntry = null;  // the raw API entry for the current word, cached for re-render

/* ============================================================
   View state switching
   ============================================================ */

function showState(name) {
  introState.hidden = name !== "intro";
  loadingState.hidden = name !== "loading";
  errorState.hidden = name !== "error";
  card.hidden = name !== "card";
}

/* ============================================================
   Fetching
   ============================================================ */

async function lookupWord(word) {
  showState("loading");
  searchStatus.textContent = `Searching for “${word}”…`;

  try {
    const response = await fetch(API_BASE + encodeURIComponent(word));

    if (response.status === 404) {
      throw new Error(`No card on file for “${word}”. Check the spelling, or try a simpler form of the word.`);
    }
    if (!response.ok) {
      throw new Error(`The catalog didn't respond as expected (status ${response.status}). Try again in a moment.`);
    }

    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : null;

    if (!entry) {
      throw new Error(`No card on file for “${word}”.`);
    }

    currentWord = entry.word || word;
    currentEntry = entry;
    renderCard(entry);
    searchStatus.textContent = `Showing the card for “${currentWord}”.`;
  } catch (err) {
    const message = err instanceof TypeError
      ? "Couldn't reach the dictionary service. Check your connection and try again."
      : err.message;
    showError(message);
    searchStatus.textContent = "";
  }
}

function showError(message) {
  errorMessage.textContent = message;
  showState("error");
}

/* ============================================================
   Rendering the index card
   ============================================================ */

function renderCard(entry) {
  wordTitle.textContent = entry.word;

  // Phonetics: prefer an entry that also has audio, fall back to plain text.
  const phoneticWithAudio = (entry.phonetics || []).find(p => p.audio);
  const phoneticText_ = entry.phonetic
    || (entry.phonetics || []).map(p => p.text).find(Boolean)
    || "";

  phoneticText.textContent = phoneticText_;

  if (phoneticWithAudio && phoneticWithAudio.audio) {
    audioBtn.hidden = false;
    audioPlayer.src = phoneticWithAudio.audio;
    audioBtn.onclick = () => {
      audioPlayer.currentTime = 0;
      audioPlayer.play();
    };
  } else {
    audioBtn.hidden = true;
    audioBtn.onclick = null;
  }

  // Meanings, grouped by part of speech
  meaningsEl.innerHTML = "";
  (entry.meanings || []).forEach(meaning => {
    const block = document.createElement("div");
    block.className = "meaning-block";

    const pos = document.createElement("p");
    pos.className = "meaning-block__pos";
    pos.textContent = meaning.partOfSpeech;
    block.appendChild(pos);

    const list = document.createElement("ol");
    list.className = "meaning-block__list";

    (meaning.definitions || []).slice(0, 4).forEach(def => {
      const li = document.createElement("li");
      li.className = "sense";

      const inner = document.createElement("div");

      const defP = document.createElement("p");
      defP.className = "sense__def";
      defP.textContent = def.definition;
      inner.appendChild(defP);

      if (def.example) {
        const exP = document.createElement("p");
        exP.className = "sense__example";
        exP.textContent = def.example;
        inner.appendChild(exP);
      }

      const synonyms = (def.synonyms && def.synonyms.length ? def.synonyms : meaning.synonyms) || [];
      if (synonyms.length) {
        const synP = document.createElement("p");
        synP.className = "sense__synonyms";
        synP.innerHTML = `Synonyms: <span>${synonyms.slice(0, 6).map(escapeHtml).join(", ")}</span>`;
        inner.appendChild(synP);
      }

      li.appendChild(inner);
      list.appendChild(li);
    });

    block.appendChild(list);
    meaningsEl.appendChild(block);
  });

  // Sources
  sourceList.innerHTML = "";
  const urls = entry.sourceUrls && entry.sourceUrls.length
    ? entry.sourceUrls
    : ["https://dictionaryapi.dev/"];
  urls.forEach(url => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = url;
    a.textContent = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    li.appendChild(a);
    sourceList.appendChild(li);
  });

  syncBookmarkUI();
  showState("card");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   Bookmarks (persisted saved words)
   ============================================================ */

function getSavedWords() {
  try {
    const raw = localStorage.getItem(SAVED_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSavedWords(words) {
  localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(words));
}

function isWordSaved(word) {
  return getSavedWords().some(w => w.toLowerCase() === word.toLowerCase());
}

function toggleBookmark() {
  if (!currentWord) return;

  const words = getSavedWords();
  const idx = words.findIndex(w => w.toLowerCase() === currentWord.toLowerCase());

  if (idx >= 0) {
    words.splice(idx, 1);
  } else {
    words.unshift(currentWord);
  }

  setSavedWords(words);
  syncBookmarkUI();
  renderSavedList();
}

function syncBookmarkUI() {
  if (!currentWord) return;
  const saved = isWordSaved(currentWord);

  bookmarkBtn.setAttribute("aria-pressed", String(saved));
  bookmarkIcon.textContent = saved ? "★" : "☆";
  bookmarkLabel.textContent = saved ? "Saved" : "Save this card";
  ribbon.hidden = !saved;
  card.classList.toggle("is-saved", saved);
}

function renderSavedList() {
  const words = getSavedWords();
  savedList.innerHTML = "";

  if (!words.length) {
    savedEmpty.hidden = false;
    savedList.appendChild(savedEmpty);
    return;
  }

  savedEmpty.hidden = true;

  words.forEach(word => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "saved-word";
    btn.innerHTML = `<span class="saved-word__dot">●</span> ${escapeHtml(word)}`;
    btn.addEventListener("click", () => {
      input.value = word;
      lookupWord(word);
    });
    li.appendChild(btn);
    savedList.appendChild(li);
  });
}

/* ============================================================
   Theme toggle (day / night reading mode)
   ============================================================ */

const THEME_KEY = "wordly:theme";

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-pressed", String(theme === "night"));
  themeToggleText.textContent = theme === "night" ? "Night reading" : "Day reading";
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
    return;
  }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "night" : "day");
}

themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  applyTheme(current === "night" ? "day" : "night");
});

/* ============================================================
   Event wiring
   ============================================================ */

form.addEventListener("submit", event => {
  event.preventDefault();
  const word = input.value.trim();
  if (!word) return;
  lookupWord(word);
});

bookmarkBtn.addEventListener("click", toggleBookmark);

/* ============================================================
   Init
   ============================================================ */

initTheme();
renderSavedList();
showState("intro");