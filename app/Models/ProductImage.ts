import Env from '@ioc:Adonis/Core/Env'
import {
  BaseModel,
  beforeDelete,
  BelongsTo,
  belongsTo,
  column,
  computed,
} from '@ioc:Adonis/Lucid/Orm'
import S3Control from 'App/Services/S3'
import { DateTime } from 'luxon'
import Product from './Product'

export default class ProductImage extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public file: string

  @column()
  public productId: number

  @computed()
  public get url() {
    return `${Env.get('S3_ENDPOINT')}/${Env.get('S3_BUCKET', 'utises')}/product-images/${this.file}`
  }

  @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeDelete()
  public static async deleteStorage(productImage: ProductImage) {
    await S3Control.deleteProductImage(productImage.file)
  }
}
