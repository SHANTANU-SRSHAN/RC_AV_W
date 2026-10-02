const form = document.getElementById("userForm");
const submitButton = document.getElementById("submitButton");
const statusMessage = document.getElementById("statusMessage");

const dobInput = document.getElementById("dob");
const ageInput = document.getElementById("age");
const ageDisplay = document.getElementById("ageDisplay");

const phoneInput = document.getElementById("phone");


// =========================================================
// SET MAXIMUM DATE FOR DOB
// User future date select nahi kar sakta
// =========================================================

const today = new Date();

dobInput.max = today.toISOString().split("T")[0];


// =========================================================
// CALCULATE AGE
// =========================================================

function calculateAge(dateOfBirth) {

    const birthDate = new Date(dateOfBirth + "T00:00:00");
    const currentDate = new Date();

    let age =
        currentDate.getFullYear() -
        birthDate.getFullYear();

    const monthDifference =
        currentDate.getMonth() -
        birthDate.getMonth();

    const dayDifference =
        currentDate.getDate() -
        birthDate.getDate();


    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            dayDifference < 0
        )
    ) {
        age--;
    }


    return age;
}


// =========================================================
// DATE OF BIRTH CHANGE
// =========================================================

dobInput.addEventListener("change", function () {

    if (!this.value) {

        ageInput.value = "";

        ageDisplay.innerHTML = `
            <i class="fa-solid fa-cake-candles"></i>
            <span>
                Age will be calculated automatically
            </span>
        `;

        ageDisplay.classList.remove("active");

        return;
    }


    const age = calculateAge(this.value);


    // Validate age

    if (age < 0 || age > 120) {

        this.value = "";

        ageInput.value = "";

        ageDisplay.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>
                Please select a valid date
            </span>
        `;

        ageDisplay.classList.remove("active");

        return;
    }


    // Save calculated age

    ageInput.value = age;


    // Display age

    ageDisplay.innerHTML = `
        <i class="fa-solid fa-cake-candles"></i>
        <span>
            Your Age:
            <strong>${age} years</strong>
        </span>
    `;

    ageDisplay.classList.add("active");
});


// =========================================================
// PHONE NUMBER
// ONLY NUMBERS ALLOWED
// =========================================================

phoneInput.addEventListener("input", function () {

    this.value = this.value.replace(/\D/g, "");

});


// =========================================================
// FORM SUBMISSION
// =========================================================

form.addEventListener("submit", async function (event) {

    event.preventDefault();


    // =====================================================
    // VALIDATE DOB
    // =====================================================

    if (!dobInput.value) {

        statusMessage.textContent =
            "Please select your date of birth.";

        statusMessage.className =
            "status error";

        return;
    }


    // =====================================================
    // CALCULATE AGE AGAIN
    // =====================================================

    const age = calculateAge(dobInput.value);


    // =====================================================
    // VALIDATE AGE
    // =====================================================

    if (age < 0 || age > 120) {

        statusMessage.textContent =
            "Please select a valid date of birth.";

        statusMessage.className =
            "status error";

        return;
    }


    ageInput.value = age;


    // =====================================================
    // DISABLE SUBMIT BUTTON
    // =====================================================

    submitButton.disabled = true;

    submitButton.innerHTML = `
        <span>
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting...
        </span>
    `;


    statusMessage.textContent = "";

    statusMessage.className = "status";


    // =====================================================
    // COLLECT FORM DATA
    // =====================================================

    const userData = {

        fullName:
            document
                .getElementById("fullName")
                .value
                .trim(),

        email:
            document
                .getElementById("email")
                .value
                .trim(),

        qualification:
            document
                .getElementById("qualification")
                .value
                .trim(),

        phone:
            phoneInput.value.trim(),

        dob:
            dobInput.value,

        age:
            age,

        message:
            document
                .getElementById("message")
                .value
                .trim()
    };


    // =====================================================
    // SEND DATA TO SERVER
    // =====================================================

    try {

        const response = await fetch(
            "/api/submit",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(userData)
            }
        );


        const result = await response.json();


        // =================================================
        // CHECK SERVER RESPONSE
        // =================================================

        if (!response.ok) {

            throw new Error(
                result.message ||
                "Submission failed"
            );
        }


        // =================================================
        // SUCCESS
        // =================================================

        statusMessage.textContent =
            "✓ Information submitted successfully!";

        statusMessage.className =
            "status success";


        // Clear form

        form.reset();

        ageInput.value = "";


        // Reset age display

        ageDisplay.innerHTML = `
            <i class="fa-solid fa-cake-candles"></i>
            <span>
                Age will be calculated automatically
            </span>
        `;

        ageDisplay.classList.remove("active");


    } catch (error) {

        console.error(
            "Submission Error:",
            error
        );


        statusMessage.textContent =
            "✕ Something went wrong. Please try again.";

        statusMessage.className =
            "status error";
    }


    // =====================================================
    // ENABLE BUTTON AGAIN
    // =====================================================

    submitButton.disabled = false;

    submitButton.innerHTML = `
        <span>
            <i class="fa-solid fa-paper-plane"></i>
            Submit Information
        </span>

        <i class="fa-solid fa-arrow-right"></i>
    `;

});