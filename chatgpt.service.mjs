import fetch from "isomorphic-fetch";
import * as dotenv from "dotenv";
import { ChatGPTAPI } from "chatgpt";
import socksProxy from "socks-proxy-agent";
import httpsProxy from "https-proxy-agent";

dotenv.config();

export default class {
  constructor() {
    const { SOCKS_PROXY, HTTPS_PROXY } = process.env;
    if (HTTPS_PROXY) {
      console.log("use proxy===", HTTPS_PROXY); // connect proxy
      this.proxyAgent = new httpsProxy.HttpsProxyAgent(HTTPS_PROXY);
    } else if (SOCKS_PROXY) {
      console.log("use proxy===", SOCKS_PROXY);
      this.proxyAgent = new socksProxy.SocksProxyAgent(SOCKS_PROXY); // socks://127.0.0.1:1080 使用远程DNS
    }

    const proxyFetch = (url, options) => {
      // console.log("===fetch===", url);
      return fetch(url, {
        ...options,
        agent: this.proxyAgent,
      }).catch((err) => {
      });
    };
    this.api = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
      fetch: proxyFetch,
      debug: true,
    });
  }

  sendMessage(message, parentMessageId, callback) {
    this.api
      .sendMessage(message, {
        parentMessageId,
        onProgress: (partialResponse) => {
          const { id, role, text } = partialResponse;
          const dataobj = {
            message: {
              id,
              role,
              user: null,
              create_time: null,
              update_time: null,
              end_turn: null,
              weight: 0,
              recipient: "all",
              metadata: null,
              content: {
                content_type: "text",
                parts: [text],
              },
            },
            error: null,
          };
          callback({ type: "add", data: dataobj });
        },
      })
      .then(() => {
        callback({ data: "[DONE]" });
      });
  }
}
