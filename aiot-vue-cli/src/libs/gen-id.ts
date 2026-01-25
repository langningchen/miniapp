import { md5 } from "./helper";
const cache = new Map<string,string>();
export default (file:string) => {
  return cache.get(file) || (cache.set(file, md5(file)));
};
