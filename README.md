# Who represents me?

Text a U.S. street address and get back the officials on file for it, from the school board and city council to Congress.

This is an open-source prototype of idea 01 on [jurisdictional.org/developers](https://jurisdictional.org/developers).
It is one call to the free, keyless [Jurisdictional API](https://jurisdictional.org/llms.txt):

```
GET https://jurisdictional.org/api/v1/juricode?address=…&include=seats
```

That returns every jurisdiction whose boundary contains the address, each with the seats that represent the point and their current holders.
Everything else here is formatting.

Node 20 or later, no dependencies.

## Try it

From the command line:

```sh
node bin/who-represents-me.js "300 Hemlock St, Vacaville, CA 95688"
node bin/who-represents-me.js --lat 38.3649 --lng -121.9999
node bin/who-represents-me.js --json "300 Hemlock St, Vacaville, CA 95688"
```

As a chat page and SMS bot:

```sh
npm start        # http://localhost:3000
```

| Route | What it does |
| --- | --- |
| `GET /` | A chat page: type an address, get the officials. |
| `GET /api/represent?address=…` | The same as JSON (`lat` and `lng` also work). |
| `POST /sms` | A Twilio Messaging webhook: the text message is the address, the reply is TwiML. |

## Hook it up to a phone number

1. Get a Twilio number with SMS.
2. Run the server somewhere public, or expose it locally with a tunnel such as `ngrok http 3000`.
3. In the number's Messaging settings, set "A message comes in" to `https://your-host/sms` (HTTP POST).
4. Text it an address.

Replies are capped at Twilio's 1,600 characters.
The most local layer comes first, so if the reply is cut it is the federal seats that are dropped, and the reply says how many.

This prototype does not check Twilio's request signature.
Before putting a number in front of the public, validate `X-Twilio-Signature` (see Twilio's webhook security docs).

## Files

- `src/jurisdictional.js`: the API call.
- `src/represent.js`: groups seats by layer and body, and formats the text reply.
- `src/server.js`: the chat page, JSON route and SMS webhook.
- `bin/who-represents-me.js`: the command line.
- `test/`: run with `npm test`, against a recorded API response (no network).

## What the data does and does not cover

Boundaries are national.
Officials are deep in a handful of cities and thin elsewhere, and a seat with no holder on file is shown as open rather than guessed.
See [what's in it, honestly](https://jurisdictional.org/developers#coverage).

If an official is missing or wrong for your address, that is a gap to fill: the [MCP server](https://jurisdictional.org/developers) lets an AI agent propose a correction with its source.

## Point it at another server

```sh
JURISDICTIONAL_BASE_URL=http://localhost:4000 npm start
```

## License

MIT.
Data from the Jurisdictional API carries its own sourcing; see each record's provenance.
