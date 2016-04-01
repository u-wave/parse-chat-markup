# parse-chat-markup

Chat markup parser for üWave client applications.

[Installation](#installation) - [Usage](#usage) - [Supported Markup](#supported-markup) -
[API](#api) - [License](#license)

## Installation

```
npm install --save @u-wave/parse-chat-markup
```

## Usage

```js
import parseChatMarkup from '@u-wave/parse-chat-markup';

const tree = parseChatMarkup('This is a *test* _message_, with some ~MARKUP~');
// tree =
[ 'This is a ',
  { type: 'bold', content: [ 'test' ] },
  ' ',
  { type: 'italic', content: [ 'message' ] },
  ', with some ',
  { type: 'strike', content: [ 'MARKUP' ] } ]
```

## Supported markup

 - **Bolded** text using `*asterisks*`
 - _Italics_ using `_underscores_`
 - `Monospace` using ``` `backticks` ```
 - <strike>Strikethrough</strike> using `~tildes~`
 - Emoji :smile: using `:colons:`
 - User @-mentions using `@at-signs`

## API

```
parseChatMarkup(text, options={})
```

[Returns an array/tree-like structure](#parsed-text) with parsed tokens.

Available options are:

 - `users` - Array of user objects that can be mentioned. User objects have to
   have a `.username` property, which will be used to match `@username`
   mentions.

 - `emojiNames` - Array of available :emoji: names, as strings, and without
   colons. If an emoji name is not in this array, it's not parsed. For example:

   ```
   emojiNames: ['smile', 'cry', 'hearts']
   ```

   If you don't pass this list, all `:emoji:`-style strings will be parsed as
   emoji, and you'll have to filter nonexistent emoji elsewhere in your app.

### Parsed text

`parseChatMarkup` returns an array of tokens. Some markup can be nested, so
some tokens contain token arrays, too.

"Normal" text is embedded as a plain string. Other tokens are objects with a
`.type` property.

Example return value:

```js
const exampleUser = {
  username: 'You'
};
parseChatMarkup(
  '@You This _is a ~bunch~ of *test markup* :sparkles:_. ' +
  '`Code blocks *do not nest*.` :not_an_emoji:',
  {
    users: [exampleUser],
    emojiNames: ['sparkles']
  }
);
// →
[ { type: 'mention', user: { username: 'You',  } },
  'This ',
  { type: 'italic', content: [
    'is a ',
    { type: 'strike', content: ['bunch'] },
    ' of ',
    { type: 'bold', content: ['test markup'] },
    ' ',
    { type: 'emoji', name: 'sparkles' } ] },
  ' ',
  { type: 'code', content: ['Code blocks *do not nest*.'] },
  ' :not_an_emoji:' ]
```

Quick list of token types:

| Type | Properties |
|------|------------|
| bold | `.content` - token array |
| italic | `.content` - token array |
| strike | `.content` - token array |
| code | `.content` - token array |
| emoji | `.name` - emoji name |
| mention | `.user` - user object |
| link | `.text` - displayed text, `.href` - link URL |

## License

[MIT][license]

[license]: ./LICENSE
