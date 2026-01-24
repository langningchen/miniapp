const NcuChecker = require('../check-update/NcuChecker.js')
const uploadCliActivity = require('./utils/UploadInfo')

module.exports = async function(options) {
  // 上报check-update埋点
  uploadCliActivity('activity', 'check_update')

  const checker = new NcuChecker({
    verbose: true,
    useCoreBeta: options['coreBeta'],
    useCoreAllVersions: options['coreAllVersions'],
  })
  checker.fullCheck()
}