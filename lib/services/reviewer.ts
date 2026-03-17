import type { Citation, DocumentRecord } from "@/lib/types";

export interface ReviewFinding {
  severity: "high" | "medium" | "low";
  fileLabel: string;
  line: number;
  title: string;
  summary: string;
}

const CODE_EXTENSIONS = new Set([
  "c",
  "cpp",
  "css",
  "go",
  "html",
  "java",
  "js",
  "json",
  "jsx",
  "kt",
  "md",
  "mjs",
  "php",
  "py",
  "rb",
  "rs",
  "sh",
  "sql",
  "swift",
  "ts",
  "tsx",
  "txt",
  "yaml",
  "yml",
]);

function getFileName(document: Pick<DocumentRecord, "sourcePath" | "title">) {
  return document.sourcePath ?? document.title;
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isReviewRequest(message: string, documentIds: string[] = []) {
  if (documentIds.length > 0) {
    return true;
  }

  return /review|scan|audit|bug|regression|pr\b|pull request|code|file/i.test(message);
}

export function isCodeLikeDocument(document: Pick<DocumentRecord, "sourcePath" | "title">) {
  return CODE_EXTENSIONS.has(getExtension(getFileName(document)));
}

function createFinding(
  severity: ReviewFinding["severity"],
  document: DocumentRecord,
  line: number,
  title: string,
  summary: string,
) {
  return {
    severity,
    fileLabel: getFileName(document),
    line,
    title,
    summary,
  } satisfies ReviewFinding;
}

function firstMatchLine(document: DocumentRecord, matcher: RegExp) {
  const lines = document.rawText.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (matcher.test(line)) {
      return {
        line: index + 1,
        content: line.trim(),
      };
    }
  }

  return null;
}

