// --- Constants (Simplified Emission Factors - kg CO2e) ---
// These are illustrative and need refinement based on specific regions/data sources.
const EMISSION_FACTORS = {
    // Transport (per unit)
    petrolCarPerKm: 0.18, // kg CO2e/km
    dieselCarPerKm: 0.17, // kg CO2e/km
    hybridCarPerKm: 0.12, // kg CO2e/km
    electricCarPerKm: 0.05, // Depends heavily on grid mix - placeholder!
    Petrolbikeperkm: 0.10, // for petrol bike - kg CO2e/km <-- Corrected name convention potentially
    Electricbikeperkm: 0.03, // for electric bike - kg CO2e/km <-- Corrected name convention potentially
    flightPerKm: 0.25, // kg CO2e/passenger-km (Short/long haul varies) - Approximation via hours
    shortHaulFlightPerHour: 150, // kg CO2e/hour (approx < 3 hours)
    longHaulFlightPerHour: 115, // kg CO2e/hour (approx >= 3 hours)
    publicTransportPerKm: 0.04, // Bus/Train average estimate


    // Home Energy (per unit)
    electricityPerKwh: 0.45, // Highly variable by region (grid mix) - kg CO2e/kWh
    naturalGasPerKwh: 0.20, // kg CO2e/kWh (approx conversion from therms/m³)
    heatingOilPerLitre: 2.96, // kg CO2e/litre
    lpgPerLitre: 1.56, // kg CO2e/litre

    // Food (Annual estimate per diet type - VERY simplified)
    highMeatAnnual: 3300, // kg CO2e/year
    mediumMeatAnnual: 2500,
    lowMeatAnnual: 1900,
    pescatarianAnnual: 1700,
    vegetarianAnnual: 1500,
    veganAnnual: 1100,

    // Food Waste Modifier (percentage increase on food footprint)
    foodWasteLow: 1.05, // +5%
    foodWasteMedium: 1.15, // +15%
    foodWasteHigh: 1.30, // +30%
};

const AVG_INDIAN_FOOTPRINT_ANNUAL = 1900; // Approx kg CO2e per capita per year

// --- DOM Elements ---
const carbonForm = document.getElementById('carbonForm');
const tabsContainer = document.querySelector('.tabs');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Results Page Elements (only access if on results page)
let footprintChart = null; // To hold the chart instance
const totalFootprintValueEl = document.getElementById('totalFootprintValue');
const transportResultEl = document.getElementById('transportResult');
const homeResultEl = document.getElementById('homeResult');
const foodResultEl = document.getElementById('foodResult');
const totalResultEl = document.getElementById('totalResult');
const transportBarEl = document.getElementById('transportBar');
const homeBarEl = document.getElementById('homeBar');
const foodBarEl = document.getElementById('foodBar');
const comparisonTextEl = document.getElementById('comparisonText');
const tipsListEl = document.getElementById('tipsList');
const streakCountEl = document.getElementById('streakCount'); // Bonus
const negativeTipsListEl = document.getElementById('negativeTipsList');

// Chatbot Elements (only access if on results page)
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userQuestion');
const sendBtn = document.getElementById('sendBtn');


// --- Functions ---

/**
 * Switches the active tab in the form.
 * @param {string} tabId The ID of the tab content to show.
 */
function showTab(tabId) {
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    const selectedTabContent = document.getElementById(tabId);
    const selectedTabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);

    if (selectedTabContent && selectedTabButton) {
        selectedTabContent.classList.add('active');
        selectedTabButton.classList.add('active');
    }
}

/**
 * Calculates carbon footprint based on form inputs.
 * @returns {object|null} An object with emission breakdowns or null if form not found.
 */
