2.1.0 / 2017-09-06
==================

 * Make :emoji: case insensitive.
 * Use url-regex module for better URL matching.
 * Fix parsing of mentions ending in punctuation, followed by punctuation, such
   as the mention "Test!" in "@Test!!!".

2.0.4 / 2017-03-04
==================

 * Only allow string inputs. Fixes an issue where passing an array (eg. a
   message that was already parsed) would send `u-wave-parse-chat-markup` into
   an infinite loop.

2.0.3 / 2016-10-09
==================

 * Fix parsing of mentions ending in punctuation at the very end of a message.

2.0.2 / 2016-10-03
==================

 * Fix parsing of mentions ending in punctuation, like "User[AFK]".

2.0.1 / 2016-09-12
==================

 * Fix parsing of emoji shortcodes with + or - signs in them, like :+1: or :-1:.

2.0.0 / 2016-06-05
==================

 * Mentions are not limited to user objects, pass strings instead:

   ```js
   mentions: ['username', 'groupname']
   ```

 * Mentions are case-insensitive.
 * Mentions immediately followed by punctuation now work.
