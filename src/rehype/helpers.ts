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
  let classNameString = '';
  token.explanation.forEach((expl: any) => {
    const thing = expl.scopes.find((scope: any) => scope.themeMatches.length > 0);
    const themeMatches = thing && thing.themeMatches && thing.themeMatches[0];
    const name = themeMatches && themeMatches.name;
    const formatted =
      name &&
      name
        .toString()
        .split(', ')
        .map((entry: string) => entry.toLowerCase());
    if (formatted) {
      classNames = formatted;
    }
  });

  classNames &&
    classNames.length &&
    classNames.forEach((className: string, index: number) => {
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

export function codeLanguage(node: any) {
  const className = node.properties.className || [];
  let value;

  for (const element of className) {
    value = element;

    if (value.slice(0, 9) === 'language-') {
      return value.slice(9);
    }
  }

  return 'bash';
}
