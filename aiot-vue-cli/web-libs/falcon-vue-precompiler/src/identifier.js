const metaMap = {
  figure: ['img', 'gif', 'image', 'figure'],
  p: ['text', 'p'],
  div: ['container', 'div'],
  section: ['cell', 'cell-slot'],
  'recycle-list': ['recycle-list']
}

const checkMap = Object.keys(metaMap).reduce(function (pre, targetTag) {
  const tagArr = metaMap[targetTag]
  tagArr.forEach(function (fromTag) {
    pre[fromTag] = targetTag
  })
  return pre
}, {})

module.exports = function (el) {
  const targetTag = checkMap[el.tag]
  if (targetTag) {
    el._origTag = el.tag
    el.tag = targetTag
  }
  return el.tag
}
