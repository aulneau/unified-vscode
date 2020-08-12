import Cache from './common/cache';
import { createHash } from 'crypto';
export const cache = new Cache({ name: 'remark-shiki' }).init();
export const generateHash = (node: any) =>
  createHash('md5').update(JSON.stringify(node)).digest('hex');

export function slugify(string: string) {
  return string
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export function removeEmptyLine(index: any, tree: any) {
  const [item] = tree.slice(index * -1);
  if (item && item.properties && item.properties.className.includes('empty')) {
    tree.pop();
  }
}

export function getTokenClassNames(token: any) {
  let classNames: any;
  let classNameString: any = '';
  token.explanation.forEach((expl: any) => {
    const thing = expl.scopes.find((scope: any) => scope.themeMatches.length > 0);
    const themeMatches = thing && thing.themeMatches && thing.themeMatches[0];
    const name = themeMatches && themeMatches.name;
    const formatted =
      name &&
      name
        .toString()
        .split(', ')
        .map((entry: any) => entry.toLowerCase());
    if (formatted) {
      classNames = formatted;
    }
  });

  classNames &&
    classNames.length &&
    classNames.forEach((className: any, index: any) => {
      classNameString += `${slugify(className)}${index !== classNames.length - 1 ? ' ' : ''}`;
    });

  return classNameString === '' ? 'plain' : classNameString;
}

export function addStyle(node: any, style: any) {
  const props = node.properties || {};
  const styles = props.style || [];
  styles.push(style);
  props.style = styles;
  node.properties = props;
}

export function escapeHtml(html: any) {
  return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function codeLanguage(node: any) {
  if (node.lang) return node.lang;
  return 'bash';
}

export function renderToHtml(lines: any, options: any = {}) {
  const highlight = options && options.highlight;

  const addHighlightClass = (lineNumber: number) =>
    highlight && highlight.find((number: number) => number === lineNumber + 1)
      ? ' token-line--highlighted'
      : '';

  let html = '';

  html += `<pre className="shiki-code">`;
  if (options.langId) {
    html += `<div className="language-id">${options.langId}</div>`;
  }
  html += `<code>`;

  lines.forEach((l: any, index: number) => {
    if (l.length === 0) {
      html += `<span className="token-line token-line--empty${addHighlightClass(index)}"></span>`;
    } else {
      html += `<span className="token-line${addHighlightClass(index)}">`;
      l.forEach((token: any) => {
        html += `<span style="color: ${token.color}">${escapeHtml(token.content)}</span>`;
      });
      html += `</span>`;
    }
  });
  html = html.replace(/<span className="token-line token-line--empty"><\/span>*$/, ''); // Get rid of final empty lines
  html += `</code></pre>`;

  return html;
}
