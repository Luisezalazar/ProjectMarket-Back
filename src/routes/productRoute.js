const express = require('express');
const pkg = require("@prisma/client");

const upload = require('../cloudinaryUploader');
//Call functions
const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();

//Route for product

//POST // Create 
router.post("/createProduct", upload.array('images', 5), async (req, res) => {
    try {
        const { name, price, stock, description, category: nameCategory } = req.body
        const imageFiles = req.files;
        const parsePrice = parseFloat(price)
        const parseStock = parseInt(stock)

        //Validation
        if (!name || !nameCategory || !parsePrice || !parseStock || !description) { return res.status(400).json({ error: "required fields are missing" }) }
        if (parseStock < 0 || parsePrice < 0) { return res.status(400).json({ error: "You cannot enter negative values" }) }

        //Find category
        let category = await prisma.category.findUnique({
            where: { name: nameCategory }
        })

        if (!category) {
            category = await prisma.category.create({
                data: { name: nameCategory, urlImage: null }
            })
        }

        const product = await prisma.product.create({
            data: {
                name,
                price: parsePrice,
                stock: parseStock,
                description,
                category: { connect: { name: category.name } },
                images:{
                    create:imageFiles.map((img)=>({
                        url: img.path
                    }))
                }
            },
            include:{images:true}
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
                category: true,
                images:true,
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

//GET BY ID  Product// Read
router.get("/getProducts/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getProductsbyid = await prisma.product.findUnique({
            where: {id: id,},
            include:{images:true}
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
})

//Delete by id
router.delete("/deleteProducts/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)

        //Find product with category
        const product = await prisma.product.findUnique({
            where: { id },
            include: { category: true, images: true, }
        });

        const nameCategory = product.category?.name

        //Delete product
        const deleteProductsById = await prisma.product.delete({
            where: { id },
        })
        res.json(deleteProductsById);

        //There are products with this category?
        const categoryProducts = await prisma.product.findMany({
            where: { category: { name: nameCategory } }
        })
        //If there are no more products with that category
        if (categoryProducts.length === 0 && nameCategory) {
            await prisma.category.delete({
                where: { name: nameCategory },
            })
        }

    } catch (error) {
        if (error.code === "P2003") { return res.status(500).json({ error: `The product is linked to one or more orders` }) }
        if (error.code === "P2025") { return res.status(400).json({ error: `Product does not exists` }) }
        return res.status(500).json({ error: `Error server: ${error.code}` })

    }

})



//Api Models
router.get("/getProductModels", async (req, res) => {
    try {
        const names = req.query.names?.split(",") || []
        const models = await prisma.category.findMany({
            where: {
                name: {
                    in: names
                }
            }
        })
        res.json(models)
    } catch (error) {
        console.log("Error getting specific categories")
    }
})
module.exports = router;