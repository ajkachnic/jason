import moo from 'moo'

type ActualObject = Record<string | number | symbol, unknown>
type Value = string | number | true | false | null | Value[] | ActualObject

type Parser<T> = (token: moo.Token, lexer: moo.Lexer) => T
type Formatter<T> = (value: T, pretty: boolean) => string

const tokenize = (source: string): moo.Lexer => {
  const lexer = moo.compile({
    WS:      /[ \t]+/,
    NL:      { match: /\n/, lineBreaks: true },
    number:  { 
      match: /[+-]?(?:\d*\.)?\d+/, 
      error: true 
    },
    string:  {
      match: /"(?:\\["\\]|[^\n"\\])*"/, 
      value: s => s.slice(1, -1)
    },
    // Symbols
    lbrace:   '{',
    rbrace:   '}',
    lbracket: '[',
    rbracket: ']',
    comma:    ',',
    colon:    ':',

    // Keywords
    null:  'null',
    boolean: ['true', 'false']
  })

  lexer.reset(source)
  return lexer
}

const parseFromLexer = (lexer: moo.Lexer): Value => {
  const parseBoolean: Parser<boolean> = (token, lexer) => {
    return token.value === 'true'
  }
  const parseNull: Parser<null> = (token, lexer) => {
    return null
  }
  const parseNumber: Parser<number> = (token, lexer) => {
    const number = parseFloat(token.value)
    return number
  }
  const parseString: Parser<string> = (token, lexer) => {
    return token.value
  }
  const parseArray: Parser<Value[]> = (token, lexer) => {
    const values: Value[] = []
    let tok = lexer.next()
    if(!tok) return values

    while(tok.type !== 'rbracket') {
      let value = parseValue(tok, lexer)
      if(value === undefined) break
      values.push(value)
      // // The comma or rbracket
      let temp = lexer.next() as moo.Token
      if(temp?.type === 'rbracket') break
      if(temp?.type !== 'comma') {
        throw new Error(lexer.formatError(temp, `Expecting token comma, got token ${temp}`))
      }
      // The next value
      tok = lexer.next()
      if(!tok) break
    }

    return values
  }
  const parseObject: Parser<ActualObject> = (token, lexer) => {
    const values: ActualObject = {}
    let tok = lexer.next()
    if(!tok) return values

    while(tok.type !== 'rbrace') {
      if(tok.type !== 'string') {
        throw new Error(lexer.formatError(tok, `Expected token string, got token ${tok}`))
      }
      let key = parseString(tok, lexer)
      // The colon
      let colon = lexer.next() as moo.Token
      if(colon?.type !== 'colon') {
        throw new Error(lexer.formatError(colon, `Expected token colon, got token ${colon}`))
      }

      tok = lexer.next()
      if(tok === undefined) break
      let value = parseValue(tok, lexer)

      values[key] = value

      let temp = lexer.next() as moo.Token
      if(temp?.type === 'rbrace') break
      if(temp?.type !== 'comma') {
        throw new Error(lexer.formatError(temp, `Expected token comma, got token ${token}`))
      }
      // The next value
      tok = lexer.next()
      if(!tok) break
    }
    return values
  }

  const parseValue: Parser<Value | void> = (token, lexer) => {
    switch(token.type) {
      case 'NL':
      case 'WS':
        let tok = lexer.next()
        if(!tok) return
        return parseValue(tok, lexer)
      case 'boolean':
        return parseBoolean(token, lexer)
      case 'null':
        return parseNull(token, lexer)
      case 'number':
        return parseNumber(token, lexer)
      case 'string':
        return parseString(token, lexer)
      case 'lbracket':
        return parseArray(token, lexer)
      case 'lbrace':
        return parseObject(token, lexer)
      default:
        throw new Error(lexer.formatError(token, `No parser found for token ${token.type}`))
    }
  }

  const token = lexer.next()
  if(!token) return null
  return parseValue(token, lexer) || null
}

export const parse = (src: string): Value => {
  if(typeof src !== 'string') throw new TypeError('Invalid type passed to parse()')
  const lexer = tokenize(src)
  return parseFromLexer(lexer)
}

const betterTypeof = (t: unknown): string => {
  let type: string = typeof t
  if(type === 'object' && Array.isArray(t)) {
    type = 'array'
  }

  return type
}

export const format = (value: Value, pretty: boolean = false): string => {
  const formatNull: Formatter<null> = () => 'null'
  const formatBoolean: Formatter<boolean> = val => val ? 'true' : 'false'
  const formatNumber: Formatter<number> = val => val.toString()
  const formatString: Formatter<string> = val => `"${val}"`
  const formatArray: Formatter<Value[]> = (val, pretty) => {
    const separator = pretty ? ', ' : ','
    const reducer = (last: Value | undefined, current: Value) => {
      if(last === undefined) return formatValue(current, pretty)
      return last + separator + formatValue(current, pretty)
    }

    // @ts-expect-error
    return `[${val.reduce<string>(reducer, undefined)}]`
  }

  const formatObject: Formatter<ActualObject> = (val, pretty) => {
    const separator = pretty ? ',\n' : ','
    const colon = pretty ? ': ' : ':'
    const reducer = (last: Value | undefined, [key, value]: [string, Value]) => {
      const formattedKey = formatValue(key, pretty)
      const formattedValue = formatValue(value, pretty)
      if(last === undefined) return `${formattedKey}${colon}${formattedValue}`
      return `${last}${separator}${formattedKey}${colon}${formattedValue}`
    }

    const entries = Object.entries(val)

    // @ts-expect-error
    return `{${entries.reduce<string>(reducer, undefined)}}`
  }

  const formatValue: Formatter<Value> = (val, pretty) => {
    switch(betterTypeof(val)) {
      case 'null':
        return formatNull(null, pretty)
      case 'boolean':
        return formatBoolean(val as boolean, pretty)
      case 'number':
        return formatNumber(val as number, pretty)
      case 'string':
        return formatString(val as string, pretty)
      case 'array':
        return formatArray(val as Value[], pretty)
      case 'object':
        return formatObject(val as ActualObject, pretty)
    }
    return ''
  }

  return formatValue(value, pretty)
}

export const beautify = (source: string): string => {
  const parsed = parse(source)
  return format(parsed, true)
}