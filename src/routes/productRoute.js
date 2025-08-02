const express = require('express');
const pkg = require("@prisma/client");

//Call functions
const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();

//Route for product

//POST // Create 
router.post("/createProduct", async (req, res) => {
    try {
        const { name, price, stock, category : nameCategory} = req.body
        const parsePrice = parseFloat(price)
        const parseStock = parseInt(stock)

        
        //Validation
        if (!name || !nameCategory || !parsePrice || !parseStock) { return res.status(400).json({ error: "required fields are missing" }) }
        if (parseStock < 0 || parsePrice < 0) { return res.status(400).json({ error: "You cannot enter negative values" }) }

        //Find category
        let category = await prisma.category.findUnique({
            where: { name: nameCategory }
        })

        if (!category) {
            category = await prisma.category.create({
                data: { name: nameCategory }
            })
        }

        const product = await prisma.product.create({
            data: {
                name,
                price: parsePrice,
                stock: parseStock,
                category: { connect: { name: category.name } }
            }
        })
        res.json(product)
    } catch (error) { console.error("Error creating product", error) }
})
// export default router;

//GET // Read

router.get("/getProducts", async (req, res) => {
    try {
        const getProducts = await prisma.product.findMany({
            include: {
                category:true
            }
        });
        if (getProducts.length === 0) {
            console.log("No products")
        }
        res.json(getProducts)
    } catch (error) {
        res.status(500).json({ error: "Error getting data", error })
    }
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


//Api All Category
router.get("/getAllCategories", async(req,res)=>{
    try {
        const categories  = await prisma.category.findMany()
        res.json(categories)
    } catch (error) {
        console.error("Error fetching categories", error)
    }
})

//Api Models
router.get("/getProductModels", async (req,res)=>{
    try {
        const names = req.query.names?.split(",") || []
        const models = await prisma.category.findMany({
            where:{
                name:{
                    in:names
                }
            }
        })
        res.json(models)
    } catch (error) {
        console.log("Error getting specific categories")
    }
})
module.exports = router;