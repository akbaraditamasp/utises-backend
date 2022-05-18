import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Category from 'App/Models/Category'

export default class CategoriesController {
  public async index({ auth }: HttpContextContract) {
    let categories = Category.query()

    await auth.use('admin').check()

    if (!auth.use('admin').isLoggedIn) {
      categories = categories.has('products')
    }

    return (await categories).map((category) => category.serialize())
  }
}
