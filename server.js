// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
// Access PORT from .env file (defaults to 3000 if not set)
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Enable CORS to allow your front-end (HTML file) to talk to this server
app.use(express.json()); // To parse incoming JSON data

// 1. MongoDB Connection
// Access MONGO_URI from .env file
const uri = process.env.MONGO_URI;

// Check if URI is present (Good practice)
if (!uri) {
    console.error('FATAL ERROR: MONGO_URI is not defined in .env file. Please check your .env file content.');
    // process.exit(1); // Uncomment this line if you want the app to crash immediately without DB connection
}

mongoose.connect(uri)
    .then(() => console.log('MongoDB successfully connected'))
    .catch(err => console.error('MongoDB connection error:', err.message)); // err.message shows cleaner error

// 2. Define the Schema (How your order data looks)
const orderSchema = new mongoose.Schema({
    billingDetails: {
        name: String,
        phone: String,
        address: String
    },
    orderedProducts: [{
        image: String,
        name: String,
        price: String,
        size: String,
        color: String,
        quantity: Number
    }],
    // 👇 এই অংশটি ঠিক করতে হবে: এটি এখন একটি নেস্টেড অবজেক্ট
    shippingInfo: { 
        type: { type: String }, // Mongoose এ type নামের ফিল্ড সংজ্ঞায়িত করতে inner type: String দিতে হয়।
        cost: String
    },
    summary: {
        subtotal: String,
        total: String,
        paymentMethod: String
    },

     status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], // সম্ভাব্য স্ট্যাটাসগুলো
        default: 'Pending' // ডিফল্ট স্ট্যাটাস হিসেবে Pending থাকবে
    },

    orderDate: {
        type: Date,
        default: Date.now
    }
});

const Order = mongoose.model('Order', orderSchema);

// 3. Define the POST Route
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Input validation (basic check)
        if (!orderData.billingDetails || orderData.orderedProducts.length === 0) {
            return res.status(400).json({ message: 'Invalid order data: Missing billing details or products.' });
        }

        // Create a new Order document based on the data received from the front-end
        const newOrder = new Order(orderData);
        
        // Save the order to MongoDB
        await newOrder.save();
        
        console.log('Order successfully saved to DB:', newOrder);
        res.status(201).json({ message: 'Order placed successfully!', orderId: newOrder._id });
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ message: 'Failed to place order', error: error.message });
    }
});

// 4. GET Route: Fetch all orders
app.get('/api/orders/all', async (req, res) => {
    try {
        // Find all orders and sort them by orderDate in descending order (-1)
        const orders = await Order.find().sort({ orderDate: -1 });

        // If no orders are found
        if (orders.length === 0) {
            return res.status(200).json({ message: 'No orders found yet.', orders: [] });
        }

        // Send the list of orders
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to retrieve orders', error: error.message });
    }
});



// 5. PATCH Route: Update order status
app.patch('/api/orders/:orderId/status', async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { newStatus } = req.body; // ফ্রন্ট-এন্ড থেকে { "newStatus": "Shipped" } আসবে

        if (!newStatus) {
            return res.status(400).json({ message: 'New status is required.' });
        }
        
        // Find the order by ID and update the status field
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: newStatus },
            { new: true, runValidators: true } // new: true returns the updated document
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        res.status(200).json({ 
            message: 'Order status updated successfully!', 
            order: updatedOrder 
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Failed to update order status', error: error.message });
    }
});


// 6. DELETE Route: Delete an order
app.delete('/api/orders/:orderId', async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        // Find and delete the order by ID
        const deletedOrder = await Order.findByIdAndDelete(orderId);

        if (!deletedOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        res.status(200).json({ message: 'Order deleted successfully!', orderId });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Failed to delete order', error: error.message });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    // You can also display the JWT secret for confirmation (optional, for development only)
    // console.log(`JWT_SECRET is: ${process.env.JWT_SECRET}`); 
});