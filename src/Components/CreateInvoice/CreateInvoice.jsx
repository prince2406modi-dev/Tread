function CreateInvoice({
    customerName,
    setCustomerName,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    customerPhone,
    setCustomerPhone,
    customerAddress,
    setCustomerAddress,
}) {

    return (
        <>
            <div className="card shadow-sm mb-4">
    <div className="card-body">

        <h2 className="h5 mb-3">
            Customer Details
        </h2>

        <div className="row g-3">

            <div className="col-md-6">
                <label className="form-label">
                    Customer Name
                </label>

                <input
                    type="text"
                    className="form-control"
                    value={customerName}
                    onChange={(e) =>
                        setCustomerName(e.target.value)
                    }
                    placeholder="Enter customer name"
                />
            </div>

            <div className="col-md-6">
                <label className="form-label">
                    Invoice Number
                </label>

                <input
                    type="text"
                    className="form-control"
                    value={invoiceNumber}
                    onChange={(e) =>
                        setInvoiceNumber(e.target.value)
                    }
                    placeholder="Enter invoice number"
                />
            </div>

            <div className="col-md-6">
                <label className="form-label">
                    Invoice Date
                </label>

                <input
                    type="date"
                    className="form-control"
                    value={invoiceDate}
                    onChange={(e) =>
                        setInvoiceDate(e.target.value)
                    }
                />
            </div>

            <div className="col-md-6">
                <label className="form-label">
                    Customer Phone
                </label>

                <input
                    type="text"
                    className="form-control"
                    value={customerPhone}
                    onChange={(e) =>
                        setCustomerPhone(e.target.value)
                    }
                    placeholder="Enter phone number"
                />
            </div>

            <div className="col-12">
                <label className="form-label">
                    Customer Address
                </label>

                <textarea
                    className="form-control"
                    rows="3"
                    value={customerAddress}
                    onChange={(e) =>
                        setCustomerAddress(e.target.value)
                    }
                    placeholder="Enter customer address"
                />
            </div>

        </div>
    </div>
</div>
        </>
    )
}

export default CreateInvoice