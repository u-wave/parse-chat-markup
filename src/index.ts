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
export type MarkupNode = string | ItalicNode | BoldNode | CodeNode | StrikeNode | EmojiNode | MentionNode | LinkNode;

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

function escapeStringRegExp(str: string) {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

interface Token {
  type: string;
  text: string;
  raw: string;
};

function createToken(type: string, text: string, raw: string = text): Token {
  return { type, text, raw};
}

/**
 * Sort users by username length. Longest usernames first.
 */
function sortMentions(mentions: string[]): string[] {
  return mentions.slice().sort((a, b) => b.length - a.length);
}

/**
 * Create a regex that matches a specific username or group being mentioned.
 *
 * @param {string} mention Mentionable name.
 * @return {RegExp}
 */
function mentionRegExp(mention: string): RegExp {
  return new RegExp(`^${escapeStringRegExp(mention)}(?:\\b|\\s|\\W|$)`, 'i');
}

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
  const tokens: Token[] = [];
  // adds a token of type `type` if the current chunk starts with
  // a `delim`-delimited string
  const delimited = (start: string, endRx: RegExp, type: string) => {
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
  const emoji = (type: string, emojiNames?: string[]) => {
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
  const mention = (start: string, type: string) => {
    if (chunk[0] === start) {
      const maybeMention = chunk.slice(1);
      for (let mi = 0, ml = mentions.length; mi < ml; mi += 1) {
        const candidate = mentions[mi];
        if (mentionRegExp(candidate).test(maybeMention)) {
          const end = candidate.length + 1;
          tokens.push(createToken(type, chunk.slice(1, end), chunk.slice(0, end)));
          i += end;
          return true;
        }
      }
    }
    return false;
  };
  const linkRx = new RegExp(`^${urlRegExp().source}`, 'i');
  const link = (type: string) => {
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
      tokens.push(createToken('word', m[0]));
      i += m[0].length;
    }
  };
  // tokenize text, just loop until it's done!
  chunk = text;
  while (chunk) {
    const found = emoji('emoji', options.emojiNames)
      || delimited('_', /_(\W|$)/, 'italic')
      || delimited('*', /\*(\W|$)/, 'bold')
      || delimited('`', /`(\W|$)/, 'code')
      || delimited('~', /~(\W|$)/, 'strike')
      || mention('@', 'mention')
      || link('link');
    if (!found) {
      let end = chunk.indexOf(' ', 1) + /* eat space */ 1;
      if (end === 0) { // no match, = -1 + 1
        end = chunk.length;
      }
      // append to previous token if it was also a word
      if (tokens.length > 0 && tokens[tokens.length - 1].type === 'word') {
        tokens[tokens.length - 1].text += chunk.slice(0, end);
      } else {
        tokens.push(createToken('word', chunk.slice(0, end)));
      }
      i += end;
    }
    space();
    chunk = text.slice(i);
  }
  return tokens;
}

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
      case 'italic':
        return { type: 'italic', content: parse(token.text, options) };
      case 'bold':
        return { type: 'bold', content: parse(token.text, options) };
      case 'code':
        return { type: 'code', content: [token.text] };
      case 'strike':
        return { type: 'strike', content: parse(token.text, options) };
      case 'emoji':
        return { type: 'emoji', name: token.text };
      case 'mention':
        return { type: 'mention', mention: token.text.toLowerCase(), raw: token.text };
      case 'link':
        return { type: 'link', text: token.text, href: httpify(token.text) };
      default:
        return token.text;
    }
  });
}
