const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  // 🔥 NUEVO - SISTEMA MARKETPLACE
  isVIP: {
    type: Boolean,
    default: false
  },

  totalSales: {
    type: Number,
    default: 0
  },

  joinDate: {
    type: Date,
    default: Date.now
  },

  stripeAccountId: {
    type: String
  },

  nequi: {
    type: String
  },

  daviplata: {
    type: String
  },

  strikes: {
    type: Number,
    default: 0
  },

  isBlocked: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("User", userSchema);