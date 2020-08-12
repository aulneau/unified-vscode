import { getHighlighter } from '../shiki/shiki';
import { IShikiTheme, TTheme } from '../shiki/themes';
import { codeLanguage, getTokenClassNames, removeEmptyLine } from '../rehype/helpers';
import { DEFAULT_THEME } from '../common/constants';
import { cache, generateHash } from '../utils';
import memoize from 'micro-memoize';
import visit from 'unist-util-visit';

// @ts-ignore
import hastToString from 'hast-util-to-string';
// @ts-ignore
import u from 'unist-builder';
// @ts-ignore
import pAll from 'p-all';

export const rehypeVscode = (
  options: {
    theme?: TTheme | IShikiTheme;
    tokenLineClassName?: string;
    tokenLineElement?: string;
  } = {}
) => {
  let theme = options.theme || DEFAULT_THEME;

  const generateHighlighter = memoize(
    async () =>
      getHighlighter({
        theme,
        cache,
      }),
    { isPromise: true }
  );

  // @ts-ignore
  const highlight = async (node: any, lang: any) => {
    const hash = generateHash(node);
    return cache.wrap(hash, async () => {
      const highlighter = await generateHighlighter();
      // @ts-ignore
      return highlighter.codeToThemedTokens(node, lang);
    });
  };

  function tokensToHast(lines: any) {
    const tokenLineClassName = (options && options.tokenLineClassName) || 'token-line';
    const tokenLineElement = (options && options.tokenLineElement) || 'span';
    const tree = [];

    for (const line of lines) {
      if (line.length === 0) {
        tree.push(
          u('element', {
            tagName: tokenLineElement,
            properties: { className: `${tokenLineClassName} ${tokenLineClassName}__empty` },
          })
        );
      } else {
        const lineChildren = [];

        // this generates our tokens within a line
        for (const token of line) {
          const className = getTokenClassNames(token);
          lineChildren.push(
            u(
              'element',
              {
                tagName: 'span',
                properties: { style: `color: ${token.color}`, className: `token ${className}` },
              },
              [u('text', token.content)]
            )
          );
        }
        // this generates our lines with the tokens as children
        tree.push(
          u(
            'element',
            {
              tagName: tokenLineElement,
              properties: { className: tokenLineClassName },
            },
            lineChildren
          )
        );
      }
    }
    removeEmptyLine(2, tree);
    removeEmptyLine(1, tree);

    return tree;
  }

  async function transformer(tree: any) {
    const nodes: any = [];
    // @ts-ignore
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || parent.tagName !== 'pre' || node.tagName !== 'code') {
        return;
      } else {
        nodes.push(node);
      }
    });

    await pAll(
      nodes.map((node: any) => () => visitor(node)),
      { concurrency: 25 }
    );
    return tree;
  }

  // @ts-ignore
  async function visitor(node: any) {
    const lang = codeLanguage(node);
    const tokens = await highlight(hastToString(node), lang);
    const tree = tokensToHast(tokens);
    node.properties.lines = tokens.length - 1;
    node.properties.lang = lang;
    node.children = tree;
  }

  return transformer;
};
