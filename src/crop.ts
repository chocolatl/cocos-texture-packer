import Jimp from 'jimp'

export function calculateCropRect(jimp: Jimp) {
  const w = jimp.bitmap.width
  const h = jimp.bitmap.height

  let t = 0
  let b = 0
  let l = 0
  let r = 0

  const checkRowCrop = (y: number) => {
    for (let x = 0; x < w; x++) {
      const color = jimp.getPixelColor(x, y)
      if (Jimp.intToRGBA(color).a > 5) {
        return false
      }
    }
    return true
  }

  const checkColCrop = (x: number) => {
    for (let y = 0; y < h; y++) {
      const color = jimp.getPixelColor(x, y)
      if (Jimp.intToRGBA(color).a > 5) {
        return false
      }
    }
    return true
  }

  for (let y = 0; y < h; y++) {
    if (checkRowCrop(y)) t++
    else break
  }

  for (let y = h - 1; y >= 0; y--) {
    if (checkRowCrop(y)) b++
    else break
  }

  if (t + b >= h) {
    t = b = 0
  }

  for (let x = 0; x < w; x++) {
    if (checkColCrop(x)) l++
    else break
  }

  for (let x = w - 1; x >= 0; x--) {
    if (checkColCrop(x)) r++
    else break
  }

  if (l + r >= w) {
    l = r = 0
  }

  return { t, b, l, r }
}
