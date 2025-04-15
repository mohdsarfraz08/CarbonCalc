// --- Constants (Simplified Emission Factors - kg CO2e) ---
// These are illustrative and need refinement based on specific regions/data sources.
const EMISSION_FACTORS = {
    // Transport (per unit)
    petrolCarPerKm: 0.18, // kg CO2e/km
    dieselCarPerKm: 0.17, // kg CO2e/km
    hybridCarPerKm: 0.12, // kg CO2e/km
    electricCarPerKm: 0.05, // Depends heavily on grid mix - placeholder!
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
    const carKmWeekly = getNum('carTravel');
    const carType = data.carType;
    let carFactor = 0;
    switch (carType) {
        case 'petrol': carFactor = EMISSION_FACTORS.petrolCarPerKm; break;
        case 'diesel': carFactor = EMISSION_FACTORS.dieselCarPerKm; break;
        case 'hybrid': carFactor = EMISSION_FACTORS.hybridCarPerKm; break;
        case 'electric': carFactor = EMISSION_FACTORS.electricCarPerKm; break;
        default: carFactor = 0;
    }
    transportEmissions += carKmWeekly * carFactor * 52; // Weekly to Annual

    const flightHoursYearly = getNum('flightHours');
    // Simple split for short/long haul based on total hours (very rough)
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
        case 'lpg': heatingFactor = EMISSION_FACTORS.lpgPerLitre; break; // Assuming usage is in Litres
        case 'electric_heat': heatingFactor = EMISSION_FACTORS.electricityPerKwh; break; // Assuming usage is in kWh
    }
    homeEmissions += heatingUsageMonthly * heatingFactor * 12; // Monthly to Annual

    // Adjust home emissions per person
    const householdSize = getNum('householdSize') || 1;
    homeEmissions = homeEmissions / householdSize;

    // --- Food Calculations (Annual) ---
    let foodEmissions = 0;
    const dietType = data.dietType;
    switch (dietType) {
        case 'high_meat': foodEmissions = EMISSION_FACTORS.highMeatAnnual; break;
        case 'medium_meat': foodEmissions = EMISSION_FACTORS.mediumMeatAnnual; break;
        case 'low_meat': foodEmissions = EMISSION_FACTORS.lowMeatAnnual; break;
        case 'pescatarian': foodEmissions = EMISSION_FACTORS.pescatarianAnnual; break;
        case 'vegetarian': foodEmissions = EMISSION_FACTORS.vegetarianAnnual; break;
        case 'vegan': foodEmissions = EMISSION_FACTORS.veganAnnual; break;
    }

    const foodWaste = data.foodWaste;
    let wasteMultiplier = 1.0;
    switch (foodWaste) {
        case 'low': wasteMultiplier = EMISSION_FACTORS.foodWasteLow; break;
        case 'medium': wasteMultiplier = EMISSION_FACTORS.foodWasteMedium; break;
        case 'high': wasteMultiplier = EMISSION_FACTORS.foodWasteHigh; break;
    }
    foodEmissions *= wasteMultiplier;

    // --- Totals ---
    const totalEmissions = transportEmissions + homeEmissions + foodEmissions;

    return {
        transport: transportEmissions,
        home: homeEmissions,
        food: foodEmissions,
        total: totalEmissions,
        inputs: data // Store inputs for potential tips generation
    };
}

/**
 * Updates the results display on the results page.
 * @param {object} results The calculated footprint results object.
 */
function displayResults(results) {
    if (!results || !totalFootprintValueEl) return; // Ensure elements exist

    const { transport, home, food, total } = results;
    const totalRounded = total.toFixed(2);
    const transportRounded = transport.toFixed(2);
    const homeRounded = home.toFixed(2);
    const foodRounded = food.toFixed(2);

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

    // Update AI Tips
    generateAiTips(results);

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
                                    label += context.parsed.toFixed(2) + ' kg CO₂e';
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
    const percentageDiff = Math.abs((difference / AVG_INDIAN_FOOTPRINT_ANNUAL) * 100);

    let message;
    if (difference > 0) {
        message = `Your footprint (${userTotalAnnual.toFixed(0)} kg CO₂e/year) is ${percentageDiff.toFixed(0)}% HIGHER than the average Indian footprint (~${AVG_INDIAN_FOOTPRINT_ANNUAL} kg CO₂e/year).`;
    } else if (difference < 0) {
        message = `Your footprint (${userTotalAnnual.toFixed(0)} kg CO₂e/year) is ${percentageDiff.toFixed(0)}% LOWER than the average Indian footprint (~${AVG_INDIAN_FOOTPRINT_ANNUAL} kg CO₂e/year). Well done!`;
    } else {
        message = `Your footprint (${userTotalAnnual.toFixed(0)} kg CO₂e/year) is about the same as the average Indian footprint (~${AVG_INDIAN_FOOTPRINT_ANNUAL} kg CO₂e/year).`;
    }
    comparisonTextEl.textContent = message;
}

