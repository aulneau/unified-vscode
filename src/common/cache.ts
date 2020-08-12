// https://github.com/gatsbyjs/gatsby/blob/7f5b262d7b5323f1a387b8b7278d9a81ee227258/packages/gatsby/src/utils/cache.js
import fs from 'fs-extra';
// @ts-ignore
import manager from 'cache-manager';
// @ts-ignore
import fsStore from 'cache-manager-fs-hash';
import * as path from 'path';

const MAX_CACHE_SIZE = 250;
const TTL = Number.MAX_SAFE_INTEGER;

export default class Cache {
  private name: any;
  private store: any;
  private cache: any;

  constructor({ name = `db`, store = fsStore } = {}) {
    this.name = name;
    this.store = store;
  }

  // @ts-ignore
  get directory() {
    return path.join(process.cwd(), `.cache/caches/${this.name}`);
  }

  init() {
    fs.ensureDirSync(this.directory);

    const caches = [
      {
        store: `memory`,
        max: MAX_CACHE_SIZE,
      },
      {
        store: this.store,
        options: {
          path: this.directory,
          ttl: TTL,
        },
      },
    ].map(cache => manager.caching(cache));

    this.cache = manager.multiCaching(caches);

    return this;
  }

  get(key: string) {
    return new Promise(resolve => {
      this.cache.get(key, (err: any, res: any) => {
        resolve(err ? undefined : res);
      });
    });
  }

  set(key: string, value: any, args = {}) {
    return new Promise(resolve => {
      this.cache.set(key, value, args, (err: any) => {
        resolve(err ? undefined : value);
      });
    });
  }

  wrap(key: string, cb: any) {
    return this.cache.wrap(key, cb);
  }
}
