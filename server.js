const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");

app.use(express.json());
app.use(cors());

/* =======================
   CONEXIÓN MONGO
======================= */
if (!process.env.MONGO_URI) {
    console.error("MONGO_URI no definida");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB conectado"))
.catch(err => {
    console.error(err);
    process.exit(1);
});

/* =======================
   MODELOS
======================= */
const userSchema = new mongoose.Schema({
    nombre: String,
    email: { type: String, unique: true },
    password: String,
    isVIP: { type: Boolean, default: false }
});

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    img: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);

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
   REGISTER
======================= */
app.post("/register", async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            nombre,
            email,
            password: hashedPassword
        });

        await user.save();
        res.json({ message: "Usuario registrado" });

    } catch (err) {
        res.status(400).json({ message: "Email ya existe" });
    }
});

/* =======================
   LOGIN
======================= */
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user._id }, "secreto_super_seguro");

    res.json({
        token,
        user: {
            id: user._id,
            nombre: user.nombre,
            email: user.email,
            isVIP: user.isVIP
        }
    });
});

/* =======================
   PRODUCTOS
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
    res.json(product);
});

app.get("/products", async (req, res) => {
    const products = await Product.find().populate("owner", "nombre email");
    res.json(products);
});

app.delete("/products/:id", verifyToken, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "No encontrado" });

    if (product.owner.toString() !== req.userId)
        return res.status(403).json({ message: "No autorizado" });

    await product.deleteOne();
    res.json({ message: "Eliminado" });
});

/* =======================
   PUERTO
======================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});