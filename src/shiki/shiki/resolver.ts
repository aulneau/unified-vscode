/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { IRawGrammar, IOnigLib, parseRawGrammar, RegistryOptions } from 'vscode-textmate';
import { ILanguageRegistration } from '../languages';
import * as fs from 'fs-extra';
import { createHash } from 'crypto';

const generateHash = (node: any) => createHash('md5').update(JSON.stringify(node)).digest('hex');

const util = require('util');
const readFile = util.promisify(fs.readFile);

function getFilename(path: string) {
  const filename = path.split('mars/')[1];
  return filename;
}

export class Resolver implements RegistryOptions {
  private readonly langMap: { [langIdOrAlias: string]: ILanguageRegistration } = {};
  private readonly scopeToLangMap: { [scope: string]: ILanguageRegistration } = {};

  private readonly _languages: ILanguageRegistration[];
  private readonly _onigLibPromise: Promise<IOnigLib>;
  private readonly _onigLibName: string;
  private readonly cache: any;

  constructor(
    languages: ILanguageRegistration[],
    onigLibPromise: Promise<IOnigLib>,
    onigLibName: string,
    cache: any
  ) {
    this._languages = languages;
    this._onigLibPromise = onigLibPromise;
    this._onigLibName = onigLibName;
    this.cache = cache;

    this._languages.forEach(l => {
      this.langMap[l.id] = l;
      l.aliases.forEach(a => {
        this.langMap[a] = l;
      });

      this.scopeToLangMap[l.scopeName] = l;
    });
  }

  public getOnigLib(): Promise<IOnigLib> {
    return this._onigLibPromise;
  }

  public getOnigLibName(): string {
    return this._onigLibName;
  }

  public getLangRegistration(langIdOrAlias: string): ILanguageRegistration {
    return this.langMap[langIdOrAlias];
  }

  public async loadGrammar(scopeName: string): Promise<IRawGrammar> {
    const lang = this.scopeToLangMap[scopeName];

    if (!lang) {
      // @ts-ignore
      return null;
    }

    if (lang.grammar) {
      return lang.grammar;
    }

    if (this.cache) {
      const filename = getFilename(lang.path);
      const cached = await this.cache.get(filename);

      if (cached) {
        return cached;
      }
    }

    const g = await readGrammarFromPath(lang.path, this.cache);

    lang.grammar = g;
    return g;
  }
}

// @ts-ignore
async function readGrammarFromPath(path: string, cache: any): Promise<IRawGrammar> {
  if (cache) {
    try {
      const filename = generateHash(getFilename(path));
      const cached = await cache.get(filename);
      if (cached) {
        return cached;
      }
      const content = await readFile(path, 'utf8');
      const rawGrammar = parseRawGrammar(content.toString(), path);
      await cache.set(filename, rawGrammar);
      return rawGrammar;
    } catch (e) {
      console.log(e);
    }
  } else {
    const content = await readFile(path, 'utf8');
    return parseRawGrammar(content.toString(), path);
  }
}
