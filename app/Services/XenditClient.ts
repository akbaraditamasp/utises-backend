import Xendit from 'xendit-node'
import Env from '@ioc:Adonis/Core/Env'

const XenditClient = new Xendit({
  secretKey: Env.get('XENDIT_SECRET_KEY'),
})

interface InvoiceData {
  externalID: string
  amount: number
  customerName: string
  customerEmail: string
  items: InvoiceItem[]
}

interface InvoiceItem {
  name: string
  quantity: number
  price: number
}

interface PaymentLink {
  invoice_url: string
}

export default class XenditControl {
  public static async createInvoice(data: InvoiceData) {
    const { Invoice: XenditInvoice } = XenditClient
    const xendit = new XenditInvoice({})

    const { invoice_url: paymentLink } = (await xendit.createInvoice({
      externalID: data.externalID,
      amount: data.amount,
      customer: {
        givenName: data.customerName,
        email: data.customerEmail,
      },
      customerNotificationPreference: {
        invoiceCreated: ['email'],
        invoicePaid: ['email'],
      },
      items: data.items,
    })) as PaymentLink

    return paymentLink
  }
}
