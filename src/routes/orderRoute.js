const express = require('express');
const pkg = require("@prisma/client");


//Call functions
const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();

//Route for order

//POST
router.post("/createOrder", async (req, res) => {
    try {
        const { customer, Product, state } = req.body
        const customerId = parseInt(customer)
        let total = 0
        const order = await prisma.order.create({
            data: { state, total: 0, customer: { connect: { id: customerId } } }
        })

        const items = await Promise.all(
            Product.map(async (product) => {
                const productId = parseInt(product.id)
                const findProduct = await prisma.product.findUnique({
                    where: { id: (productId) }
                })
                //Validation

                const quantity = parseInt(product.quantity)
                if (!findProduct) {
                    res.status(500).json({ error: "The product was not found" })
                }
                if (findProduct.stock < 0) { res.status(500).json({ error: "There is not stock" }) }
                if (quantity < 1) { throw new Error("The quantity must be grater than 0") }
                if (findProduct.stock < quantity) {
                    throw new Error("There is not enough stock for that quantity")

                }

                //Count
                const subtotal = findProduct.price * quantity

                total += subtotal

                // Update stock
                const updateStock = findProduct.stock - quantity
                await prisma.product.update({
                    where: { id: productId },
                    data: { stock: updateStock }
                })
                //Create ItemOrder

                return await prisma.itemOrder.create({
                    data: {
                        quantity: quantity,
                        subtotal,
                        product: { connect: { id: productId } },
                        order: { connect: { id: order.id } }
                    }
                })
            }))
        //Update total 
        await prisma.order.update({
            where: { id: order.id },
            data: { total, state: req.body.state }
        })
        res.json({ orderId: order.id, total, items })

    } catch (error) {
        res.json("Error creating Order" + error)
    }

})

//GET
router.get("/getOrder", async (req, res) => {
    try {
        const getOrder = await prisma.order.findMany({
            include: {
                customer: true,
                ItemOrder: true
            }
        });
        if (getOrder.length === 0) { console.log('There is no data')}
        res.json(getOrder)
    } catch (error) { res.status(500).json({ error: "Error getting data" }) }
})

// export default router;

//GET By Id
router.get("/getOrderById/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getOrderById = await prisma.order.findMany({
            where: { id: id, },
            include:{
                customer:true,
                ItemOrder:{
                    include:{
                        product:true
                    }
                }
            }
        })
        res.json(getOrderById)
    } catch (error) {
        if (error.code === "P2025") { return res.status(400).json({ error: `Product does not exists` }) }
    }
})

// PATCH State
router.patch("/patchState/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const { state } = req.body
        const validState = ['pending', 'inProgress', 'completed']
        if (!validState.includes(state)) {
            return res.status(400).json({ error: `Invalid state. Valid state are: ${validState}` })
        }
        const pathOrder = await prisma.order.update({
            where: { id },
            data: { state }
        })
        res.json({
            message: 'State Updated',
            order: pathOrder
        })
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Orden no encontrada.' });
        }
        return
    }

})

//Update // By id
router.put("/updateOrder/:id", async (req, res) => {
    try {
        const id= parseInt(req.params.id)
        const customerId = parseInt(req.body.customer)

        const products= req.body.Product.map(p => ({
            id: parseInt(p.id),
            quantity: parseInt(p.quantity)
        }))

        const existsOrder = await prisma.order.findUnique({
            where: { id },
            include: { ItemOrder: true }
        });

        if (!existsOrder) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Update customer if changed
        if (customerId && customerId !== existsOrder.customerId) {
            await prisma.order.update({
                where: { id },
                data: { customerId }
            });
        }

    
        //Return stock the products
        for (const item of existsOrder.ItemOrder) {
            const productOld = await prisma.product.findUnique({
                where: { id: item.productId }
            });
            if (productOld) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: productOld.stock + item.quantity }
                });
            }
        }

        
        //Delete Items old
        await prisma.itemOrder.deleteMany({
            where: { orderId: id }
        });

        // Insert new products
        let total = 0;
        for (const product of products) {
            const prod = await prisma.product.findUnique({ where: { id: product.id } });

            if (!prod) {
                return res.status(404).json({ error: `Product with ID ${product.id} not found` });
            }

            if (prod.stock < product.quantity) {
                return res.status(400).json({ error: `Not enough stock for product ID ${product.id}` });
            }

            const subtotal = prod.price * product.quantity;
            total += subtotal;

            await prisma.product.update({
                where: { id: product.id },
                data: { stock: prod.stock - product.quantity }
            });

            await prisma.itemOrder.create({
                data: {
                    quantity: product.quantity,
                    subtotal,
                    product: { connect: { id: product.id } },
                    order: { connect: { id } }
                }
            });
        }

        
        //Update total
        await prisma.order.update({
            where: { id },
            data: { total , state: req.body.state}

        });

        res.json({ message: "Order updated successfully" });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Error updating order" });
    }
});



//Delete by id
router.delete("/deleteOrder/:id", async (req, res) => {
    try {


        const id = parseInt(req.params.id)

        const deleteOrderById = await prisma.order.delete({
            where: {
                id: id,
            },
        })
        res.json(deleteOrderById);

    } catch (error) {
        if (error.code === "P2003") { return res.status(500).json({ error: `The order is linked to one or more orders` }) }
        if (error.code === "P2025") { return res.status(400).json({ error: `Order does not exists` }) }
        return res.status(500).json({ error: `Errors server: ${error}` })

    }

})

module.exports = router;