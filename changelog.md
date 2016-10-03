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
