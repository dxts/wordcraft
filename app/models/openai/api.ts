const API_HOST = 'https://localhost:4000';

const MODEL_NAME = 'mistralai--Mistral-7B-Instruct-v0.1';

/** ChatCompletion Model's params */
export interface CCModelParams {
  max_tokens?: number;
  /** number of completion choices to generate */
  n?: number;
  temperature?: number;
  /** We generally recommend altering top_p or temperature but not both. */
  top_p?: number;
  top_k?: number;
  logprobs?: boolean;
  top_logprobs?: number;
}

const DEFAULT_PARAMS: CCModelParams = {
  temperature: 1,
  top_p: 0.95,
  top_k: 40,
  n: 8,
  max_tokens: 4096,
  logprobs: false,
};

const API_URL = `${API_HOST}/v1/chat/completions`;

export async function callChatCompletionsModel(
  prompt: string | ChatCompletionMessage[],
  params: CCModelParams
) {
  params = {
    ...DEFAULT_PARAMS,
    ...params,
  };

  const query: Omit<ChatCompletionsRequest, 'model'> = {
    messages: [],
    ...params,
  };

  if (typeof prompt === 'string') {
    query.messages.push({
      content: prompt,
      role: 'user',
    });
  } else {
    query.messages = prompt;
  }

  return callApi(MODEL_NAME, query);
}

export async function callApi(
  model: string,
  query: Omit<ChatCompletionsRequest, 'model'>
) {
  const url = new URL(API_URL);

  const queryWithModel = {
    ...query,
    model,
  };

  return fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(queryWithModel),
  });
}

export interface ChatCompletionMessage {
  content: string;
  role: 'user' | 'assistant' | 'system';
}

export interface ChatCompletionsRequest extends CCModelParams {
  model: string;
  messages: ChatCompletionMessage[];
}

export interface ChatCompletionsResponse {
  id: string;
  model: string;
  object: 'chat.completion';
  choices: Array<{
    finish_reason: 'length' | 'stop' | 'content_filter';
    index: number;
    message: ChatCompletionMessage;
    logprobs?: {
      content: Array<{
        token: string;
        logprob: number;
        top_logprobs: Array<{token: string; logprob: number}>;
      }>;
    };
  }>;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}
