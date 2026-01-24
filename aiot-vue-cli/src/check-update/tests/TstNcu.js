const ncu = require('npm-check-updates');
const _ = require('lodash')
const AppInfo = require('../libs/appinfo.js');
const ncuLogginPath = require.resolve('npm-check-updates/lib/logging.js')
const ncuLogging = require(ncuLogginPath)

module.exports = async function() {
  const packageName = 'aiot-vue-cli'
  const timeout = 5000
  const registry = 'https://registry.npmmirror.com'
  const options = {timeout, registry}
  
  // if (0) {
  //   findLast(packageName, options)
  // }
  
  if (0) {
    const upgraded = await ncu.run(options)
    console.log(upgraded)
  }
  // get installed packages
  if (0) {
    const pkgs = await ncu.getInstalledPackages(options)
    console.log(pkgs)
  }
  
  // get depedencies
  if (0) {
    const packageInfo = AppInfo.getAppPackageInfo();
    let deps = ncu.getCurrentDependencies(packageInfo, options)
    console.log(deps)
  }
  // update to dependencies
  if (0) {
    const packageInfo = AppInfo.getAppPackageInfo();
    const currentDependencies = ncu.getCurrentDependencies(packageInfo, options)
    console.log('currentDependencies', currentDependencies)
    // const latestVersions = await ncu.run(options)
    // console.log('latestVersions', latestVersions)
    console.log('ncu.upgradePackageDefinitions', ncu.upgradePackageDefinitions)
    let [filteredUpgradedDependencies, latestVersions, peerDependencies] = 
     await ncu.upgradePackageDefinitions(currentDependencies, options)

    console.log('filteredUpgradedDependencies', filteredUpgradedDependencies)
    console.log('latestVersions', latestVersions)
    console.log('peerDependencies', peerDependencies)
    // const upgradedDependencies  = ncu.upgradeDependencies(deps, latestVersions)
    // console.log(upgradedDependencies)
  }
  
  // check some package package's beta aiot-vue-cli / falcon-ui and so on
  if (0) {
    const npmMgr = ncu.getPackageManager()
    const beta = await npmMgr.viewOne('aiot-vue-cli', 'dist-tags.beta', '0.0.91', options)
    const beta1 = await npmMgr.viewOne('falcon-ui', 'dist-tags.beta', '0.0.91', options)
    console.log(beta)
    console.log(beta1)
  }
  
  // update package data
  if (0) {
    const pkgData = AppInfo.getAppPackageData()
    const packageInfo = AppInfo.getAppPackageInfo();

    const currentDependencies = ncu.getCurrentDependencies(packageInfo, options) 
     
    let [filteredUpgradedDependencies, latestVersions, peerDependencies] = 
      await ncu.upgradePackageDefinitions(currentDependencies, options)

    const oldDependencies = currentDependencies
    const newDependencies = filteredUpgradedDependencies
    const newVersions = latestVersions
    const { newPkgData, selectedNewDependencies } =
      await ncu.upgradePackageData(pkgData, oldDependencies, newDependencies, newVersions, options)
    console.log(newPkgData)
    console.log(selectedNewDependencies)

  
    const numUpgraded = Object.keys(selectedNewDependencies).length
    // print table
    if (numUpgraded > 0) {
      const current = currentDependencies
      const upgraded = filteredUpgradedDependencies
      const ownersChangedDeps = null
      const table = ncuLogging.toDependencyTable({
        from: current,
        to: upgraded,
        ownersChangedDeps,
        format: options.format || [],
      })
      ncuLogging.print(options, table.toString())
    } else {
      console.info('没有更新内容')
    }
  }
}