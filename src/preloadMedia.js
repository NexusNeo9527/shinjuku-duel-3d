import { BGM_TRACKS } from "./audio.js";

// Keep decoded artwork alive so cut-ins and results are ready on first use.
const artwork = new Map();
const IMAGE_FILES = [
  "borrowed-heal.png", "domain-clash.png", "gojo-death.png", "gojo-murasaki.png",
  "gojo-void.png", "gojo-win.jpg", "limitless-blue.png", "limitless-red.png",
  "mahoraga-summon.png", "sukuna-domain.png", "sukuna-flame.png", "sukuna-guard.png",
  "sukuna-heal.png", "sukuna-slash.png", "sukuna-world-slash.png", "win-gojo.jpg",
  "win-sukuna.jpg", "win-yuta.png", "yuta-authentic-love.png", "yuta-cursed-speech.png",
  "yuta-heal.png", "yuta-jacobs-ladder.png", "yuta-katana.png", "yuta-rika.png",
  "yuta-sky-break.png"
];

async function preloadImage(file) {
  if (artwork.has(file)) return artwork.get(file);
  const image = new Image();
  await new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error(`Image timed out: ${file}`)), 120000);
    function finish(error) {
      window.clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) reject(error);
      else resolve();
    }
    image.onload = () => finish();
    image.onerror = () => finish(new Error(`Image failed: ${file}`));
    image.src = `${import.meta.env.BASE_URL}assets/${file}`;
  });
  await image.decode();
  artwork.set(file, image);
  return image;
}

export function mediaPreloadTasks(audio) {
  return [
    ...IMAGE_FILES.map((file) => ({ label: `图片 · ${file}`, load: () => preloadImage(file) })),
    ...BGM_TRACKS.map((track) => ({ label: `音乐 · ${track.label}`, load: () => audio.preloadTrack(track) }))
  ];
}
