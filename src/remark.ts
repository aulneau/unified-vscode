import { getHighlighter } from './shiki/shiki';
import { cache, generateHash, codeLanguage, renderToHtml } from './utils';
import { selectAll } from 'unist-util-select';
import memoize from 'micro-memoize';
import pAll from 'p-all';
import { DEFAULT_THEME } from './common/constants';
// @ts-ignore
const getHighlightLineNumbers = (str: string): number[] | undefined => {
  if (!str) return;
  let numbers: number[] | undefined = undefined;
  numbers = str.split(',').flatMap(s => {
    if (!s.includes('-')) return +s;

    const [min, max] = s.split('-');
    // @ts-ignore
    const final = Array.from({ length: max - min + 1 }, (_, n) => n + +min);
    return final;
  });
  return numbers;
};

const getProps = (meta: any) => {
  let props =
    meta &&
    meta.split(' ').reduce((acc: any, cur: any) => {
      if (cur && cur.includes('=')) {
        const t = cur.split('=');
        acc[t[0]] = t[1];
        return acc;
      }

      acc[cur] = true;
      return acc;
    }, {});
  if (props.highlight) {
    props.highlight = getHighlightLineNumbers(props.highlight);
  }
  return props;
};

const generateHighlighter = memoize(
  async () =>
    getHighlighter({
      theme: DEFAULT_THEME,
      renderer: renderToHtml,
      cache,
    }),
  { isPromise: true }
);

// @ts-ignore
const highlight = async (node: any) => {
  const hash = generateHash(node.value);
  return cache.wrap(hash, async () => {
    const props = node && node.meta && getProps(node.meta);
    const highlighter = await generateHighlighter();
    // @ts-ignore
    return highlighter.codeToHtml(node, props);
  });
};

const visitor = memoize(
  async (node: any) => {
    node.type = 'html';
    node.children = undefined;
    node.lang = codeLanguage(node);
    node.value = await highlight(node);
  },
  { isPromise: true }
);

const transformer = async (tree: any) => {
  const nodes = selectAll('code', tree);
  await pAll(
    nodes.map(node => () => visitor(node)),
    { concurrency: 25 }
  );
  return tree;
};

export const remarkVscode = memoize(function attacher() {
  return transformer;
});
