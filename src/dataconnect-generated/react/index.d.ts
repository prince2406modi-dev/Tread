import { CreateUserData, CreateCustomerData, CreateCustomerVariables, CreateProductData, CreateProductVariables, CreateInvoiceData, CreateInvoiceVariables, CreatePaymentData, CreatePaymentVariables, UpdateCustomerData, UpdateCustomerVariables, UpdateProductData, UpdateProductVariables, UpdateInvoiceStatusData, UpdateInvoiceStatusVariables, DeleteCustomerData, DeleteCustomerVariables, DeleteProductData, DeleteProductVariables, DeleteInvoiceData, DeleteInvoiceVariables, GetMyCustomersData, GetProductData, GetProductVariables, ListInvoicesData, ListPaymentsForInvoiceData, ListPaymentsForInvoiceVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;

export function useCreateCustomer(options?: useDataConnectMutationOptions<CreateCustomerData, FirebaseError, CreateCustomerVariables>): UseDataConnectMutationResult<CreateCustomerData, CreateCustomerVariables>;
export function useCreateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCustomerData, FirebaseError, CreateCustomerVariables>): UseDataConnectMutationResult<CreateCustomerData, CreateCustomerVariables>;

export function useCreateProduct(options?: useDataConnectMutationOptions<CreateProductData, FirebaseError, CreateProductVariables>): UseDataConnectMutationResult<CreateProductData, CreateProductVariables>;
export function useCreateProduct(dc: DataConnect, options?: useDataConnectMutationOptions<CreateProductData, FirebaseError, CreateProductVariables>): UseDataConnectMutationResult<CreateProductData, CreateProductVariables>;

export function useCreateInvoice(options?: useDataConnectMutationOptions<CreateInvoiceData, FirebaseError, CreateInvoiceVariables>): UseDataConnectMutationResult<CreateInvoiceData, CreateInvoiceVariables>;
export function useCreateInvoice(dc: DataConnect, options?: useDataConnectMutationOptions<CreateInvoiceData, FirebaseError, CreateInvoiceVariables>): UseDataConnectMutationResult<CreateInvoiceData, CreateInvoiceVariables>;

export function useCreatePayment(options?: useDataConnectMutationOptions<CreatePaymentData, FirebaseError, CreatePaymentVariables>): UseDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables>;
export function useCreatePayment(dc: DataConnect, options?: useDataConnectMutationOptions<CreatePaymentData, FirebaseError, CreatePaymentVariables>): UseDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables>;

export function useUpdateCustomer(options?: useDataConnectMutationOptions<UpdateCustomerData, FirebaseError, UpdateCustomerVariables>): UseDataConnectMutationResult<UpdateCustomerData, UpdateCustomerVariables>;
export function useUpdateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateCustomerData, FirebaseError, UpdateCustomerVariables>): UseDataConnectMutationResult<UpdateCustomerData, UpdateCustomerVariables>;

export function useUpdateProduct(options?: useDataConnectMutationOptions<UpdateProductData, FirebaseError, UpdateProductVariables>): UseDataConnectMutationResult<UpdateProductData, UpdateProductVariables>;
export function useUpdateProduct(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateProductData, FirebaseError, UpdateProductVariables>): UseDataConnectMutationResult<UpdateProductData, UpdateProductVariables>;

export function useUpdateInvoiceStatus(options?: useDataConnectMutationOptions<UpdateInvoiceStatusData, FirebaseError, UpdateInvoiceStatusVariables>): UseDataConnectMutationResult<UpdateInvoiceStatusData, UpdateInvoiceStatusVariables>;
export function useUpdateInvoiceStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateInvoiceStatusData, FirebaseError, UpdateInvoiceStatusVariables>): UseDataConnectMutationResult<UpdateInvoiceStatusData, UpdateInvoiceStatusVariables>;

export function useDeleteCustomer(options?: useDataConnectMutationOptions<DeleteCustomerData, FirebaseError, DeleteCustomerVariables>): UseDataConnectMutationResult<DeleteCustomerData, DeleteCustomerVariables>;
export function useDeleteCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteCustomerData, FirebaseError, DeleteCustomerVariables>): UseDataConnectMutationResult<DeleteCustomerData, DeleteCustomerVariables>;

export function useDeleteProduct(options?: useDataConnectMutationOptions<DeleteProductData, FirebaseError, DeleteProductVariables>): UseDataConnectMutationResult<DeleteProductData, DeleteProductVariables>;
export function useDeleteProduct(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteProductData, FirebaseError, DeleteProductVariables>): UseDataConnectMutationResult<DeleteProductData, DeleteProductVariables>;

export function useDeleteInvoice(options?: useDataConnectMutationOptions<DeleteInvoiceData, FirebaseError, DeleteInvoiceVariables>): UseDataConnectMutationResult<DeleteInvoiceData, DeleteInvoiceVariables>;
export function useDeleteInvoice(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteInvoiceData, FirebaseError, DeleteInvoiceVariables>): UseDataConnectMutationResult<DeleteInvoiceData, DeleteInvoiceVariables>;

export function useGetMyCustomers(options?: useDataConnectQueryOptions<GetMyCustomersData>): UseDataConnectQueryResult<GetMyCustomersData, undefined>;
export function useGetMyCustomers(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyCustomersData>): UseDataConnectQueryResult<GetMyCustomersData, undefined>;

export function useGetProduct(vars: GetProductVariables, options?: useDataConnectQueryOptions<GetProductData>): UseDataConnectQueryResult<GetProductData, GetProductVariables>;
export function useGetProduct(dc: DataConnect, vars: GetProductVariables, options?: useDataConnectQueryOptions<GetProductData>): UseDataConnectQueryResult<GetProductData, GetProductVariables>;

export function useListInvoices(options?: useDataConnectQueryOptions<ListInvoicesData>): UseDataConnectQueryResult<ListInvoicesData, undefined>;
export function useListInvoices(dc: DataConnect, options?: useDataConnectQueryOptions<ListInvoicesData>): UseDataConnectQueryResult<ListInvoicesData, undefined>;

export function useListPaymentsForInvoice(vars: ListPaymentsForInvoiceVariables, options?: useDataConnectQueryOptions<ListPaymentsForInvoiceData>): UseDataConnectQueryResult<ListPaymentsForInvoiceData, ListPaymentsForInvoiceVariables>;
export function useListPaymentsForInvoice(dc: DataConnect, vars: ListPaymentsForInvoiceVariables, options?: useDataConnectQueryOptions<ListPaymentsForInvoiceData>): UseDataConnectQueryResult<ListPaymentsForInvoiceData, ListPaymentsForInvoiceVariables>;
