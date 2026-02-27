const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* =======================
   CONEXIÓN MONGO (ATLAS)
======================= */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB conectado 🌎"))
.catch(err => console.log(err));

/* =======================
   CONFIG MULTER
======================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

/* =======================
   MODELOS
======================= */
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    isVIP: { type: Boolean, default: false },
    totalSales: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now },
    stripeAccountId: String,
    nequi: String,
    daviplata: String,
    strikes: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false }
});

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    img: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    commission: Number,
    status: {
        type: String,
        enum: ["pendiente_envio","enviado","confirmado","disputa","reembolsado"],
        default: "pendiente_envio"
    },
    evidence: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Order = mongoose.model("Order", orderSchema);

/* =======================
   MIDDLEWARE TOKEN
======================= */
function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(403).json({ message: "Token requerido" });

    const token = authHeader.split(" ")[1];
    jwt.verify(token, "secreto_super_seguro", (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token inválido" });
        req.userId = decoded.id;
        next();
    });
}

/* =======================
   CREAR PRODUCTO
======================= */
app.post("/products", verifyToken, async (req, res) => {
    const { name, price, category, img } = req.body;

    const product = new Product({
        name,
        price,
        category,
        img,
        owner: req.userId
    });

    await product.save();
    res.json({ message: "Producto publicado ✅", product });
});

/* =======================
   LISTAR PRODUCTOS (GLOBAL)
======================= */
app.get("/products", async (req, res) => {
    const products = await Product.find()
        .populate("owner", "username isVIP nequi daviplata");

    res.json(products);
});

/* =======================
   ELIMINAR PRODUCTO
======================= */
app.delete("/products/:id", verifyToken, async (req,res)=>{
    const product = await Product.findById(req.params.id);
    if(!product) return res.status(404).json({message:"Producto no encontrado"});
    if(product.owner.toString() !== req.userId)
        return res.status(403).json({message:"No autorizado"});

    await product.deleteOne();
    res.json({message:"Producto eliminado ✅"});
});

/* =======================
   CHECKOUT
======================= */
app.post("/checkout", verifyToken, async (req, res) => {
    const { productId } = req.body;

    const product = await Product.findById(productId).populate("owner");
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    const seller = product.owner;
    const commissionRate = seller.isVIP ? 0.035 : 0.10;
    const commission = Math.round(product.price * commissionRate);

    const order = new Order({
        product: product._id,
        buyer: req.userId,
        seller: seller._id,
        amount: product.price,
        commission
    });

    await order.save();
    res.json({ message: "Orden creada ✅", order });
});

/* =======================
   MIS ÓRDENES
======================= */
app.get("/my-orders", verifyToken, async (req,res)=>{
    const orders = await Order.find({
        $or: [{buyer:req.userId},{seller:req.userId}]
    }).populate("product buyer seller");

    res.json(orders);
});

/* =======================
   SERVIDOR
======================= */
app.listen(5000, () => {
    console.log("Servidor corriendo en puerto 5000 🚀");
});