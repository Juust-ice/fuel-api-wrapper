const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const EIA_KEY = process.env.EIA_KEY;
const ORS_KEY = process.env.ORS_KEY;

// -------------------------------
// BASIC SAFETY CHECK (IMPORTANT)
// -------------------------------
if (!EIA_KEY) console.warn("⚠️ Missing EIA_KEY");
if (!ORS_KEY) console.warn("⚠️ Missing ORS_KEY");

// -------------------------------
// GAS MAP ROUTE
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
    console.log("EIA ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: "failed to build map data",
      details: err.message
    });
  }
});

// -------------------------------
// ROUTE API (FIXED + MORE RELIABLE)
// -------------------------------
app.get("/api/route", async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({
        error: "missing coordinates"
      });
    }

    const body = {
      coordinates: [
        [Number(startLng), Number(startLat)],
        [Number(endLng), Number(endLat)]
      ]
    };

    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      body,
      {
        headers: {
          Authorization: ORS_KEY,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        timeout: 10000
      }
    );

    res.json(response.data);

  } catch (err) {
    console.log("ORS ERROR:");
    console.log(err.response?.data || err.message);

    res.status(500).json({
      error: "route failed",
      details: err.response?.data || err.message
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