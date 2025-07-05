import express from "express";
import bodyParser from "body-parser";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

const SHEET_ID = "YOUR_SHEET_ID"; // ← Your Google Sheet ID
const SHEET_NAME = "Reminderr";

const credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

app.get("/", (req, res) => {
  res.send("Railway webhook server is running 🚂");
});

app.post("/webhook", async (req, res) => {
  console.log("Received webhook:", JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const messages = change?.value?.messages;
    const buttonText = messages?.[0]?.button?.text;
    const msgContextId = messages?.[0]?.context?.id || messages?.[0]?.id;

    // For now: simulate Account value (later you can store mapping of msgContextId ↔ Account)
    const accountValue = "ACC123"; // Replace with actual lookup logic

    // Read all rows
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
    });

    const rows = readRes.data.values;
    if (!rows) throw new Error("No data found.");

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][3] === accountValue) { // Column D (Account)
        const rowNumber = i + 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${SHEET_NAME}!F${rowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[buttonText]],
          },
        });
        console.log(`✅ Updated Status for Account: ${accountValue}`);
        break;
      }
    }

    res.send("OK");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error updating sheet");
  }
});

// Use Railway provided PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
