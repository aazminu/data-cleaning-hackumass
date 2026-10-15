document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    const fileInput = document.getElementById("fileInput");
    const emailInput = document.getElementById("emailInput");
    const message = document.getElementById("message");

    // Attach event listeners to option checkboxes for saving selections
    document.querySelectorAll(".option").forEach(checkbox => {
        checkbox.addEventListener("change", saveSelections);
    });

    // Handle form submission for uploading the file
    if (uploadForm) {
        uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                await uploadFileAndTriggerProcessing();
            } catch (error) {
                console.error("An error occurred:", error);
                message.textContent = "An error occurred during the process.";
            }
        });
    }

    // Save selected options to local storage
    function saveSelections() {
        const options = document.querySelectorAll(".option:checked");
        const selectedOptions = {};
        options.forEach(option => selectedOptions[option.value] = true); // save each option, using hash?table 

        localStorage.setItem("selectedOptions", JSON.stringify(selectedOptions)); //important - do not stringify again, will create format issue 
        
        console.log("Options saved to local storage:", selectedOptions); // log to verify options
        message.textContent = "Options saved, upload file.";
    }

    // Function to handle file upload and trigger processing
    async function uploadFileAndTriggerProcessing() {
        const file = fileInput.files[0]; //gets selected file - the first (and only ) one of course
        const email = emailInput.value; // gets user's email
        const selectedOptions = JSON.parse(localStorage.getItem("selectedOptions")) || {}; //get options

        // log selected options to verify before sending
        console.log("Selected options - local storage:", selectedOptions);

        const data = new FormData(); //creates formdata object - holds the data to be sent, appended in next lines
        data.append("file", file); 
        data.append("email", email);
        data.append("selectedOptions", JSON.stringify(selectedOptions)); // store options in JSON format

        // log the FormData values being sent,  call the key - pais from the table 
        console.log("FormData to be sent:");
        for (let pair of data.entries()) {
            console.log(pair[0] + ':', pair[1]);
        }

        message.textContent = "Uploading file and cleaning.";

        // Send file, email, and selected options to the backend - post method 
        const response = await fetch("/api/data/upload", {
            method: "POST",
            body: data
        });

        if (response.ok) { // if upload succesful
            const result = await response.json();
            message.textContent = "File being cleaned ! You will receive an email once complete (3-5 minutes).";
            console.log("Cleaning, email will be sent to:", email);
            console.log("Backend response:", result);
        } else { // if upload fails 
            message.textContent = "Error uploading file.";
            console.error("File upload failed:", response);
            throw new Error("File upload failed");
        }
    }
});
