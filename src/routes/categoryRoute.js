const express = require('express');
const pkg = require("@prisma/client");

const upload = require('../cloudinaryUploader');
//Call functions
const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();


//Routes for Category 

//Api All Category
router.get("/getAllCategories", async (req, res) => {
    try {
        const categories = await prisma.category.findMany()
        res.json(categories)
    } catch (error) {
        console.error("Error fetching categories", error)
    }
})

//GET BY ID  // Read
router.get("/getCategory/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getCategoryId = await prisma.category.findUnique({
            where: {
                id: id,
            },
        })
        if (!getCategoryId) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getCategoryId)
    } catch (error) {
        res.status(500).json({ error: "Error getting data" })

    }
})

// UPDATE Category By ID
router.put("/updateCategory/:id", upload.single("image"), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name } = req.body;

        let urlImage = req.body.urlImage;

        if (req.file) {
            urlImage = req.file.path; // cloudinary devuelve la URL
        }

        if (!name && !urlImage) {
            return res.status(400).json({ error: "At least one field is required" });
        }

        const updateCategory = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(urlImage && { urlImage })
            }
        });

        res.json(updateCategory);
    } catch (error) {
        console.error("Error updating category", error);
        return res.status(500).json({ error: "Error updating category" });
    }
});
//Delete by id
router.delete("/deleteCategory/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Find the category with its products and images
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                products: {
                    include: { images: true }
                }
            }
        });

        if (!category) {
            return res.status(404).json({ error: "Category does not exist" });
        }

        // Delete all images of each product
        for (const product of category.products) {
            await prisma.image.deleteMany({
                where: { productId: product.id }
            });
        }

        // Delete all products of the category
        await prisma.product.deleteMany({
            where: { categoryId: id }
        });

        // Delete the category itself
        const deletedCategory = await prisma.category.delete({
            where: { id }
        });

        res.json({ message: "Category, its products and images were deleted", deletedCategory });
    } catch (error) {
        if (error.code === "P2003") {
            return res.status(500).json({ error: `The category is linked to one or more orders` });
        }
        if (error.code === "P2025") {
            return res.status(400).json({ error: `Category does not exist` });
        }
        return res.status(500).json({ error: `Server error: ${error.code}` });
    }

})

module.exports = router;