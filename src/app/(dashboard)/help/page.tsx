import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { HelpClient } from "./help-client";

export const dynamic = "force-static";

interface DocSection {
  id: string;
  filename: string;
  title: string;
  body: string;
}

async function loadDocs(): Promise<{ readme: string; sections: DocSection[] }> {
  const docsDir = path.join(process.cwd(), "docs");
  const all = await readdir(docsDir);

  const readme = await readFile(path.join(docsDir, "README.md"), "utf8");

  const numbered = all
    .filter((f) => /^\d{2}-.+\.md$/.test(f))
    .filter((f) => f !== "_combined-user-guide.md")
    .sort();

  const sections = await Promise.all(
    numbered.map(async (filename) => {
      const body = await readFile(path.join(docsDir, filename), "utf8");
      // Derive the section id from the filename: "02-call-sheet.md" → "call-sheet"
      const id = filename.replace(/^\d{2}-/, "").replace(/\.md$/, "");
      // First H1 line is the title
      const titleMatch = body.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1]?.trim() || id;
      return { id, filename, title, body };
    })
  );

  return { readme, sections };
}

export default async function HelpPage() {
  const { readme, sections } = await loadDocs();
  return <HelpClient readme={readme} sections={sections} />;
}
