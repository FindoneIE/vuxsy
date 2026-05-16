import sharp from "sharp";
import fs from "node:fs";
const files = fs.readdirSync("/tmp/findone-slow-frames").sort();
const bufs = [];
for (const f of files) {
  const buf = await sharp(`/tmp/findone-slow-frames/${f}`).raw().toBuffer({ resolveWithObject: true });
  bufs.push({ file: f, data: buf.data, info: buf.info });
}
const regions = {
  logo: { x: 24, y: 10, w: 92, h: 48 },
  card1: { x: 377, y: 274, w: 278, h: 278 },
  card2: { x: 677, y: 274, w: 278, h: 278 },
  card3: { x: 977, y: 274, w: 278, h: 278 },
};
const final = bufs[bufs.length - 1];
function diff(a, b, x, y, w, h) {
  const stride = a.info.width * 3;
  let d = 0;
  const tol = 8;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const i = py * stride + px * 3;
      if (
        Math.abs(a.data[i] - b.data[i]) > tol ||
        Math.abs(a.data[i + 1] - b.data[i + 1]) > tol ||
        Math.abs(a.data[i + 2] - b.data[i + 2]) > tol
      )
        d++;
    }
  }
  return (100 * d) / (w * h);
}
console.log("frame".padEnd(40), "logo    card1    card2    card3");
for (const f of bufs) {
  const cells = Object.entries(regions)
    .map(([, r]) => diff(f, final, r.x, r.y, r.w, r.h).toFixed(2).padStart(6) + "%")
    .join(" ");
  console.log(f.file.padEnd(40), cells);
}
