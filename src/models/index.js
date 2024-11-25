// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Employees, Transactions, Customers, Categories, Users, MenuItems, Tenants, Orders, OrderDetails } = initSchema(schema);

export {
  Employees,
  Transactions,
  Customers,
  Categories,
  Users,
  MenuItems,
  Tenants,
  Orders,
  OrderDetails
};