import { Registry } from 'vscode-textmate';

import {
  TLang,
  commonLangIds,
  commonLangAliases,
  ILanguageRegistration,
  getLangRegistrations,
} from '../languages';

import { Resolver } from './resolver';
import { getOnigasm } from './onigLibs';
import { tokenizeWithTheme, IThemedToken } from './themedTokenizer';
import { renderToHtml, HtmlRendererOptions } from './renderer';

import { getTheme, TTheme, IShikiTheme } from '../themes';

// @ts-ignore
type Renderer = (lines: IThemedToken[][], options: HtmlRendererOptions = {}) => string;

export interface HighlighterOptions {
  theme: TTheme | IShikiTheme;
  langs?: (TLang | ILanguageRegistration)[];
  renderer?: Renderer;
  cache?: any;
}

let highlighter: Highlighter;
const languageRecord = {};

export async function getHighlighter(options: HighlighterOptions) {
  if (highlighter) {
    return highlighter;
  }
  let t: IShikiTheme;
  if (typeof options.theme === 'string') {
    t = getTheme(options.theme);
  } else if (options.theme.name) {
    t = options.theme;
  } else {
    t = getTheme('nord');
  }

  let langs: (TLang | ILanguageRegistration)[] = [...commonLangIds, ...commonLangAliases];

  let renderer = renderToHtml;

  if (options.langs) {
    langs = options.langs;
  }

  if (options.renderer) {
    renderer = options.renderer;
  }

  const langRegistrations = getLangRegistrations(langs);

  const s = new Shiki(t, langRegistrations, renderer, options.cache);
  highlighter = await s.getHighlighter();
  return highlighter;
}

class Shiki {
  private _resolver: Resolver;
  private _registry: Registry;
  private _renderer: Renderer;
  private _cache: any;

  private _theme: IShikiTheme;
  private _colorMap: string[];
  private _langs: ILanguageRegistration[];

  constructor(theme: IShikiTheme, langs: ILanguageRegistration[], renderer: Renderer, cache: any) {
    this._resolver = new Resolver(langs, getOnigasm(), 'onigasm', cache);
    this._registry = new Registry(this._resolver);
    this._renderer = renderer;
    this._cache = cache;

    this._registry.setTheme(theme);

    this._theme = theme;
    this._colorMap = this._registry.getColorMap();

    this._langs = langs;
  }

  async getGrammar() {
    if (this._cache) {
      const cached = await this._cache.get('languageRecord');
      if (cached) return cached;
    }

    await Promise.all(
      // @ts-ignore
      this._langs.map(async l => {
        const g = await this._registry.loadGrammar(l.scopeName);
        // @ts-ignore
        languageRecord[l.id] = g;
        l.aliases.forEach(la => {
          // @ts-ignore
          languageRecord[la] = g;
        });
      })
    );
    if (this._cache) {
      await this._cache.set('languageRecord', languageRecord);
    }
    return languageRecord;
  }

  // @ts-ignore

  async getHighlighter(): Promise<Highlighter> {
    const ltog = await this.getGrammar();
    return {
      codeToThemedTokens: (code, lang) => {
        if (isPlaintext(lang)) {
          throw Error('Cannot tokenize plaintext');
        }
        if (!ltog[lang]) {
          throw Error(`No language registration for ${lang}`);
        }
        return tokenizeWithTheme(this._theme, this._colorMap, code, ltog[lang]);
      },
      codeToHtml: (node: any, props: any) => {
        const lang = node.lang;
        const code = node.value;
        const highlight = props && props.highlight;
        if (isPlaintext(lang)) {
          return this._renderer([[{ content: code }]], {
            bg: this._theme.bg,
          });
        }
        if (!ltog[lang]) {
          console.error(`No language registration for ${lang}`);
          return this._renderer([[{ content: code }]], {
            bg: this._theme.bg,
          });
        }
        const tokens = tokenizeWithTheme(this._theme, this._colorMap, code, ltog[lang]);
        return this._renderer(tokens, {
          bg: this._theme.bg,
          highlight,
        });
      },
    };
  }
}

function isPlaintext(lang: string) {
  return ['plaintext', 'txt', 'text'].indexOf(lang) !== -1;
}

export interface Highlighter {
  codeToThemedTokens(code: string, lang: TLang): IThemedToken[][];

  codeToHtml?(code: string, lang: TLang): string;

  // codeToRawHtml?(code: string): string
  // getRawCSS?(): string

  // codeToSVG?(): string
  // codeToImage?(): string
}
