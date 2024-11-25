import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncItem, AsyncCollection } from "@aws-amplify/datastore";





type EagerEmployees = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Employees, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly role?: string | null;
  readonly email?: string | null;
  readonly Tenants?: Tenants | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly employeesTenantsId?: string | null;
}

type LazyEmployees = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Employees, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly role?: string | null;
  readonly email?: string | null;
  readonly Tenants: AsyncItem<Tenants | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly employeesTenantsId?: string | null;
}

export declare type Employees = LazyLoading extends LazyLoadingDisabled ? EagerEmployees : LazyEmployees

export declare const Employees: (new (init: ModelInit<Employees>) => Employees) & {
  copyOf(source: Employees, mutator: (draft: MutableModel<Employees>) => MutableModel<Employees> | void): Employees;
}

type EagerTransactions = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Transactions, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly order_id?: number | null;
  readonly employee_id?: number | null;
  readonly date?: string | null;
  readonly paymentMethod?: string | null;
  readonly amount?: number | null;
  readonly tip?: number | null;
  readonly Employees?: Employees | null;
  readonly Orders?: Orders | null;
  readonly Tenants?: Tenants | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly transactionsEmployeesId?: string | null;
  readonly transactionsOrdersId?: string | null;
  readonly transactionsTenantsId?: string | null;
}

type LazyTransactions = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Transactions, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly order_id?: number | null;
  readonly employee_id?: number | null;
  readonly date?: string | null;
  readonly paymentMethod?: string | null;
  readonly amount?: number | null;
  readonly tip?: number | null;
  readonly Employees: AsyncItem<Employees | undefined>;
  readonly Orders: AsyncItem<Orders | undefined>;
  readonly Tenants: AsyncItem<Tenants | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly transactionsEmployeesId?: string | null;
  readonly transactionsOrdersId?: string | null;
  readonly transactionsTenantsId?: string | null;
}

export declare type Transactions = LazyLoading extends LazyLoadingDisabled ? EagerTransactions : LazyTransactions

export declare const Transactions: (new (init: ModelInit<Transactions>) => Transactions) & {
  copyOf(source: Transactions, mutator: (draft: MutableModel<Transactions>) => MutableModel<Transactions> | void): Transactions;
}

type EagerCustomers = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Customers, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly email?: string | null;
  readonly phoneNumber?: string | null;
  readonly Tenants?: Tenants | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly customersTenantsId?: string | null;
}

type LazyCustomers = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Customers, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly email?: string | null;
  readonly phoneNumber?: string | null;
  readonly Tenants: AsyncItem<Tenants | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly customersTenantsId?: string | null;
}

export declare type Customers = LazyLoading extends LazyLoadingDisabled ? EagerCustomers : LazyCustomers

export declare const Customers: (new (init: ModelInit<Customers>) => Customers) & {
  copyOf(source: Customers, mutator: (draft: MutableModel<Customers>) => MutableModel<Customers> | void): Customers;
}

type EagerCategories = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Categories, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly name?: string | null;
  readonly Tenants?: Tenants | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly categoriesTenantsId?: string | null;
}

type LazyCategories = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Categories, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly name?: string | null;
  readonly Tenants: AsyncItem<Tenants | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly categoriesTenantsId?: string | null;
}

export declare type Categories = LazyLoading extends LazyLoadingDisabled ? EagerCategories : LazyCategories

export declare const Categories: (new (init: ModelInit<Categories>) => Categories) & {
  copyOf(source: Categories, mutator: (draft: MutableModel<Categories>) => MutableModel<Categories> | void): Categories;
}

type EagerUsers = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Users, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly username?: string | null;
  readonly password?: string | null;
  readonly email?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly role?: string | null;
  readonly tenantsID: string;
  readonly Tenants?: Tenants | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUsers = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Users, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly username?: string | null;
  readonly password?: string | null;
  readonly email?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly role?: string | null;
  readonly tenantsID: string;
  readonly Tenants: AsyncItem<Tenants | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Users = LazyLoading extends LazyLoadingDisabled ? EagerUsers : LazyUsers

export declare const Users: (new (init: ModelInit<Users>) => Users) & {
  copyOf(source: Users, mutator: (draft: MutableModel<Users>) => MutableModel<Users> | void): Users;
}

