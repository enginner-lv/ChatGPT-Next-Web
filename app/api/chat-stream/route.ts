import { createParser } from "eventsource-parser";
import { NextRequest } from "next/server";
import { requestOpenai } from "../common";

async function createStream(req: NextRequest) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await requestOpenai(req);

  console.log("createStream res", res);

  // const contentType = res.headers.get("Content-Type") ?? "";
  // if (!contentType.includes("stream")) {
  //   const content = await (
  //     await res.text()
  //   ).replace(/provided:.*. You/, "provided: ***. You");
  //   console.log("[Stream] error ", content);
  //   return "```json\n" + content + "```";
  // }

  const stream = new ReadableStream({
    async start(controller) {
      function onParse(event: any) {
        if (event.type === "event") {
          const data = event.data;
          const json = JSON.parse(data);
          const text = json.choices[0].delta.content;
          const isFinished = json.choices[0].finish_reason === "stop";

          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (isFinished) {
            controller.close();
            return;
          }
          try {
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      }

      const parser = createParser(onParse);
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk, { stream: true }));
      }
    },
  });
  return stream;
  // const reader = res?.body?.getReader();
  // const stream = new ReadableStream({
  //   start(controller) {
  //     function push() {
  //       reader
  //         ?.read()
  //         .then(({ done, value }) => {
  //           if (done) {
  //             controller.close();
  //             return;
  //           }
  //           controller.enqueue(value);
  //           push();
  //         })
  //         .catch((error) => {
  //           console.error(error);
  //           controller.error(error);
  //         });
  //     }
  //     push();
  //   },
  // });
  // return stream;
}

export async function POST(req: NextRequest) {
  try {
    const stream = await createStream(req);
    return new Response(stream);
  } catch (error) {
    console.error("[Chat Stream]", error);
    return new Response(
      ["```json\n", JSON.stringify(error, null, "  "), "\n```"].join(""),
    );
  }
}

export const config = {
  runtime: "edge",
};
