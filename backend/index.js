const express = require('express');
const app =express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { log } = require('console');
require('dotenv').config();
const port = 4000;
const MONGO_URI = 'mongodb+srv://guptashivamsg02:1122334455@cluster0.nnqetgf.mongodb.net/GrocerEase'
const STRIPE_SECRET_KEY = 'sk_test_51PnykdP4EAP1PB1lwjg1QCx3TGYTJij22Xi12FEBw9LBDnZIesvuJZXf7KxXMigAhwYxS8t4P2HUKAeUVtI9t2PY00IZrT2ekf'
const url = 'http://localhost:4000'
app.use(express.json());
app.use(cors());    //to connect from react frontend

//DB connection with mongo DB

// const connectDB = async ()=>{
//     await mongoose.connect('').then(()=>console.log("DB connected"));
// }

// connectDB();
mongoose.connect(MONGO_URI)
    .then(() => console.log("DB connected"))
    .catch(err => console.error("DB connection error:", err));
//API Creation

app.get("/",(req,res)=>{
    res.send("Express App Is Running");
})


//Image Storage 
const storage=multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)   //it will return the newname for the uploaded image
    }
})
const upload=multer({storage:storage})

//creating upload endpoint for images
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

//Schema for creating product 
const Product=mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
    description:{
        type:String,
        required:true,
    }

})

//Add product API to store the product in DB
app.post("/addproduct", async (req, res) => {
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array=products.slice(-1);
        let last_product=last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
       id:id,
       name:req.body.name,
       image:req.body.image,
       category:req.body.category,
       new_price:req.body.new_price,
       old_price:req.body.old_price, 
       description:req.body.description,
    });
    console.log(product);
    await product.save();
    console.log("saved");
    res.json({
        success: true,
        name:req.body.name,
    })
})

//creating API for deleting products
app.post('/removeproduct', async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// creating API for getting all product
app.get('/allproducts',async (req,res)=>{
    let products= await Product.find({});
    console.log("All Products Fetched");
    res.json(products);
})

//Schema creatinig for user model
const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    address:{
        type:String,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//creating API for Registerning new user
app.post('/signup',async (req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({sucess:false,errors:"existing User Found with same email address"})               //success is false because the user about already exist form this email
    }
    let cart = {};
    for(let i=0;i<300;i++){
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })
    await user.save();
    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom');  //token will not be readable
    res.json({success:true, token})
})

//creating API for user login
app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare=req.body.password===user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true, token})     
        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
    }
    else{
        console.log("user doesn't exist");
        res.json({success:false,errors:"User Not Found"});
    }
})

//Creating API for new Collection Data
app.get('/newcollections', async (req,res)=>{
    let products = await Product.find({});
    let newcollection=products.slice(1).slice(-8);
    console.log("New collection Fetched");
    res.json(newcollection);
})

//API for popular in snacks
app.get('/popularinsnacks',async (req,res)=>{
    let products = await Product.find({category:"Snacks"});
    let popular_in_snacks =products.slice(0,4);
    console.log("Popular in Snacks fetched");
    res.json(popular_in_snacks);
   
})

//creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    
    if (!token) {
        return res.status(401).json({ errors: "Please Authenticate using a valid Token" });
    }
    try {
        const data = jwt.verify(token, 'secret_ecom');
        req.user = data.user;
        next();
    } catch (error) {
        return res.status(401).json
        
        ({ errors: "Please Authenticate Using a Valid Token" });
    }
};

//get user for profile
app.post('/getuser', fetchUser, async (req, res) => {
    try {
        const user = await Users.findById(req.user.id).select('-password'); // Exclude password
        res.json(user);
    } catch (error) {
        res.status(500).json('Server Error');
    }
});

// API for updating user profile
app.put('/updateuser', fetchUser, async (req, res) => {
    const { name, email, address } = req.body; // Add any other fields you want to update
    try {
        const updatedUser = await Users.findOneAndUpdate(
            { _id: req.user.id },
            { name, email, address }, // Update the fields you want to modify
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating user', error });
    }
});

//Creating API for adding porducts in cart data in db
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Added", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });

    // Check if the item exists in the cart; if not, initialize it
    if (!userData.cartData[req.body.itemId]) {
        userData.cartData[req.body.itemId] = 0;
    }
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.json("Added");
});

