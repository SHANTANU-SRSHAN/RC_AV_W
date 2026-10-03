require("dotenv").config();

const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const app = express();

const PORT = process.env.PORT || 3000;

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
   Loaded from Environment Variable
===================================== */

let serviceAccount;

try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_BASE64 environment variable is missing."
        );
    }

    const serviceAccountJson = Buffer
        .from(
            process.env.GOOGLE_SERVICE_ACCOUNT_BASE64,
            "base64"
        )
        .toString("utf8");

    serviceAccount = JSON.parse(serviceAccountJson);

    console.log("GOOGLE SERVICE ACCOUNT LOADED");

} catch (error) {

    console.error(
        "GOOGLE SERVICE ACCOUNT ERROR:",
        error.message
    );

}

/* =====================================
   GOOGLE AUTHENTICATION
===================================== */

let auth = null;
let sheets = null;

if (serviceAccount) {

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
            "GMAIL SMTP ERROR:",
            error.message
        );

    } else {

        console.log(
            "GMAIL SMTP READY"
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
   SUBMIT API
===================================== */

app.post(
    "/api/submit",
    async (req, res) => {

        try {

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

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please fill all required fields."

                    });

            }

            /* -----------------------------
               CHECK GOOGLE CONFIG
            ------------------------------ */

            if (!sheets) {

                console.error(
                    "Google Sheets is not configured."
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
                "Google Sheet saved successfully."
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
                "Email notification sent successfully."
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
                "SUBMISSION ERROR"
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
   START SERVER
===================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);