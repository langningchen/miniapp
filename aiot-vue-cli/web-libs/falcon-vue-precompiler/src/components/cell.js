const ast = require('../util/ast')

exports.processCell = function (
  el,
  attrsMap,
  attrsList,
  attrs,
  staticClass
) {
  const finalClass = staticClass + ' weex-ct weex-cell'
  el.staticClass = `"${finalClass}"`
  attrs.push({
    name: `weex-type`,
    value: '"cell"'
  })
  el.plain = false
  if (el._origTag === 'cell-slot') {
    const recycleFor = ast.parseFor(el.parent.attrsMap.for)
    const slotScope =
      `{ item: ${recycleFor.alias}, index: ${recycleFor.iterator1} }`
    el.slotScope = slotScope
    attrsMap['slot-scope'] = slotScope
    el.slotTarget = `"${attrsMap.case || 'default' }"`

    const currentParent = el.parent
    currentParent.plain = false
    const name = el.slotTarget
    ;(currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = el
    currentParent.children = []
  }
}
