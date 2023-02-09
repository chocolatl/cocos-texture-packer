import plist from 'plist'
import {
  EncodeMultipleResult,
  EncodeResult,
  PackageInfo,
  TexturePackerEncoder,
} from '../types'

interface CocosSpriteMeta {
  /**
   * 别名
   */
  aliases: string[]

  /**
   * 裁剪后的图片位于裁剪前图片中心的偏移量{x,y}
   */
  spriteOffset: string

  /**
   * 图片裁剪后的宽高{w,h}
   */
  spriteSize: string

  /**
   * 图片未裁剪透明像素前的宽高{w,h}
   */
  spriteSourceSize: string

  /**
   * 图片在纹理中的位置{{x,y}{w,h}}
   */
  textureRect: string

  /**
   * 图片是否旋转
   */
  textureRotated: boolean
}

interface CocosSheetMeta {
  /**
   * cocos精灵表格式, 固定为3
   */
  format: number

  /**
   * 像素格式
   */
  pixelFormat: string

  /**
   * 预乘Alpha
   */
  premultiplyAlpha: boolean

  /**
   * 纹理尺寸{w,h}
   */
  size: string

  /**
   * 纹理文件名
   */
  textureFileName: string
}

function formatArrayToBrace(arr: any[]) {
  const t: string = arr
    .map(e => (Array.isArray(e) ? formatArrayToBrace(e) : e))
    .join(',')
  return '{' + t + '}'
}

export class CocosTexturePackerEncoder implements TexturePackerEncoder {
  private encodePlist(info: PackageInfo): string {
    const cocosSpriteMetaMap: Record<string, CocosSpriteMeta> =
      Object.fromEntries(
        info.sprites.map(sprite => {
          const cocosSpriteMeta: CocosSpriteMeta = {
            aliases: [],
            spriteOffset: formatArrayToBrace(sprite.offset),
            spriteSize: formatArrayToBrace(sprite.size),
            spriteSourceSize: formatArrayToBrace(sprite.sourceSize),
            textureRect: formatArrayToBrace([sprite.position, sprite.size]),
            textureRotated: sprite.rotated,
          }
          return [sprite.name, cocosSpriteMeta]
        }),
      )

    const cocosSheetMeta: CocosSheetMeta = {
      format: 3,
      pixelFormat: info.pixelFormat,
      premultiplyAlpha: info.sheetMeta.premultiplyAlpha,
      size: formatArrayToBrace(info.sheetMeta.size),
      textureFileName: info.fileName + info.textureExtension,
    }

    const content = plist.build({
      frames: cocosSpriteMetaMap,
      metadata: cocosSheetMeta,
    } as any)

    return content
  }

  public encode(info: PackageInfo): EncodeResult {
    const content = this.encodePlist(info)
    const buffer = Buffer.from(content, 'utf-8')

    return {
      sheetExtension: '.plist',
      sheetBuffer: buffer,
    }
  }

  public encodeMultiple(infos: PackageInfo[]): EncodeMultipleResult {
    const buffers = infos.map(info => {
      const content = this.encodePlist(info)
      return Buffer.from(content, 'utf-8')
    })

    return {
      sheetExtension: '.plist',
      sheetBuffers: buffers,
    }
  }
}