// --- Gemini AI Tips Integration ---
async function generateAiTips(results) {
    const { transport, home, food, total, inputs } = results;

    const prompt = `
You are an eco advisor. Based on this user's carbon footprint data, give 3–5 short, actionable, personalized tips to reduce emissions.

Transport: ${transport.toFixed(2)} kg
Home: ${home.toFixed(2)} kg
Food: ${food.toFixed(2)} kg
Car travel: ${inputs.carTravel} km/week (${inputs.carType})
Flights: ${inputs.flightHours} hrs/year
Public Transport: ${inputs.publicTransport} km/week
Electricity: ${inputs.electricityUsage} kWh/month
Diet: ${inputs.dietType}, Food waste: ${inputs.foodWaste}
Heating: ${inputs.heatingFuel}, Usage: ${inputs.heatingUsage}
Household: ${inputs.householdSize}

Avoid complex language. Tips should be realistic and simple.
`;

    tipsListEl.innerHTML = `<li>Loading AI suggestions...</li>`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCxKwC9vNh5oueVIBGjgBvlJ2TTLisx4bo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

        tipsListEl.innerHTML = '';
        text.split('\n').forEach(line => {
            if (line.trim()) {
                const li = document.createElement('li');
                li.textContent = line.replace(/^[-•\d.]+\s*/, '');
                tipsListEl.appendChild(li);
            }
        });
    } catch (err) {
        console.error("Gemini API error:", err);
        tipsListEl.innerHTML = `<li>Could not load AI tips right now.</li>`;
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

    if (lastDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastDate === new Date(yesterday).toDateString()) {
            streak++; // continued streak
        } else if (lastDate === today) {
            // do nothing, already calculated today
        } else {
            streak = 1; // reset streak
        }
    } else {
        streak = 1; // first time
    }

    localStorage.setItem('carbonCalcLastDate', today);
    localStorage.setItem('carbonCalcStreak', streak);
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
    // Initialize first tab
    showTab('transport-tab');
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
            window.location.href = 'results.html';
        } else {
            alert('Could not calculate footprint. Please check your inputs.');
        }
    });
}

// Results Page: Display data on load
// Check if we are on the results page by looking for a specific element
if (document.getElementById('footprintChart')) {
    window.addEventListener('DOMContentLoaded', () => {
        const storedResults = localStorage.getItem('carbonResults');
        if (storedResults) {
            try {
                const results = JSON.parse(storedResults);
                displayResults(results);
            } catch (error) {
                console.error("Error parsing results from localStorage:", error);
                alert("Could not load results. Please try calculating again.");
                comparisonTextEl.textContent = "Could not load results.";
                tipsListEl.innerHTML = '<li>Could not load tips.</li>';
            }
        } else {
            // Handle case where user lands directly on results without data
            alert("No calculation data found. Please fill out the form first.");
            comparisonTextEl.textContent = "No calculation data found.";
            tipsListEl.innerHTML = '<li>No tips available. Please calculate first.</li>';
            // Maybe disable chart/results area or redirect back
            if (totalFootprintValueEl) totalFootprintValueEl.textContent = "N/A";
        }
    });
}

// Add simple icons (using inline SVG or font awesome if preferred)
// Placeholder for icon loading logic if needed. For now, assuming CSS handles background images or inline SVGs in HTML are sufficient.


// here an chatbot code 

const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userQuestion');
const sendBtn = document.getElementById('sendBtn');

if (sendBtn && userInput && chatWindow) {
  sendBtn.addEventListener('click', async () => {
    const question = userInput.value.trim();
    if (!question) return;

    appendChatMessage('user', question);
    userInput.value = '...';

    // ✨ Show "thinking..." loader
    const thinkingEl = document.createElement('div');
    thinkingEl.classList.add('chat-msg');
    thinkingEl.setAttribute('id', 'botThinking');
    thinkingEl.innerHTML = `<strong>EcoBot:</strong> <em>Thinking...</em>`;
    chatWindow.appendChild(thinkingEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const stored = localStorage.getItem('carbonResults');
    let contextText = '';

    if (stored) {
      try {
        const { transport, home, food, total, inputs } = JSON.parse(stored);
        contextText = `
The user has asked a question: "${question}"

Here is their carbon footprint summary:
- Total: ${total.toFixed(2)} kg CO₂e/year
- Transport: ${transport.toFixed(2)} kg
  - Car travel: ${inputs.carTravel} km/week (${inputs.carType})
  - Flight hours/year: ${inputs.flightHours}
  - Public transport: ${inputs.publicTransport} km/week
- Home: ${home.toFixed(2)} kg
  - Electricity: ${inputs.electricityUsage} kWh/month
  - Heating fuel: ${inputs.heatingFuel}, Usage: ${inputs.heatingUsage}
  - Household size: ${inputs.householdSize}
- Food: ${food.toFixed(2)} kg
  - Diet: ${inputs.dietType}
  - Food waste level: ${inputs.foodWaste}

Use this data to provide an accurate, friendly, helpful answer.
Avoid technical jargon. Be clear and simple.
        `;
      } catch (e) {
        contextText = `The user asked: "${question}". Provide helpful, beginner-friendly climate advice.`;
      }
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCxKwC9vNh5oueVIBGjgBvlJ2TTLisx4bo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextText }] }]
        })
      });

      const data = await res.json();

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I didn't get a clear response. Try rephrasing your question.";

      // ✅ Replace "thinking..." with the response
      const botThinkingEl = document.getElementById('botThinking');
      if (botThinkingEl) {
        botThinkingEl.innerHTML = `<strong>EcoBot:</strong> ${reply}`;
      }

    } catch (err) {
      console.error("Chatbot error:", err);
      const botThinkingEl = document.getElementById('botThinking');
      if (botThinkingEl) {
        botThinkingEl.innerHTML = `<strong>EcoBot:</strong> Oops! Something went wrong.`;
      }
    }

    userInput.value = '';
    userInput.focus();
  });

  // 🔁 Press Enter to send
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
  });
}

// 🧩 Helper to add chat messages to the window
function appendChatMessage(sender, message) {
  const msgEl = document.createElement('div');
  msgEl.classList.add('chat-msg');
  msgEl.style.marginBottom = '10px';
  msgEl.innerHTML = `<strong>${sender === 'user' ? 'You' : 'EcoBot'}:</strong> ${message}`;
  chatWindow.appendChild(msgEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
