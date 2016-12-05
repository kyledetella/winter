/**
 * TODO: This is a naieve parser that strictly expects
 * a String of the following format: "11x14"
 */
module.exports = function parseArtworkSize(size) {
  const parsedSize = size.split('x')

  return {
    width: parsedSize[0],
    height: parsedSize[1],
  }
}