function collectFindings(document: DocumentRecord) {
  const findings: ReviewFinding[] = [];

  const hardcodedSecret = firstMatchLine(
    document,
    /(api[_-]?key|secret|token|password)\s*[:=]\s*["'`][^"'`]{8,}["'`]/i,
  );
  if (hardcodedSecret) {
    findings.push(
      createFinding(
        "high",
        document,
        hardcodedSecret.line,
        "Hardcoded credential-like value",
        "Secrets in source are easy to leak and hard to rotate safely.",
      ),
    );
  }

  const htmlInjection = firstMatchLine(document, /(dangerouslySetInnerHTML|innerHTML\s*=)/);
  if (htmlInjection) {
    findings.push(
      createFinding(
        "high",
        document,
        htmlInjection.line,
        "HTML injection surface",
        "Rendering unsanitized HTML can become an XSS path if any part of the payload is user-controlled.",
      ),
    );
  }

  const evalUsage = firstMatchLine(document, /\b(eval|new Function)\s*\(/);
  if (evalUsage) {
    findings.push(
      createFinding(
        "high",
        document,
        evalUsage.line,
        "Dynamic code execution",
        "Executing strings as code is usually unnecessary in app code and sharply increases security risk.",
      ),
    );
  }

  const swallowError = firstMatchLine(document, /catch\s*\([^)]*\)\s*{\s*}$/);
  if (swallowError) {
    findings.push(
      createFinding(
        "medium",
        document,
        swallowError.line,
        "Silent error handling",
        "The catch block appears to swallow failures, which makes debugging and user recovery harder.",
      ),
    );
  }

  const unsafeRandom = firstMatchLine(document, /\bMath\.random\s*\(/);
  if (unsafeRandom) {
    findings.push(
      createFinding(
        "medium",
        document,
        unsafeRandom.line,
        "Weak randomness",
        "Math.random is fine for UI flair, but not for IDs, tokens, or security-sensitive decisions.",
      ),
    );
  }

  const anyUsage = firstMatchLine(document, /(:\s*any\b|<any>|\bas any\b)/);
  if (anyUsage) {
    findings.push(
      createFinding(
        "medium",
        document,
        anyUsage.line,
        "Type safety escape hatch",
        "Broad any usage can hide shape mismatches and makes refactors riskier.",
      ),
    );
  }

  const ignoreDirective = firstMatchLine(document, /@ts-ignore|eslint-disable/);
  if (ignoreDirective) {
    findings.push(
      createFinding(
        "medium",
        document,
        ignoreDirective.line,
        "Suppressed static checks",
        "This line disables a safety net, so it deserves a comment or a tighter fix before merge.",
      ),
    );
  }

  const todo = firstMatchLine(document, /\b(TODO|FIXME|HACK)\b/i);
  if (todo) {
    findings.push(
      createFinding(
        "low",
        document,
        todo.line,
        "Follow-up marker left in code",
        "The file still carries a TODO/FIXME marker, which usually means behavior or cleanup is unfinished.",
      ),
    );
  }

  const consoleLog = firstMatchLine(document, /\bconsole\.log\s*\(/);
  if (consoleLog) {
    findings.push(
      createFinding(
        "low",
        document,
        consoleLog.line,
        "Debug logging in runtime path",
        "Leftover console logging can leak internal state and add noise in production debugging.",
      ),
    );
  }

  return findings;
}

function compareSeverity(left: ReviewFinding, right: ReviewFinding) {
  const rank = {
    high: 0,
    medium: 1,
    low: 2,
  } satisfies Record<ReviewFinding["severity"], number>;

  return rank[left.severity] - rank[right.severity];
}

function buildFindings(documents: DocumentRecord[]) {
  return documents
    .filter(isCodeLikeDocument)
    .flatMap(collectFindings)
    .sort(compareSeverity)
    .slice(0, 6);
}

function buildResidualRiskLine(codeDocuments: DocumentRecord[]) {
  const hasTests = codeDocuments.some((document) =>
    /(test|spec)\.(ts|tsx|js|jsx|py|go|rb)$/i.test(getFileName(document)),
  );

  if (!codeDocuments.length) {
    return "Residual risk: the selected files look more like docs/config than executable code, so runtime behavior still needs a code-path review.";
  }

  if (!hasTests) {
    return "Residual risk: I did not see an obvious test file in the submitted set, so regressions around edge cases are still possible.";
  }

  return "Residual risk: a static pass can miss integration failures, so the next check should be a targeted runtime or test run.";
}

export function buildConversationTitle(message: string, documents: DocumentRecord[] = []) {
  const firstCodeDocument = documents.find(isCodeLikeDocument);
  if (firstCodeDocument && isReviewRequest(message, documents.map((document) => document.id))) {
    return `Review ${getFileName(firstCodeDocument)}`;
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return "New review thread";
  }

  return trimmed.length > 42 ? `${trimmed.slice(0, 39).trimEnd()}...` : trimmed;
}

export function buildDemoReviewResponse(input: {
  message: string;
  documents: DocumentRecord[];
  citations: Citation[];
}) {
  const findings = buildFindings(input.documents);
  const codeDocuments = input.documents.filter(isCodeLikeDocument);
  const fileCount = input.documents.length;

  if (!fileCount) {
    return [
      "No files are attached to this thread yet.",
      "Upload code or config files in the review panel, then ask for a bug scan, PR review, or architecture pass.",
    ].join(" ");
  }

  if (!findings.length) {
    return [
      `I reviewed ${fileCount} submitted file${fileCount === 1 ? "" : "s"} and did not find any high-confidence bugs from a static pass.`,
      buildResidualRiskLine(codeDocuments),
      input.citations.length
        ? "I still attached the strongest evidence snippets below so you can inspect the reviewed areas quickly."
        : "Attach more targeted files if you want a narrower review.",
    ].join(" ");
  }

  const lines = [
    `Reviewed ${fileCount} submitted file${fileCount === 1 ? "" : "s"}.`,
    "",
    "Findings",
    ...findings.map(
      (finding, index) =>
        `${index + 1}. ${finding.severity.toUpperCase()} - \`${finding.fileLabel}:${finding.line}\` ${finding.title}. ${finding.summary}`,
    ),
    "",
    "Next checks",
    `1. ${buildResidualRiskLine(codeDocuments)}`,
  ];

  if (input.message.trim()) {
    lines.push(`2. Requested focus: ${input.message.trim()}`);
  }

  return lines.join("\n");
}
