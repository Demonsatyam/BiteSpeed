const express = require("express");
const router = express.Router();
const { identifyContact } = require("../services/identityService");

router.post("/", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ message: "Email or phoneNumber required" });
    }

    const result = await identifyContact(email, phoneNumber);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;