require("dotenv").config();

const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const app = express();

const PORT = process.env.PORT || 5000;


/* =========================================
   CHECK ENVIRONMENT VARIABLES
========================================= */

console.log("\n=========================================");
console.log("       AVIATION JOURNEY SERVER");
console.log("=========================================");

console.log(
    "EMAIL USER:",
    process.env.EMAIL_USER || "NOT SET"
);

console.log(
    "EMAIL PASS:",
    process.env.EMAIL_PASS
        ? `LOADED (${process.env.EMAIL_PASS.length} characters)`
        : "NOT LOADED"
);

console.log(
    "ADMIN EMAIL:",
    process.env.ADMIN_EMAIL || "NOT SET"
);

console.log(
    "GOOGLE SHEET ID:",
    process.env.GOOGLE_SHEET_ID
        ? "LOADED"
        : "NOT SET"
);

console.log(
    "GOOGLE SERVICE ACCOUNT JSON:",
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        || "NOT SET"
);

console.log("=========================================\n");


/* =========================================
   MIDDLEWARE
========================================= */

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================
   STATIC FILES
========================================= */

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =====================================
   GOOGLE AUTHENTICATION
===================================== */

let auth;

if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
        const serviceAccount = JSON.parse(
            process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        );

        auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: [
                "https://www.googleapis.com/auth/spreadsheets"
            ]
        });

        console.log("Google authentication: Environment variable");

    } catch (error) {
        console.error(
            "Invalid GOOGLE_SERVICE_ACCOUNT_JSON:",
            error.message
        );

        process.exit(1);
    }

} else {

    auth = new google.auth.GoogleAuth({
        keyFile: path.join(
            __dirname,
            "credentials",
            "service-account.json"
        ),
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets"
        ]
    });

    console.log(
        "Google authentication: Local service-account.json"
    );
}


/* =========================================
   GOOGLE SHEETS
========================================= */

const sheets = google.sheets({

    version: "v4",

    auth

});


/* =========================================
   GMAIL SMTP TRANSPORTER
========================================= */

const transporter =
    nodemailer.createTransport({

        host: "smtp.gmail.com",

        port: 465,

        secure: true,

        auth: {

            user:
                process.env.EMAIL_USER,

            pass:
                process.env.EMAIL_PASS

        }

    });


/* =========================================
   VERIFY GMAIL CONNECTION
========================================= */

transporter.verify(

    function (error, success) {

        if (error) {

            console.error(
                "\n❌ GMAIL AUTHENTICATION ERROR\n"
            );

            console.error(error);

            console.log(
                "\nCheck these values in .env:"
            );

            console.log(
                "1. EMAIL_USER"
            );

            console.log(
                "2. EMAIL_PASS"
            );

            console.log(
                "3. EMAIL_PASS must be Gmail App Password"
            );

            console.log(
                "4. App Password must belong to EMAIL_USER\n"
            );

        } else {

            console.log(
                "✅ GMAIL SMTP READY\n"
            );

        }

    }
);


/* =========================================
   HOME PAGE
========================================= */

app.get(
    "/",
    function (req, res) {

        res.sendFile(

            path.join(
                __dirname,
                "public",
                "index.html"
            )

        );

    }
);


/* =========================================
   SUBMIT API
========================================= */

app.post(
    "/api/submit",
    async function (req, res) {

        try {

            /* =================================
               GET FORM DATA
            ================================= */

            const {

                fullName,

                email,

                qualification,

                phone,

                dob,

                age,

                message

            } = req.body;


            /* =================================
               VALIDATION
            ================================= */

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


            /* =================================
               TIMESTAMP
            ================================= */

            const timestamp =

                new Date().toLocaleString(

                    "en-IN",

                    {

                        timeZone:
                            "Asia/Kolkata"

                    }

                );


            /* =================================
               SAVE DATA TO GOOGLE SHEET
            ================================= */

            console.log(
                "\nSaving data to Google Sheet..."
            );

            await sheets
                .spreadsheets
                .values
                .append({

                    spreadsheetId:

                        process.env
                            .GOOGLE_SHEET_ID,

                    range:
                        "Sheet1!A:H",

                    valueInputOption:
                        "USER_ENTERED",

                    requestBody: {

                        values: [

                            [

                                timestamp,

                                fullName,

                                email,

                                qualification,

                                phone,

                                dob,

                                age,

                                message || ""

                            ]

                        ]

                    }

                });


            console.log(
                "✅ Data saved to Google Sheet"
            );


            /* =================================
               EMAIL CONTENT
            ================================= */

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


            /* =================================
               SEND EMAIL
            ================================= */

            console.log(
                "Sending registration email..."
            );


            await transporter.sendMail({

                from:
                    `"Aviation Journey" <${process.env.EMAIL_USER}>`,

                to:
                    process.env.ADMIN_EMAIL,

                subject:
                    "New Aviation Journey Registration",

                text:
                    emailText

            });


            console.log(
                "✅ Registration email sent"
            );


            /* =================================
               SUCCESS RESPONSE
            ================================= */

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
                "\n========================================="
            );

            console.error(
                "❌ SUBMISSION ERROR"
            );

            console.error(
                "========================================="
            );

            console.error(
                error
            );

            console.error(
                "=========================================\n"
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


/* =========================================
   START SERVER
========================================= */

app.listen(

    PORT,

    function () {

        console.log(
            `🚀 Server running at http://localhost:${PORT}\n`
        );

    }

);