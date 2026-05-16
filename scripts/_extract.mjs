import sharp from "sharp";
const region = { left: 377, top: 274, width: 278, height: 278 };
for (const f of ["_services_01_1017ms", "_services_02_1230ms"]) {
  await sharp(`/tmp/findone-slow-frames/${f}.jpg`).extract(region).toFile(`/tmp/findone-slow-frames/${f}_card1.png`);
}
for (const f of ["_services_00_18ms", "_services_01_1017ms", "_services_02_1230ms"]) {
  await sharp(`/tmp/findone-slow-frames/${f}.jpg`).extract({ left: 0, top: 0, width: 1280, height: 600 }).toFile(`/tmp/findone-slow-frames/${f}_top.png`);
}
console.log("ok");
