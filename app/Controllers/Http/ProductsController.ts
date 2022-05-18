import { cuid } from '@ioc:Adonis/Core/Helpers'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema, validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Category from 'App/Models/Category'
import Product from 'App/Models/Product'
import ProductImage from 'App/Models/ProductImage'
import S3Control from 'App/Services/S3'

export default class ProductsController {
  public async index({ request, response, auth }: HttpContextContract) {
    const {
      limit,
      page,
      category_slug: categorySlug,
      search,
      collection,
    } = await validator.validate({
      schema: schema.create({
        limit: schema.number.optional([rules.range(0, 20)]),
        page: schema.number.optional(),
        category_slug: schema.string.optional(),
        search: schema.string.optional(),
        collection: schema.boolean.optional(),
      }),
      data: request.all(),
    })

    let category: Category | null = null

    if (categorySlug) {
      category = await Category.findByOrFail('slug', categorySlug)
    }

    let totalQuery = Product.query().count('* as total')

    if (categorySlug)
      totalQuery = totalQuery.andWhereHas('categories', (query) => {
        query.where('category_product.category_id', category!.id)
      })

    if (collection) {
      if (await auth.use('api').authenticate()) {
        totalQuery = totalQuery.andWhereHas('invoices', (query) => {
          query.whereHas('invoice', (query) => {
            query
              .where('invoices.user_id', auth.use('api').user!.id)
              .andWhere('invoices.is_paid', true)
          })
        })
      }
    }

    if (search) totalQuery = totalQuery.andWhere('name', 'iLIKE', `%${search}%`)

    const totalPage = Math.ceil(Number((await totalQuery)[0].$extras.total) / (limit || 10))

    if ((page || 1) > totalPage && !search && !collection) return response.notFound()

    let products = Product.query()
      .preload('images', (query) => {
        query.select('file', 'id').groupLimit(1)
      })
      .orderBy('products.created_at', 'desc')
      .limit(limit || 10)
      .select('products.*')
      .offset(((page || 1) - 1) * (limit || 10))

    if (categorySlug)
      products = products.whereHas('categories', (query) => {
        query.where('category_product.category_id', category!.id)
      })

    if (search) products = products.where('name', 'iLIKE', `%${search}%`)

    if (collection && (await auth.use('api').authenticate()))
      products = products.andWhereHas('invoices', (query) => {
        query.whereHas('invoice', (query) => {
          query
            .where('invoices.user_id', auth.use('api').user!.id)
            .andWhere('invoices.is_paid', true)
        })
      })

    const result = {
      total: totalPage,
      data: (await products).map((product) => ({
        ...product.serialize(),
        description: product.description.substring(0, 150),
      })),
    } as any

    if (categorySlug) result.category = category!.serialize()

    return result
  }

  public async create({ request }: HttpContextContract) {
    const {
      name,
      description,
      price,
      file,
      images,
      categories,
      create_categories: createCategories,
    } = await request.validate({
      schema: schema.create({
        name: schema.string({}, [rules.minLength(30)]),
        description: schema.string({}, [rules.minLength(120)]),
        price: schema.number(),
        file: schema.file({
          size: '100mb',
        }),
        images: schema.array.optional().members(
          schema.file({
            size: '3mb',
            extnames: ['jpg', 'png'],
          })
        ),
        categories: schema.array.optional().members(schema.number()),
        create_categories: schema.array.optional().members(schema.string()),
      }),
    })

    const result = await Database.transaction(async (t) => {
      //setup filename
      const filename = `${cuid()}.${file.extname}`
      const imagesFile = (images || []).map((image) => ({
        name: `${cuid()}.${image.extname}`,
        file: image,
      }))

      //setup category
      const attachedCategory: number[] = categories?.length
        ? (await Category.query().whereIn('id', categories)).map((category) => category.id)
        : []

      const product = new Product()
      product.name = name
      product.price = price
      product.description = description
      product.file = filename

      await product.useTransaction(t).save()
      if (images?.length) {
        await product
          .useTransaction(t)
          .related('images')
          .createMany(
            imagesFile.map((image) => ({
              file: image.name,
            }))
          )
      }

      if (attachedCategory.length)
        await product.useTransaction(t).related('categories').attach(attachedCategory)

      if (createCategories?.length)
        await product
          .useTransaction(t)
          .related('categories')
          .createMany(
            createCategories?.map((category) => ({
              name: category,
            }))
          )

      await S3Control.uploadProduct(filename, file.tmpPath!)

      for (let image of imagesFile) {
        await S3Control.uploadProductImage(image.name, image.file.tmpPath!)
      }

      return {
        ...product.serialize(),
        images: (await product.related('images').query()).map((image) => image.serialize()),
      }
    })

    return result
  }

