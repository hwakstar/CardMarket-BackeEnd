const expressAsyncHandler = require("express-async-handler");

const LinkModel = require("../../models/LinkModel");

const DeleteLink = expressAsyncHandler(async (req, res) => {
  try {
    await LinkModel.deleteOne(req.body);
    const links = await LinkModel.find();

    res.send({ status: true, links: links });
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = DeleteLink;
