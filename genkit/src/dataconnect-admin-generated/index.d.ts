import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface CreateCustomerData {
  customer_insert: Customer_Key;
}

export interface CreateCustomerVariables {
  name: string;
  gst: string;
  state: string;
}

export interface CreateInvoiceData {
  invoice_insert: Invoice_Key;
}

export interface CreateInvoiceVariables {
  total: number;
  cust: Customer_Key;
}

export interface CreatePaymentData {
  payment_insert: Payment_Key;
}

export interface CreatePaymentVariables {
  amt: number;
  inv: Invoice_Key;
}

export interface CreateProductData {
  product_insert: Product_Key;
}

export interface CreateProductVariables {
  name: string;
  sku: string;
  price: number;
  gstRate: number;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface Customer_Key {
  id: UUIDString;
  __typename?: 'Customer_Key';
}

export interface DeleteCustomerData {
  customer_delete?: Customer_Key | null;
}

export interface DeleteCustomerVariables {
  id: UUIDString;
}

export interface DeleteInvoiceData {
  invoice_delete?: Invoice_Key | null;
}

export interface DeleteInvoiceVariables {
  id: UUIDString;
}

export interface DeleteProductData {
  product_delete?: Product_Key | null;
}

export interface DeleteProductVariables {
  id: UUIDString;
}

export interface GetMyCustomersData {
  customers: ({
    id: UUIDString;
    name: string;
    email?: string | null;
  } & Customer_Key)[];
}

export interface GetProductData {
  product?: {
    name: string;
    price: number;
    stockQuantity: number;
  };
}

export interface GetProductVariables {
  id: UUIDString;
}

export interface InvoiceItem_Key {
  id: UUIDString;
  __typename?: 'InvoiceItem_Key';
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: 'Invoice_Key';
}

export interface ListInvoicesData {
  invoices: ({
    id: UUIDString;
    issueDate: DateString;
    totalAmount: number;
    status: string;
  } & Invoice_Key)[];
}

export interface ListPaymentsForInvoiceData {
  payments: ({
    amount: number;
    paymentDate: TimestampString;
    paymentMethod: string;
  })[];
}

export interface ListPaymentsForInvoiceVariables {
  invId: UUIDString;
}

export interface Payment_Key {
  id: UUIDString;
  __typename?: 'Payment_Key';
}

export interface Product_Key {
  id: UUIDString;
  __typename?: 'Product_Key';
}

export interface UpdateCustomerData {
  customer_update?: Customer_Key | null;
}

export interface UpdateCustomerVariables {
  id: UUIDString;
  name: string;
}

export interface UpdateInvoiceStatusData {
  invoice_update?: Invoice_Key | null;
}

export interface UpdateInvoiceStatusVariables {
  id: UUIDString;
  status: string;
}

export interface UpdateProductData {
  product_update?: Product_Key | null;
}

export interface UpdateProductVariables {
  id: UUIDString;
  price: number;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function createUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;
/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function createUser(options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;

/** Generated Node Admin SDK operation action function for the 'CreateCustomer' Mutation. Allow users to execute without passing in DataConnect. */
export function createCustomer(dc: DataConnect, vars: CreateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateCustomerData>>;
/** Generated Node Admin SDK operation action function for the 'CreateCustomer' Mutation. Allow users to pass in custom DataConnect instances. */
export function createCustomer(vars: CreateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateCustomerData>>;

/** Generated Node Admin SDK operation action function for the 'CreateProduct' Mutation. Allow users to execute without passing in DataConnect. */
export function createProduct(dc: DataConnect, vars: CreateProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateProductData>>;
/** Generated Node Admin SDK operation action function for the 'CreateProduct' Mutation. Allow users to pass in custom DataConnect instances. */
export function createProduct(vars: CreateProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateProductData>>;

/** Generated Node Admin SDK operation action function for the 'CreateInvoice' Mutation. Allow users to execute without passing in DataConnect. */
export function createInvoice(dc: DataConnect, vars: CreateInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvoiceData>>;
/** Generated Node Admin SDK operation action function for the 'CreateInvoice' Mutation. Allow users to pass in custom DataConnect instances. */
export function createInvoice(vars: CreateInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvoiceData>>;

/** Generated Node Admin SDK operation action function for the 'CreatePayment' Mutation. Allow users to execute without passing in DataConnect. */
export function createPayment(dc: DataConnect, vars: CreatePaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePaymentData>>;
/** Generated Node Admin SDK operation action function for the 'CreatePayment' Mutation. Allow users to pass in custom DataConnect instances. */
export function createPayment(vars: CreatePaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePaymentData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateCustomer' Mutation. Allow users to execute without passing in DataConnect. */
export function updateCustomer(dc: DataConnect, vars: UpdateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCustomerData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateCustomer' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateCustomer(vars: UpdateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCustomerData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateProduct' Mutation. Allow users to execute without passing in DataConnect. */
export function updateProduct(dc: DataConnect, vars: UpdateProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateProductData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateProduct' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateProduct(vars: UpdateProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateProductData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateInvoiceStatus' Mutation. Allow users to execute without passing in DataConnect. */
export function updateInvoiceStatus(dc: DataConnect, vars: UpdateInvoiceStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateInvoiceStatusData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateInvoiceStatus' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateInvoiceStatus(vars: UpdateInvoiceStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateInvoiceStatusData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteCustomer' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteCustomer(dc: DataConnect, vars: DeleteCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteCustomerData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteCustomer' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteCustomer(vars: DeleteCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteCustomerData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteProduct' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteProduct(dc: DataConnect, vars: DeleteProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteProductData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteProduct' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteProduct(vars: DeleteProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteProductData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteInvoice' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteInvoice(dc: DataConnect, vars: DeleteInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteInvoiceData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteInvoice' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteInvoice(vars: DeleteInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteInvoiceData>>;

/** Generated Node Admin SDK operation action function for the 'GetMyCustomers' Query. Allow users to execute without passing in DataConnect. */
export function getMyCustomers(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyCustomersData>>;
/** Generated Node Admin SDK operation action function for the 'GetMyCustomers' Query. Allow users to pass in custom DataConnect instances. */
export function getMyCustomers(options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyCustomersData>>;

/** Generated Node Admin SDK operation action function for the 'GetProduct' Query. Allow users to execute without passing in DataConnect. */
export function getProduct(dc: DataConnect, vars: GetProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetProductData>>;
/** Generated Node Admin SDK operation action function for the 'GetProduct' Query. Allow users to pass in custom DataConnect instances. */
export function getProduct(vars: GetProductVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetProductData>>;

/** Generated Node Admin SDK operation action function for the 'ListInvoices' Query. Allow users to execute without passing in DataConnect. */
export function listInvoices(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvoicesData>>;
/** Generated Node Admin SDK operation action function for the 'ListInvoices' Query. Allow users to pass in custom DataConnect instances. */
export function listInvoices(options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvoicesData>>;

/** Generated Node Admin SDK operation action function for the 'ListPaymentsForInvoice' Query. Allow users to execute without passing in DataConnect. */
export function listPaymentsForInvoice(dc: DataConnect, vars: ListPaymentsForInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPaymentsForInvoiceData>>;
/** Generated Node Admin SDK operation action function for the 'ListPaymentsForInvoice' Query. Allow users to pass in custom DataConnect instances. */
export function listPaymentsForInvoice(vars: ListPaymentsForInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPaymentsForInvoiceData>>;

