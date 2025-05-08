import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Read and parse the JSON file
// const serviceAccount = JSON.parse(
//   await readFile(join(__dirname, "./credentials/serviceAccountKey.json"))
// );

// const app = initializeApp({
//   credential: cert(serviceAccount),
// });

const db = getFirestore();

export { db };
