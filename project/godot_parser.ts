import fs from "fs"
import util from "util"

/**
 * Basic Godot configuration file parser.
 */
export type Dict = { [key: string]: Data }
export type Data = number | string | boolean | null | undefined | Data[] | Dict
// type Data = InnerData | { [key: string]: InnerData }

export const parseGodotConfigFile = (path: string, initial: Dict = {}) => {
  const file = fs.readFileSync(path, "utf-8")

  let index = 0
  const getchar = (expected?: string) => {
    let x: string

    x = file[index++]
    while (x.trim() === "") x = file[index++]

    if (expected) {
      if (expected !== x) {
        throw new Error(
          `Expected ${expected} but got ${x} at ${getLineAndCol()}`
        )
      }
    }

    return x
  }

  const getLineAndCol = () => {
    let line = 1
    let col = 0

    for (let i = 0; i < index; i++) {
      if (file[i] === "\n") {
        line++
        col = 0
      } else {
        col++
      }
    }

    return `line ${line}, col ${col}`
  }

  const getCharIncludingWhitespace = (expected?: string) => {
    let x = file[index++]

    if (expected) {
      if (expected !== x) {
        throw new Error(`Expected ${expected} but got ${x}`)
      }
    }

    return x
  }

  const peekchar = () => {
    let nextNonemptyIndex = index

    while (
      nextNonemptyIndex < file.length &&
      file[nextNonemptyIndex].trim() === ""
    ) {
      ++nextNonemptyIndex
    }

    return file[nextNonemptyIndex]
  }

  const peekcharIncludingWhitespace = () => {
    return file[index]
  }

  const eof = () => {
    let nextNonemptyIndex = index

    while (
      nextNonemptyIndex < file.length &&
      file[nextNonemptyIndex].trim() === ""
    ) {
      ++nextNonemptyIndex

      if (nextNonemptyIndex >= file.length) return true
    }

    return nextNonemptyIndex >= file.length
  }

  const getComment = () => {
    let comment = ""

    while (peekcharIncludingWhitespace() !== "\n") {
      comment += getCharIncludingWhitespace()
    }

    getCharIncludingWhitespace("\n")

    return comment
  }

  const getSection = () => {
    getchar("[")

    let result: Dict & { identifier: string } = {
      identifier: getIdentifier(),
    }

    while (peekchar() !== "]") {
      const key = getIdentifier()

      if (peekchar() !== "=") {
        throw new Error(
          `Unexpected token '${peekchar()}' in section after ${key} at ${getLineAndCol()}\nIn ${path}`
        )
      }

      getchar("=")
      const value = getValue()

      result[key] = value
    }

    getchar("]")

    return result
  }

  const getVariableName = () => {
    let variableName = ""

    while (peekchar() !== "=") {
      variableName += getchar()
    }

    return variableName
  }

  const getArray = (): Data[] => {
    let result: Data[] = []

    getchar("[")

    while (peekchar() !== "]") {
      result.push(getValue())

      if (peekchar() === ",") {
        getchar()
      }
    }

    getchar("]")

    return result
  }

  const getJson = () => {
    let result: Dict = {}

    getchar("{")

    while (peekchar() !== "}") {
      const key = getString()
      getchar(":")
      const value = getValue()

      result[key] = value

      if (peekchar() === ",") {
        getchar(",")
      }
    }

    getchar("}")

    return result
  }

  const getNumber = () => {
    let result = getchar()

    while (/[-e0-9.]/.exec(peekcharIncludingWhitespace())) {
      result += getchar()
    }

    return Number(result)
  }

  const getString = () => {
    getchar('"')

    let result = ""

    while (peekcharIncludingWhitespace() !== '"') {
      const char = getCharIncludingWhitespace()
      if (char === "\\") {
        result += getCharIncludingWhitespace()
      } else {
        result += char
      }
      result += char
    }

    getchar('"')

    return result
  }

  const getIdentifier = () => {
    let result = getchar() // note - implicitly advances past any initial whitespace

    while (/[a-zA-Z0-9_]/.exec(peekcharIncludingWhitespace())) {
      result += getchar()
    }

    if (result.trim() === "") {
      throw new Error("Expected identifier!")
    }

    return result
  }

  const getObject = (identifier: string) => {
    let result: {
      args: Data[]
      identifier: string
    } = {
      args: [],
      identifier,
    }

    const start = getLineAndCol()

    getchar("(")

    while (peekchar() !== ")") {
      const key = getValue()

      if (peekchar() === "," || peekchar() === ")") {
        // This is a single value
        result.args.push(key)
      } else if (peekchar() === ":") {
        // This is a key-value pair
        getchar(":")
        const value = getValue()

        result.args.push([key, value])
      } else {
        throw new Error(
          `Unexpected token '${peekchar()}' in object constructor after ${key} from ${start} to ${getLineAndCol()}
  In file ${path}`
        )
      }

      if (peekchar() === ",") {
        getchar(",")
      }
    }

    getchar(")")

    return result
  }

  const getValue = () => {
    if (peekchar() === "[") {
      return getArray()
    } else if (peekchar() === "{") {
      return getJson()
    } else if (peekchar() === '"') {
      return getString()
    } else if (/[-0-9.]/.exec(peekchar())) {
      return getNumber()
    } else {
      const identifier = getIdentifier()

      if (peekchar() === "(") {
        return getObject(identifier)
      } else {
        return identifier
      }
    }
  }

  let currentSection = { identifier: "globals" }
  const result: Dict = {
    globals: currentSection,
    ...initial,
  }

  try {
    while (!eof()) {
      const peek = peekchar()

      if (peek === ";") {
        getComment()
      } else if (peek === "[") {
        currentSection = getSection()
        const id = currentSection.identifier

        if (result[id]) {
          if (!Array.isArray(result[id])) {
            result[id] = [result[id], { $section: currentSection }]
          } else {
            result[id].push({ $section: currentSection })
          }
        } else {
          result[id] = { $section: currentSection }
        }
      } else if (peek.trim() !== "") {
        const variableName = getVariableName()

        getchar("=")

        let variableValue = getValue()
        const id = currentSection.identifier
        if (Array.isArray(result[id])) {
          // Last is always dict
          let last = result[id][result[id].length - 1] as Dict
          last[variableName] = variableValue
        } else {
          // or dict
          let dict = result[id] as Dict
          dict[variableName] = variableValue
        }
      }
    }
  } catch (e) {
    console.error(`Failed to parse godot config file ${path}. This is a bug.`)
    console.info(util.inspect(result, false, 10, true))

    throw e
  }

  return result
}
