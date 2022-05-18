/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('/download/:id', 'ProductsController.download')
  Route.get('/slug/:slug', 'ProductsController.find')
  Route.put('/:id', 'ProductsController.update').middleware('auth:admin')
  Route.delete('/:id', 'ProductsController.delete').middleware('auth:admin')
  Route.get('/:id', 'ProductsController.find')
  Route.post('/', 'ProductsController.create').middleware('auth:admin')
  Route.get('/', 'ProductsController.index')
}).prefix('/product')

Route.get('/category', 'CategoriesController.index')

Route.group(() => {
  Route.get('/get-token', 'AdminsController.getToken')
  Route.delete('/remove-token', 'AdminsController.removeToken').middleware('auth:admin')
}).prefix('/admin')

Route.group(() => {
  Route.delete('/remove-token', 'UsersController.removeToken').middleware('auth:api')
  Route.get('/get-token', 'UsersController.getToken')
  Route.post('/', 'UsersController.create')
}).prefix('/user')

Route.group(() => {
  Route.get('/inv/:invId', 'InvoicesController.find').middleware('auth:api')
  Route.post('/callback', 'InvoicesController.callback')
  Route.post('/:id', 'InvoicesController.create').middleware('auth:api')
  Route.get('/', 'InvoicesController.index').middleware('auth:api,admin')
}).prefix('/invoice')

Route.get('/stats', 'DashboardController.index').middleware('auth:admin')
