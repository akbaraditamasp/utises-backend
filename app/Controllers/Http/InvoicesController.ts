import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Invoice from 'App/Models/Invoice'
import InvoiceDetail from 'App/Models/InvoiceDetail'
import Product from 'App/Models/Product'
import { DateTime } from 'luxon'
import { validator, schema, rules } from '@ioc:Adonis/Core/Validator'
import Env from '@ioc:Adonis/Core/Env'
import XenditControl from 'App/Services/XenditClient'

export default class InvoicesController {
  private _generateUnique(): string {
    let text = ''
    const possible = 'ABCDEFGH0123456789'

    for (var i = 0; i < 7; i++) text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
  }

  private async _createInvId() {
    let inv = this._generateUnique()

    while (await Invoice.findBy('inv_id', DateTime.now().toFormat('yy-LL-dd') + '-' + inv)) {
      inv = this._generateUnique()
    }

    return DateTime.now().toFormat('yy-LL-dd') + '-' + inv
  }

  public async create({ auth, params }: HttpContextContract) {
    const product = await Product.findOrFail(params.id)

    const result = await Database.transaction(async (t) => {
      const invId = await this._createInvId()

      const paymentLink = await XenditControl.createInvoice({
        externalID: invId,
        amount: product.price,
        customerName: auth.use('api').user!.fullname.split(' ')[0],
        customerEmail: auth.use('api').user!.email,
        items: [
          {
            name: product.name.substring(0, 250),
            quantity: 1,
            price: product.price,
          },
        ],
      })

      const invoice = new Invoice()
      invoice.isPaid = false
      invoice.userId = auth.use('api').user!.id
      invoice.paymentLink = paymentLink
      invoice.invId = invId

      await invoice.useTransaction(t).save()

      const detail = new InvoiceDetail()
      detail.invoiceId = invoice.id
      detail.productId = product.id
      detail.name = product.name
      detail.price = product.price

      await detail.useTransaction(t).save()

      return {
        ...invoice.serialize(),
        detail: detail.serialize(),
      }
    })

    return result
  }

  public async find({ params, auth }: HttpContextContract) {
    let invoiceQuery = auth.use('api').user!.related('invoices').query()

    if (params.invId) {
      invoiceQuery = invoiceQuery.where('inv_id', params.invId)
    } else {
      invoiceQuery = invoiceQuery.where('id', params.id)
    }

    const invoice = await invoiceQuery
      .preload('detail', (query) => {
        query.preload('product')
      })
      .firstOrFail()

    return {
      ...invoice.serialize(),
    }
  }

  public async index({ request, auth, response }: HttpContextContract) {
    const { limit, page } = await validator.validate({
      schema: schema.create({
        limit: schema.number.optional([rules.range(0, 20)]),
        page: schema.number.optional(),
      }),
      data: request.all(),
    })

    let totalPageQuery = Invoice.query().count('* as total')

    if (!auth.use('admin').isLoggedIn) {
      totalPageQuery = totalPageQuery.where('user_id', auth.use('api').user!.id)
    }

    const totalPage = Math.ceil(Number((await totalPageQuery)[0].$extras.total) / (limit || 10))

    if ((page || 1) > totalPage) return response.notFound()

    let invoices = Invoice.query()
      .preload('detail')
      .limit(limit || 10)
      .offset(((page || 1) - 1) * (limit || 10))
      .orderBy('created_at', 'desc')

    if (!auth.use('admin').isLoggedIn) {
      invoices = invoices.where('user_id', auth.use('api').user!.id)
    }

    return {
      total: totalPage,
      data: (await invoices).map((invoice) => invoice.serialize()),
    }
  }

  public async callback({ request, response }: HttpContextContract) {
    if (request.header('x-callback-token') !== Env.get('XENDIT_CALLBACK_TOKEN'))
      return response.unauthorized()

    const { external_id: invId, status } = await request.validate({
      schema: schema.create({
        external_id: schema.string(),
        status: schema.string(),
      }),
    })

    const invoice = await Invoice.findByOrFail('inv_id', invId)
    if (status === 'PAID') {
      invoice.isPaid = true
      await invoice.save()
    }

    return invoice.serialize()
  }
}
