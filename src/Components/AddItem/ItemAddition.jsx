import { useState } from 'react';

function AddItem({ onAddItem, onClose }) {

    const [item, setItem] = useState({
        name: "",
        quantity: 1,
        price: "",
        gst: 0
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setItem({
            ...item,
            [name]: value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!item.name.trim() || !item.price || !item.quantity) {
            alert("Please fill all required fields");
            return;
        }

        const newItem = {
            name: item.name.trim(),
            quantity: Number(item.quantity),
            price: Number(item.price),
            gst: Number(item.gst),
            total:
                Number(item.quantity) *
                Number(item.price) *
                (1 + Number(item.gst) / 100)
        };

        if (onAddItem) {
            onAddItem(newItem);
        }

        setItem({
            name: "",
            quantity: 1,
            price: "",
            gst: 0
        });

        if (onClose) {
            onClose();
        }
    };

    return (
        <div className="container py-4">

            <div className="text-center mb-4">
                <h2 className="h3">
                    Add Item
                </h2>
            </div>

            <div
                className="card shadow p-4 mx-auto"
                style={{ maxWidth: "600px" }}
            >

                <form onSubmit={handleSubmit}>

                    <div className="mb-3">

                        <label className="form-label">
                            Item Name
                        </label>

                        <input
                            type="text"
                            name="name"
                            className="form-control"
                            placeholder="Enter item name"
                            value={item.name}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="mb-3">

                        <label className="form-label">
                            Quantity
                        </label>

                        <input
                            type="number"
                            name="quantity"
                            className="form-control"
                            min="1"
                            value={item.quantity}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="mb-3">

                        <label className="form-label">
                            Price
                        </label>

                        <input
                            type="number"
                            name="price"
                            className="form-control"
                            placeholder="Enter price"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="mb-4">

                        <label className="form-label">
                            GST (%)
                        </label>

                        <select
                            name="gst"
                            className="form-select"
                            value={item.gst}
                            onChange={handleChange}
                        >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                        </select>

                    </div>

                    <div className="d-flex gap-2">

                        <button
                            type="submit"
                            className="btn btn-success flex-grow-1"
                        >
                            + Add Item
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}

export default AddItem;