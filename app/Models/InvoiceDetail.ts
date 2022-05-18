import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import Invoice from './Invoice'
import Product from './Product'

export default class InvoiceDetail extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public invoiceId: number

  @column()
  public productId: number

  @column()
  public name: string

  @column()
  public price: number

  @belongsTo(() => Invoice)
  public invoice: BelongsTo<typeof Invoice>

  @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
