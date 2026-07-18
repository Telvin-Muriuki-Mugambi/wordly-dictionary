# wordly-dictionary

A single-page dictionary app. Type a word, get its pronunciation, part of
speech, definitions, example usage, and synonyms — no page reload.

Built with plain HTML, CSS, and JavaScript (no framework, no build step),
using the [Free Dictionary API](https://dictionaryapi.dev/).

## Features

- **Search** — a form fetches `GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}` and renders the result on the same page.
- **Definitions** — grouped by part of speech, each with a definition, example (when available), and synonyms.
- **Pronunciation** — phonetic spelling plus a play button when the API provides an audio clip.
- **Bookmarks** — save words with one click; saved words persist in `localStorage` and appear in the sidebar, with the card itself getting a highlighted "bookmarked" ribbon.
- **Day / night reading mode** — a theme toggle swaps the whole palette via a `data-theme` attribute and CSS custom properties, and remembers your choice.
- **Error handling** — a dedicated error state for words that aren't found (404) and for network/API failures, with a plain-language message.

