const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express(); // ✅ MUST BE FIRST (before any routes)

app.use(cors());
app.use(express.static("public"));

const EIA_KEY = process.env.EIA_KEY;
const ORS_KEY = process.env.ORS_KEY;

// -------------------------------
// ROOT TEST
// -------------------------------
app.get("/", (req, res) => {
  res.send("Fuel API running");
});

// -------------------------------
// GAS MAP API
// -------------------------------
app.get("/api/gas/us/map", async (req, res) => {
  try {
    const url =
      "https://api.eia.gov/v2/petroleum/pri/gnd/data/" +
      `?api_key=${EIA_KEY}` +
      `&frequency=weekly` +
      `&data[0]=value` +
      `&facets[product][]=EPM0` +
      `&facets[duoarea][]=NUS`;

    const response = await axios.get(url);

    const data =
      response.data?.response?.data ||
      response.data?.data ||
      [];

    let basePrice = 3.5;

    for (const row of data) {
      if (row.product === "EPM0") {
        basePrice = Number(row.value);
        break;
      }
    }

    const regions = {
      NUS: { gasoline: basePrice },
      STX: { gasoline: basePrice * 0.95 },
      SCA: { gasoline: basePrice * 1.15 },
      SCO: { gasoline: basePrice * 1.05 },
      SFL: { gasoline: basePrice * 1.02 },
      SMA: { gasoline: basePrice * 1.08 },
      SMN: { gasoline: basePrice * 0.97 },
      SNY: { gasoline: basePrice * 1.12 },
      SOH: { gasoline: basePrice * 0.98 },
      SWA: { gasoline: basePrice * 1.10 },
      YDEN: { gasoline: basePrice * 1.04 },
      YMIA: { gasoline: basePrice * 1.02 },
      YORD: { gasoline: basePrice * 1.06 }
    };

    res.json({
      source: "mock-multi-region",
      regions
    });

  } catch (err) {
    res.json({
      error: "failed to build map data",
      details: err.response?.data || err.message
    });
  }
});

// -------------------------------
// ROUTE API (FIXED + REQUIRED FOR MAP)
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
    console.log("ROUTE ERROR:", err.response?.data || err.message);

    res.json({
      error: "route failed",
      details: err.response?.data || err.message
    });
  }
});

// -------------------------------
app.listen(3000, () => {
  console.log("⛽ Server running on http://localhost:3000");
});