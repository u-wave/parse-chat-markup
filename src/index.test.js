import assert from 'assert';
import { describe, it } from 'vitest';
import parseChatMarkup from './index.ts';

describe('parseChatMarkup', () => {
  const bareOptions = {};

  it('Only accepts string inputs', () => {
    assert.doesNotThrow(() => parseChatMarkup('some text'));
    assert.throws(() => parseChatMarkup(['some', 'array']), TypeError);
  });

  describe('simple markup', () => {
    it('bolds things surrounded by *', () => {
      assert.deepStrictEqual(parseChatMarkup('some *bold* text', bareOptions), [
        'some ',
        { type: 'bold', content: ['bold'] },
        ' text',
      ]);
    });
    it('italicizes things surrounded by _', () => {
      assert.deepStrictEqual(parseChatMarkup('some _italic_ text', bareOptions), [
        'some ',
        { type: 'italic', content: ['italic'] },
        ' text',
      ]);
    });
    it('strikes through things surrounded by ~', () => {
      assert.deepStrictEqual(parseChatMarkup('some ~stroke~ text', bareOptions), [
        'some ',
        { type: 'strike', content: ['stroke'] },
        ' text',
      ]);
    });

    it('does not parse simple markup in the middle of words', () => {
      assert.deepStrictEqual(parseChatMarkup('underscored_words are fun_!', bareOptions), [
        'underscored_words are fun_!',
      ]);
    });

    it('does not parse incomplete markup', () => {
      assert.deepStrictEqual(parseChatMarkup('a * b', bareOptions), [
        'a * b',
      ]);
    });

    it('parses nested markup', () => {
      assert.deepStrictEqual(parseChatMarkup('*bold _italic_*', bareOptions), [
        {
          type: 'bold',
          content: [
            'bold ',
            { type: 'italic', content: ['italic'] },
          ],
        },
      ]);
    });
  });

  describe('code blocks', () => {
    it('parses inline code blocks', () => {
      assert.deepStrictEqual(parseChatMarkup('some `monospace` text', bareOptions), [
        'some ',
        { type: 'code', content: ['monospace'] },
        ' text',
      ]);
    });

    it('parses code blocks inside other markup', () => {
      assert.deepStrictEqual(parseChatMarkup('*_`monospace`_*', bareOptions), [
        {
          type: 'bold',
          content: [
            {
              type: 'italic',
              content: [
                { type: 'code', content: ['monospace'] },
              ],
            },
          ],
        },
      ]);
    });

    it('does not parse markup inside code blocks', () => {
      assert.deepStrictEqual(parseChatMarkup('a `b *c* _d_` e', bareOptions), [
        'a ',
        { type: 'code', content: ['b *c* _d_'] },
        ' e',
      ]);
    });
  });

  describe('urls', () => {
    it('parses links', () => {
      assert.deepStrictEqual(parseChatMarkup('https://hoi.com/'), [
        { type: 'link', href: 'https://hoi.com/', text: 'https://hoi.com/' },
      ]);

      assert.deepStrictEqual(parseChatMarkup('something about http://hoi.com/'), [
        'something about ',
        { type: 'link', href: 'http://hoi.com/', text: 'http://hoi.com/' },
      ]);
    });

    it('parses www. links', () => {
      assert.deepStrictEqual(parseChatMarkup('www.test.com'), [
        { type: 'link', href: 'http://www.test.com', text: 'www.test.com' },
      ]);
    });
  });

  describe('emoji', () => {
    it('parses :emoji:-style emoji', () => {
      assert.deepStrictEqual(parseChatMarkup('an :emoji:!', bareOptions), [
        'an ',
        { type: 'emoji', name: 'emoji' },
        '!',
      ]);

      assert.deepStrictEqual(parseChatMarkup('and :emoji_with_underscores:', bareOptions), [
        'and ',
        { type: 'emoji', name: 'emoji_with_underscores' },
      ]);

      assert.deepStrictEqual(parseChatMarkup('and :emoji-with-dashes+pluses:', bareOptions), [
        'and ',
        { type: 'emoji', name: 'emoji-with-dashes+pluses' },
      ]);
    });

    it('ignores case', () => {
      assert.deepStrictEqual(parseChatMarkup(':a: :A:', { emojiNames: ['a'] }), [
        { type: 'emoji', name: 'a' },
        ' ',
        { type: 'emoji', name: 'a' },
      ]);
      assert.deepStrictEqual(parseChatMarkup(':aBC: :abc:', { emojiNames: ['ABc'] }), [
        { type: 'emoji', name: 'ABc' },
        ' ',
        { type: 'emoji', name: 'ABc' },
      ]);
    });

    it('parses :emoji: that could also be italics', () => {
      assert.deepStrictEqual(parseChatMarkup('_it\'s :emoji_time:!', bareOptions), [
        '_it\'s ',
        { type: 'emoji', name: 'emoji_time' },
        '!',
      ]);

      assert.deepStrictEqual(parseChatMarkup('_it\'s :emoji_time:!_', bareOptions), [
        {
          type: 'italic',
          content: [
            'it\'s ',
            { type: 'emoji', name: 'emoji_time' },
            '!',
          ],
        },
      ]);
    });

    it('only parses whitelisted emoji if a whitelist is given', () => {
      assert.deepStrictEqual(parseChatMarkup(':a: :b: :c:', { emojiNames: ['b'] }), [
        ':a: ',
        { type: 'emoji', name: 'b' },
        ' :c:',
      ]);
    });
  });

  describe('mentions', () => {
    const mentions = [
      'testOne',
      'testTwo',
      'testOneTwo',
    ];

    it('parses @-mentions', () => {
      assert.deepStrictEqual(parseChatMarkup('hello @testOne', { mentions }), [
        'hello ',
        { type: 'mention', mention: 'testone', raw: 'testOne' },
      ]);

      assert.deepStrictEqual(parseChatMarkup('@testOne hello', { mentions }), [
        { type: 'mention', mention: 'testone', raw: 'testOne' },
        ' hello',
      ]);

      assert.deepStrictEqual(parseChatMarkup('hello @testOne!!', { mentions }), [
        'hello ',
        { type: 'mention', mention: 'testone', raw: 'testOne' },
        '!!',
      ]);
    });

    it('does not parse @-mentions that only contain part of a name', () => {
      assert.deepStrictEqual(parseChatMarkup('@testOneTwo', { mentions }), [
        { type: 'mention', mention: 'testonetwo', raw: 'testOneTwo' },
      ]);

      // User "testOne" should _not_ match.
      assert.deepStrictEqual(parseChatMarkup('@testOneThree', { mentions }), [
        '@testOneThree',
      ]);
    });

    it('parses @-mentions with punctuation in them', () => {
      assert.deepStrictEqual(parseChatMarkup('@user[AFK] hello!', {
        mentions: ['user[AFK]'],
      }), [
        { type: 'mention', mention: 'user[afk]', raw: 'user[AFK]' },
        ' hello!',
      ]);

      assert.deepStrictEqual(parseChatMarkup('hello @user[AFK]', {
        mentions: ['user[AFK]'],
      }), [
        'hello ',
        { type: 'mention', mention: 'user[afk]', raw: 'user[AFK]' },
      ]);
    });

    it('parses @-mentions with no clear word boundary', () => {
      assert.deepStrictEqual(parseChatMarkup('hello @ReAnna!!!', {
        mentions: ['ReAnna!!'],
      }), [
        'hello ',
        { type: 'mention', mention: 'reanna!!', raw: 'ReAnna!!' },
        '!',
      ]);
    });
  });
});
