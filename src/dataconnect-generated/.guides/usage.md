# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateUser, useCreateCustomer, useCreateProduct, useCreateInvoice, useCreatePayment, useUpdateCustomer, useUpdateProduct, useUpdateInvoiceStatus, useDeleteCustomer, useDeleteProduct } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateUser();

const { data, isPending, isSuccess, isError, error } = useCreateCustomer(createCustomerVars);

const { data, isPending, isSuccess, isError, error } = useCreateProduct(createProductVars);

const { data, isPending, isSuccess, isError, error } = useCreateInvoice(createInvoiceVars);

const { data, isPending, isSuccess, isError, error } = useCreatePayment(createPaymentVars);

const { data, isPending, isSuccess, isError, error } = useUpdateCustomer(updateCustomerVars);

const { data, isPending, isSuccess, isError, error } = useUpdateProduct(updateProductVars);

const { data, isPending, isSuccess, isError, error } = useUpdateInvoiceStatus(updateInvoiceStatusVars);

const { data, isPending, isSuccess, isError, error } = useDeleteCustomer(deleteCustomerVars);

const { data, isPending, isSuccess, isError, error } = useDeleteProduct(deleteProductVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createUser, createCustomer, createProduct, createInvoice, createPayment, updateCustomer, updateProduct, updateInvoiceStatus, deleteCustomer, deleteProduct } from '@dataconnect/generated';


// Operation CreateUser: 
const { data } = await CreateUser(dataConnect);

// Operation CreateCustomer:  For variables, look at type CreateCustomerVars in ../index.d.ts
const { data } = await CreateCustomer(dataConnect, createCustomerVars);

// Operation CreateProduct:  For variables, look at type CreateProductVars in ../index.d.ts
const { data } = await CreateProduct(dataConnect, createProductVars);

// Operation CreateInvoice:  For variables, look at type CreateInvoiceVars in ../index.d.ts
const { data } = await CreateInvoice(dataConnect, createInvoiceVars);

// Operation CreatePayment:  For variables, look at type CreatePaymentVars in ../index.d.ts
const { data } = await CreatePayment(dataConnect, createPaymentVars);

// Operation UpdateCustomer:  For variables, look at type UpdateCustomerVars in ../index.d.ts
const { data } = await UpdateCustomer(dataConnect, updateCustomerVars);

// Operation UpdateProduct:  For variables, look at type UpdateProductVars in ../index.d.ts
const { data } = await UpdateProduct(dataConnect, updateProductVars);

// Operation UpdateInvoiceStatus:  For variables, look at type UpdateInvoiceStatusVars in ../index.d.ts
const { data } = await UpdateInvoiceStatus(dataConnect, updateInvoiceStatusVars);

// Operation DeleteCustomer:  For variables, look at type DeleteCustomerVars in ../index.d.ts
const { data } = await DeleteCustomer(dataConnect, deleteCustomerVars);

// Operation DeleteProduct:  For variables, look at type DeleteProductVars in ../index.d.ts
const { data } = await DeleteProduct(dataConnect, deleteProductVars);


```