//Creating API to remove the products from the cart data in db
app.post('/removefromcart', fetchUser, async (req,res)=>{
    console.log("Removed",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});          //finding the user id generated by by the mongdb
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})  //updating the users cart item in db
    res.json("Removed")
})

//Creating API to get cart data from db
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("GetCart");
    console.log("User ID:", req.user.id); 
    let userData = await Users.findOne({ _id: req.user.id });
    if (!userData) {
        return res.status(404).json({ error: "User not found" }); 
    }
    res.json(userData.cartData);
});


//API to store Reviews
// Review Schema
const Review = mongoose.model('Review', {
    productId: {
        type: Number,
        required: true,
    },
    userName: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    comment: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

// API to submit a new review
app.post('/addreview', async (req, res) => {
    const review = new Review({
        productId: req.body.productId,
        userName: req.body.userName,
        rating: req.body.rating,
        comment: req.body.comment,
    });
    await review.save();
    console.log("Review Added");
    res.json({ success: true, message: 'Review added successfully' });
});

// API to get reviews for a specific product
app.get('/reviews/:productId', async (req, res) => {
    const reviews = await Review.find({ productId: req.params.productId });
    res.json(reviews);
});

// API for updating a product
app.put('/updateproduct', async (req, res) => {
    const { id, name, old_price, new_price } = req.body;
    try {
        // Find and update the product
        const updatedProduct = await Product.findOneAndUpdate(
            { id: id },
            { name, old_price, new_price },
            { new: true } // Return the updated document
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, product: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating product', error });
    }
});

//payment backend
const Order = mongoose.model('Order', {
    userId: {
        type: String,
        required: true
    },
    items: {
        type: Array,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    address: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        default: "Order Processing"
    },
    date: {
        type: Date,
        default: Date.now()
    },
    payment: {
        type: Boolean,
        default: false
    }
});

// import stripe from "stripe"
const stripe = require('stripe')(STRIPE_SECRET_KEY);

app.post('/place',fetchUser, async (req, res) => {
    try {
        console.log(req.body);  // Log the request body
        

        const newOrder = new Order({
            userId: { _id: req.user.id },
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address
        });
        

        await newOrder.save();
        await Users.findByIdAndUpdate({ _id: req.user.id },{cartData:{}});

        const line_items = req.body.items.map((item) => ({
            price_data: {
                currency: 'inr',
                product_data: {
                    name: item.name,
                },
                unit_amount: item.new_price * 100 // Convert price to paise
            },
            quantity: item.quantity
        }));
        
        line_items.push({
            price_data: {
                currency: 'inr',
                product_data: {
                    name: 'Delivery Charges',
                },
                unit_amount: 200 // Delivery charges in paise
            },
            quantity: 1
        });
        
        


        const session = await stripe.checkout.sessions.create({

            line_items: line_items,
            mode: 'payment',
            success_url: `https://grocerease-frontend-r8sk.onrender.com/?payment=success`,
            cancel_url: `https://grocerease-frontend-r8sk.onrender.com/?payment=failed`,
        });

        res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
});




app.post('/verify', fetchUser, async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success === "true") {
            await Order.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Paid" });
        } else {
            await Order.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Payment Failed" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
});


//userOrder of Frontend
app.post('/userorders', fetchUser, async (req, res) => {
    try {
        // Use req.user.id instead of req.body.userId
        const orders = await Order.find({ userId: req.user.id });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.log("Error:", error);
        res.json({ success: false, message: "Error" });
    }
});



//listing orders for admin panel
app.get('/list', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json({ success: true, data: orders });
    } catch (error) {
        console.log("Error:", error);
        res.json({ success: false, message: "Error" });
    }
})



//api for admin to update order status

app.post('/status', async (req, res) => {
    try {
        const { orderId, status } = req.body;
        await Order.findByIdAndUpdate(orderId, { status:req.body.status });
        res.json({ success: true, message: "Status updated" });
    } catch (error) {
        // console.log("Error:", error);
        res.json({ success: false, message: "Error" });
    }
})


//api creation
app.listen(port, (error)=>{
    if(!error){
        console.log(`Server is running on port ${port}`);
    }
    else{
        console.log(`Error : ${error}`);
    }
})





