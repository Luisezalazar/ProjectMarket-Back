const express = require('express');
const pkg = require( "@prisma/client");
const Prisma = require( "@prisma/client");

//Call functions
const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();

//Route for order

//POST
router.post("/createOrder", async (req, res) => {
    try {
        const { state, customer, Product } = req.body
        let total = 0
        const order = await prisma.order.create({
            data: { state, total: 0, customer: { connect: { id: customer } } }
        })
        const items = await Promise.all(
            Product.map(async (product) => {
                const findProduct = await prisma.product.findUnique({
                    where: { id: (product.id) }
                })
                //Validation

                if (!findProduct) {
                    res.status(500).json({ error: "The product was not found" })
                }
                if (findProduct.stock < 0) { res.status(500).json({ error: "There is not stock" }) }
                if (Product.quantity < 1) { throw new Error("The quantity must be grater than 0") }
                if (findProduct.stock < product.quantity) {
                    throw new Error("There is not enough stock for that quantity")

                }

                //Count

                const subtotal = findProduct.price * product.quantity
                total += subtotal

                // Update stock
                const updateStock = findProduct.stock - product.quantity
                await prisma.product.update({
                    where: { id: product.id },
                    data: { stock: updateStock }
                })
                //Create ItemOrder

                return await prisma.itemOrder.create({
                    data: {
                        quantity: product.quantity,
                        subtotal,
                        product: { connect: { id: product.id } },
                        order: { connect: { id: order.id } }
                    }
                })
            }))
        //Update total 
        await prisma.order.update({
            where: { id: order.id },
            data: { total }
        })
        res.json({ orderId: order.id, total, items })

    } catch (error) { console.error("Error creating Order", error) }

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
        if (getOrder.length === 0) { return res.status(404).json({ error: "There is no data" }) }
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
        const validState = ['pending', 'in-progress', 'completed']
        if (!validState.includes(state)) {
            return res.status(400).json({ error: `Invalid state. Valid state are: ${validState}` })
        }
        const pathOrder = await prisma.order.update({
            where: {id},
            data: {state}
        })
        res.json({
            message : 'State Updated',
            order: pathOrder
        })
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Orden no encontrada.' });
        }
    }

})
module.exports = router;