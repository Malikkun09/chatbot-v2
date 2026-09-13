import { nvidiaBaseUrl, nvidiaKeys } from "@/lib/ai/config";
import { toChatCompletionsMessages } from "@/lib/ai/messages";
import { streamOpenAiChat } from "@/lib/ai/openai-stream";
import type { ChatProvider, ProviderChatRequest } from "@/lib/ai/types";

export function createNvidiaProvider(model: string): ChatProvider {
  return {
    id: "nvidia",
    model,
    async *stream(request: ProviderChatRequest) {
      yield* streamOpenAiChat({
        endpoint: `${nvidiaBaseUrl()}/chat/completions`,
        keys: nvidiaKeys(),
        body: {
          model,
          messages: toChatCompletionsMessages(request.messages),
          stream: true,
          temperature: 0.6,
          top_p: 0.95,
          max_tokens: 8192,
          chat_template_kwargs: {
            enable_thinking: true,
            reasoning_budget: 2048,
          },
        },
        signal: request.signal,
        provider: "nvidia",
      });
    },
  };
}
