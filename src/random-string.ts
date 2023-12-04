export function randomString(len = 15) {
  // cspell:disable-next-line
  const CHARS = ' aaa aabcdee eeefgh iijkl mnoo oop qrst uu uuvwx yz'

  let result = ''
  for (let i = 0; i < len; i++) {
    result += CHARS.at(Math.trunc(Math.random() * CHARS.length))
  }

  console.log('result', result)

  return result
}
