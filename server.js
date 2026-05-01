const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static("public"));

const EIA_KEY = process.env.EIA_KEY;
const ORS_KEY = process.env.ORS_KEY;

// -------------------------------
// GAS MAP ROUTE (PROTECTED)
// -------------------------------
app.get("/api/gas/us/map", async (req, res) => {
  try {
    const url =
      "https://api.eia.gov/v2/petroleum/pri/gnd/data/" +
      `?api_key=${EIA_KEY}` +
      `&frequency=weekly` +
      `&data[0]=value` +
      `&facets[product][]=EPM0` +
      `&facets[product][]=EPD2DXL0` +
      `&facets[duoarea][]=NUS` +
      `&facets[duoarea][]=SCA` +
      `&facets[duoarea][]=SCO` +
      `&facets[duoarea][]=SFL` +
      `&facets[duoarea][]=SMA` +
      `&facets[duoarea][]=SMN` +
      `&facets[duoarea][]=SNY` +
      `&facets[duoarea][]=SOH` +
      `&facets[duoarea][]=STX` +
      `&facets[duoarea][]=SWA` +
      `&facets[duoarea][]=Y05LA` +
      `&facets[duoarea][]=Y05SF` +
      `&facets[duoarea][]=Y35NY` +
      `&facets[duoarea][]=Y44HO` +
      `&facets[duoarea][]=Y48SE` +
      `&facets[duoarea][]=YBOS` +
      `&facets[duoarea][]=YDEN` +
      `&facets[duoarea][]=YMIA` +
      `&facets[duoarea][]=YORD` +
      `&start=2026-04-27` +
      `&end=2026-04-27` +
      `&length=5000`;

    const response = await axios.get(url);

    const data =
      response.data?.response?.data ||
      response.data?.data ||
      [];

    const map = {};

    for (const row of data) {
      const region = row.duoarea;
      const product = row.product;
      const value = Number(row.value);

      if (!region || isNaN(value)) continue;

      if (!map[region]) {
        map[region] = { gasoline: null, diesel: null };
      }

      if (product === "EPM0") map[region].gasoline = value;
      if (product === "EPD2DXL0") map[region].diesel = value;
    }

    res.json({
      source: "EIA-map",
      regions: map
    });

  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      error: "failed to build map data",
      details: err.message
    });
  }
});

// -------------------------------
// ROUTE API (OPENROUTESERVICE)
// -------------------------------
app.get("/api/route", async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.query;

    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        coordinates: [
          [parseFloat(startLng), parseFloat(startLat)],
          [parseFloat(endLng), parseFloat(endLat)]
        ]
      },
      {
        headers: {
          Authorization: ORS_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    res.status(500).json({
      error: "route failed",
      details: err.message
    });
  }
});

// -------------------------------
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// -------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`⛽ Server running on port ${PORT}`);
});