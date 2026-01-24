const esprima = require('espree')

const espreeOptions = {
  ecmaVersion: 11,  // 2020
}

exports.genPropNode = function (k, v) {
  return {
    type: 'Property',
    key: {
      type: 'Identifier',
      name: k
    },
    computed: false,
    value: {
      type: 'Literal',
      value: v
    },
    kind: 'init',
    method: false,
    shorthand: false
  }
}

exports.parseAst = function (val) {
  let statement = 'a = '
  if (typeof val === 'object') {
    statement += `${JSON.stringify(val)}`
  }
  else {
    statement += val
  }
  const ast = esprima.parse(statement,espreeOptions);

  return ast.body[0].expression.right
}

const forAliasRE = /([^]*?)\s+(?:in|of)\s+([^]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g

exports.parseFor = function (exp) {
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return
  const res = {}
  res.for = inMatch[2].trim()
  const alias = inMatch[1].trim().replace(stripParensRE, '')
  const iteratorMatch = alias.match(forIteratorRE)
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, '')
    res.iterator1 = iteratorMatch[1].trim()
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim()
    }
  } else {
    res.alias = alias
  }
  return res
}
