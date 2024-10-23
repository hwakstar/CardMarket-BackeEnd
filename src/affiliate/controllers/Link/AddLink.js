const expressAsyncHandler = require("express-async-handler");

const LinkModel = require("../../models/LinkModel");

const AddLink = expressAsyncHandler(async (req, res) => {
  try {
    console.log(req.body);
    const newLink = new LinkModel(req.body);
    await newLink.save();

    const links = await LinkModel.find();

    res.send({ status: true, links: links });
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = AddLink;
