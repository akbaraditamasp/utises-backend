import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { validator, schema, rules } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import Hash from '@ioc:Adonis/Core/Hash'

export default class UsersController {
  public async getToken({ response, request, auth }: HttpContextContract) {
    const { email, password } = await validator.validate({
      schema: schema.create({
        email: schema.string(),
        password: schema.string(),
      }),
      data: request.all(),
    })

    const user = await User.findByOrFail('email', email.toLowerCase())

    if (!(await Hash.verify(user.password, password))) return response.unauthorized()

    const { token } = await auth.use('api').generate(user)

    return {
      ...user.serialize(),
      token,
    }
  }

  public async create({ request, auth }: HttpContextContract) {
    const { email, fullname, password } = await request.validate({
      schema: schema.create({
        email: schema.string({}, [
          rules.email(),
          rules.unique({
            table: 'users',
            column: 'email',
            caseInsensitive: true,
          }),
        ]),
        fullname: schema.string(),
        password: schema.string(),
      }),
    })

    const user = new User()
    user.email = email.toLowerCase()
    user.fullname = fullname
    user.password = password

    await user.save()

    const { token } = await auth.use('api').generate(user)

    return {
      ...user.serialize(),
      token,
    }
  }

  public async removeToken({ auth }: HttpContextContract) {
    const user = auth.use('api').user!

    await auth.use('api').revoke()

    return user.serialize()
  }
}
