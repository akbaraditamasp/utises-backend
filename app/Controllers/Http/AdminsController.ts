import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { validator, schema } from '@ioc:Adonis/Core/Validator'
import Admin from 'App/Models/Admin'
import Hash from '@ioc:Adonis/Core/Hash'

export default class AdminsController {
  public async removeToken({ auth }: HttpContextContract) {
    const user = auth.use('admin').user!

    await auth.use('admin').revoke()
    return user.serialize()
  }

  public async getToken({ request, response, auth }: HttpContextContract) {
    const { username, password } = await validator.validate({
      schema: schema.create({
        username: schema.string(),
        password: schema.string(),
      }),
      data: request.all(),
    })

    const admin = await Admin.findByOrFail('username', username)

    if (!(await Hash.verify(admin.password, password))) return response.unauthorized()

    const { token } = await auth.use('admin').generate(admin)

    return {
      ...admin.serialize(),
      token,
    }
  }
}
