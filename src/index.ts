import urlRegExp from './url-regex';

/**
 * A node of italicised text.
 */
export type ItalicNode = {
  type: 'italic',
  content: MarkupNode[],
};

/**
 * A node of bold text.
 */
export type BoldNode = {
  type: 'bold',
  content: MarkupNode[],
};

/**
 * A code node, containing unstyled text.
 */
export type CodeNode = {
  type: 'code',
  content: [string],
};

/**
 * A node of struck-through text.
 */
export type StrikeNode = {
  type: 'strike',
  content: MarkupNode[],
};

/**
 * An emoji.
 */
export type EmojiNode = {
  type: 'emoji',
  name: string,
};

/**
 * A node that mentions a user.
 */
export type MentionNode = {
  type: 'mention',
  mention: string,
  raw: string,
};

/**
 * A node that contains a web link.
 */
export type LinkNode = {
  type: 'link',
  text: string,
  href: string,
};

/**
 * Markup node types: either raw text or one of the Node types.
 */
export type MarkupNode =
  | string
  | ItalicNode
  | BoldNode
  | CodeNode
  | StrikeNode
  | EmojiNode
  | MentionNode
  | LinkNode;

/**
 * Options for the parser.
 */
export type MarkupOptions = {
  /**
   * The names of the available :emoji: shortcodes.
   */
  emojiNames?: string[],
  /**
   * Usernames that can be mentioned.
   */
  mentions?: string[],
};

/**
 * RegExp that matches a URL at the start of the input.
 */
const linkRx = new RegExp(`^${urlRegExp().source}`, 'i');

/**
 * Memoize a single-argument function.
 *
 * Remembers one (input, output) pair, and uses === equality to check if the argument has changed.
 */
function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  let lastArg: void | T;
  let lastReturn: void | R;
  return (arg: T) => {
    if (arg !== lastArg) {
      lastArg = arg;
      lastReturn = fn(arg);
    }
    return lastReturn as R;
  };
}

/**
 * Escape `str` for use in a regular expression. The resulting snippet will match the input string.
 */
function escapeStringRegExp(str: string) {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

const enum TokenType {
  Italic,
  Bold,
  Code,
  Strike,
  Emoji,
  Mention,
  Link,
  Text,
}

interface Token {
  type: TokenType;
  text: string;
  raw: string;
}

function createToken(type: TokenType, text: string, raw: string = text): Token {
  return { type, text, raw };
}

/**
 * Sort users by username length. Longest usernames first.
 */
const sortMentions = memoize((mentions: string[]): string[] => (
  mentions.slice().sort((a, b) => b.length - a.length)));

const makeMentionRegExp = memoize((mentions: string[]): RegExp => new RegExp(
  `^(${
    mentions.map((mention) => escapeStringRegExp(mention)).join('|')
  })(?:\\b|\\s|\\W|$)`,
  'i',
));

/**
 * Case-insensitively get the correct emoji name from the possible emoji for an
 * input string.
 *
 * @param {Array.<string>} names All possible emoji names.
 * @param {string} match The input string.
 * @return {string|null} The correct emoji name (including casing), or `null` if
 *    the requested emoji does not exist.
 */
function findEmoji(names: string[], match: string): string | null {
  const compare = match.toLowerCase();
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i].toLowerCase();
    if (name === compare) {
      return names[i];
    }
  }

  return null;
}

