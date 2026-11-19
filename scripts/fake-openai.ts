import { createServer, type IncomingMessage } from "node:http";
import { answerHealth, readBody } from "./fake-server";

// A stand-in for the OpenAI Responses API, for the end-to-end tests only. The
// test server reaches it through OPENAI_BASE_URL (scripts/e2e-server-env.ts),
// which the SDK reads itself, so the app carries no test hook. It answers the
// two structured calls with fixed text; anything else is a 404, so a journey
// that starts another AI call fails loudly instead of reaching the real API.
// Playwright starts it beside the test server (playwright.config.ts); it
// listens on localhost only.

export const FAKE_OPENAI_PORT = 3101;
export const FAKE_SUMMARY = "Waits until the value has stopped changing.";
export const FAKE_TAGS = ["e2e-fake-tag"];

const ANSWERS: Record<string, unknown> = {
  item_summary: { summary: FAKE_SUMMARY },
  tag_suggestions: { tags: FAKE_TAGS },
};

async function readJson(request: IncomingMessage): Promise<unknown> {
  return JSON.parse((await readBody(request)).toString("utf8"));
}

function schemaName(body: unknown): string | null {
  const name = (body as { text?: { format?: { name?: unknown } } }).text?.format
    ?.name;
  return typeof name === "string" ? name : null;
}

// A completed response in the shape `responses.parse` reads: one message with
// the answer as JSON text, and the usage the app logs.
function completedResponse(answer: unknown) {
  return {
    id: "resp_e2e_fake",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "e2e-fake",
    output: [
      {
        type: "message",
        id: "msg_e2e_fake",
        status: "completed",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(answer),
            annotations: [],
          },
        ],
      },
    ],
    usage: {
      input_tokens: 1,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 1,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 2,
    },
  };
}

function main() {
  const server = createServer((request, response) => {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (answerHealth(request, response)) return;
    if (request.method !== "POST" || request.url !== "/v1/responses") {
      send(404, { error: { message: "Not faked" } });
      return;
    }
    readJson(request).then(
      (body) => {
        const name = schemaName(body);
        if (name === null || !(name in ANSWERS)) {
          send(404, { error: { message: "Not faked" } });
          return;
        }
        send(200, completedResponse(ANSWERS[name]));
      },
      () => send(400, { error: { message: "Invalid JSON" } }),
    );
  });
  server.listen(FAKE_OPENAI_PORT, "localhost");
}

if (process.argv[1]?.endsWith("fake-openai.ts")) main();
