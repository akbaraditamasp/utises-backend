// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import Database from '@ioc:Adonis/Lucid/Database'
import Category from 'App/Models/Category'
import Invoice from 'App/Models/Invoice'
import InvoiceDetail from 'App/Models/InvoiceDetail'
import Product from 'App/Models/Product'
import { DateTime } from 'luxon'

interface GraphVal {
  date: string
  val: number
}

export default class DashboardController {
  public async index() {
    const today = DateTime.now()

    const productCount = await Product.all()
    const categoriesCount = await Category.query().has('products')
    const invoicesCount = await Invoice.query()
      .where('is_paid', true)
      .andWhere(
        'created_at',
        '>=',
        DateTime.fromObject({ year: today.year, month: today.month, day: today.day }).toSQL()
      )
    const income = await InvoiceDetail.query()
      .whereHas('invoice', (query) => {
        query
          .where('invoices.is_paid', true)
          .andWhere(
            'invoices.created_at',
            '>=',
            DateTime.fromObject({ year: today.year, month: today.month, day: today.day }).toSQL()
          )
      })
      .sum('price as total')

    const graphs = await Database.query()
      .select('dategroup')
      .from((subquery) => {
        subquery
          .select(
            Database.raw('DATE(invoice_details.created_at) as dategroup'),
            'invoice_details.created_at',
            'price'
          )
          .from('invoice_details')
          .leftJoin('invoices', 'invoices.id', '=', 'invoice_details.invoice_id')
          .where(
            'invoice_details.created_at',
            '>=',
            `${DateTime.now().minus({ days: 13 }).toFormat('yyyy-LL-dd')} 00:00:00`
          )
          .andWhere('invoices.is_paid', true)
          .as('invoice')
      })
      .count('dategroup as total')
      .groupBy('dategroup')
      .orderBy('dategroup')

    const days: GraphVal[] = []

    for (let i = 13; i >= 0; i--) {
      const date = DateTime.now().minus({ days: i }).toFormat('dd-LL-yyyy')
      const getFromDb = graphs.find((el) => {
        const luxonDate = DateTime.fromJSDate(el.dategroup).toFormat('dd-LL-yyyy')
        return luxonDate === date
      })
      days.push({
        date,
        val: getFromDb ? Number(getFromDb.total) : 0,
      })
    }

    return {
      products: productCount.length,
      categories: categoriesCount.length,
      invoices: invoicesCount.length,
      income: Number(income[0].$extras.total),
      graph: days,
    }
  }
}
