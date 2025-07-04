const express = require('express');
const pkg = require( "@prisma/client");

//Call functions
const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();

//Route for product

//POST // Create 
router.post("/createProduct", async (req, res) => {
    try {
        const { name, price, stock } = req.body
        const parsePrice = parseFloat(price)
        const parseStock = parseInt(stock)
        //Validation
        if (!name || !parsePrice || !parseStock) { return res.status(400).json({ error: "required fields are missing" }) }
        if (parseStock < 0 || parsePrice < 0) { return res.status(400).json({ error: "You cannot enter negative values" }) }
        const product = await prisma.product.create({
            data: {
                name,
                price: parsePrice,
                stock: parseStock
            }
        })
        res.json(product)
    } catch (error) { console.error("Error creating product", error) }
})
// export default router;

//GET // Read

router.get("/getProducts", async (req, res) => {
    try {
        const getProducts = await prisma.product.findMany({});
        if (getProducts.length === 0) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getProducts)
    } catch (error) { res.status(500).json({ error: "Error getting data" }) }
})

//GET BY ID // Read
router.get("/getProducts/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getProductsbyid = await prisma.product.findUnique({
            where: {
                id: id,
            },
        })
        if (!getProductsbyid) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getProductsbyid)
    } catch (error) {
        res.status(500).json({ error: "Error getting data" })

    }
})

//UPDATE // By id
router.put("/updateProducts/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, price, stock } = req.body;
        console.log(req.body)
        if (!name == null || price == null || stock == null) {
            return res.status(400).json({ error: "All fields are required" })
        }
        const UpdateProducts = await prisma.product.update({
            where: { id: id },
            data: {
                name,
                price,
                stock
            }
        });
        res.json(UpdateProducts);
    } catch (error) {

    }
}
)

//Delete by id
router.delete("/deleteProducts/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const deleteProductsById = await prisma.product.delete({
            where: {
                id: id,
            },
        })
        res.json(deleteProductsById);

    } catch (error) {
        if (error.code === "P2003") { return res.status(500).json({ error: `The product is linked to one or more orders` }) }
        if (error.code === "P2025") { return res.status(400).json({ error: `Product does not exists` }) }
        return res.status(500).json({ error: `Error server: ${error.code}` })

    }

})
module.exports = router;