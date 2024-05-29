import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.sendFile("index.html");
});

router.get('/ping', function (req, res) {
    return res.json('pong');
})

export default router;