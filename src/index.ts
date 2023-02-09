import fs from 'fs'
import path from 'path'
import {
  MaxRectsPacker,
  Rectangle,
  IOption as IMaxRectsOption,
} from 'maxrects-packer'
import Jimp from 'jimp'
import {
  MetaOverrides,
  PackageInfo,
  PixelFormat,
  SheetMeta,
  SpriteMeta,
  TexturePackerEncoder,
} from './types'
import { calculateCropRect } from './crop'

interface PackerOptions extends IMaxRectsOption {
  maxWidth?: number
  maxHeight?: number
  padding?: number
}

interface PackageData {
  sheetMeta: SheetMeta
  spriteNames: string[]
  textureJimp: Jimp
}

const defaultOptions: PackerOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  padding: 2,
  smart: true,
  pot: true,
  square: false,
  allowRotation: true,
  tag: false,
  border: 5,
}

export class TexturePacker {
  private inputMap: Map<string, string | Buffer> = new Map()
  private jimpMap: Map<string, Jimp> = new Map()
  private spriteMetaMap: Map<string, SpriteMeta> = new Map()
  private texturePackages: PackageData[] = []
  private currentPacker: MaxRectsPacker | undefined

  public add(name: string, path: string): void
  public add(name: string, buffer: Buffer): void
  public add(...params: [string, string | Buffer]): void {
    if (this.inputMap.has(params[0])) {
      throw new Error('Duplicated sprite name: ' + params[0])
    }
    this.inputMap.set(params[0], params[1])
  }

  public async generate(options: PackerOptions = {}) {
    const {
      maxWidth: width,
      maxHeight: height,
      padding,
      ...maxRectsOptions
    } = {
      ...defaultOptions,
      ...options,
    }

    const uninitializedKeys = [...this.inputMap.keys()].filter(
      name => !this.jimpMap.has(name),
    )

    const uninitializedJimps: [string, Promise<Jimp>][] = uninitializedKeys.map(
      name => {
        const item = this.inputMap.get(name)
        if (typeof item === 'string') {
          return [name, Jimp.read(item)]
        } else if (item instanceof Buffer) {
          return [name, Jimp.read(item)]
        } else {
          throw new Error()
        }
      },
    )

    await Promise.all(uninitializedJimps.map(e => e[1]))

    for (const [n, p] of uninitializedJimps) {
      this.jimpMap.set(n, await p)
    }

    // 裁剪图片
    for (const name of uninitializedKeys) {
      const jimp = this.jimpMap.get(name)!

      const sourceW = jimp.bitmap.width
      const sourceH = jimp.bitmap.height

      let { t, b, l, r } = calculateCropRect(jimp)

      let w = sourceW - l - r
      let h = sourceH - t - b

      // 避免原始宽度和裁剪后宽度一个为奇数一个为偶数的情况
      // 否则裁剪后图片位于原始图片中心就会出现0.5px
      if (w % 2 !== sourceW % 2) {
        l > 0 ? l-- : r--
        w++
      }

      if (h % 2 !== sourceH % 2) {
        t > 0 ? t-- : b--
        h++
      }

      // 计算裁剪后图片位于原始图片中心的偏移
      const offsetX = (l - r) / 2
      const offsetY = (b - t) / 2

      jimp.crop(l, t, w, h)

      this.spriteMetaMap.set(name, {
        name: name,
        offset: [offsetX, offsetY],
        size: [w, h],
        sourceSize: [sourceW, sourceH],

        // 以下字段打包后填充
        position: [0, 0],
        rotated: false,
      })
    }

    this.currentPacker = new MaxRectsPacker(
      width,
      height,
      padding,
      maxRectsOptions,
    )

    const rects = [...this.jimpMap.entries()].map(([name, jimp]) => {
      const rect = new Rectangle()
      rect.width = jimp.bitmap.width
      rect.height = jimp.bitmap.height
      rect.data = name
      return rect
    })

    this.currentPacker.addArray(rects)

    this.texturePackages = []
    this.currentPacker.bins.forEach((bin, i) => {
      const textureJimp = new Jimp(bin.width, bin.height)

      const packageData: PackageData = {
        sheetMeta: {
          premultiplyAlpha: false,
          size: [bin.width, bin.height],
        },
        spriteNames: [],
        textureJimp: textureJimp,
      }

      bin.rects.forEach(spriteRect => {
        const name: string = spriteRect.data

        let spriteJimp = this.jimpMap.get(name)!

        if (spriteRect.rot) {
          spriteJimp = spriteJimp.clone().rotate(-90)
        }

        textureJimp.composite(spriteJimp, spriteRect.x, spriteRect.y)

        const spriteMeta = this.spriteMetaMap.get(name)!
        spriteMeta.position = [spriteRect.x, spriteRect.y]
        spriteMeta.rotated = spriteRect.rot

        packageData.spriteNames.push(name)
      })

      this.texturePackages.push(packageData)
    })
  }