function calculateFootprint() {
    if (!carbonForm) return null;

    const formData = new FormData(carbonForm);
    const data = Object.fromEntries(formData.entries()); // Easier access

    // Helper function to safely get numeric values
    const getNum = (key) => parseFloat(data[key]) || 0;

    // --- Transport Calculations (Annualized) ---
    let transportEmissions = 0;
    // NB: 'carTravel' and 'carType' now refer to the *primary personal vehicle* selected in the form
    const vehicleKmWeekly = getNum('carTravel');
    const vehicleType = data.carType; // Value from the <select> element (e.g., 'petrol', 'electric_bike', 'cycle')
    let vehicleFactor = 0;

    // *** UPDATED SWITCH STATEMENT ***
    switch (vehicleType) {
        case 'petrol':        vehicleFactor = EMISSION_FACTORS.petrolCarPerKm; break;
        case 'diesel':        vehicleFactor = EMISSION_FACTORS.dieselCarPerKm; break;
        case 'hybrid':        vehicleFactor = EMISSION_FACTORS.hybridCarPerKm; break;
        case 'electric':      vehicleFactor = EMISSION_FACTORS.electricCarPerKm; break;
        case 'petrol_bike':   vehicleFactor = EMISSION_FACTORS.Petrolbikeperkm; break; // Added
        case 'electric_bike': vehicleFactor = EMISSION_FACTORS.Electricbikeperkm; break; // Added
        case 'cycle':                                                             // Added
        case 'none':          vehicleFactor = 0; break;                           // Added
        default:              vehicleFactor = 0; // Default to 0 if type is unknown or not applicable
    }
    transportEmissions += vehicleKmWeekly * vehicleFactor * 52; // Weekly to Annual

    const flightHoursYearly = getNum('flightHours');
    // Simple split for short/long haul based on total hours (very rough)
    // Consider refining flight logic for better accuracy if needed
    const flightFactor = flightHoursYearly > 6 ? EMISSION_FACTORS.longHaulFlightPerHour : EMISSION_FACTORS.shortHaulFlightPerHour;
    transportEmissions += flightHoursYearly * flightFactor; // Already annual

    const publicTransportKmWeekly = getNum('publicTransport');
    transportEmissions += publicTransportKmWeekly * EMISSION_FACTORS.publicTransportPerKm * 52; // Weekly to Annual

    // --- Home Energy Calculations (Annualized) ---
    let homeEmissions = 0;
    const electricityKwhMonthly = getNum('electricityUsage');
    homeEmissions += electricityKwhMonthly * EMISSION_FACTORS.electricityPerKwh * 12; // Monthly to Annual

    const heatingFuel = data.heatingFuel;
    const heatingUsageMonthly = getNum('heatingUsage');
    let heatingFactor = 0;
    // Note: Heating usage units need careful consideration in a real app
    switch (heatingFuel) {
        case 'natural_gas': heatingFactor = EMISSION_FACTORS.naturalGasPerKwh; break; // Assuming usage is in kWh equivalent for simplicity here
        case 'heating_oil': heatingFactor = EMISSION_FACTORS.heatingOilPerLitre; break; // Assuming usage is in Litres
        case 'lpg':         heatingFactor = EMISSION_FACTORS.lpgPerLitre; break; // Assuming usage is in Litres
        case 'electric_heat': heatingFactor = EMISSION_FACTORS.electricityPerKwh; break; // Assuming usage is in kWh
        case 'none':        heatingFactor = 0; break; // If no heating fuel used
    }
    homeEmissions += heatingUsageMonthly * heatingFactor * 12; // Monthly to Annual

    // Adjust home emissions per person
    const householdSize = getNum('householdSize') || 1; // Ensure household size is at least 1
    if (householdSize > 0) {
        homeEmissions = homeEmissions / householdSize;
    } else {
        homeEmissions = 0; // Avoid division by zero, though UI should prevent 0
    }


    // --- Food Calculations (Annual) ---
    let foodEmissions = 0;
    const dietType = data.dietType;
    switch (dietType) {
        case 'high_meat':   foodEmissions = EMISSION_FACTORS.highMeatAnnual; break;
        case 'medium_meat': foodEmissions = EMISSION_FACTORS.mediumMeatAnnual; break;
        case 'low_meat':    foodEmissions = EMISSION_FACTORS.lowMeatAnnual; break;
        case 'pescatarian': foodEmissions = EMISSION_FACTORS.pescatarianAnnual; break;
        case 'vegetarian':  foodEmissions = EMISSION_FACTORS.vegetarianAnnual; break;
        case 'vegan':       foodEmissions = EMISSION_FACTORS.veganAnnual; break;
        default: foodEmissions = EMISSION_FACTORS.mediumMeatAnnual; // Default if needed
    }

    const foodWaste = data.foodWaste;
    let wasteMultiplier = 1.0;
    switch (foodWaste) {
        case 'low':    wasteMultiplier = EMISSION_FACTORS.foodWasteLow; break;
        case 'medium': wasteMultiplier = EMISSION_FACTORS.foodWasteMedium; break;
        case 'high':   wasteMultiplier = EMISSION_FACTORS.foodWasteHigh; break;
    }
    foodEmissions *= wasteMultiplier;

    // --- Totals ---
    const totalEmissions = transportEmissions + homeEmissions + foodEmissions;

    return {
        transport: transportEmissions,
        home: homeEmissions,
        food: foodEmissions,
        total: totalEmissions,
        inputs: data // Store ALL inputs for AI context and tips generation
    };
}

