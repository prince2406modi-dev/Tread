import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Login from './Components/Login/Login'
import Start from './Components/Start/start'
import downloadPDF from './Components/DownloadInvoice/Invoice.jsx'
import Menu from './Components/Menu/Menu'
import CreateInvoice from './Components/CreateInvoice/CreateInvoice'
import AddItemPage from './Components/AddItem/ItemAddition'

import './App.css'

function App() {
  const [customerName, setCustomerName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  const [showAddItem, setShowAddItem] = useState(false)

  const [items, setItems] = useState([])
  const [itemDescription, setItemDescription] = useState('')
  const [itemQty, setItemQty] = useState('')
  const [itemRate, setItemRate] = useState('0')
  const [itemGst, setItemGst] = useState('18')

  const Additem = () => {
    setShowAddItem(true)
  }

  const invoiceStorageKey = useCallback(
    (username) => `gst-invoice-app-invoices-${username}`,
    []
  )

  const loadInvoices = useCallback(
    (username) => {
      if (typeof window === 'undefined' || !username) {
        return []
      }

      const savedInvoices = window.localStorage.getItem(
        invoiceStorageKey(username)
      )

      if (!savedInvoices) {
        return []
      }

      try {
        return JSON.parse(savedInvoices)
      } catch {
        return []
      }
    },
    [invoiceStorageKey]
  )

  const [voiceSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  )

  const [recognitionActive, setRecognitionActive] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [showLogin, setShowLogin] = useState(false)

  const getInitialUsers = () => {
    if (typeof window === 'undefined') {
      return []
    }

    const saved = window.localStorage.getItem('gst-invoice-app-users')

    if (!saved) {
      return []
    }

    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }

  const getInitialCurrentUser = () => {
    if (typeof window === 'undefined') {
      return null
    }

    const username = window.localStorage.getItem(
      'gst-invoice-app-current-user'
    )

    return username ? { username } : null
  }

  const initialCurrentUser = getInitialCurrentUser()

  const [users, setUsers] = useState(getInitialUsers)
  const [currentUser, setCurrentUser] = useState(initialCurrentUser)

  const [invoices, setInvoices] = useState(() => {
    if (!initialCurrentUser) {
      return []
    }

    return loadInvoices(initialCurrentUser.username)
  })

  const recognitionRef = useRef(null)
  const recognitionActiveRef = useRef(recognitionActive)

  const invoiceDataRef = useRef({
    customerName,
    invoiceNumber,
    invoiceDate,
    customerPhone,
    customerAddress,
    items,
    itemDescription,
    itemQty,
    itemRate,
    itemGst,
  })

  useEffect(() => {
    recognitionActiveRef.current = recognitionActive
  }, [recognitionActive])

  useEffect(() => {
    invoiceDataRef.current = {
      customerName,
      invoiceNumber,
      invoiceDate,
      customerPhone,
      customerAddress,
      items,
      itemDescription,
      itemQty,
      itemRate,
      itemGst,
    }
  }, [
    customerName,
    invoiceNumber,
    invoiceDate,
    customerPhone,
    customerAddress,
    items,
    itemDescription,
    itemQty,
    itemRate,
    itemGst,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      'gst-invoice-app-users',
      JSON.stringify(users)
    )
  }, [users])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (currentUser) {
      window.localStorage.setItem(
        'gst-invoice-app-current-user',
        currentUser.username
      )
    } else {
      window.localStorage.removeItem('gst-invoice-app-current-user')
    }
  }, [currentUser])

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) {
      return
    }

    window.localStorage.setItem(
      invoiceStorageKey(currentUser.username),
      JSON.stringify(invoices)
    )
  }, [invoices, currentUser, invoiceStorageKey])

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    )

    const totalGst = items.reduce(
      (sum, item) =>
        sum + (item.quantity * item.rate * item.gstPercent) / 100,
      0
    )

    return {
      subtotal,
      totalGst,
      total: subtotal + totalGst,
    }
  }, [items])

  const computeTotals = (itemsArray) => {
    const subtotal = itemsArray.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    )

    const totalGst = itemsArray.reduce(
      (sum, item) =>
        sum + (item.quantity * item.rate * item.gstPercent) / 100,
      0
    )

    return {
      subtotal,
      totalGst,
      total: subtotal + totalGst,
    }
  }

  const resetInvoice = useCallback(() => {
    setCustomerName('')
    setInvoiceNumber('')
    setInvoiceDate(new Date().toISOString().slice(0, 10))
    setCustomerPhone('')
    setCustomerAddress('')
    setItems([])
    setItemDescription('')
    setItemQty('1')
    setItemRate('0')
    setItemGst('18')
    setVoiceTranscript('')
    setRecognitionActive(false)
    setShowAddItem(false)
  }, [])

  const addItem = () => {
    if (!itemDescription.trim()) {
      alert('Enter a description for the item.')
      return
    }

    const quantity = Number(itemQty) || 1
    const rate = Number(itemRate) || 0
    const gstPercent = Number(itemGst) || 18

    setItems((current) => [
      ...current,
      {
        id: uuidv4(),
        description: itemDescription.trim(),
        quantity,
        rate,
        gstPercent,
      },
    ])

    setItemDescription('')
    setItemQty('1')
    setItemRate('0')
    setItemGst('18')
  }

  const handleAddItemFromForm = (newItem) => {
    setItems((current) => [
      ...current,
      {
        id: uuidv4(),
        description: newItem.name,
        quantity: newItem.quantity,
        rate: newItem.price,
        gstPercent: newItem.gst,
      },
    ])

    setShowAddItem(false)
  }

  const updateItem = (id, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === 'description'
                  ? value
                  : Number(value) || 0,
            }
          : item
      )
    )
  }

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const saveInvoice = useCallback(() => {
    if (!currentUser) {
      alert('Please log in to save invoices.')
      return
    }

    if (!invoiceDataRef.current.customerName.trim()) {
      alert('Please enter customer name before saving.')
      return
    }

    if (invoiceDataRef.current.items.length === 0) {
      alert('Add at least one item before saving the invoice.')
      return
    }

    const totalsForInvoice = computeTotals(
      invoiceDataRef.current.items
    )

    const invoice = {
      id: uuidv4(),
      customerName: invoiceDataRef.current.customerName.trim(),
      invoiceNumber:
        invoiceDataRef.current.invoiceNumber.trim() ||
        `INV-${new Date().getTime()}`,
      invoiceDate: invoiceDataRef.current.invoiceDate,
      customerPhone: invoiceDataRef.current.customerPhone.trim(),
      customerAddress:
        invoiceDataRef.current.customerAddress.trim(),
      items: invoiceDataRef.current.items,
      totals: totalsForInvoice,
      createdAt: new Date().toISOString(),
    }

    setInvoices((current) => [invoice, ...current])
    resetInvoice()
    alert('Invoice saved successfully.')
  }, [currentUser, resetInvoice])

  const loadInvoice = (invoice) => {
    setCustomerName(invoice.customerName)
    setInvoiceNumber(invoice.invoiceNumber)
    setInvoiceDate(invoice.invoiceDate)
    setCustomerPhone(invoice.customerPhone)
    setCustomerAddress(invoice.customerAddress)
    setItems(invoice.items)
    setVoiceTranscript('')
  }

  const handleLogin = useCallback(
    (username) => {
      setCurrentUser({ username })
      setInvoices(loadInvoices(username))
    },
    [loadInvoices]
  )

  const handleRegister = useCallback((newUser) => {
    setUsers((current) => [...current, newUser])
    setCurrentUser({ username: newUser.username })
    setInvoices([])
  }, [])

  const logout = useCallback(() => {
    resetInvoice()
    setInvoices([])
    setCurrentUser(null)
  }, [resetInvoice])

  const processVoiceCommand = useCallback(
    (command) => {
      if (!command) {
        return
      }

      const text = command.toLowerCase().trim()

      if (
        text.includes('clear invoice') ||
        text.includes('reset invoice') ||
        text.includes('new invoice')
      ) {
        resetInvoice()
        return
      }

      if (
        text.includes('save invoice') ||
        text.includes('submit invoice')
      ) {
        saveInvoice()
        return
      }

      if (text.includes('set customer name to')) {
        const value = command
          .split(/set customer name to/i)[1]
          ?.trim()

        if (value) {
          setCustomerName(value)
        }

        return
      }

      if (text.includes('set invoice number to')) {
        const value = command
          .split(/set invoice number to/i)[1]
          ?.trim()

        if (value) {
          setInvoiceNumber(value)
        }

        return
      }

      if (
        text.includes('set customer phone to') ||
        text.includes('set mobile to') ||
        text.includes('set phone to')
      ) {
        const parts = command.split(
          /set (customer )?(phone|mobile) to/i
        )

        const value = parts[parts.length - 1]?.trim()

        if (value) {
          setCustomerPhone(value)
        }

        return
      }

      if (
        text.includes('set address to') ||
        text.includes('set customer address to')
      ) {
        const value = command
          .split(/set (customer )?address to/i)[1]
          ?.trim()

        if (value) {
          setCustomerAddress(value)
        }

        return
      }

      if (text.includes('add item')) {
        const addRegex =
          /add item\s+(.+?)(?:\s+quantity\s+(\d+))?(?:\s+rate\s+(\d+(?:\.\d+)?))?(?:\s+gst\s+(\d+))?$/i

        const match = command.match(addRegex)

        if (match) {
          const description = match[1].trim()
          const quantity = Number(match[2] || 1)
          const rate = Number(match[3] || 0)
          const gstPercent = Number(match[4] || 18)

          if (description) {
            setItems((current) => [
              ...current,
              {
                id: uuidv4(),
                description,
                quantity,
                rate,
                gstPercent,
              },
            ])
          }
        }

        return
      }

      if (text.includes('set item description to')) {
        const value = command
          .split(/set item description to/i)[1]
          ?.trim()

        if (value) {
          setItemDescription(value)
        }

        return
      }

      if (text.includes('set item quantity to')) {
        const value = command
          .split(/set item quantity to/i)[1]
          ?.trim()

        if (value) {
          setItemQty(value)
        }

        return
      }

      if (text.includes('set item rate to')) {
        const value = command
          .split(/set item rate to/i)[1]
          ?.trim()

        if (value) {
          setItemRate(value)
        }

        return
      }

      if (text.includes('set item gst to')) {
        const value = command
          .split(/set item gst to/i)[1]
          ?.trim()

        if (value) {
          setItemGst(value)
        }

        return
      }
    },
    [resetInvoice, saveInvoice]
  )

  useEffect(() => {
    if (!voiceSupported || typeof window === 'undefined') {
      return undefined
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      return undefined
    }

    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const lastResult =
        event.results[event.results.length - 1]

      const sentence = lastResult[0].transcript.trim()

      setVoiceTranscript((prev) =>
        `${prev} ${sentence}`.trim()
      )

      processVoiceCommand(sentence)
    }

    recognition.onend = () => {
      if (recognitionActiveRef.current) {
        recognition.start()
      }
    }

    recognition.onerror = () => {
      setRecognitionActive(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
      recognition.stop()
      recognitionRef.current = null
    }
  }, [voiceSupported, processVoiceCommand])

  useEffect(() => {
    if (!recognitionRef.current) {
      return
    }

    if (recognitionActive) {
      recognitionRef.current.start()
    } else {
      recognitionRef.current.stop()
    }
  }, [recognitionActive])

  if (!currentUser) {
    return (
      <div className="app-shell">
        <div className="container py-5">
          {showLogin ? (
            <div className="row justify-content-center">
              <div className="col-xl-6 col-lg-8">
                <Login
                  users={users}
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  onBack={() => setShowLogin(false)}
                />
              </div>
            </div>
          ) : (
            <Start onContinue={() => setShowLogin(true)} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container py-4">

        <Menu
          currentUser={currentUser}
          onLogout={logout}
        />

        {showAddItem ? (
          <AddItemPage
            onAddItem={handleAddItemFromForm}
            onClose={() => setShowAddItem(false)}
          />
        ) : (
          <>
            <CreateInvoice
              customerName={customerName}
              setCustomerName={setCustomerName}

              invoiceNumber={invoiceNumber}
              setInvoiceNumber={setInvoiceNumber}

              invoiceDate={invoiceDate}
              setInvoiceDate={setInvoiceDate}

              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}

              customerAddress={customerAddress}
              setCustomerAddress={setCustomerAddress}

              items={items}

              itemDescription={itemDescription}
              setItemDescription={setItemDescription}

              itemQty={itemQty}
              setItemQty={setItemQty}

              itemRate={itemRate}
              setItemRate={setItemRate}

              itemGst={itemGst}
              setItemGst={setItemGst}

              addItem={addItem}
              updateItem={updateItem}
              removeItem={removeItem}

              totals={totals}

              resetInvoice={resetInvoice}
              saveInvoice={saveInvoice}

              recognitionActive={recognitionActive}
              setRecognitionActive={setRecognitionActive}
              voiceSupported={voiceSupported}
              voiceTranscript={voiceTranscript}

              invoices={invoices}
              setInvoices={setInvoices}
              loadInvoice={loadInvoice}

              downloadPDF={downloadPDF}
            />

            <section className="card mb-4 shadow-sm">
              <div className="card-body">

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={Additem}
                  >
                    Add Item
                  </button>

                  <div>
                    <h2 className="h5">
                      Invoice Items
                    </h2>

                    <p className="text-muted mb-0">
                      Add items manually or use voice commands.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={resetInvoice}
                  >
                    Clear Invoice
                  </button>

                </div>

                <div className="table-responsive mt-4">

                  <table className="table table-bordered table-hover align-middle">

                    <thead className="table-light">
                      <tr>
                        <th>Description</th>
                        <th className="text-end">Qty</th>
                        <th className="text-end">Rate</th>
                        <th className="text-end">GST %</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">GST Amount</th>
                        <th className="text-end">Total</th>
                        <th className="text-center">Remove</th>
                      </tr>
                    </thead>

                    <tbody>

                      {items.map((item) => {
                        const amount =
                          item.quantity * item.rate

                        const gstAmount =
                          (amount * item.gstPercent) / 100

                        const total =
                          amount + gstAmount

                        return (
                          <tr key={item.id}>

                            <td>
                              <input
                                className="form-control"
                                value={item.description}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    'description',
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control text-end"
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    'quantity',
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control text-end"
                                value={item.rate}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    'rate',
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-control text-end"
                                value={item.gstPercent}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    'gstPercent',
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td className="text-end">
                              ₹{amount.toFixed(2)}
                            </td>

                            <td className="text-end">
                              ₹{gstAmount.toFixed(2)}
                            </td>

                            <td className="text-end">
                              ₹{total.toFixed(2)}
                            </td>

                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  removeItem(item.id)
                                }
                              >
                                Remove
                              </button>
                            </td>

                          </tr>
                        )
                      })}

                      {items.length === 0 && (
                        <tr>
                          <td
                            colSpan="8"
                            className="text-center text-muted py-4"
                          >
                            No items added yet. Click "Add Item" to add an item.
                          </td>
                        </tr>
                      )}

                    </tbody>

                  </table>

                </div>

                <div className="row mt-3 justify-content-end">

                  <div className="col-md-4">

                    <div className="card bg-light p-3">

                      <div className="d-flex justify-content-between mb-2">
                        <strong>Subtotal</strong>
                        <span>
                          ₹{totals.subtotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between mb-2">
                        <strong>Total GST</strong>
                        <span>
                          ₹{totals.totalGst.toFixed(2)}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between border-top pt-2">
                        <strong>Total</strong>
                        <span className="fs-5">
                          ₹{totals.total.toFixed(2)}
                        </span>
                      </div>

                    </div>

                  </div>

                </div>

                <div className="mt-4 d-flex flex-column flex-sm-row gap-2">

                  <button
                    type="button"
                    className="btn btn-success btn-lg"
                    onClick={saveInvoice}
                  >
                    Save Invoice
                  </button>

                  <button
                    type="button"
                    className={`btn btn-outline-${
                      recognitionActive
                        ? 'danger'
                        : 'secondary'
                    } btn-lg`}
                    onClick={() =>
                      setRecognitionActive(
                        (active) => !active
                      )
                    }
                    disabled={!voiceSupported}
                  >
                    {recognitionActive
                      ? 'Stop Voice Mode'
                      : 'Start Voice Mode'}
                  </button>

                </div>

              </div>
            </section>

            <section className="card mb-4 shadow-sm">

              <div className="card-body">

                <h2 className="h5">
                  Voice Assistant
                </h2>

                <p className="text-muted">
                  Use your microphone to add invoice data.
                  Supported commands include:
                </p>

                <ul>
                  <li>
                    "Set customer name to John Doe"
                  </li>

                  <li>
                    "Set invoice number to INV-1002"
                  </li>

                  <li>
                    "Add item mobile charger quantity 2 rate 500 gst 18"
                  </li>

                  <li>
                    "Save invoice" or "Clear invoice"
                  </li>
                </ul>

                {!voiceSupported && (
                  <div className="alert alert-warning">
                    Your browser does not support speech recognition.
                  </div>
                )}

                <div className="voice-output p-3 bg-white border rounded">

                  <strong>Transcript</strong>

                  <div className="mt-2 text-break">
                    {voiceTranscript ||
                      'No voice input yet.'}
                  </div>

                </div>

              </div>

            </section>

            <section className="card mb-4 shadow-sm">

              <div className="card-body">

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">

                  <div>
                    <h2 className="h5">
                      Saved Invoices
                    </h2>

                    <p className="text-muted mb-0">
                      Invoices are stored in your browser local storage.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setInvoices([])}
                  >
                    Delete All Saved Invoices
                  </button>

                </div>

                {invoices.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    No saved invoices yet.
                  </div>
                ) : (
                  <div className="table-responsive">

                    <table className="table table-striped">

                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th className="text-end">Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>

                        {invoices.map((invoice) => (
                          <tr key={invoice.id}>

                            <td>
                              {invoice.invoiceNumber}
                            </td>

                            <td>
                              {invoice.customerName}
                            </td>

                            <td>
                              {invoice.invoiceDate}
                            </td>

                            <td className="text-end">
                              ₹{invoice.totals.total.toFixed(2)}
                            </td>

                            <td>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() =>
                                  loadInvoice(invoice)
                                }
                              >
                                Load
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  downloadPDF(invoice)
                                }
                                className="btn btn-sm btn-outline-primary"
                              >
                                Download PDF
                              </button>

                            </td>

                          </tr>
                        ))}

                      </tbody>

                    </table>

                  </div>
                )}

              </div>

            </section>
          </>
        )}

      </div>
    </div>
  )
}

export default App