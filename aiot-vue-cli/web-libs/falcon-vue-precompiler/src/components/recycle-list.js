const ast = require('../util/ast')

exports.processRecycleList = function (
  el,
  attrsMap,
  attrsList,
  attrs,
  staticClass
) {
  const recycleFor = ast.parseFor(attrsMap.for)
  attrs.push({
    name: '_items',
    value: recycleFor.for
  })
  if (attrsMap['switch']) {
    attrs.push({
      name: '_switch',
      value: `"${attrsMap['switch']}"`
    })
  }
}