/**
 * Updates the results display on the results page.
 * @param {object} results The calculated footprint results object.
 */
function displayResults(results) {
    if (!results || !totalFootprintValueEl) return; // Ensure elements exist

    const { transport, home, food, total } = results;
    const totalRounded = total.toFixed(1); // Use 1 decimal place for readability
    const transportRounded = transport.toFixed(1);
    const homeRounded = home.toFixed(1);
    const foodRounded = food.toFixed(1);

    // Update text values
    totalFootprintValueEl.textContent = totalRounded;
    transportResultEl.textContent = `${transportRounded} kg CO₂e`;
    homeResultEl.textContent = `${homeRounded} kg CO₂e`;
    foodResultEl.textContent = `${foodRounded} kg CO₂e`;
    totalResultEl.textContent = `${totalRounded} kg CO₂e / year`;

    // Update progress bars (percentage of total)
    const calcPercent = (value) => (total > 0 ? (value / total) * 100 : 0);
    transportBarEl.style.width = `${calcPercent(transport)}%`;
    homeBarEl.style.width = `${calcPercent(home)}%`;
    foodBarEl.style.width = `${calcPercent(food)}%`;

    // Update Chart
    updateChart(transport, home, food);

    // Update Comparison
    displayComparison(total);

    // Update AI Tips (pass the full results object)
    generateAiTips(results); // *** Pass the full results object ***

    // Update Bonus Tracker (Example)
    updateStreak();
}

/**
 * Creates or updates the results chart.
 * @param {number} transportVal Transport emissions value.
 * @param {number} homeVal Home emissions value.
 * @param {number} foodVal Food emissions value.
 */