function tokenize(text: string, options: MarkupOptions) {
  let chunk: string;
  let i = 0;
  const mentions = sortMentions(options.mentions || []);
  const mentionRx = makeMentionRegExp(mentions);
  const tokens: Token[] = [];
  // adds a token of type `type` if the current chunk starts with
  // a `delim`-delimited string
  const delimited = (type: TokenType, start: string, endRx: RegExp) => {
    if (chunk[0] === start && chunk[1] !== start) {
      const end = 1 + chunk.slice(1).search(endRx);
      if (end) {
        tokens.push(createToken(type, chunk.slice(1, end)));
        i += end + 1;
        return true;
      }
    }
    return false;
  };
  const emoji = (type: TokenType, emojiNames?: string[]) => {
    const match = /^:([A-Za-z0-9_+-]+):/.exec(chunk);
    if (match) {
      // if a whitelist of emoji names is given, only accept emoji from that
      // list.
      const emojiName = emojiNames ? findEmoji(emojiNames, match[1]) : match[1];
      if (emojiName) {
        tokens.push(createToken(type, emojiName, match[0]));
        i += match[0].length;
        return true;
      }
    }
    return false;
  };
  const mention = (type: TokenType, start: string) => {
    if (chunk[0] === start) {
      const maybeMentionable = chunk.slice(1);
      const match = mentionRx.exec(maybeMentionable);
      if (match) {
        i += 1 + match[1].length;
        tokens.push(createToken(type, match[1], chunk.slice(0, i)));
        return true;
      }
    }
    return false;
  };
  const link = (type: TokenType) => {
    const match = linkRx.exec(chunk);
    if (match) {
      tokens.push(createToken(type, chunk.slice(0, match[0].length)));
      i += match[0].length;
      return true;
    }
    return false;
  };
  // eat spaces
  const space = () => {
    // .slice again because `i` changed
    const m = /^\s+/.exec(text.slice(i));
    if (m) {
      tokens.push(createToken(TokenType.Text, m[0]));
      i += m[0].length;
    }
  };
  // tokenize text, just loop until it's done!
  chunk = text;
  while (chunk) {
    const found = emoji(TokenType.Emoji, options.emojiNames)
      || delimited(TokenType.Italic, '_', /_(\W|$)/)
      || delimited(TokenType.Bold, '*', /\*(\W|$)/)
      || delimited(TokenType.Code, '`', /`(\W|$)/)
      || delimited(TokenType.Strike, '~', /~(\W|$)/)
      || mention(TokenType.Mention, '@')
      || link(TokenType.Link);
    if (!found) {
      let end = chunk.indexOf(' ', 1) + /* eat space */ 1;
      if (end === 0) { // no match, = -1 + 1
        end = chunk.length;
      }
      // append to previous token if it was also text
      if (tokens.length > 0 && tokens[tokens.length - 1].type === TokenType.Text) {
        tokens[tokens.length - 1].text += chunk.slice(0, end);
      } else {
        tokens.push(createToken(TokenType.Text, chunk.slice(0, end)));
      }
      i += end;
    }
    space();
    chunk = text.slice(i);
  }
  return tokens;
}

/**
 * Adds `http://` to a string if it does not have a URL scheme yet.
 */
function httpify(text: string): string {
  if (!/^[a-z]+:/.test(text)) {
    return `http://${text}`;
  }
  return text;
}

/**
 * Parses a chat message into a tree-ish structure.
 */
export default function parse(message: string, options: MarkupOptions = {}): MarkupNode[] {
  if (typeof message !== 'string') {
    throw new TypeError('Expected a string');
  }

  return tokenize(message, options).map((token) => {
    switch (token.type) {
      case TokenType.Italic:
        return { type: 'italic', content: parse(token.text, options) };
      case TokenType.Bold:
        return { type: 'bold', content: parse(token.text, options) };
      case TokenType.Code:
        return { type: 'code', content: [token.text] };
      case TokenType.Strike:
        return { type: 'strike', content: parse(token.text, options) };
      case TokenType.Emoji:
        return { type: 'emoji', name: token.text };
      case TokenType.Mention:
        return { type: 'mention', mention: token.text.toLowerCase(), raw: token.text };
      case TokenType.Link:
        return { type: 'link', text: token.text, href: httpify(token.text) };
      case TokenType.Text:
        return token.text;
      /* istanbul ignore next */
      default:
        throw new Error('unreachable');
    }
  });
}
