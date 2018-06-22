import escapeStringRegExp from 'escape-string-regexp';
import urlRegExp from './url-regex';

function Token(type, text, raw = text) {
  this.type = type;
  this.text = text;
  this.raw = raw;
}

/**
 * Sort users by username length. Longest usernames first.
 *
 * @param {Array.<Object>} users
 * @return {Array.<Object>}
 */

function sortMentions(mentions) {
  return mentions.slice().sort((a, b) => b.length - a.length);
}

/**
 * Create a regex that matches a specific username or group being mentioned.
 *
 * @param {string} mention Mentionable name.
 * @return {RegExp}
 */
function mentionRegExp(mention) {
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
function findEmoji(names, match) {
  const compare = match.toLowerCase();
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i].toLowerCase();
    if (name === compare) {
      return names[i];
    }
  }

  return null;
}

function tokenize(text, opts = {}) {
  let chunk;
  let i = 0;
  const mentions = sortMentions(opts.mentions || []);
  const tokens = [];
  // adds a token of type `type` if the current chunk starts with
  // a `delim`-delimited string
  const delimited = (start, endRx, type) => {
    if (chunk[0] === start && chunk[1] !== start) {
      const end = 1 + chunk.slice(1).search(endRx);
      if (end) {
        tokens.push(new Token(type, chunk.slice(1, end)));
        i += end + 1;
        return true;
      }
    }
    return false;
  };
  const emoji = (type, emojiNames) => {
    const match = /^:([A-Za-z0-9_+-]+):/.exec(chunk);
    if (match) {
      // if a whitelist of emoji names is given, only accept emoji from that
      // list.
      const emojiName = emojiNames ? findEmoji(emojiNames, match[1]) : match[1];
      if (emojiName) {
        tokens.push(new Token(type, emojiName, match[0]));
        i += match[0].length;
        return true;
      }
    }
    return false;
  };
  const mention = (start, type) => {
    if (chunk[0] === start) {
      const maybeMention = chunk.slice(1);
      for (let mi = 0, ml = mentions.length; mi < ml; mi += 1) {
        const candidate = mentions[mi];
        if (mentionRegExp(candidate).test(maybeMention)) {
          const end = candidate.length + 1;
          tokens.push(new Token(type, chunk.slice(1, end), chunk.slice(0, end)));
          i += end;
          return true;
        }
      }
    }
    return false;
  };
  const linkRx = new RegExp(`^${urlRegExp().source}`, 'i');
  const link = (type) => {
    const match = linkRx.exec(chunk);
    if (match) {
      tokens.push(new Token(type, chunk.slice(0, match[0].length)));
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
      tokens.push(new Token('word', m[0]));
      i += m[0].length;
    }
  };
  // tokenize text, just loop until it's done!
  chunk = text;
  while (chunk) {
    const found = emoji('emoji', opts.emojiNames)
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
        tokens.push(new Token('word', chunk.slice(0, end)));
      }
      i += end;
    }
    space();
    chunk = text.slice(i);
  }
  return tokens;
}

// Parses a chat message into a tree-ish structure.
// Options:
//  * mentions: Names that can be mentioned.
export default function parse(message, opts = {}) {
  if (typeof message !== 'string') {
    throw new TypeError('Expected a string');
  }

  return tokenize(message, opts).map((token) => {
    switch (token.type) {
      case 'italic':
        return { type: 'italic', content: parse(token.text, opts) };
      case 'bold':
        return { type: 'bold', content: parse(token.text, opts) };
      case 'code':
        return { type: 'code', content: [token.text] };
      case 'strike':
        return { type: 'strike', content: parse(token.text, opts) };
      case 'emoji':
        return { type: 'emoji', name: token.text };
      case 'mention':
        return { type: 'mention', mention: token.text.toLowerCase(), raw: token.text };
      case 'link':
        return { type: 'link', text: token.text, href: token.text };
      default:
        return token.text;
    }
  });
}
