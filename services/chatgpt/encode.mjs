// src/tokenizer.ts
import { get_encoding } from '@dqbd/tiktoken';

var tokenizer = get_encoding('cl100k_base');
export default function encode(input) {
  return tokenizer.encode(input);
}
