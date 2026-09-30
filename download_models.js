import fs from 'fs';
import path from 'path';
import https from 'https';

const baseUrl = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api@master/model/';
const manifests = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
];

const dest = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

function download(model) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(dest, model);
    console.log(`Downloading ${model}...`);
    https.get(baseUrl + model, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${model}: ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Finished ${model}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  for (const manifestName of manifests) {
    await download(manifestName);
    const manifest = JSON.parse(fs.readFileSync(path.join(dest, manifestName), 'utf8'));
    for (const group of manifest) {
      for (const pathName of group.paths) await download(pathName);
    }
  }
}

downloadModels().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
