import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse the TSV file
const content = fs.readFileSync(
  path.join(__dirname, "../en_US.txt"),
  "utf-8"
);

const ipaDict = {};
content.split("\n").forEach((line) => {
  if (line.trim()) {
    const [word, ipa] = line.split("\t");
    if (word && ipa) {
      ipaDict[word.toLowerCase()] = ipa;
    }
  }
});

export function getIPA(text) {
  const words = text.trim().split(/\s+/);
  
  // If single word, return just the IPA string or null
  if (words.length === 1) {
    return ipaDict[words[0].toLowerCase()] || null;
  }
  
  // If multiple words, return an array of IPAs
  return words.map(word => ipaDict[word.toLowerCase()] || null);
}