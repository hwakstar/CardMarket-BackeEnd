const path = require("path");
const expressAsyncHandler = require("express-async-handler");

const AffRankModel = require("../../models/RankModel");
const deleteFile = require("../../../utils/delete");

const DeleteRank = expressAsyncHandler(async (req, res) => {
  try {
    const rank = await AffRankModel.findOne(req.body);
    if (rank.img_url) {
      const filePath = path.join("./", rank.img_url);
      await deleteFile(filePath);
    }

    await AffRankModel.deleteOne(req.body);
    res.send({ status: true });
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = DeleteRank;