function updateChart(transportVal, homeVal, foodVal) {
    const ctx = document.getElementById('footprintChart')?.getContext('2d');
    if (!ctx) return;

    const chartData = {
        labels: ['Transport', 'Home Energy', 'Food'],
        datasets: [{
            label: 'Carbon Footprint Breakdown (kg CO₂e)',
            data: [transportVal, homeVal, foodVal],
            backgroundColor: [
                '#007bff', // Transport Color
                '#ffc107', // Home Color
                '#dc3545'  // Food Color
            ],
            borderColor: 'var(--card-background)', // Use CSS variable or static color
            borderWidth: 3,
            hoverOffset: 4
        }]
    };

    if (footprintChart) {
        // Update existing chart
        footprintChart.data = chartData;
        footprintChart.update();
    } else {
        // Create new chart
        footprintChart = new Chart(ctx, {
            type: 'doughnut', // or 'pie'
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%', // Creates the doughnut hole
                plugins: {
                    legend: {
                        display: false // Using custom legend/breakdown instead
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed.toFixed(1) + ' kg CO₂e'; // Consistent decimal places
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
}


/**
 * Displays comparison text against the average.
 * @param {number} userTotalAnnual User's total annual emissions.
 */
function displayComparison(userTotalAnnual) {
    if (!comparisonTextEl) return;

    const difference = userTotalAnnual - AVG_INDIAN_FOOTPRINT_ANNUAL;
    const percentageDiff = AVG_INDIAN_FOOTPRINT_ANNUAL !== 0
        ? Math.abs((difference / AVG_INDIAN_FOOTPRINT_ANNUAL) * 100)
        : 0; // Avoid division by zero if average is 0

    let message;
    if (difference > AVG_INDIAN_FOOTPRINT_ANNUAL * 0.05) { // More than 5% higher
        message = `Your footprint (${userTotalAnnual.toFixed(0)} kg CO₂e/year) is approx. ${percentageDiff.toFixed(0)}% HIGHER than the average Indian footprint (~${AVG_INDIAN_FOOTPRINT_ANNUAL} kg CO₂e/year).`;
    } else if (difference < -AVG_INDIAN_FOOTPRINT_ANNUAL * 0.05) { // More than 5% lower
        message = `Your footprint (${userTotalAnnual.toFixed(0)} kg CO₂e/year) is approx. ${percentageDiff.toFixed(0)}% LOWER than the average Indian footprint (~${AVG_INDIAN_FOOTPRINT_ANNUAL} kg CO₂e/year). Great job!`;
    } else { // Within +/- 5%
        message = `Your footprint (${userTotalAnnual.toFixed(0)} kg CO₂e/year) is about the same as the average Indian footprint (~${AVG_INDIAN_FOOTPRINT_ANNUAL} kg CO₂e/year).`;
    }
    comparisonTextEl.textContent = message;
}

// --- Gemini AI Tips Integration ---
// *** THIS FUNCTION NOW RECEIVES THE FULL 'results' OBJECT ***
async function generateAiTips(results) {
    if (!tipsListEl || !negativeTipsListEl) return;

    const { transport, home, food, total, inputs } = results;

    // Create a more structured prompt
    const prompt = `
Based on this user's carbon footprint data:
- Transport: ${transport.toFixed(2)} kg CO₂e/year
- Home Energy: ${home.toFixed(2)} kg CO₂e/year
- Food: ${food.toFixed(2)} kg CO₂e/year
- Total: ${total.toFixed(2)} kg CO₂e/year

Key behaviors:
- Vehicle: ${inputs.carTravel}km/week (${inputs.carType})
- Flights: ${inputs.flightHours} hours/year
- Public Transport: ${inputs.publicTransport}km/week
- Diet: ${inputs.dietType}
- Food Waste Level: ${inputs.foodWaste}

Please provide:
1. POSITIVE RECOMMENDATIONS: List 3-4 specific, actionable tips to reduce their carbon footprint.
2. BEHAVIORS TO AVOID: List 2-3 specific behaviors they should stop or reduce based on their current habits.

Format your response exactly like this:
POSITIVE RECOMMENDATIONS:
• First tip
• Second tip
• Third tip

BEHAVIORS TO AVOID:
• First warning
• Second warning
`;

    tipsListEl.innerHTML = '<li>Loading recommendations...</li>';
    negativeTipsListEl.innerHTML = '<li>Loading warnings...</li>';

    try {
        const API_KEY = "YOUR_API_KEY"; // Replace with your actual API key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCxKwC9vNh5oueVIBGjgBvlJ2TTLisx4bo`, {
           
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300,
                }
            })
        });

        

        if (!response.ok) {
            throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
     

       
        
        if (!aiResponse) {
            throw new Error('Invalid AI response format');
        }

        // Split the response into positive and negative sections
        const sections = aiResponse.split(/BEHAVIORS TO AVOID:/i);
        const positivePart = sections[0].split(/POSITIVE RECOMMENDATIONS:/i)[1];
        const negativePart = sections[1];

        // Process positive recommendations
        if (positivePart) {
            const positiveTips = positivePart
                .split('\n')
                .filter(line => line.trim().startsWith('•'))
                .map(line => line.trim().replace('•', '').trim());

            tipsListEl.innerHTML = positiveTips
                .map(tip => `<li>${tip}</li>`)
                .join('');
        }

        // Process negative recommendations
        if (negativePart) {
            const negativeTips = negativePart
                .split('\n')
                .filter(line => line.trim().startsWith('•'))
                .map(line => line.trim().replace('•', '').trim());

            negativeTipsListEl.innerHTML = negativeTips
                .map(tip => `<li>${tip}</li>`)
                .join('');
        }
        
       

    } catch (error) {
        console.error('Error generating tips:', error);
        tipsListEl.innerHTML = '<li>Error loading recommendations. Please try again.</li>';
        negativeTipsListEl.innerHTML = '<li>Error loading warnings. Please try again.</li>';
    }
}

/**
 * Simple streak update example (using localStorage).
 */
function updateStreak() {
    if (!streakCountEl) return;

    const today = new Date().toDateString(); // Only the date part, no time
    const lastDate = localStorage.getItem('carbonCalcLastDate');
    let streak = parseInt(localStorage.getItem('carbonCalcStreak') || '0');

    if (lastDate === today) {
         // Already calculated today, don't increment streak multiple times a day
         // Just display the current streak
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastDate === yesterday.toDateString()) {
            streak++; // Continued streak from yesterday
        } else {
            streak = 1; // Reset streak (not today, not yesterday)
        }
        // Save the updated streak and date only if it changed or was reset
        localStorage.setItem('carbonCalcLastDate', today);
        localStorage.setItem('carbonCalcStreak', streak);
    }

    streakCountEl.textContent = streak;
}

