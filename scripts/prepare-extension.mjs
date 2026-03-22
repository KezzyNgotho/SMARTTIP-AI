import { cpSync, existsSync, mkdirSync, watch } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const publicDir = resolve(rootDir, "public");
const distDir = resolve(rootDir, "dist");
const pwaManifestPath = resolve(rootDir, "pwa.webmanifest");
const watchMode = process.argv.includes("--watch");

const requiredFiles = ["manifest.json", "icon16.png", "icon48.png", "icon128.png"];

function syncExtensionAssets() {
  mkdirSync(distDir, { recursive: true });

  for (const fileName of requiredFiles) {
    const src = resolve(publicDir, fileName);
    const dest = resolve(distDir, fileName);

    if (!existsSync(src)) {
      throw new Error(`Missing required extension asset: public/${fileName}`);
    }

    cpSync(src, dest, { force: true });
  }

  const iconsDir = resolve(publicDir, "icons");
  if (existsSync(iconsDir)) {
    cpSync(iconsDir, resolve(distDir, "icons"), { recursive: true, force: true });
  }

  if (existsSync(pwaManifestPath)) {
    cpSync(pwaManifestPath, resolve(distDir, "pwa.webmanifest"), { force: true });
  }

  console.log("Extension assets copied to dist.");
}

syncExtensionAssets();

if (watchMode) {
  const onChange = () => {
    try {
      syncExtensionAssets();
    } catch (error) {
      console.error(`Asset sync error: ${error.message}`);
    }
  };

  watch(publicDir, { recursive: true }, onChange);
  watch(pwaManifestPath, onChange);
  console.log("Watching extension assets for changes...");
}