  get spriteSheetCount() {
    return this.currentPacker?.bins.length ?? 0
  }

  public async write(
    encoder: TexturePackerEncoder,
    outputPath: string,
    fileName: string,
    overrides: MetaOverrides = {},
  ) {
    const defaultTextureExtension = '.png'
    const defaultPixelFormat = PixelFormat.RGBA8888

    const { sheetMeta, spriteNames, textureJimp } = this.texturePackages[0]

    const packageInfo: PackageInfo = {
      fileName: fileName,
      textureExtension: overrides.textureExtension ?? defaultTextureExtension,
      pixelFormat: overrides.pixelFormat ?? defaultPixelFormat,
      sprites: spriteNames.map<SpriteMeta>(
        name => this.spriteMetaMap.get(name)!,
      ),
      sheetMeta: sheetMeta,
    }

    const outputResult: string[] = []
    const encodeResult = encoder.encode(packageInfo)

    if (encodeResult != null) {
      const { sheetExtension, sheetBuffer } = encodeResult
      const dataFileName = fileName + sheetExtension
      const dataFullPath = path.join(outputPath, dataFileName)
      await fs.promises.writeFile(dataFullPath, sheetBuffer)
      outputResult.push(dataFullPath)
    }

    const textureFileName = fileName + defaultTextureExtension
    const textureFullPath = path.join(outputPath, textureFileName)
    await textureJimp.writeAsync(textureFullPath)
    outputResult.push(textureFullPath)

    return outputResult
  }

  public async writeMultiple(
    encoder: TexturePackerEncoder,
    outputPath: string,
    fileName: string,
    fileNameFormat: (baseName: string, index: number) => string,
    overrides: MetaOverrides = {},
  ) {
    const defaultTextureExtension = '.png'
    const defaultPixelFormat = PixelFormat.RGBA8888

    const packageInfos: PackageInfo[] = this.texturePackages.map(
      (texturePackage, i) => {
        const { sheetMeta, spriteNames } = texturePackage
        return {
          fileName: fileNameFormat(fileName, i),
          textureExtension:
            overrides.textureExtension ?? defaultTextureExtension,
          pixelFormat: overrides.pixelFormat ?? defaultPixelFormat,
          sprites: spriteNames.map<SpriteMeta>(
            name => this.spriteMetaMap.get(name)!,
          ),
          sheetMeta: sheetMeta,
        }
      },
    )

    const promises: Promise<any>[] = []
    const outputResult: string[] = []
    const encodeResult = encoder.encodeMultiple(packageInfos)

    if (encodeResult != null) {
      const { sheetExtension, sheetBuffers } = encodeResult
      if (sheetBuffers.length === this.texturePackages.length) {
        encodeResult.sheetBuffers.forEach((buffer, i) => {
          const dataFileName = fileNameFormat(fileName, i) + sheetExtension
          const dataFullPath = path.join(outputPath, dataFileName)
          const promise = fs.promises.writeFile(dataFullPath, buffer)
          promises.push(promise)
          outputResult.push(dataFullPath)
        })
      } else if (sheetBuffers.length === 1) {
        const buffer = sheetBuffers[0]
        const dataFileName = fileName + sheetExtension
        const dataFullPath = path.join(outputPath, dataFileName)
        const promise = fs.promises.writeFile(dataFullPath, buffer)
        promises.push(promise)
        outputResult.push(dataFullPath)
      }
    }

    this.texturePackages.forEach((texturePackage, i) => {
      const textureFileName =
        fileNameFormat(fileName, i) + defaultTextureExtension
      const textureFullPath = path.join(outputPath, textureFileName)
      const promise = texturePackage.textureJimp.writeAsync(textureFullPath)
      promises.push(promise)
      outputResult.push(textureFullPath)
    })

    await Promise.all(promises)

    return outputResult
  }
}
