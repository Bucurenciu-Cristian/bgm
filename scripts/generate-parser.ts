import { join } from "path";
import { parse as parseYaml } from "yaml";

// Use require for the Kaitai compiler (it's a UMD module)
const KaitaiStructCompiler = require("kaitai-struct-compiler");

const schemaPath = join(import.meta.dir, "../src/core/snss/chrome-session.ksy");
const outputPath = join(import.meta.dir, "../src/core/snss/ChromeSession.js");

console.log("Generating JavaScript parser from Kaitai schema...");

const schemaFile = Bun.file(schemaPath);
const schemaContent = await schemaFile.text();

// Parse YAML schema
const schema = parseYaml(schemaContent);

// Compile to JavaScript (since 0.11.0, KaitaiStructCompiler is the compiler object itself)
const result = await KaitaiStructCompiler.compile("javascript", schema, null, false);

// Get the generated JavaScript
const jsFileName = Object.keys(result)[0]!;
const jsContent = result[jsFileName];

// Write the output
await Bun.write(outputPath, jsContent);

console.log(`Parser generated: ${outputPath}`);
