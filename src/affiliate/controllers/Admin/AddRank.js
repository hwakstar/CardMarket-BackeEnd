const path = require("path");
const expressAsyncHandler = require("express-async-handler");

const AffRankModel = require("../../models/RankModel");
const deleteFile = require("../../../utils/delete");

const AddRank = expressAsyncHandler(async (req, res) => {
  const {
    id,
    name,
    deposite_commission,
    register_commission,
    start_amount,
    end_amount,
    last,
  } = req.body;

  try {
    const reqData = {
      name: name,
      deposite_commission: deposite_commission,
      register_commission: register_commission,
      start_amount: start_amount,
      end_amount: end_amount,
      last: JSON.parse(last),
    };

    if (req.file?.filename !== undefined) {
      reqData.img_url = `uploads/affRank/${req.file.filename}`;
    }

    if (id !== "" && id !== undefined) {
      const affRank = await AffRankModel.findOne({ _id: id });

      if (reqData.img_url && affRank.img_url) {
        const filePath = path.join("./", affRank.img_url);
        await deleteFile(filePath);
      }

      await AffRankModel.updateOne({ _id: id }, reqData);
      res.send({ status: true, type: 2 });
    } else {
      const newAffRank = new AffRankModel(reqData);
      await newAffRank.save();
      res.send({ status: true, type: 1 });
    }
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = AddRank;