type EagerMenuItems = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<MenuItems, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly name?: string | null;
  readonly description?: string | null;
  readonly purchasePrice?: number | null;
  readonly sellingPrice?: number | null;
  readonly status?: boolean | null;
  readonly category_id?: number | null;
  readonly ordersID: string;
  readonly Categories?: Categories | null;
  readonly Tenants?: Tenants | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly menuItemsCategoriesId?: string | null;
  readonly menuItemsTenantsId?: string | null;
}

type LazyMenuItems = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<MenuItems, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly tenant_id?: number | null;
  readonly name?: string | null;
  readonly description?: string | null;
  readonly purchasePrice?: number | null;
  readonly sellingPrice?: number | null;
  readonly status?: boolean | null;
  readonly category_id?: number | null;
  readonly ordersID: string;
  readonly Categories: AsyncItem<Categories | undefined>;
  readonly Tenants: AsyncItem<Tenants | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly menuItemsCategoriesId?: string | null;
  readonly menuItemsTenantsId?: string | null;
}

export declare type MenuItems = LazyLoading extends LazyLoadingDisabled ? EagerMenuItems : LazyMenuItems

export declare const MenuItems: (new (init: ModelInit<MenuItems>) => MenuItems) & {
  copyOf(source: MenuItems, mutator: (draft: MutableModel<MenuItems>) => MutableModel<MenuItems> | void): MenuItems;
}

type EagerTenants = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Tenants, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name?: string | null;
  readonly contactEmail?: string | null;
  readonly Users?: (Users | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyTenants = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Tenants, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name?: string | null;
  readonly contactEmail?: string | null;
  readonly Users: AsyncCollection<Users>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Tenants = LazyLoading extends LazyLoadingDisabled ? EagerTenants : LazyTenants

export declare const Tenants: (new (init: ModelInit<Tenants>) => Tenants) & {
  copyOf(source: Tenants, mutator: (draft: MutableModel<Tenants>) => MutableModel<Tenants> | void): Tenants;
}

type EagerOrders = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Orders, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly customer_id?: number | null;
  readonly tenant_id?: number | null;
  readonly orderNumber?: number | null;
  readonly tableNumber?: number | null;
  readonly type?: string | null;
  readonly status?: boolean | null;
  readonly orderDate?: string | null;
  readonly Customers?: Customers | null;
  readonly MenuItems?: (MenuItems | null)[] | null;
  readonly Tenants?: Tenants | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly ordersCustomersId?: string | null;
  readonly ordersTenantsId?: string | null;
}

type LazyOrders = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Orders, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly customer_id?: number | null;
  readonly tenant_id?: number | null;
  readonly orderNumber?: number | null;
  readonly tableNumber?: number | null;
  readonly type?: string | null;
  readonly status?: boolean | null;
  readonly orderDate?: string | null;
  readonly Customers: AsyncItem<Customers | undefined>;
  readonly MenuItems: AsyncCollection<MenuItems>;
  readonly Tenants: AsyncItem<Tenants | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly ordersCustomersId?: string | null;
  readonly ordersTenantsId?: string | null;
}

export declare type Orders = LazyLoading extends LazyLoadingDisabled ? EagerOrders : LazyOrders

export declare const Orders: (new (init: ModelInit<Orders>) => Orders) & {
  copyOf(source: Orders, mutator: (draft: MutableModel<Orders>) => MutableModel<Orders> | void): Orders;
}

type EagerOrderDetails = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<OrderDetails, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly order_id: number;
  readonly menuItem_id?: number | null;
  readonly quantity?: number | null;
  readonly priceAtTimeOfOrder?: number | null;
  readonly MenuItems?: MenuItems | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly orderDetailsMenuItemsId?: string | null;
}

type LazyOrderDetails = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<OrderDetails, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly order_id: number;
  readonly menuItem_id?: number | null;
  readonly quantity?: number | null;
  readonly priceAtTimeOfOrder?: number | null;
  readonly MenuItems: AsyncItem<MenuItems | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly orderDetailsMenuItemsId?: string | null;
}

export declare type OrderDetails = LazyLoading extends LazyLoadingDisabled ? EagerOrderDetails : LazyOrderDetails

export declare const OrderDetails: (new (init: ModelInit<OrderDetails>) => OrderDetails) & {
  copyOf(source: OrderDetails, mutator: (draft: MutableModel<OrderDetails>) => MutableModel<OrderDetails> | void): OrderDetails;
}