  public async find({ params, auth }: HttpContextContract) {
    let productQuery = Product.query().preload('images').preload('categories')

    if (params.id) {
      productQuery = productQuery.where('id', params.id)
    } else {
      productQuery = productQuery.where('slug', params.slug)
    }

    if (await auth.use('api').check()) {
      productQuery = productQuery.select(
        'products.*',
        Database.from('invoice_details')
          .select(
            Database.raw('CASE WHEN invoices.id IS NULL THEN false ELSE true END AS is_collection')
          )
          .leftJoin('invoices', (query) => {
            query.on('invoices.id', 'invoice_details.invoice_id')
          })
          .whereColumn('invoice_details.product_id', 'products.id')
          .andWhere('invoices.user_id', auth.use('api').user!.id)
          .andWhere('invoices.is_paid', true)
          .as('is_collection')
      )
    }

    const product = await productQuery.firstOrFail()

    return { ...product.serialize() }
  }

  public async delete({ params }: HttpContextContract) {
    const product = await Product.findOrFail(params.id)
    await product.delete()

    return product.serialize()
  }

  public async update({ request, params }: HttpContextContract) {
    const product = await Product.query()
      .where('id', params.id)
      .preload('images', (query) => {
        query.select('id', 'file')
      })
      .firstOrFail()

    const {
      name,
      description,
      price,
      file,
      images,
      categories,
      create_categories: createCategories,
      uploaded_images: uploadedImages,
    } = await request.validate({
      schema: schema.create({
        name: schema.string({}, [rules.minLength(30)]),
        description: schema.string({}, [rules.minLength(120)]),
        price: schema.number(),
        file: schema.file.optional({
          size: '100mb',
        }),
        uploaded_images: schema.array.optional().members(
          schema.file({
            size: '3mb',
            extnames: ['jpg', 'png'],
          })
        ),
        categories: schema.array.optional().members(schema.number()),
        images: schema.array.optional().members(schema.number()),
        create_categories: schema.array.optional().members(schema.string()),
      }),
    })

    const result = await Database.transaction(async (t) => {
      //setup filename
      const mustDelete = product.file
      const filename = `${cuid()}.${file?.extname}`
      const imagesFile = (uploadedImages || []).map((image) => ({
        name: `${cuid()}.${image.extname}`,
        file: image,
      }))

      //setup image
      const deletedImages: ProductImage[] = []
      for (let image of product.images) {
        if (!images?.find((el) => el === image.id)) {
          deletedImages.push(image)
        }
      }

      //setup category
      const attachedCategory: number[] = categories?.length
        ? (await Category.query().whereIn('id', categories)).map((category) => category.id)
        : []

      product.name = name
      product.price = price
      product.description = description
      if (file) product.file = filename

      await product.useTransaction(t).save()
      if (uploadedImages?.length) {
        await product
          .useTransaction(t)
          .related('images')
          .createMany(
            imagesFile.map((image) => ({
              file: image.name,
            }))
          )
      }

      for (let deletedImage of deletedImages) {
        await deletedImage.delete()
      }

      if (attachedCategory.length)
        await product.useTransaction(t).related('categories').sync(attachedCategory)

      if (createCategories?.length)
        await product
          .useTransaction(t)
          .related('categories')
          .createMany(
            createCategories?.map((category) => ({
              name: category,
            }))
          )

      if (file) {
        await S3Control.deleteProduct(mustDelete)
        await S3Control.uploadProduct(filename, file.tmpPath!)
      }

      for (let image of imagesFile) {
        await S3Control.uploadProductImage(image.name, image.file.tmpPath!)
      }

      return {
        ...product.serialize(),
        images: (await product.related('images').query()).map((image) => image.serialize()),
      }
    })

    return result
  }

  public async download({ params, auth }: HttpContextContract) {
    const product = await Product.query()
      .where('id', params.id)
      .andWhereHas('invoices', (query) => {
        query.whereHas('invoice', (query) => {
          query
            .where('invoices.user_id', auth.use('api').user!.id)
            .andWhere('invoices.is_paid', true)
        })
      })
      .firstOrFail()

    return {
      download_url: await S3Control.getDownloadUrl(product.file),
    }
  }
}
