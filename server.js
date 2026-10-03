require("dotenv").config();

const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const app = express();

const PORT = process.env.PORT || 3000;

/* =====================================
   SERVER VERSION
===================================== */

console.log("=================================");
console.log("AVIATION JOURNEY SERVER");
console.log("BASE64 GOOGLE AUTH VERSION");
console.log("=================================");

/* =====================================
   MIDDLEWARE
===================================== */

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

/* =====================================
   STATIC FILES
===================================== */

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

/* =====================================
   GOOGLE SERVICE ACCOUNT
   Loaded from Vercel Environment Variable
===================================== */

let serviceAccount = null;

try {
    const base64Credentials =
        process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;

    if (!base64Credentials) {
        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_BASE64 environment variable is missing."
        );
    }

    // Remove accidental spaces/newlines from pasted Base64
    const cleanBase64 =
        base64Credentials.replace(/\s/g, "");

    const serviceAccountJson =
        Buffer
            .from(cleanBase64, "base64")
            .toString("utf8");

    serviceAccount =
        JSON.parse(serviceAccountJson);

    console.log(
        "✅ GOOGLE SERVICE ACCOUNT LOADED"
    );

} catch (error) {

    console.error(
        "❌ GOOGLE SERVICE ACCOUNT ERROR:",
        error.message
    );

}

/* =====================================
   GOOGLE SHEETS AUTHENTICATION
===================================== */

let auth = null;
let sheets = null;

if (serviceAccount) {

    try {

        auth = new google.auth.GoogleAuth({

            credentials: serviceAccount,

            scopes: [
                "https://www.googleapis.com/auth/spreadsheets"
            ]

        });

        sheets = google.sheets({

            version: "v4",

            auth

        });

        console.log(
            "✅ GOOGLE SHEETS CLIENT READY"
        );

    } catch (error) {

        console.error(
            "❌ GOOGLE SHEETS AUTH ERROR:",
            error.message
        );

    }

}

/* =====================================
   EMAIL TRANSPORTER
===================================== */

const transporter =
    nodemailer.createTransport({

        service: "gmail",

        auth: {

            user:
                process.env.EMAIL_USER,

            pass:
                process.env.EMAIL_PASS

        }

    });

/* =====================================
   CHECK GMAIL
===================================== */

transporter.verify((error) => {

    if (error) {

        console.error(
            "❌ GMAIL SMTP ERROR:",
            error.message
        );

    } else {

        console.log(
            "✅ GMAIL SMTP READY"
        );

    }

});

/* =====================================
   HOME PAGE
===================================== */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);

/* =====================================
   HEALTH CHECK
===================================== */

app.get(
    "/api/health",
    (req, res) => {

        res.status(200).json({

            success: true,

            googleSheets:
                !!sheets,

            gmail:
                !!process.env.EMAIL_USER &&
                !!process.env.EMAIL_PASS,

            version:
                "BASE64_GOOGLE_AUTH"

        });

    }
);

/* =====================================
   SUBMIT API
===================================== */

app.post(
    "/api/submit",
    async (req, res) => {

        try {

            console.log(
                "================================="
            );

            console.log(
                "📩 SUBMIT REQUEST RECEIVED"
            );

            const {

                fullName,
                email,
                qualification,
                phone,
                dob,
                age,
                message

            } = req.body;

            /* -----------------------------
               VALIDATION
            ------------------------------ */

            if (
                !fullName ||
                !email ||
                !qualification ||
                !phone ||
                !dob ||
                age === undefined ||
                age === null
            ) {

                console.error(
                    "❌ FORM VALIDATION FAILED"
                );

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please fill all required fields."

                    });

            }

            /* -----------------------------
               CHECK GOOGLE SHEETS
            ------------------------------ */

            if (!sheets) {

                console.error(
                    "❌ GOOGLE SHEETS IS NOT CONFIGURED"
                );

                return res
                    .status(500)
                    .json({

                        success: false,

                        message:
                            "Google Sheets configuration error."

                    });

            }

            /* -----------------------------
               CHECK SHEET ID
            ------------------------------ */

            if (!process.env.GOOGLE_SHEET_ID) {

                console.error(
                    "❌ GOOGLE_SHEET_ID IS MISSING"
                );

                return res
                    .status(500)
                    .json({

                        success: false,

                        message:
                            "Google Sheet ID is missing."

                    });

            }

            /* -----------------------------
               TIMESTAMP
            ------------------------------ */

            const timestamp =
                new Date()
                    .toLocaleString(
                        "en-IN",
                        {
                            timeZone:
                                "Asia/Kolkata"
                        }
                    );

            /* -----------------------------
               SAVE TO GOOGLE SHEET
            ------------------------------ */

            console.log(
                "Saving data to Google Sheet..."
            );

            await sheets
                .spreadsheets
                .values
                .append({

                    spreadsheetId:
                        process.env.GOOGLE_SHEET_ID,

                    range:
                        "Sheet1!A:H",

                    valueInputOption:
                        "USER_ENTERED",

                    requestBody: {

                        values: [[

                            timestamp,
                            fullName,
                            email,
                            qualification,
                            phone,
                            dob,
                            age,
                            message || ""

                        ]]

                    }

                });

            console.log(
                "✅ GOOGLE SHEET SAVED SUCCESSFULLY"
            );

            /* -----------------------------
               EMAIL CONTENT
            ------------------------------ */

            const emailText = `

NEW AVIATION JOURNEY REGISTRATION

========================================

Full Name:
${fullName}

Email:
${email}

Qualification:
${qualification}

Phone Number:
${phone}

Date of Birth:
${dob}

Age:
${age} years

Message:
${message || "No message provided"}

========================================

Submitted:
${timestamp}

`;

            /* -----------------------------
               SEND EMAIL
            ------------------------------ */

            console.log(
                "Sending email notification..."
            );

            await transporter.sendMail({

                from:
                    process.env.EMAIL_USER,

                to:
                    process.env.ADMIN_EMAIL,

                subject:
                    "New Aviation Journey Registration",

                text:
                    emailText

            });

            console.log(
                "✅ EMAIL NOTIFICATION SENT SUCCESSFULLY"
            );

            console.log(
                "================================="
            );

            /* -----------------------------
               SUCCESS RESPONSE
            ------------------------------ */

            return res
                .status(200)
                .json({

                    success: true,

                    message:
                        "Information submitted successfully!"

                });

        }

        catch (error) {

            console.error(
                "================================="
            );

            console.error(
                "❌ SUBMISSION ERROR"
            );

            console.error(
                error
            );

            console.error(
                "================================="
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Server error. Please try again."

                });

        }

    }
);

/* =====================================
   EXPORT APP FOR VERCEL
===================================== */

module.exports = app;

/* =====================================
   START SERVER LOCALLY
===================================== */

if (!process.env.VERCEL) {

    app.listen(
        PORT,
        () => {

            console.log(
                `🚀 Server running at http://localhost:${PORT}`
            );

        }
    );

}