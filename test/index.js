import { expect } from 'chai';
import parseChatMarkup from '../src/index';

describe('utils/parseChatMarkup', () => {
  const bareOptions = {};

  it('Only accepts string inputs', () => {
    expect(() => parseChatMarkup('some text')).not.to.throw();
    expect(() => parseChatMarkup(['some', 'array'])).to.throw(TypeError);
  });

  describe('simple markup', () => {
    it('bolds things surrounded by *', () => {
      expect(parseChatMarkup('some *bold* text', bareOptions)).to.eql([
        'some ',
        { type: 'bold', content: ['bold'] },
        ' text',
      ]);
    });
    it('italicizes things surrounded by _', () => {
      expect(parseChatMarkup('some _italic_ text', bareOptions)).to.eql([
        'some ',
        { type: 'italic', content: ['italic'] },
        ' text',
      ]);
    });
    it('strikes through things surrounded by ~', () => {
      expect(parseChatMarkup('some ~stroke~ text', bareOptions)).to.eql([
        'some ',
        { type: 'strike', content: ['stroke'] },
        ' text',
      ]);
    });

    it('does not parse simple markup in the middle of words', () => {
      expect(parseChatMarkup('underscored_words are fun_!', bareOptions)).to.eql([
        'underscored_words are fun_!',
      ]);
    });

    it('does not parse incomplete markup', () => {
      expect(parseChatMarkup('a * b', bareOptions)).to.eql([
        'a * b',
      ]);
    });

    it('parses nested markup', () => {
      expect(parseChatMarkup('*bold _italic_*', bareOptions)).to.eql([
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
      expect(parseChatMarkup('some `monospace` text', bareOptions)).to.eql([
        'some ',
        { type: 'code', content: ['monospace'] },
        ' text',
      ]);
    });

    it('parses code blocks inside other markup', () => {
      expect(parseChatMarkup('*_`monospace`_*', bareOptions)).to.eql([
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
      expect(parseChatMarkup('a `b *c* _d_` e', bareOptions)).to.eql([
        'a ',
        { type: 'code', content: ['b *c* _d_'] },
        ' e',
      ]);
    });
  });

  describe('urls', () => {
    it('parses links', () => {
      expect(parseChatMarkup('https://hoi.com/')).to.eql([
        { type: 'link', href: 'https://hoi.com/', text: 'https://hoi.com/' },
      ]);

      expect(parseChatMarkup('something about http://hoi.com/')).to.eql([
        'something about ',
        { type: 'link', href: 'http://hoi.com/', text: 'http://hoi.com/' },
      ]);
    });

    it('parses www. links', () => {
      expect(parseChatMarkup('www.test.com')).to.eql([
        { type: 'link', href: 'http://www.test.com', text: 'www.test.com' },
      ]);
    });
  });

  describe('emoji', () => {
    it('parses :emoji:-style emoji', () => {
      expect(parseChatMarkup('an :emoji:!', bareOptions)).to.eql([
        'an ',
        { type: 'emoji', name: 'emoji' },
        '!',
      ]);

      expect(parseChatMarkup('and :emoji_with_underscores:', bareOptions)).to.eql([
        'and ',
        { type: 'emoji', name: 'emoji_with_underscores' },
      ]);

      expect(parseChatMarkup('and :emoji-with-dashes+pluses:', bareOptions)).to.eql([
        'and ',
        { type: 'emoji', name: 'emoji-with-dashes+pluses' },
      ]);
    });

    it('ignores case', () => {
      expect(parseChatMarkup(':a: :A:', { emojiNames: ['a'] })).to.eql([
        { type: 'emoji', name: 'a' },
        ' ',
        { type: 'emoji', name: 'a' },
      ]);
      expect(parseChatMarkup(':aBC: :abc:', { emojiNames: ['ABc'] })).to.eql([
        { type: 'emoji', name: 'ABc' },
        ' ',
        { type: 'emoji', name: 'ABc' },
      ]);
    });

    it('parses :emoji: that could also be italics', () => {
      expect(parseChatMarkup('_it\'s :emoji_time:!', bareOptions)).to.eql([
        '_it\'s ',
        { type: 'emoji', name: 'emoji_time' },
        '!',
      ]);

      expect(parseChatMarkup('_it\'s :emoji_time:!_', bareOptions)).to.eql([
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
      expect(parseChatMarkup(':a: :b: :c:', { emojiNames: ['b'] })).to.eql([
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
      expect(parseChatMarkup('hello @testOne', { mentions })).to.eql([
        'hello ',
        { type: 'mention', mention: 'testone', raw: 'testOne' },
      ]);

      expect(parseChatMarkup('@testOne hello', { mentions })).to.eql([
        { type: 'mention', mention: 'testone', raw: 'testOne' },
        ' hello',
      ]);

      expect(parseChatMarkup('hello @testOne!!', { mentions })).to.eql([
        'hello ',
        { type: 'mention', mention: 'testone', raw: 'testOne' },
        '!!',
      ]);
    });

    it('does not parse @-mentions that only contain part of a name', () => {
      expect(parseChatMarkup('@testOneTwo', { mentions })).to.eql([
        { type: 'mention', mention: 'testonetwo', raw: 'testOneTwo' },
      ]);

      // User "testOne" should _not_ match.
      expect(parseChatMarkup('@testOneThree', { mentions })).to.eql([
        '@testOneThree',
      ]);
    });

    it('parses @-mentions with punctuation in them', () => {
      expect(parseChatMarkup('@user[AFK] hello!', {
        mentions: ['user[AFK]'],
      })).to.eql([
        { type: 'mention', mention: 'user[afk]', raw: 'user[AFK]' },
        ' hello!',
      ]);

      expect(parseChatMarkup('hello @user[AFK]', {
        mentions: ['user[AFK]'],
      })).to.eql([
        'hello ',
        { type: 'mention', mention: 'user[afk]', raw: 'user[AFK]' },
      ]);
    });

    it('parses @-mentions with no clear word boundary', () => {
      expect(parseChatMarkup('hello @ReAnna!!!', {
        mentions: ['ReAnna!!'],
      })).to.eql([
        'hello ',
        { type: 'mention', mention: 'reanna!!', raw: 'ReAnna!!' },
        '!',
      ]);
    });
  });
});
