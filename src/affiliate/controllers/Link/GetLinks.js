const expressAsyncHandler = require("express-async-handler");

const LinkModel = require("../../models/LinkModel");

const GetLinks = expressAsyncHandler(async (req, res) => {
  try {
    const allLinks = await LinkModel.find();
    res.send({ status: true, allLinks: allLinks });
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = GetLinks;
