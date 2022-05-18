import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Admin from 'App/Models/Admin'

export default class AdminSeeder extends BaseSeeder {
  public async run() {
    // Write your database queries inside the run method
    if (!(await Admin.findBy('username', 'admin'))) {
      await Admin.create({
        username: 'admin',
        password: '123456',
      })
    }
  }
}
