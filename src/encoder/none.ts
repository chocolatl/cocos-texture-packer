import { TexturePackerEncoder } from '../types'

export class NoneTexturePackerEncoder implements TexturePackerEncoder {
  encode() {
    return undefined
  }

  encodeMultiple() {
    return undefined
  }
}
