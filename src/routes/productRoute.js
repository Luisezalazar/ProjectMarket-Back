const express = require('express');
const pkg = require("@prisma/client");
const cloudinary = require('cloudinary').v2;

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
                    create:imageFiles.map((img, index)=>({
                        url: img.path,
                        order: index
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
                images: {
                    orderBy: { order: 'asc' }
                },
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
            include:{
                images: {
                    orderBy: { order: 'asc' }
                }
            }
        })
        if (!getProductsbyid) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getProductsbyid)
    } catch (error) {
        res.status(500).json({ error: "Error getting data" })

    }
})

//UPDATE // By id
router.put("/updateProducts/:id", upload.array('images', 5), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, price, stock, imagesToDelete, existingImagesOrder } = req.body;
        const newImageFiles = req.files || [];
        
        console.log("Update request:", { name, price, stock, imagesToDelete, existingImagesOrder, newImagesCount: newImageFiles.length });
        
        if (!name || price == null || stock == null) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const parsePrice = parseFloat(price);
        const parseStock = parseInt(stock);

        if (parseStock < 0 || parsePrice < 0) {
            return res.status(400).json({ error: "You cannot enter negative values" });
        }

        // Start a transaction to ensure data consistency
        const result = await prisma.$transaction(async (prisma) => {
            // Delete specified images if any
            if (imagesToDelete) {
                const imageIds = JSON.parse(imagesToDelete);
                if (imageIds.length > 0) {
                    // Get image URLs before deletion for Cloudinary cleanup
                    const imagesToDeleteFromDB = await prisma.image.findMany({
                        where: {
                            id: { in: imageIds },
                            productId: id
                        }
                    });

                    // Delete images from database
                    await prisma.image.deleteMany({
                        where: {
                            id: { in: imageIds },
                            productId: id
                        }
                    });

                    // Delete images from Cloudinary
                    for (const image of imagesToDeleteFromDB) {
                        try {
                            // Extract public_id from Cloudinary URL
                            const urlParts = image.url.split('/');
                            const fileWithExtension = urlParts[urlParts.length - 1];
                            const publicId = `products/${fileWithExtension.split('.')[0]}`;
                            
                            await cloudinary.uploader.destroy(publicId);
                            console.log(`Deleted image from Cloudinary: ${publicId}`);
                        } catch (cloudinaryError) {
                            console.error("Error deleting from Cloudinary:", cloudinaryError);
                        }
                    }
                }
            }

            // Update order of existing images
            if (existingImagesOrder) {
                const imageOrder = JSON.parse(existingImagesOrder);
                for (let i = 0; i < imageOrder.length; i++) {
                    await prisma.image.update({
                        where: { id: imageOrder[i].id },
                        data: { order: i }
                    });
                }
            }

            // Add new images if any
            if (newImageFiles.length > 0) {
                // Get the current max order for existing images
                const maxOrderResult = await prisma.image.aggregate({
                    where: { productId: id },
                    _max: { order: true }
                });
                const startOrder = (maxOrderResult._max.order || -1) + 1;

                await prisma.image.createMany({
                    data: newImageFiles.map((file, index) => ({
                        url: file.path,
                        productId: id,
                        order: startOrder + index
                    }))
                });
            }

            // Update product basic information
            const updatedProduct = await prisma.product.update({
                where: { id: id },
                data: {
                    name,
                    price: parsePrice,
                    stock: parseStock
                },
                include: {
                    images: {
                        orderBy: { order: 'asc' }
                    },
                    category: true
                }
            });

            return updatedProduct;
        });

        res.json(result);
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Error updating product" });
    }
})

//Delete by id
router.delete("/deleteProducts/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)

        //Find product with category and images
        const product = await prisma.product.findUnique({
            where: { id },
            include: { category: true, images: true, }
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const nameCategory = product.category?.name

        // Delete images from Cloudinary before deleting the product
        for (const image of product.images) {
            try {
                // Extract public_id from Cloudinary URL
                const urlParts = image.url.split('/');
                const fileWithExtension = urlParts[urlParts.length - 1];
                const publicId = `products/${fileWithExtension.split('.')[0]}`;
                
                await cloudinary.uploader.destroy(publicId);
                console.log(`Deleted image from Cloudinary: ${publicId}`);
            } catch (cloudinaryError) {
                console.error("Error deleting from Cloudinary:", cloudinaryError);
            }
        }

        //Delete product (this will cascade delete images due to foreign key)
        const deleteProductsById = await prisma.product.delete({
            where: { id },
        })
        
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

        res.json(deleteProductsById);

    } catch (error) {
        console.error("Error deleting product:", error);
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