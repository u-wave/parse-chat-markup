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

[Todo]

## License

[MIT][license]

[license]: ./LICENSE
