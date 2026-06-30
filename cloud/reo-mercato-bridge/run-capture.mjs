import { captureFotmobTransfers } from "./lib/fotmobCapture.mjs";
const out = await captureFotmobTransfers({ orderBy: "fee", daysSince: 140 });
if (!out.ok) { console.log("CAPTURE FAILED", JSON.stringify(out).slice(0,300)); process.exit(1); }
const t = out.raw.transfers || [];
console.log("OK url=", out.url);
console.log("hits=", out.raw.hits, "maxFee=", out.raw.maxFee, "transfers=", t.length);
console.log("keys[0]=", Object.keys(t[0]||{}).join(","));
console.log(JSON.stringify(t[0], null, 1).slice(0, 1400));
