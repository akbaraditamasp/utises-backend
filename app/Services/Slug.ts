import { string } from '@ioc:Adonis/Core/Helpers'
import { ModelObject } from '@ioc:Adonis/Lucid/Orm'

function slugify(text: string): string {
  let slug = text
  slug = slug.replace(/^\s+|\s+$/g, '')
  slug = slug.toLowerCase()
  slug = slug
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return slug
}

export default async function Slug(title: string, model: ModelObject) {
  let slug = title.substring(0, 20)

  let rand = string.generateRandom(8)

  while (await model.findBy('slug', slugify(slug + ' ' + rand))) {
    rand = string.generateRandom(8)
  }

  return slugify(slug + ' ' + rand)
}
