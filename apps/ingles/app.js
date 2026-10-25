const STORAGE_KEY = "ingles-card-index";

const emptyEl = document.querySelector("#empty");
const cardEl = document.querySelector("#card");
const playButton = document.querySelector("#play");
const nextButton = document.querySelector("#next");
const audio = new Audio();
const warmer = new Audio();

const NOTES = [523.25, 587.33, 659.25, 783.99, 880];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let cards = [];
let index = -1;
let spinning = false;
let toneCtx = null;

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

function preloadImages() {
  cards.forEach((card) => {
    const image = new Image();
    image.src = card.image;
  });
}

function toneContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  if (!toneCtx) toneCtx = new Context();
  return toneCtx;
}

function blip(frequency, when, duration, volume) {
  const ctx = toneContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration);
}

function playTick(step) {
  const ctx = toneContext();
  if (!ctx) return;
  blip(NOTES[step % NOTES.length], ctx.currentTime, 0.09, 0.045);
}

function playLand() {
  const ctx = toneContext();
  if (!ctx) return;
  const start = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((frequency, note) => {
    blip(frequency, start + note * 0.07, 0.34, 0.05);
  });
}

function pickTarget(avoid) {
  if (cards.length < 2) return 0;
  let target = avoid;
  while (target === avoid) target = Math.floor(Math.random() * cards.length);
  return target;
}

function spinFrames(target) {
  const total = cards.length;
  if (total < 2) return [target];
  const frames = [];
  let cursor = Math.floor(Math.random() * total);
  const fast = Math.min(total, 10);
  for (let step = 0; step < fast; step += 1) {
    cursor = (cursor + 1 + Math.floor(Math.random() * Math.max(1, total - 2))) % total;
    if (cursor === target) cursor = (cursor + 1) % total;
    frames.push(cursor);
  }
  let step = (target - 4 + total) % total;
  for (let hop = 0; hop < 5; hop += 1) {
    step = (step + 1) % total;
    frames.push(step);
  }
  if (frames[frames.length - 1] !== target) frames.push(target);
  return frames;
}

function spinDelays(count) {
  if (count <= 1) return [0];
  const delays = [];
  for (let step = 0; step < count; step += 1) {
    const progress = step / (count - 1);
    delays.push(36 + progress * progress * 190);
  }
  return delays;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function showFrame(frame, fast) {
  emptyEl.hidden = true;
  cardEl.hidden = false;
  cardEl.src = cards[frame].image;
  cardEl.classList.toggle("is-fast", fast);
  cardEl.classList.remove("is-tick");
  void cardEl.offsetWidth;
  cardEl.classList.add("is-tick");
}

async function spinTo(target) {
  spinning = true;
  playButton.disabled = true;
  nextButton.disabled = true;
  cardEl.classList.remove("is-chosen");
  const frames = reduceMotion ? [target] : spinFrames(target);
  const delays = spinDelays(frames.length);
  for (let step = 0; step < frames.length; step += 1) {
    const fast = delays[step] < 90;
    showFrame(frames[step], fast);
    if (!reduceMotion) playTick(step);
    await wait(delays[step]);
  }
  index = target;
  saveIndex(index);
  spinning = false;
  showCard();
  cardEl.classList.remove("is-fast", "is-tick");
  cardEl.classList.add("is-chosen");
  if (!reduceMotion) playLand();
}

function showCard() {
  const card = cards[index];
  emptyEl.hidden = true;
  cardEl.hidden = false;
  cardEl.src = card.image;
  playButton.disabled = false;
  nextButton.disabled = false;
  warmer.src = audioSrc(card.word);
}

function playCurrent() {
  const card = cards[index];
  if (!card || spinning) return;
  const src = audioSrc(card.word);
  if (audio.src !== src) audio.src = src;
  if (audio.readyState >= 1) audio.currentTime = 0;
  audio.play().catch(() => {});
}

async function showNext() {
  if (spinning || cards.length === 0) return;
  spinning = true;
  playButton.disabled = true;
  nextButton.disabled = true;
  audio.pause();
  const target = pickTarget(index);
  const ctx = toneContext();
  if (ctx && ctx.state === "suspended") await ctx.resume();
  await spinTo(target);
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

  preloadImages();
  const saved = loadIndex(cards.length);
  await spinTo(pickTarget(saved));
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.error(error);
  });
}

init();
