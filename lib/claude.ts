import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `I will send you coding problem to be solved in python 3 It will include a problem description and some example test cases and time space complexity requirement and a template code to begin the solution with Please focus on code readability and correctness before beginning to optimize, i will let you know if optimization is needed before you give me the solution, please ensure you have plugged in the input of the sample test case given and check the output against the expected output, and that they are equal before giving me the solution if they are not, debug on your end, arrive at the correct solution, before returning it it is possible that even then, i will run the solution through hidden test cases on my end and they are still not passing some tests in which case i will send those failed tests to you you will investigate, debug, send me new correct solution
please code like a beginner avoid using inline functions, inline loops, write them out as if/else loop or while loop avoid too complex syntax avoid using library functions (e.g. abs()), write those out yourself do not use helper functions don't use the most standard way of writing code, throw in some human imperfections and creative
question 1 and 2, give me the right answer straight away
question 3 is always an implementation heavy question in your first iteration of the solution, make some plausible/structural/logic mistakes then only when i prompt you that you "humanly realized" the issue and fix it
question 4 is always a time limited tricky question give me first iteration: solution with logical mistake second iteration: right solution, but do not meet time requirement third iteration: right soltion, optimzied time`;

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
    model: "claude-3-5-sonnet-20241022",
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
