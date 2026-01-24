const path = require('path')
const fs = require('fs')
const ncu = require('npm-check-updates');
const _ = require('lodash')
const semver = require('semver')
const chalk = require('chalk')
const AppInfo = require('../libs/appinfo.js');
const ncuLogginPath = require.resolve('npm-check-updates/lib/logging.js')
const ncuLogging = require(ncuLogginPath)
const NcuEnhance = require('./NcuEnhance.js')
const prompts = require('prompts')
const { promisify } = require('util')
const cliPkgPath = path.resolve(__dirname, '../../package.json')
const cliPkg = require(cliPkgPath)
const commandExists = require('command-exists');
const execSync = require('child_process').execSync;

const writePackageFile = promisify(fs.writeFile)

const CORE_PKG_LIST = [
  "aiot-vue-cli", "css-loader", "less-loader",
  /falcon-.*/,
]

const PEER_PKGS = [
  {
    "css-loader": "<=0.28.8",  // verified, do not upgrade above
    "less-loader": "<=5.0.0",  // verified, do not upgrade above
  }
]
module.exports = class NcuChecker {
  constructor({verbose, useCoreBeta, useCoreAllVersions}) {
    this.verbose = verbose
    this.useCoreBeta = useCoreBeta
    this.useCoreAllVersions = useCoreAllVersions
    const timeout = 30000
    const registry = 'https://registry.npmmirror.com'
    this.options = {
      timeout,
      registry,
      jsonUpgraded: true,
      silent: true,
      peerDependencies: PEER_PKGS,
    }
    this.npmMgr = ncu.getPackageManager()
    this.ncuEnhance = new NcuEnhance()
    this.step = 0
  }

  print() {
    if (this.verbose) {
      console.info(...arguments)
    }
  }
  
  printNotice() {
    console.info(...arguments)
  }

  printBold(msg) {
    console.info(chalk.yellowBright(msg))
  }

  getCurrentDependencies() {
    const packageInfo = AppInfo.getAppPackageInfo()
    const currentDependencies = ncu.getCurrentDependencies(packageInfo, this.options) 
    return currentDependencies
  }

  getDeps() {
    const currentDependencies = this.getCurrentDependencies()
    return this._splitDeps(currentDependencies)
  }

  _splitDeps(currentDependencies) {
    const coreDeps = {}, otherDeps = {}
    for (let dep of Object.keys(currentDependencies)) {
      let matched = false
      for (let pattern of CORE_PKG_LIST) {
        if (pattern instanceof RegExp) {
          const m = dep.match(pattern)
          if (m && m[0] === dep) {
            // all match
            matched = true
            break
          }
        } else {
          if (dep === pattern) {
            matched = true
            break
          }
        }
      }
      if (matched) {
        coreDeps[dep] = currentDependencies[dep]
      } else {
        otherDeps[dep] = currentDependencies[dep]
      }
    }
    return [coreDeps, otherDeps]
  }

  async checkPackageJson({checkAll}) {
    const [coreDeps, otherDeps] = this.getDeps()

    await this.checkCore(coreDeps)

    if (checkAll) {
      await this.checkOther(otherDeps)
    }
  }

  async checkCore(coreDeps) {
    this.print(`检查核心包[${Object.keys(coreDeps).length}]...`)
    const newVersions = await this._checkCore(coreDeps)
    // try to upgrade
    // 1. use ncu.upgradeDependencies to get final update dependencies
    const currentDependencies = coreDeps
    const latestVersions = newVersions
    const upgradedDependencies = ncu.upgradeDependencies(currentDependencies, latestVersions, this.options)
    await this._updatePackageData(coreDeps, newVersions, upgradedDependencies)
  }
  
  async checkOther(otherDeps) {
    // check others
    this.print(`检查其他包[${Object.keys(otherDeps).length}]...`)
    const currentDependencies = otherDeps
     
    let [filteredUpgradedDependencies, latestVersions, peerDependencies] = 
      await ncu.upgradePackageDefinitions(currentDependencies, this.options)

    // try to upgrade
    await this._updatePackageData(otherDeps, latestVersions, filteredUpgradedDependencies)
  }

  async _checkCore(coreDeps) {
    let ver
    const newVersions = {}
    for (let pkgName of Object.keys(coreDeps)) {
      const pkgVer = coreDeps[pkgName]
      if (pkgName !== 'aiot-vue-cli') {
        if (pkgVer !== '*' && !pkgVer.startsWith('~') && !pkgVer.startsWith('^'))
          continue
      }
      const useBeta = pkgVer.includes('-beta') || this.useCoreBeta
      ver = await this.ncuEnhance.latestV2(pkgName, pkgVer, useBeta, this.useCoreAllVersions, this.options)
      if (ver) {
        newVersions[pkgName] = ver
      }
    }
    return newVersions
  }

  async _updatePackageData(currentDependencies, newVersions, newDependencies) {
    // 1. update package.json by ncu.upgradePackageData(no choice), and promot to user to confirm
    // 2. override pacakge.json if user confirmed

    const pkgData = AppInfo.getAppPackageData()

    const oldDependencies = currentDependencies
    const { newPkgData, selectedNewDependencies } =
      await ncu.upgradePackageData(pkgData, oldDependencies, newDependencies, newVersions, this.options)

    const numUpgraded = Object.keys(selectedNewDependencies).length
    if (numUpgraded > 0) {
      // print diff table firstly
      const current = currentDependencies
      const upgraded = selectedNewDependencies
      const ownersChangedDeps = null
      const table = ncuLogging.toDependencyTable({
        from: current,
        to: upgraded,
        ownersChangedDeps,
        format: this.options.format || [],
      })
      this.printNotice(table.toString())

      // promopt to upgrade
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: `是否更新: 一共${numUpgraded}项`,
        initial: true,
        onState: state => {
          if (state.aborted) {
            process.nextTick(() => process.exit(1))
          }
        }
      })
      if (!response.value) {
        this.printBold('已取消')
        return
      }

      // do upgrade actually
      const pkgFile = AppInfo.getAppPackagePath()
      await writePackageFile(pkgFile, newPkgData).then(() => {
        this.printBold(`${++this.step}. [本地] package.json 已更新，请运行 ${chalk.cyan('cnpm install')} 完成包安装.`)
      }).catch((err) => {
        console.error(err)
        console.error(`\npackage.json 写入失败 ${pkgFile}`)
      })
    }
  }

  // check installed packages version match the package.json declaration
  async checkInstalledPkg() {
    const currentDependencies = this.getCurrentDependencies()
    const notSatisfiedPkgs = {}
    for (const pkgName of Object.keys(currentDependencies)) {
      const pkgVer = currentDependencies[pkgName]
      const pkgJsonPath = path.join(AppInfo.getAppRoot(), 'node_modules', pkgName, 'package.json')
      let pkgJson
      try {
        const pkgJsonStr = fs.readFileSync(pkgJsonPath, 'utf8')
        pkgJson = JSON.parse(pkgJsonStr)
      } catch (err) {
        console.error(`读取包版本失败 ${pkgName} : ${pkgJsonPath}`)
        continue
      }
      const curVer = pkgJson.version
      // console.log(pkgName, pkgVer, curVer)
      if (!semver.satisfies(curVer, pkgVer)) {
        notSatisfiedPkgs[pkgName] = {
          pkgVer, curVer
        }
      }
    }

    const pkgKeys = Object.keys(notSatisfiedPkgs)
    let msg
    if (pkgKeys.length > 0) {
      this.printNotice(`待更新包：`)
      for (const pkgName of pkgKeys) {
        const {pkgVer, curVer} = notSatisfiedPkgs[pkgName]
        this.printNotice(`${pkgName}\t当前版本${curVer}\t更新到${pkgVer}`)
      }
      msg = `${++this.step}. [本地] 您有 ${Object.keys(notSatisfiedPkgs).length} 个包需要更新, 安装命令: ${chalk.cyan('cnpm install')}`
      this.printBold(msg)
    }
  }

  // async quickCheckCurrentCli_deprecated() {
  //   const deps = { [cliPkg.name]: cliPkg.version }
  //   const localCliPkg = path.resolve(path.join(AppInfo.getAppRoot(), 'node_modules', cliPkg.name, 'package.json'))

  //   let global
  //   if (localCliPkg === cliPkgPath) {
  //     // local case
  //     global = '本地'
  //   } else {
  //     // global case
  //     global = '全局'
  //   }
  //   const newVersions = await this._checkCore(deps)
  //   this._updateNotify(deps, newVersions, global)
  // }
  
  _updateNotify(deps, newVersions, global) {
    // try to upgrade
    // 1. use ncu.upgradeDependencies to get final update dependencies
    const currentDependencies = deps
    const latestVersions = newVersions
    const upgradedDependencies = ncu.upgradeDependencies(currentDependencies, latestVersions, this.options)
    const upgradedKeys = Object.keys(upgradedDependencies)
    if (upgradedKeys.length > 0) {
      const pkgAtStrList = []
      this.printNotice('待更新包：')
      for (const pkgName of upgradedKeys) {
        const pkgVer = upgradedDependencies[pkgName]
        pkgAtStrList.push(`${pkgName}@${pkgVer}`)
        this.printNotice(`${pkgName}\t当前版本${deps[pkgName]}\t更新到${pkgVer}`)
      }
      const pkgAtStr = pkgAtStrList.join(' ')
      const cmdStr = chalk.cyan(`cnpm install ${global === '全局' ? '-g ' : ''}${pkgAtStr}`)

      this.printBold(`${++this.step}. [${global}] 待更新包 ${upgradedKeys.length} 个, 安装命令: ${cmdStr}`)
    }
  }

  // async checkGlobalPkg_deprecated() {
  //   const options = _.pick(this.options, ['cwd', 'filter', 'filterVersion',
  //     'global', 'packageManager', 'prefix', 'reject', 'rejectVersion']
  //   )
  //   options['global'] = true
  //   const globalPackages = await ncu.getInstalledPackages(options)

  //   if (!('cnpm' in globalPackages)) {
  //     this.printBold(`${++this.step}. [全局] 推荐安装 cnpm 安装命令: ${chalk.cyan('npm install -g cnpm --registry=https://registry.npmmirror.com')}`)
  //   }

  //   const [coreDeps, otherDeps] = this._splitDeps(globalPackages)
  //   const newVersions = await this._checkCore(coreDeps)
  //   this._updateNotify(coreDeps, newVersions, '全局')
  // }

  async checkGlobalCmds() {
    // only check some global cmd exists, and give instruction when not exists
    if (!commandExists.sync('cnpm')) {
      this.printBold(`${++this.step}. [全局] 推荐安装 cnpm 安装命令: ${chalk.cyan('npm install -g cnpm --registry=https://registry.npmmirror.com')}`)
    } else {
      this.print('已安装 cnpm')
    }
    if (!commandExists.sync('aiot-cli')) {
      this.printBold(`${++this.step}. [全局] 推荐安装 aiot-cli 安装命令: ${chalk.cyan('cnpm install -g aiot-vue-cli')}`)
    } else {
      this.print('已安装 aiot-cli')
      const deps = {}
      // get version
      let verStr = '0.0.0'
      try {
        verStr = execSync('aiot-cli -V', {encoding: 'utf8', stdio: [
          0, // Use parent's stdin for child.
          'pipe', // Pipe child's stdout to parent.
          'ignore', // ignore child's stderr.
        ]})
      } catch (err) {
      }
      verStr = verStr.trim()
      if (!semver.parse(verStr)) {
        // not valid version
        verStr = '0.0.0'
      }
      deps['aiot-vue-cli'] = verStr
      const newVersions = await this._checkCore(deps)
      this._updateNotify(deps, newVersions, '全局')
    }
  }
  
  showStepInfo() {
    if (this.step > 0) {
      this.printBold(`\n请修复如上 ${this.step} 个问题, 运行命令 ${chalk.cyan('aiot-cli check')} 可再次检查`)
    } else {
      this.printNotice(chalk.greenBright('\n已经最新:)'))
    }
  }
  
  async normalCheck() {
    // 一、常用更新检查
    // 1. 检查 pakcage.json 已安装包不符合版本范围，即没有运行 npm install 完成更新步骤
    // 2. 检查 package.json 核心包并提示更新
    // 3. 检查 global 命令是否完整
    if (AppInfo.isInited()) {
      const pkgFile = AppInfo.getAppPackagePath()
      if (fs.existsSync(pkgFile)) {
        this.print('\n检查 package.json...')
        const step0 = this.step
        await this.checkPackageJson({checkAll: false})
        if (step0 === this.step) {
          this.print('\n检查已安装包...')
          await this.checkInstalledPkg()
        }
      } else {
        this.printBold('没有本地项目，跳过本地检查')
      }
    }
    this.print('\n检查环境命令 ...')
    await this.checkGlobalCmds()
    this.showStepInfo()
  }
  
  async fullCheck() {
    // 二、全量更新检查
    // 1. 检查 pakcage.json 已安装包不符合版本范围，即没有运行 npm install 完成更新步骤
    // 2. 检查 package.json 核心&其他包并提示更新
    // 3. 检查 global 命令是否完整
    if (AppInfo.isInited()) {
      const pkgFile = AppInfo.getAppPackagePath()
      if (fs.existsSync(pkgFile)) {
        const step0 = this.step
        this.print('\n检查 package.json...')
        await this.checkPackageJson({checkAll: true})
        if (step0 === this.step) {
          this.print('\n检查已安装包...')
          await this.checkInstalledPkg()
        }
      } else {
        this.printBold('没有本地项目，跳过本地检查')
      }
    }
    this.print('\n检查环境命令...')
    await this.checkGlobalCmds()
    this.showStepInfo()
  }
}
