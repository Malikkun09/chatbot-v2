import { openrouterBaseUrl, openrouterHeaders, openrouterKeys } from "@/lib/ai/config";
import type { CatalogModel } from "@/lib/ai/catalog";
import { toChatCompletionsMessages } from "@/lib/ai/messages";
import { streamOpenAiChat } from "@/lib/ai/openai-stream";
import type { ChatProvider, ProviderChatRequest } from "@/lib/ai/types";

export function createOpenRouterProvider(model: CatalogModel): ChatProvider {
  return {
    id: "openrouter",
    model: model.id,
    async *stream(request: ProviderChatRequest) {
      yield* streamOpenAiChat({
        endpoint: `${openrouterBaseUrl()}/chat/completions`,
        keys: openrouterKeys(),
        extraHeaders: openrouterHeaders(),
        body: {
          model: model.id,
          messages: toChatCompletionsMessages(request.messages),
          stream: true,
          stream_options: { include_usage: true },
          temperature: 0.6,
          top_p: 0.95,
          max_tokens: 8192,
          ...(model.reasoning
            ? {
                include_reasoning: true,
                chat_template_kwargs: {
                  enable_thinking: true,
                  reasoning_budget: 2048,
                },
              }
            : {}),
        },
        signal: request.signal,
        provider: "openrouter",
      });
    },
  };
}
