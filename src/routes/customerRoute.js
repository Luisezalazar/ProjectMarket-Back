const express = require('express');
const pkg = require( "@prisma/client");

//Call functions
const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();

//Routes for customer

//POST // Create
router.post("/createCustomer", async (req, res) => {
    try {
        const { name, email, phone } = req.body
        //Validation
        if (!name || !email || !phone) { return res.status(400).json({ error: "required fields are missing" }) }
        const customer = await prisma.customer.create({
            data: {
                name,
                email,
                phone
            }
        })
        res.json(customer)
    } catch (error) { console.error("Error creating customer") }
})
// export default router;

//GET // Read

router.get("/getCustomers", async (req, res) => {
    try {
        const getCustomers = await prisma.customer.findMany({});
        if(getCustomers.length === 0) { console.log('There is no data')}
        res.json(getCustomers)
        
    } catch (error) {
        res.status(500).json({error: "Error getting data"})
    }
});

//GET BY ID // Read
router.get("/getCustomers/:id", async (req,res) => {
    try {
        const id = parseInt(req.params.id)
        const getCustomersById = await prisma.customer.findUnique({
            where : {
                id: id,
            },
        })
        if(!getCustomersById) { return res.status(404).json({error: "There is no data"})}
        res.json(getCustomersById)
    } catch (error) {
        res.status(500).json({error: "Error getting data"})
    }
})

//UPDATE // By id
router.put("/updateCustomers/:id", async (req,res) => {
    try {
        const id = parseInt(req.params.id);
        const  { name ,email ,phone} = req.body
        if(!name == null || !email == null || !phone == null ){
            return res.status(400).json({error : "All fields are required"})
        }
        const updateCustomers = await prisma.customer.update({
            where : {id: id},
            data: {
                name,
                email,
                phone
            }
        })
        res.json(updateCustomers);
    } catch (error) {

    }
})

//DELETE by id
router.delete("/deleteCustomers/:id", async (req,res) => {
    try {
        const id = parseInt(req.params.id)
        const deleteCustomersById = await prisma.customer.delete({
            where: {
                id:id,
            },
        })
        res.json(deleteCustomersById);
    } catch (error) {
       if(error.code === "P2003"){res.status(500).json({error: `The customer is linked to one or more orders`})}
       res.status(500).json({error:`Error: ${error.code}`})
    }
})

module.exports = router;