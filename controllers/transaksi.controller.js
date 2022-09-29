const express = require("express");
const helper = require("../helper");
const axios = require("axios");
const router = express.Router();
const TransaksiModel = require("../models/transaksi.model");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const sendWhatsvuck = (phone, message) => {
  const payload = {
    phone: phone,
    message: message,
  };
  axios({
    method: "post",
    url: "http://localhost:5000/send",
    data: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
  })
    .then((response) => console.log(response.data))
    .catch((err) => console.log(err));
};

router.get("/", [isAuthenticated], async (req, res) => {
  let result = await TransaksiModel.all(req.query);
  result.forEach((element, index) => {
    result[index].detail = "/faktur/" + element._id;
  });
  res.json(result);
});

router.post("/", [isAuthenticated], async (req, res) => {
  let payload = req.body;
  let harga = 10000;
  payload.totalHarga = payload.berat * harga;
  payload.sisa =
    payload.uangMuka < payload.totalHarga
      ? payload.totalHarga - payload.uangMuka
      : 0;
  payload.kembali =
    payload.uangMuka > payload.totalHarga
      ? payload.uangMuka - payload.totalHarga
      : 0;
  payload.pic = {
    username: req.user.username,
    email: req.user.email,
  };

  TransaksiModel.terimaCucian(payload)
    .then((result) => {
      // console.log(payload.nomorHP);
      // sendWhatsapp(payload.nomorHP, "coba dulu");
      let arrBarang = [];
      payload.daftarBarang.forEach((element) => {
        arrBarang.push(`${element.nama} - ${element.jumlah}`);
      });
      result.data.cetakFaktur = "/faktur/download/" + result.result._id;
      var fullUrl =
        req.protocol +
        "://" +
        req.get("host") +
        req.originalUrl +
        result.data.cetakFaktur;
      const pesan = `${fullUrl}`;
      sendWhatsvuck(payload.nomorHP, pesan);
      res.json(result.data);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ message: err._message });
    });
});

router.get("/:nomorterima", [isAuthenticated], async (req, res) => {
  let nomorTerima = req.params.nomorterima;
  res.json(await TransaksiModel.get(nomorTerima));
});

router.put("/:nomorterima", [isAuthenticated], async (req, res) => {
  let nomorTerima = req.params.nomorterima;
  if (
    req.body.statusCucian === "belum" &&
    req.body.statusPengambilan === "sudah"
  ) {
    res.status(400).json({ message: "Invalid update!" });
  } else {
    let transaksi = await TransaksiModel.get(nomorTerima);
    if (
      req.body.statusPengambilan === "sudah" &&
      req.body.statusCucian === "sudah"
    ) {
      // TODO: beresin logic!
      let customBody = req.body;
      customBody.sisa = 0;
      customBody.uangMuka = transaksi.totalHarga;
      customBody.kembali = 0;
      res.json(await TransaksiModel.statusCucian(customBody, nomorTerima));
    } else if (
      req.body.statusPengambilan === "belum" &&
      req.body.statusCucian === "sudah"
    ) {
      res.json(await TransaksiModel.statusCucian(req.body, nomorTerima));
    }
  }
});

router.get("/download/:nomorterima", async (req, res) => {
  let nomorTerima = req.params.nomorterima;
  const faktur = await TransaksiModel.get(nomorTerima);
  helper.generatePDF(res, faktur);
});

module.exports = router;