// --- Event Listeners ---

// Form Page: Handle Tab Switching
if (tabsContainer) {
    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
            const tabId = e.target.getAttribute('data-tab');
            showTab(tabId);
        }
    });
    // Initialize first tab if it exists
    const firstTabButton = document.querySelector('.tab-button');
    if (firstTabButton) {
        showTab(firstTabButton.getAttribute('data-tab'));
    }
}

// Form Page: Handle Form Submission
if (carbonForm) {
    carbonForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent actual form submission
        const results = calculateFootprint();
        if (results) {
            // Store results in localStorage to pass to the results page
            localStorage.setItem('carbonResults', JSON.stringify(results));
            // Redirect to results page
            window.location.href = 'results.html'; // Make sure this page exists
        } else {
            // Provide more specific feedback if possible, or a general error
            alert('Could not calculate footprint. Please ensure all required fields are filled correctly.');
        }
    });
}

// Results Page: Display data on load
// Check if we are on the results page by looking for a specific element (e.g., the chart canvas)
if (document.getElementById('footprintChart')) {
    window.addEventListener('DOMContentLoaded', () => {
        const storedResults = localStorage.getItem('carbonResults');
        if (storedResults) {
            try {
                const results = JSON.parse(storedResults);
                displayResults(results); // This function now calls generateAiTips and chatbot setup indirectly if elements exist
            } catch (error) {
                console.error("Error parsing results from localStorage:", error);
                // Display error message to the user on the page
                if(comparisonTextEl) comparisonTextEl.textContent = "Error loading results. Please try calculating again.";
                if(tipsListEl) tipsListEl.innerHTML = '<li>Could not load tips due to an error.</li>';
                if(totalFootprintValueEl) totalFootprintValueEl.textContent = "Err";
                // Optionally clear other fields or show placeholders
            }
        } else {
            // Handle case where user lands directly on results without data
             if(comparisonTextEl) comparisonTextEl.textContent = "No calculation data found. Please use the calculator first.";
             if(tipsListEl) tipsListEl.innerHTML = '<li>No tips available. Please calculate your footprint first.</li>';
             if(totalFootprintValueEl) totalFootprintValueEl.textContent = "N/A";
             // Disable or hide results sections if desired
             document.getElementById('resultsBreakdown')?.classList.add('disabled');
             document.getElementById('aiTips')?.classList.add('disabled');
             document.getElementById('comparison')?.classList.add('disabled');
             document.getElementById('chatbotSection')?.classList.add('disabled'); // Disable chatbot if no data
        }
    });
}


// --- Chatbot Code ---

// Check if chatbot elements exist (likely on results page)
if (sendBtn && userInput && chatWindow) {
    sendBtn.addEventListener('click', handleChatbotQuery);

    // Press Enter to send
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Allow Shift+Enter for new lines if needed in textarea
            e.preventDefault(); // Prevent default Enter behavior (like form submission)
            handleChatbotQuery();
        }
    });
}

