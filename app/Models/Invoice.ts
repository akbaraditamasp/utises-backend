import { DateTime } from 'luxon'
import { BaseModel, column, computed, HasOne, hasOne } from '@ioc:Adonis/Lucid/Orm'
import InvoiceDetail from './InvoiceDetail'

export default class Invoice extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public invId: string

  @column()
  public userId: number

  @column()
  public isPaid: boolean

  @column()
  public paymentLink: string

  @computed()
  public get expired() {
    return DateTime.now().diff(this.createdAt, 'hours').toObject().hours! > 24 ? true : false
  }

  @hasOne(() => InvoiceDetail)
  public detail: HasOne<typeof InvoiceDetail>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
