import { getAmrPath, getFalconBuildDir } from '../libs/appinfo';
import { zip } from 'compressing';

export default async () => {
  await zip.compressDir(getFalconBuildDir(), getAmrPath(), { ignoreBase: true });
};
