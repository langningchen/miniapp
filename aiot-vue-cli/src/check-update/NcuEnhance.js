const _ = require('lodash')
const pacote = require('pacote')
const ncuVersionUtil = require('./NcuVersionUtil.js')
const semver = require('semver')

const filterPredicate = ncuVersionUtil.filterPredicate

// we use NcuEnhance here, because there is a little bug in ncu package,
//  that is registry not pass with versions check, will slow down the speed of checking
module.exports = class NcuEnhance {
  async viewMany(packageName, fields, { registry, timeout } = {}) {
    const opts = { cache: false, timeout }
    if (registry) opts['registry'] = registry
    const result = await pacote.packument(packageName, opts)
  
    let res = fields.reduce((accum, field) => ({
      ...accum,
      [field]: field.startsWith('dist-tags.') && result.versions ?
        result.versions[_.get(result, field)] :
        result[field]
    }), {})

    Object.keys(res).forEach(key => {
      if (res[key] === undefined) {
        delete res[key]
      }
    })
    return res
  }
  
  async viewOne(packageName, field, options) {
    const result = await this.viewMany(packageName, [field], options)
    return result && result[field]
  }

  /**
   * @param packageName
   * @param options
   * @returns
   */
   async latest(packageName, options = {}) {
    const latest = await this.viewOne(packageName, 'dist-tags.latest', options)

    // latest should not be deprecated
    // if latest exists and latest is not a prerelease version, return it
    // if latest exists and latest is a prerelease version and --pre is specified, return it
    // if latest exists and latest not satisfies min version of engines.node
    if (latest && filterPredicate(options)(latest)) return latest.version

    // if latest is a prerelease version and --pre is not specified
    // or latest is deprecated
    // find the next valid version
    const versions = await this.viewOne(packageName, 'versions', options)
    const validVersions = _.filter(versions, filterPredicate(options))

    return _.last(validVersions.map(o => o.version))
  }

  _cleanPreVersions(versions) {
    return _.filter(versions,
      (val) => !val.version.includes('-beta') && !val.version.includes('-alpha') && !val.version.includes('-rc'))
  }

  _findGreatest() {
    return _.last(
      // eslint-disable-next-line fp/no-mutating-methods
      _.filter(versions, filterPredicate(options))
        .map(o => o.version)
        .sort(ncuVersionUtil.compareVersions)
    )
  }

  _matchVer(versions, currentVersion, useBeta, useAllVersions, options) {
    if (!useBeta) {
      versions = this._cleanPreVersions(versions)
    }

    if (useAllVersions) {
      return _.last(
        // eslint-disable-next-line fp/no-mutating-methods
        _.filter(versions, filterPredicate(options))
          .map(o => o.version)
          .sort(ncuVersionUtil.compareVersions)
      )
    }

    // or match by level, it will compatible afterward.
    let level = 'minor'
    try {
      // semver.minVersion() may crash on some tag format, like 'next' and so on.
      const verObj = semver.minVersion(currentVersion)
      if (verObj.major === 0 && verObj.minor === 0) {
        level = 'patch'
      }
    } catch (err) {
      console.error(`Invalid version ${currentVersion}, omit.`)
      return
    }

    return ncuVersionUtil.findGreatestByLevel(
      _.filter(versions, filterPredicate(options)).map(o => o.version),
      currentVersion,
      level
    )
  }

  async latestV2(pkgName, currentVersion, useBeta, useAllVersions, options={}) {
    let ver
    // first search in distTags
    const distTags = await this.viewOne(pkgName, 'dist-tags', options)
    const fields = []
    for (const tag of Object.keys(distTags)) {
      fields.push(`dist-tags.${tag}`)
    }

    const distTagsVersions = await this.viewMany(pkgName, fields, options)
    ver = this._matchVer(distTagsVersions, currentVersion, useBeta, useAllVersions, options)
    if (ver) return ver

    // second search in versions
    const versions = await this.viewOne(pkgName, 'versions', options)
    ver = this._matchVer(versions, currentVersion, useBeta, useAllVersions, options)
    return ver
  }
}
