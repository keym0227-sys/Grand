const fs = require('fs');
const fetch = require('node-fetch');
const zlib = require("zlib");

async function fetchText(url) {
    let response = await fetch(url);
    return await response.text();
}

async function fetchData(url) {
    let response = await fetch(url);
    return await response.arrayBuffer();
}

async function compress(data) {
    const output = await zlib.gzipSync(data);
    return output.toString("base64");
}
function dataToBase64(data) {
    const buf = Buffer.from(data);
    return buf.toString("base64");
}

async function makeForCore(core, webgl2) {
    const index = await fetchText("https://raw.githubusercontent.com/EmulatorJS/EmulatorJS/refs/heads/main/index.html");
    const loader = await fetchData("https://cdn.emulatorjs.org/stable/data/loader.js");
    const js = await fetchData("https://cdn.emulatorjs.org/stable/data/emulator.min.js");
    const css = await fetchData("https://cdn.emulatorjs.org/stable/data/emulator.min.css");
    
    const extract7Z = await fetchData("https://cdn.emulatorjs.org/stable/data/compression/extract7z.js");
    const extractZIP = await fetchData("https://cdn.emulatorjs.org/stable/data/compression/extractzip.js");
    const libunrarJS = await fetchData("https://cdn.emulatorjs.org/stable/data/compression/libunrar.js");
    const libunrarWASM = await fetchData("https://cdn.emulatorjs.org/stable/data/compression/libunrar.wasm");
    
    const coreName = `${core}${webgl2 ? "" : "-legacy"}-wasm.data`;
    const coreFile = await fetchData(`https://cdn.emulatorjs.org/stable/data/cores/${coreName}`);
    const coreReport = await fetchData(`https://cdn.emulatorjs.org/stable/data/cores/reports/${core}.json`);
    
    const loaderMin = await compress(loader);
    const jsMin = await compress(js);
    const cssMin = await compress(css);
    
    const extract7ZMin = await compress(extract7Z);
    const extractZIPMin = await compress(extractZIP);
    const libunrarJSMin = await compress(libunrarJS);
    const libunrarWASMMin = await compress(libunrarWASM);
    
    const coreFileMin = await compress(coreFile);
    const coreReportMin = await compress(coreReport);
    
    const logo = await fetchData("https://demo.emulatorjs.org/img/logo-light.png");
    const logoData = dataToBase64(logo);
    
    const data = `
    async function decompress(base64) {
        const blob = new Blob([Uint8Array.from(atob(base64), (m) => m.codePointAt(0))]);
        return await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).blob();
    }
    async function decompressToBlobURL(base64, type) {
        let blob = await decompress(base64);
        blob = new Blob([blob], { type: type || "application/json" });
        return URL.createObjectURL(blob);
    }
    window.EJS_paths = {
        "emulator.min.js": await decompressToBlobURL("${jsMin}"),
        "emulator.min.css": await decompressToBlobURL("${cssMin}", "text/css"),
        
        "extract7z.js": await decompressToBlobURL("${extract7ZMin}"),
        "extractzip.js": await decompressToBlobURL("${extractZIPMin}"),
        "libunrar.js": await decompressToBlobURL("${libunrarJSMin}"),
        "libunrar.wasm": await decompressToBlobURL("${libunrarWASMMin}", "application/wasm"),
        "${coreName}": await decompressToBlobURL("${coreFileMin}", "application/octet-stream"),
        "${core}.json": await decompressToBlobURL("${coreReportMin}", "application/json")
    };
    window.EJS_defaultOptions = {
        webgl2Enabled: "${webgl2 ? "enabled" : "disabled"}"
    };
    
    script.src = await decompressToBlobURL("${loaderMin}");
    `;
    
    const output = index
        .replace(`<h1>EmulatorJS Demo</h1>`, `<h1>EmulatorJS all-in-one</h1>`)
        .replace(`Drag ROM file or click here`, `Drag ROM file or click here - ${core}`)
        .replace(`const core = await (async (ext) => {`, `const core = await (async (ext) => {return "${core}";`)
        .replace(`<img src="docs/Logo-light.png" alt="Logo" class="logo">`, `<img src="data:image/png;base64,${logoData}" alt="Logo" class="logo">`)
        .replace(`script.src = "data/loader.js";`, data);
    
    fs.writeFileSync(`output/EJS-${core}${webgl2 ? "" : "-legacy"}.html`, output);
}

(async function() {
    const cores = ["81","a5200","beetle_vb","cap32","crocods","desmume","desmume2015","fbalpha2012_cps1","fbalpha2012_cps2","fbneo","fceumm","fuse","gambatte","gearcoleco","genesis_plus_gx","handy","mame2003_plus","mame2003","mednafen_ngp","mednafen_pce","mednafen_pcfx","mednafen_psx_hw","mednafen_wswan","melonds","mgba","mupen64plus_next","nestopia","opera","parallel_n64","pcsx_rearmed","picodrive","prboom","prosystem","puae","same_cdi","smsplus","snes9x","stella2014","vice_x128","vice_x64","vice_x64sc","vice_xpet","vice_xplus4","vice_xvic","virtualjaguar","yabause"];
    fs.mkdirSync("output/");
    cores.forEach(core => {
        console.log(`Building ${core}`);
        makeForCore(core, true);
        makeForCore(core, false);
    });
})();

/**
let a = [];
Array.from(document.querySelectorAll("tr")).filter(e => e.firstChild.firstChild.href.endsWith(e.firstChild.firstChild.innerText)).forEach(e => {
    let name = e.firstChild.firstChild.innerText;
    if (name.includes("-legacy") || name.includes("-thread")) return;
    let core = name.replace("-wasm.data", "");
    if (core.includes(".")) return;
    if (!a.includes(core)) a.push(core);
});
*/
