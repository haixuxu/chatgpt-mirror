# ChatGPT Mirror

Based on model `gpt-3.5-turbo`.

## Installation

> Tested on Node.js 14.21.3

```bash
$ yarn install
```

## Running the app

Create a `.env` file in the root directory and add your OpenAI API key:

```properties
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# optional, support http or socks proxy
HTTPS_PROXY=http://127.0.0.1:1087
# or
# SOCKS_PROXY=socks://127.0.0.1:1080
```

```bash
# development
$ node app.mjs

# production
# use pm2
pm2 start app.yml
# use nohup
nohup node app.mjs > console.out 2>&1 &
```



Visit http://localhost:3000

## Credits

Thanks: [transitive-bullshit/chatgpt-api](https://github.com/transitive-bullshit/chatgpt-api)

## License

[MIT licensed](LICENSE).