async function handleChatbotQuery() {
    const question = userInput.value.trim();
    if (!question) return;
    
    removeWelcomeMessage();

    appendChatMessage('user', question);
    userInput.value = ''; // Clear input immediately
    userInput.disabled = true; // Disable input while processing
    sendBtn.disabled = true;    // Disable send button

    // Show "thinking..." loader immediately
    const thinkingId = 'botThinking-' + Date.now(); // Unique ID for the thinking message
    appendChatMessage('bot', `<div class="loader-inline"></div> Thinking...`, thinkingId);

    const storedResults = localStorage.getItem('carbonResults');
    let contextText = '';
    let promptForAI = '';

    if (storedResults) {
        try {
            const results = JSON.parse(storedResults);
            const { transport, home, food, total, inputs } = results;

            // *** UPDATED CONTEXT TEXT for Chatbot ***
            contextText = `
The user's approximate annual carbon footprint is ${total.toFixed(1)} kg CO₂e.
Breakdown: Transport ${transport.toFixed(1)} kg, Home Energy ${home.toFixed(1)} kg, Food ${food.toFixed(1)} kg.
Key inputs:
- Personal Vehicle: ${inputs.carTravel || 0} km/week (Type: ${inputs.carType || 'N/A'})
- Flights: ${inputs.flightHours || 0} hours/year
- Public Transport: ${inputs.publicTransport || 0} km/week
- Electricity: ${inputs.electricityUsage || 0} kWh/month
- Heating Fuel: ${inputs.heatingFuel || 'N/A'}, Usage: ${inputs.heatingUsage || 0} unit/month
- Household Size: ${inputs.householdSize || 1}
- Diet: ${inputs.dietType || 'N/A'}
- Food Waste: ${inputs.foodWaste || 'N/A'}

Based on this context and the user's question below, provide a helpful, concise, and friendly answer suitable for someone in India. Avoid overly technical terms. If the question is unrelated to climate/environment/their footprint, politely state you can only answer questions on those topics.

User Question: "${question}"
`;
            promptForAI = contextText; // Use the detailed context

        } catch (e) {
            console.error("Error parsing stored results for chatbot:", e);
            // Fallback prompt if parsing fails
            promptForAI = `The user asked: "${question}". Provide helpful, beginner-friendly climate or sustainability advice relevant to India. If the question is unrelated, politely state you can only answer questions on those topics.`;
        }
    } else {
        // Fallback prompt if no results are stored
        promptForAI = `The user asked: "${question}". Provide helpful, beginner-friendly climate or sustainability advice relevant to India. If the question is unrelated, politely state you can only answer questions on those topics.`;
    }


    try {
         // --- IMPORTANT: Replace "your_APi" with your actual Gemini API Key ---
        const API_KEY = "AIzaSyCxKwC9vNh5oueVIBGjgBvlJ2TTLisx4bo";
        if (API_KEY === "your_APi") {
             updateChatMessage(thinkingId, 'EcoBot', 'API Key not configured for chatbot.');
             console.warn("Gemini API Key not set for chatbot!");
             userInput.disabled = false;
             sendBtn.disabled = false;
             userInput.focus();
             return;
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCxKwC9vNh5oueVIBGjgBvlJ2TTLisx4bo`, { // Using 1.5 Flash
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptForAI }] }],
                 generationConfig: {
                    temperature: 0.6, // Slightly more factual for Q&A
                    maxOutputTokens: 300, // Allow slightly longer answers if needed
                 },
                 // Add safety settings if desired
                 // safetySettings: [...]
            })
        });

         if (!res.ok) {
            const errorData = await res.json();
            console.error("Gemini Chatbot API Error:", errorData);
            updateChatMessage(thinkingId, 'EcoBot', `Sorry, I encountered an error: ${errorData?.error?.message || res.statusText}`);
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
            return;
        }

        const data = await res.json();

        let reply = "Sorry, I couldn't get a response. Please try asking differently."; // Default fallback

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
             reply = data.candidates[0].content.parts[0].text;
        } else {
             console.warn("Gemini chatbot response issue:", data);
             let reason = "No content received.";
             if(data.promptFeedback?.blockReason) {
                reason = `Blocked due to: ${data.promptFeedback.blockReason}`;
             } else if (data.candidates?.[0]?.finishReason && data.candidates[0].finishReason !== 'STOP') {
                 reason = `Finished due to: ${data.candidates[0].finishReason}`;
             }
             reply = `I couldn't generate a response (${reason}). Could you rephrase?`;
        }

        // Replace "thinking..." with the actual response
        updateChatMessage(thinkingId, 'EcoBot', reply);

    } catch (err) {
        console.error("Chatbot fetch error:", err);
        updateChatMessage(thinkingId, 'EcoBot', 'Oops! Something went wrong connecting to the AI. Please try again later.');
    } finally {
        // Re-enable input fields regardless of success or failure
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// Helper to add chat messages to the window
function appendChatMessage(sender, message, elementId = null) {
    if (!chatWindow) return;
    const msgEl = document.createElement('div');
    msgEl.classList.add('chat-msg', sender === 'user' ? 'chat-msg-user' : 'chat-msg-bot');
    if(elementId) {
        msgEl.id = elementId;
    }
    // Use textContent for user input to prevent HTML injection
    // Use innerHTML for bot messages which might include the loader or formatted text from AI
    const strong = document.createElement('strong');
    strong.textContent = `${sender === 'user' ? 'You' : 'EcoBot'}: `;
    msgEl.appendChild(strong);

    if (sender === 'user') {
         const span = document.createElement('span');
         span.textContent = message;
         msgEl.appendChild(span);
    } else {
         const span = document.createElement('span');
         span.innerHTML = message; // Allows loader HTML
         msgEl.appendChild(span);
    }

    chatWindow.appendChild(msgEl);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
}

// Helper to update an existing chat message (used for replacing 'Thinking...' with response)
function updateChatMessage(elementId, sender, message) {
     const msgEl = document.getElementById(elementId);
     if (msgEl) {
         // Reconstruct the inner HTML safely
         const strong = document.createElement('strong');
         strong.textContent = `${sender === 'user' ? 'You' : 'EcoBot'}: `;

         const span = document.createElement('span');
         // Sanitize bot response slightly if needed, or trust Gemini's output filtering
         span.innerHTML = message; // Assuming bot message is safe or sanitized by API/filter

         // Clear existing content and append new structure
         msgEl.innerHTML = '';
         msgEl.appendChild(strong);
         msgEl.appendChild(span);
     }
}


let welcomeMessageEl; // to track the welcome message element

function showWelcomeMessage() {
  welcomeMessageEl = document.createElement('div');
  welcomeMessageEl.classList.add('chat-msg', 'bot');
  welcomeMessageEl.innerHTML = `<strong>EcoBot:</strong> 👋 Hey! Ask me anything about your carbon footprint.`;
  chatWindow.appendChild(welcomeMessageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Remove welcome message once user interacts
function removeWelcomeMessage() {
  if (welcomeMessageEl && welcomeMessageEl.parentNode) {
    welcomeMessageEl.parentNode.removeChild(welcomeMessageEl);
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', showWelcomeMessage);


// --- Add simple icons (Example using CSS classes) ---
// You would typically add CSS rules for these classes, potentially using background images or font icons
// e.g., in your CSS:
// .icon-transport::before { content: '🚗'; margin-right: 5px; } /* Or use background-image */
// .icon-home::before { content: '🏠'; margin-right: 5px; }
// .icon-food::before { content: '🍎'; margin-right: 5px; }

// Example of potentially adding classes (do this where results are displayed if needed)
// if (transportResultEl) transportResultEl.classList.add('icon-transport');
// if (homeResultEl) homeResultEl.classList.add('icon-home');
// if (foodResultEl) foodResultEl.classList.add('icon-food');

// Placeholder for any other initialization logic needed
console.log("Carbon Footprint Calculator script loaded.");