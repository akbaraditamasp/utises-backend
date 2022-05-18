import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class CategoryProducts extends BaseSchema {
  protected tableName = 'category_product'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('category_id').unsigned().references('categories.id').onDelete('cascade')
      table.integer('product_id').unsigned().references('products.id').onDelete('cascade')
      table.unique(['category_id', 'product_id'])

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
