const fs = require("fs");
const path = require("path");

const htmlPath = path.join(process.cwd(), "test-ninjas-sat-vocabulary.html");
const outputPath = path.join(process.cwd(), "data", "sat-vocabulary-list.json");

function decodeHtml(value) {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/Ã©/g, "e")
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitDefinitionAndExample(text) {
  const parts = text
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return {
      definition: text,
      example: ""
    };
  }

  return {
    definition: parts.slice(0, -1).join("; "),
    example: parts.at(-1)
  };
}

const html = fs.readFileSync(htmlPath, "utf8");
const rowPattern =
  /<tr><td scope="row"><span class="bold">(\d+)<\/span><\/td><td>(.*?)<\/td><td><em>(.*?)<\/em><\/td><td>(.*?)<\/td><\/tr>/g;

const entries = [...html.matchAll(rowPattern)].map((match) => {
  const sourceOrder = Number(match[1]);
  const word = decodeHtml(match[2]);
  const partOfSpeech = decodeHtml(match[3]);
  const rawDefinition = decodeHtml(match[4]);
  const { definition, example } = splitDefinitionAndExample(rawDefinition);

  return {
    sourceOrder,
    setName: "Test Ninjas SAT Vocabulary",
    word,
    definition,
    example,
    partOfSpeech,
    difficulty: 2,
    tags: ["SAT", "Test Ninjas"]
  };
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`);

console.log(`Extracted ${entries.length} SAT vocabulary entries.`);
console.log(`Wrote ${outputPath}`);
