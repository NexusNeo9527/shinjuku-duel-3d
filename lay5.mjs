import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: "new", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"] });
const errors = [];
const audit = async (w, h, mode) => {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.on("pageerror", e => errors.push(`${w}x${h}/${mode}: ${e.message}`));
  page.on("console", m => { if (m.type()==="error") errors.push(`${w}x${h}/${mode}: ${m.text()}`); });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
  await page.waitForFunction("window.__arena3d !== undefined", { timeout: 20000 });
  await new Promise(r=>setTimeout(r,400));
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", clientX: 150, clientY: 300, bubbles: true })));
  await page.evaluate((m) => { const g = window.__arena3d.game; if (m === "practice") { g.practiceChar = "gojo"; g.setPracticeOption("dummy", true); } window.__arena3d.start(m, "normal"); }, mode);
  await new Promise(r=>setTimeout(r,1300));
  const bad = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, rects = {};
    for (const s of [".duel-hud",".operator-card",".practice-panel",".split-panel.left",".split-panel.right",".touch-right",".touch-right.p2"]) {
      const el = document.querySelector(s); if (!el) continue; const cs = getComputedStyle(el);
      if (cs.display === "none" || el.classList.contains("hidden")) continue;
      const r = el.getBoundingClientRect(); if (r.width < 2) continue;
      rects[s] = {l:r.left,t:r.top,r:r.right,b:r.bottom};
    }
    let n = 0;
    document.querySelectorAll("#touchUI button").forEach(b => { const cs = getComputedStyle(b); if (cs.display === "none") return;
      const r = b.getBoundingClientRect(); if (r.width < 2) return;
      if (r.left < -1 || r.top < -1 || r.right > vw+1 || r.bottom > vh+1) n += 1; });
    const k = Object.keys(rects);
    for (let i=0;i<k.length;i+=1) for (let j=i+1;j<k.length;j+=1) { const a=rects[k[i]],b=rects[k[j]];
      const ox=Math.min(a.r,b.r)-Math.max(a.l,b.l), oy=Math.min(a.b,b.b)-Math.max(a.t,b.t); if (ox>4&&oy>4) n += 1; }
    for (const [s,r] of Object.entries(rects)) if (r.l<-1||r.t<-1||r.r>vw+1||r.b>vh+1) n += 1;
    return n;
  });
  await page.close();
  return bad === 0;
};
let ok = true, pass = 0, total = 0;
for (const mode of ["single","dual","practice"]) for (const [w,h] of [[360,740],[390,844],[414,896],[740,360],[844,390],[768,1024],[1024,768],[1180,820],[1280,760],[1920,1080]]) { total += 1; const r = await audit(w,h,mode); if (r) pass += 1; ok = r && ok; }
console.log(`布局通过 ${pass}/${total}`);
console.log("ALL OK:", ok && errors.length === 0, errors.length ? "| " + errors.join(" | ") : "");
await browser.close();
process.exit(errors.length || !ok ? 1 : 0);
