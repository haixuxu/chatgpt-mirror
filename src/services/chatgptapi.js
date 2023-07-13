// src/chatgpt-api.ts
import Keyv from 'keyv';
import pTimeout from 'p-timeout';
import QuickLRU from 'quick-lru';
import { v4 as uuidv4 } from 'uuid';
import fetchSSE from './chatgpt/fetchsse.js';
import encode from './chatgpt/encode.js';

// src/chatgpt-api.ts
var CHATGPT_MODEL = 'gpt-3.5-turbo';
var USER_LABEL_DEFAULT = 'User';
var ASSISTANT_LABEL_DEFAULT = 'ChatGPT';
class ChatGPTAPI {
  /**
   * Creates a new client wrapper around OpenAI's chat completion API, mimicing the official ChatGPT webapp's functionality as closely as possible.
   *
   * @param apiKey - OpenAI API key (required).
   * @param apiBaseUrl - Optional override for the OpenAI API base URL.
   * @param debug - Optional enables logging debugging info to stdout.
   * @param completionParams - Param overrides to send to the [OpenAI chat completion API](https://platform.openai.com/docs/api-reference/chat/create). Options like `temperature` and `presence_penalty` can be tweaked to change the personality of the assistant.
   * @param maxModelTokens - Optional override for the maximum number of tokens allowed by the model's context. Defaults to 4096.
   * @param maxResponseTokens - Optional override for the minimum number of tokens allowed for the model's response. Defaults to 1000.
   * @param messageStore - Optional [Keyv](https://github.com/jaredwray/keyv) store to persist chat messages to. If not provided, messages will be lost when the process exits.
   * @param getMessageById - Optional function to retrieve a message by its ID. If not provided, the default implementation will be used (using an in-memory `messageStore`).
   * @param upsertMessage - Optional function to insert or update a message. If not provided, the default implementation will be used (using an in-memory `messageStore`).
   * @param fetch - Optional override for the `fetch` implementation to use. Defaults to the global `fetch` function.
   */
  constructor(opts) {
    const {
      apiKey,
      apiBaseUrl = 'https://api.openai.com/v1',
      debug = false,
      messageStore,
      completionParams,
      systemMessage,
      maxModelTokens = 4e3,
      maxResponseTokens = 1e3,
      getMessageById,
      upsertMessage,
      fetch: fetch2 = fetch
    } = opts;
    this._apiKey = apiKey;
    this._apiBaseUrl = apiBaseUrl;
    this._debug = !!debug;
    this._fetch = fetch2;
    this._completionParams = {
      model: CHATGPT_MODEL,
      temperature: 0.8,
      top_p: 1,
      presence_penalty: 1,
      ...completionParams
    };
    this._systemMessage = systemMessage;
    if (this._systemMessage === void 0) {
      const currentDate = /* @__PURE__ */ new Date().toISOString().split('T')[0];
      this._systemMessage = `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.
Knowledge cutoff: 2021-09-01
Current date: ${currentDate}`;
    }
    this._maxModelTokens = maxModelTokens;
    this._maxResponseTokens = maxResponseTokens;
    this._getMessageById = getMessageById ?? this._defaultGetMessageById;
    this._upsertMessage = upsertMessage ?? this._defaultUpsertMessage;
    if (messageStore) {
      this._messageStore = messageStore;
    } else {
      this._messageStore = new Keyv({
        store: new QuickLRU({ maxSize: 1e4 })
      });
    }
    if (!this._apiKey) {
      throw new Error('OpenAI missing required apiKey');
    }
    if (!this._fetch) {
      throw new Error('Invalid environment; fetch is not defined');
    }
    if (typeof this._fetch !== 'function') {
      throw new Error('Invalid "fetch" is not a function');
    }
  }
  /**
   * Sends a message to the OpenAI chat completions endpoint, waits for the response
   * to resolve, and returns the response.
   *
   * If you want your response to have historical context, you must provide a valid `parentMessageId`.
   *
   * If you want to receive a stream of partial responses, use `opts.onProgress`.
   *
   * Set `debug: true` in the `ChatGPTAPI` constructor to log more info on the full prompt sent to the OpenAI chat completions API. You can override the `systemMessage` in `opts` to customize the assistant's instructions.
   *
   * @param message - The prompt message to send
   * @param opts.parentMessageId - Optional ID of the previous message in the conversation (defaults to `undefined`)
   * @param opts.messageId - Optional ID of the message to send (defaults to a random UUID)
   * @param opts.systemMessage - Optional override for the chat "system message" which acts as instructions to the model (defaults to the ChatGPT system message)
   * @param opts.timeoutMs - Optional timeout in milliseconds (defaults to no timeout)
   * @param opts.onProgress - Optional callback which will be invoked every time the partial response is updated
   * @param opts.abortSignal - Optional callback used to abort the underlying `fetch` call using an [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
   * @param completionParams - Optional overrides to send to the [OpenAI chat completion API](https://platform.openai.com/docs/api-reference/chat/create). Options like `temperature` and `presence_penalty` can be tweaked to change the personality of the assistant.
   *
   * @returns The response from ChatGPT
   */
  async sendMessage(text, opts = {}) {
    const { parentMessageId, messageId = uuidv4(), timeoutMs, onProgress, stream = onProgress ? true : false, completionParams } = opts;
    let { abortSignal } = opts;
    let abortController = null;
    if (timeoutMs && !abortSignal) {
      abortController = new AbortController();
      abortSignal = abortController.signal;
    }
    const message = {
      role: 'user',
      id: messageId,
      parentMessageId,
      text
    };
    await this._upsertMessage(message);
    const { messages, maxTokens, numTokens } = await this._buildMessages(text, opts);
    const result = {
      role: 'assistant',
      id: uuidv4(),
      parentMessageId: messageId,
      text: ''
    };
    const responseP = new Promise(async (resolve, reject) => {
      var _a, _b;
      const url = `${this._apiBaseUrl}/chat/completions`;
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this._apiKey}`
      };
      const body = {
        max_tokens: maxTokens,
        ...this._completionParams,
        ...completionParams,
        messages,
        stream
      };
      if (this._debug) {
        console.log(`sendMessage (${numTokens} tokens)`, body);
      }
      if (stream) {
        fetchSSE(
          url,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: abortSignal,
            onMessage: (data) => {
              var _a2;
              if (data === '[DONE]') {
                result.text = result.text.trim();
                return resolve(result);
              }
              try {
                const response = JSON.parse(data);
                if (response.id) {
                  result.id = response.id;
                }
                if ((_a2 = response == null ? void 0 : response.choices) == null ? void 0 : _a2.length) {
                  const delta = response.choices[0].delta;
                  result.delta = delta.content;
                  if (delta == null ? void 0 : delta.content) result.text += delta.content;
                  result.detail = response;
                  if (delta.role) {
                    result.role = delta.role;
                  }
                  onProgress == null ? void 0 : onProgress(result);
                }
              } catch (err) {
                console.warn('OpenAI stream SEE event unexpected error', err);
                return reject(err);
              }
            }
          },
          this._fetch
        ).catch(reject);
      } else {
        try {
          const res = await this._fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: abortSignal
          });
          if (!res.ok) {
            const reason = await res.text();
            const msg = `OpenAI error ${res.status || res.statusText}: ${reason}`;
            const error = new Error(msg);
            error.cause = res;
            error.statusCode = res.status;
            error.statusText = res.statusText;
            return reject(error);
          }
          const response = await res.json();
          if (this._debug) {
            console.log(response);
          }
          if (response == null ? void 0 : response.id) {
            result.id = response.id;
          }
          if ((_a = response == null ? void 0 : response.choices) == null ? void 0 : _a.length) {
            const message2 = response.choices[0].message;
            result.text = message2.content;
            if (message2.role) {
              result.role = message2.role;
            }
          } else {
            const res2 = response;
            return reject(new Error(`OpenAI error: ${((_b = res2 == null ? void 0 : res2.detail) == null ? void 0 : _b.message) || (res2 == null ? void 0 : res2.detail) || 'unknown'}`));
          }
          result.detail = response;
          return resolve(result);
        } catch (err) {
          return reject(err);
        }
      }
    }).then((message2) => {
      return this._upsertMessage(message2).then(() => message2);
    });
    if (timeoutMs) {
      if (abortController) {
        responseP.cancel = () => {
          abortController.abort();
        };
      }
      return pTimeout(responseP, {
        milliseconds: timeoutMs,
        message: 'OpenAI timed out waiting for response'
      });
    } else {
      return responseP;
    }
  }
  get apiKey() {
    return this._apiKey;
  }
  set apiKey(apiKey) {
    this._apiKey = apiKey;
  }
  async _buildMessages(text, opts) {
    const { systemMessage = this._systemMessage } = opts;
    let { parentMessageId } = opts;
    const userLabel = USER_LABEL_DEFAULT;
    const assistantLabel = ASSISTANT_LABEL_DEFAULT;
    const maxNumTokens = this._maxModelTokens - this._maxResponseTokens;
    let messages = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    const systemMessageOffset = messages.length;
    let nextMessages = text ? messages.concat([{ role: 'user', content: text, name: opts.name }]) : messages;
    let numTokens = 0;
    do {
      const prompt = nextMessages
        .reduce((prompt2, message) => {
          if (message.role === 'system') {
            return prompt2.concat([`Instructions:${message.content}`]);
          } else if (message.role === 'user') {
            return prompt2.concat([`${userLabel}:${message.content}`]);
          } else {
            return prompt2.concat([`${assistantLabel}:${message.content}`]);
          }
        }, [])
        .join('\n\n');
      const nextNumTokensEstimate = await this._getTokenCount(prompt);
      const isValidPrompt = nextNumTokensEstimate <= maxNumTokens;
      if (prompt && !isValidPrompt) {
        break;
      }
      messages = nextMessages;
      numTokens = nextNumTokensEstimate;
      if (!isValidPrompt) {
        break;
      }
      if (!parentMessageId) {
        break;
      }
      const parentMessage = await this._getMessageById(parentMessageId);
      if (!parentMessage) {
        break;
      }
      const parentMessageRole = parentMessage.role || 'user';
      nextMessages = nextMessages.slice(0, systemMessageOffset).concat([
        {
          role: parentMessageRole,
          content: parentMessage.text,
          name: parentMessage.name
        },
        ...nextMessages.slice(systemMessageOffset)
      ]);
      parentMessageId = parentMessage.parentMessageId;
    } while (true);
    const maxTokens = Math.max(1, Math.min(this._maxModelTokens - numTokens, this._maxResponseTokens));
    return { messages, maxTokens, numTokens };
  }
  async _getTokenCount(text) {
    text = text.replace(/<\|endoftext\|>/g, '');
    return encode(text).length;
  }
  async _defaultGetMessageById(id) {
    const res = await this._messageStore.get(id);
    return res;
  }
  async _defaultUpsertMessage(message) {
    await this._messageStore.set(message.id, message);
  }
}

export { ChatGPTAPI };
