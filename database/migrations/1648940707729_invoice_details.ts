import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class InvoiceDetails extends BaseSchema {
  protected tableName = 'invoice_details'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('invoice_id').unsigned().references('invoices.id').onDelete('cascade')
      table
        .integer('product_id')
        .unsigned()
        .nullable()
        .references('products.id')
        .onDelete('set null')
      table.string('name')
      table.integer('price')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
