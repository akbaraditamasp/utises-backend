import {
  BaseModel,
  beforeCreate,
  beforeDelete,
  column,
  HasMany,
  hasMany,
  ManyToMany,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import S3Control from 'App/Services/S3'
import Slug from 'App/Services/Slug'
import { DateTime } from 'luxon'
import Category from './Category'
import InvoiceDetail from './InvoiceDetail'
import ProductImage from './ProductImage'

export default class Product extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public description: string

  @column()
  public price: number

  @column()
  public slug: string

  @column()
  public file: string

  @hasMany(() => ProductImage)
  public images: HasMany<typeof ProductImage>

  @manyToMany(() => Category)
  public categories: ManyToMany<typeof Category>

  @hasMany(() => InvoiceDetail)
  public invoices: HasMany<typeof InvoiceDetail>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeCreate()
  public static async assignSlug(product: Product) {
    product.slug = await Slug(product.name, Product)
  }

  @beforeDelete()
  public static async deleteImages(product: Product) {
    const images = await ProductImage.query().where('product_id', product.id)
    for (let image of images) {
      await image.delete()
    }
  }

  @beforeDelete()
  public static async deleteStorage(product: Product) {
    await S3Control.deleteProduct(product.file)
  }

  public serializeExtras() {
    return {
      is_collection: this.$extras.is_collection,
    }
  }
}
