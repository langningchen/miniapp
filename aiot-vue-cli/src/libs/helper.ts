import { createHash, type BinaryLike } from 'crypto';
import { readdirSync } from 'fs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getPort } from 'portfinder';

const QUERY_REG = /([^=&\s]+)[=\s]*([^&\s]*)/g;

export const md5 = (data: BinaryLike) => {
  const hash = createHash('md5');
  hash.update(data);
  return hash.digest('hex');
};

export const Helper = {
  async findPort(port) {
    return new Promise((resolve, reject) => {
      getPort({ port: port }, (err, port) => {
        if (err) {
          console.log(err);
          reject();
        } else {
          resolve(port);
        }
      });
    });
  },
  parseQuery(query) {
    const obj = {};
    while (QUERY_REG.exec(query)) {
      obj[RegExp.$1] = RegExp.$2;
    }
    return obj;
  },
};
