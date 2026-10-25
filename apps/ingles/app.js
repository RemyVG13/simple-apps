const STORAGE_KEY = "ingles-card-index";

const emptyEl = document.querySelector("#empty");
const cardEl = document.querySelector("#card");
const playButton = document.querySelector("#play");
const nextButton = document.querySelector("#next");
const audio = new Audio();
const warmer = new Audio();

let cards = [];
let index = 0;

audio.preload = "auto";
warmer.preload = "auto";

function slug(word) {
  return String(word)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function audioSrc(word) {
  return new URL(`audio/${slug(word)}.mp3`, document.baseURI).href;
}

function loadIndex(length) {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < length) return saved;
  } catch (error) {
    return 0;
  }
  return 0;
}

function saveIndex(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (error) {
    /* El modo privado puede bloquear el almacenamiento. */
  }
}

function showEmpty() {
  cardEl.hidden = true;
  cardEl.removeAttribute("src");
  emptyEl.hidden = false;
  playButton.disabled = true;
  nextButton.disabled = true;
}

function preloadNext() {
  if (cards.length < 2) return;
  const next = cards[(index + 1) % cards.length];
  const image = new Image();
  image.src = next.image;
  warmer.src = audioSrc(next.word);
}

function showCard() {
  const card = cards[index];
  emptyEl.hidden = true;
  cardEl.hidden = false;
  cardEl.src = card.image;
  playButton.disabled = false;
  nextButton.disabled = false;
  preloadNext();
}

function playCurrent() {
  const card = cards[index];
  if (!card) return;
  const src = audioSrc(card.word);
  if (audio.src !== src) audio.src = src;
  if (audio.readyState >= 1) audio.currentTime = 0;
  audio.play().catch(() => {});
}

function showNext() {
  if (cards.length === 0) return;
  audio.pause();
  index = (index + 1) % cards.length;
  saveIndex(index);
  showCard();
}

playButton.addEventListener("click", playCurrent);
nextButton.addEventListener("click", showNext);

async function init() {
  try {
    const response = await fetch("./data/cards.json");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        cards = data.filter(
          (card) =>
            card &&
            typeof card.word === "string" &&
            card.word.trim() !== "" &&
            typeof card.image === "string" &&
            card.image.trim() !== ""
        );
      }
    }
  } catch (error) {
    cards = [];
  }

  if (cards.length === 0) {
    showEmpty();
    return;
  }

  index = loadIndex(cards.length);
  showCard();
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.error(error);
  });
}

init();
