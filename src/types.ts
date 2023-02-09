/**
 * 图片像素格式
 */
export enum PixelFormat {
  RGBA8888 = 'RGBA8888',
}

/**
 * 精灵元数据
 */
export interface SpriteMeta {
  /**
   * 精灵名称
   */
  name: string

  /**
   * 裁剪后的图片位于裁剪前图片中心的偏移量
   */
  offset: [number, number]

  /**
   * 图片在合图中的起始坐标
   */
  position: [number, number]

  /**
   * 图片裁剪透明像素后的宽高[w,h]
   */
  size: [number, number]

  /**
   * 图片未裁剪透明像素前的宽高[w,h]
   */
  sourceSize: [number, number]

  /**
   * 图片是否旋转
   */
  rotated: boolean
}

/**
 * 精灵表元数据
 */
export interface SheetMeta {
  /**
   * 纹理尺寸[w,h]
   */
  size: [number, number]

  /**
   * 预乘Alpha, 固定为false
   */
  premultiplyAlpha: boolean
}

/**
 * 打包信息
 */
export interface PackageInfo {
  /**
   * 打包后的文件名, 不包含后缀
   */
  fileName: string

  /**
   * 打包后图片的后缀
   */
  textureExtension: string

  /**
   * 打包后图片的像素格式
   */
  pixelFormat: string

  /**
   * 所有精灵图的元数据
   */
  sprites: SpriteMeta[]

  /**
   * 打包后图片的元数据
   */
  sheetMeta: SheetMeta
}

export interface EncodeResult {
  /**
   * 精灵表描述文件后缀
   */
  sheetExtension: string

  /**
   * 精灵表描述文件数据
   */
  sheetBuffer: Buffer
}

export interface EncodeMultipleResult {
  /**
   * 精灵表描述文件后缀
   */
  sheetExtension: string

  /**
   * 精灵表描述文件数据
   * 数组长度可以为`1`, 表示多张精灵图打包单个描述文件
   * 或等于传入的`PackageInfo`数组长度, 表示每张精灵表对应一个单独的描述文件
   */
  sheetBuffers: Buffer[]
}

/**
 * 编码器接口
 */
export interface TexturePackerEncoder {
  encode(info: PackageInfo): EncodeResult | undefined
  encodeMultiple(infos: PackageInfo[]): EncodeMultipleResult | undefined
}

export interface MetaOverrides {
  textureExtension?: string
  pixelFormat?: string
}
