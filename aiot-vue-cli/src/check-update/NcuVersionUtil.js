const _ = require('lodash')
const semver = require('semver')

/**
 * Returns true if the node engine requirement is satisfied or not specified for a given package version.
 *
 * @param versionResult   Version object returned by pacote.packument.
 * @param nodeEngine      The value of engines.node in the package file.
 * @returns               True if the node engine requirement is satisfied or not specified.
 */
 function satisfiesNodeEngine(versionResult, nodeEngine) {
  if (!nodeEngine) return true
  const minVersion = _.get(semver.minVersion(nodeEngine), 'version')
  if (!minVersion) return true
  const versionNodeEngine = _.get(versionResult, 'engines.node')
  return versionNodeEngine && semver.satisfies(minVersion, versionNodeEngine)
}

/**
 * Returns true if the peer dependencies requirement is satisfied or not specified for a given package version.
 *
 * @param versionResult     Version object returned by pacote.packument.
 * @param peerDependencies  The list of peer dependencies.
 * @returns                 True if the peer dependencies are satisfied or not specified.
 */
function satisfiesPeerDependencies(versionResult, peerDependencies) {
  if (!peerDependencies) return true
  return Object.values(peerDependencies).every(
    peers => peers[versionResult.name] === undefined || semver.satisfies(versionResult.version, peers[versionResult.name])
  )
}

/** Returns a composite predicate that filters out deprecated, prerelease, and node engine incompatibilies from version objects returns by pacote.packument. */
function filterPredicate(options) {
  return _.overEvery([
    options.deprecated ? null : o => !o.deprecated,
    // options.pre ? null : o => !versionUtil.isPre(o.version),
    options.enginesNode ? o => satisfiesNodeEngine(o, options.enginesNode) : null,
    options.peerDependencies ? o => satisfiesPeerDependencies(o, options.peerDependencies) : null,
  ])
}

/**
 * Finds the greatest version at the given level (minor|patch).
 *
 * @param versions  Unsorted array of all available versions
 * @param current   Current version or range
 * @param level     minor|patch
 * @returns         String representation of the suggested version.
 */
function findGreatestByLevel(versions, current, level) {

  if (!semver.validRange(current)) {
    return null
  }

  const cur = semver.minVersion(current)
  const versionsSorted = [...versions] // eslint-disable-line fp/no-mutating-methods
    .sort(compareVersions)
    .filter(v => {
      const parsed = semver.parse(v)
      return (level === 'major' || parsed.major === cur.major) &&
        (level === 'major' || level === 'minor' || parsed.minor === cur.minor)
    })

  return _.last(versionsSorted)
}

/** Comparator used to sort semver versions */
function compareVersions(a, b) {
  return semver.gt(a, b) ? 1 : a === b ? 0 : -1
}

module.exports = {
  filterPredicate,
  findGreatestByLevel,
  compareVersions,
}