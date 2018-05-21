/**
 * Adapted from https://github.com/kevva/url-regex.
 */
export default function urlRegex() {
  const protocol = '(?:(?:[a-z]+:)?//)';
  const auth = '(?:\\S+(?::\\S*)?@)?';
  const host = '(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)';
  const domain = '(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*';
  const tld = '(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?';
  const port = '(?::\\d{2,5})?';
  const path = '(?:[/?#][^\\s"]*)?';
  const regex = `(?:${protocol}|www\\.)${auth}(?:localhost|${host}${domain}${tld})${port}${path}`;

  return new RegExp(regex, 'ig');
}
