import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `I will send you coding problems to be solved in Python 3. Each will include a problem description, some example test cases, time and space complexity requirements, and a template code to begin the solution with. Please focus on code readability and correctness before beginning to optimize — I will let you know if optimization is needed. Before giving me the solution, please ensure you have plugged in the input of the sample test case given and checked the output against the expected output, and that they are equal. If they are not, debug on your end and arrive at the correct solution before returning it. It is possible that even then, I will run the solution through hidden test cases on my end and they are still not passing some tests, in which case I will send those failed tests to you. You will investigate, debug, and send me a new correct solution.

Please code like a beginner — avoid using inline functions and inline loops; write them out as if/else or while loops. Avoid overly complex syntax. Avoid using library functions (e.g. abs()); write those out yourself. Do not use helper functions. Don't use the most standard way of writing code — throw in some human imperfections and creativity.`;

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

function parseBase64DataUrl(dataUrl: string): { mediaType: AllowedMediaType; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const rawType = match ? match[1].toLowerCase() : "image/jpeg";
  const base64 = match ? match[2] : dataUrl;
  const mediaType = ALLOWED_MEDIA_TYPES.includes(rawType as AllowedMediaType)
    ? (rawType as AllowedMediaType)
    : "image/jpeg";
  return { mediaType, base64 };
}

export async function generateCodeFromImages(
  imageBase64List: string[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = new Anthropic({ apiKey });

  const content: Anthropic.MessageParam["content"] = [
    {
      type: "text",
      text: "Solve the coding problem(s) shown in these images. Return only the Python 3 code, no explanation.",
    },
    ...imageBase64List.flatMap((img) => {
      const { mediaType, base64 } = parseBase64DataUrl(img);
      return [
        { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } },
      ];
    }),
  ];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in Claude response");
  }

  return textBlock.text;
}

export type RegenerateReason = "logic_wrong" | "runtime_too_long" | "alternative" | "brute_force";

const REGENERATE_REASON_TEXT: Record<RegenerateReason, string> = {
  logic_wrong:
    "The previous solution had wrong logic (incorrect output or failed test cases). Please fix the logic and return a corrected Python 3 solution. Return only the code, no explanation.",
  runtime_too_long:
    "The previous solution was logically correct but exceeded the time limit. Please return an optimized Python 3 solution that meets the time complexity requirement. Return only the code, no explanation.",
  alternative:
    "The previous solution is correct and passes the test cases. The user wants to see a different valid solution: use a different code structure, different logic or algorithm, different variable names or control flow, but still pass all the same test cases and meet the requirements. Return a distinct alternative implementation in Python 3. Return only the code, no explanation.",
  brute_force:
    "The user wants a brute force (naive) solution: the simplest, most straightforward approach that correctly solves the problem and passes the given test cases. Do not optimize for time or space; use the most direct logic (e.g. try all possibilities, nested loops if needed). Return only the Python 3 code, no explanation.",
};

export async function regenerateCodeFromFeedback(
  imageBase64List: string[],
  previousCode: string,
  reason: RegenerateReason
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = new Anthropic({ apiKey });

  const instruction = REGENERATE_REASON_TEXT[reason];
  const content: Anthropic.MessageParam["content"] = [
    {
      type: "text",
      text: `${instruction}\n\nHere was the previous solution:\n\n\`\`\`python\n${previousCode}\n\`\`\``,
    },
    ...imageBase64List.flatMap((img) => {
      const { mediaType, base64 } = parseBase64DataUrl(img);
      return [
        { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } },
      ];
    }),
  ];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in Claude response");
  }

  return textBlock.text;
}
