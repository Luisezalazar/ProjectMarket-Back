const express = require("express");
const customerRoute = require("./routes/customerRoute.js");
const productRoute = require("./routes/productRoute.js");
const orderRoute = require("./routes/orderRoute.js");
const category = require ("./routes/categoryRoute.js");

const cors = require('cors')

const app = express();

//Cors
app.use(cors());

app.use(express.json());


app.use('/api/customer', customerRoute)
app.use('/api/product', productRoute)
app.use('/api/order', orderRoute)
app.use('/api/category', category)



const port = 3000;
app.listen(port, () => console.log(`Activado en ${port}`))