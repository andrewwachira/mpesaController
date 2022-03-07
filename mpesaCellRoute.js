const router = require("express").Router();
const {makeTransaction,mpesaHooks} = require("../controllers/mpesaController.js");

router.post("/",makeTransaction)
router.post("/callBack",mpesaHooks)
module.exports = router;