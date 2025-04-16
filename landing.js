const floatingChat = document.getElementById('floatingChat');
const chatToggle = document.getElementById('chatToggle');
const closeChat = document.getElementById('closeChat');

chatToggle.addEventListener('click', () => {
  floatingChat.classList.remove('hidden');
  document.getElementById('landingUserInput').focus();
});

closeChat.addEventListener('click', () => {
  floatingChat.classList.add('hidden');
});

// The Gemini-powered landing chatbot (reuse from previous step)
const landingChatWindow = document.getElementById('landingChatWindow');
const landingUserInput = document.getElementById('landingUserInput');
const landingSendBtn = document.getElementById('landingSendBtn');

if (landingSendBtn && landingUserInput && landingChatWindow) {
  landingSendBtn.addEventListener('click', async () => {
    const question = landingUserInput.value.trim();
    if (!question) return;

    appendLandingMessage('You', question);
    landingUserInput.value = '...';

    // Show "typing..." message
const thinkingEl = document.createElement('div');
thinkingEl.classList.add('chat-msg');
thinkingEl.setAttribute('id', 'botThinking');
thinkingEl.innerHTML = `<strong>EcoBot:</strong> <em>Thinking...</em>`;
landingChatWindow.appendChild(thinkingEl);
landingChatWindow.scrollTop = landingChatWindow.scrollHeight;


    const prompt = `
You are a friendly climate assistant chatbot. The user asked: "${question}"
Give a clear, short, beginner-friendly answer about carbon footprint or the climate.
    `;

    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Hmm, I couldn’t answer that. Try asking differently!";
      
      const botThinkingEl = document.getElementById('botThinking');
      if (botThinkingEl) {
        botThinkingEl.innerHTML = `<strong>EcoBot:</strong> ${reply}`;
      }
      


    } catch (err) {
      console.error("Landing Chatbot Error:", err);
      appendLandingMessage('EcoBot', "Oops! Something went wrong.");
    }

    landingUserInput.value = '';
    landingUserInput.focus();
    hideSampleQuestions();
  });

  landingUserInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') landingSendBtn.click();
  });
}

function appendLandingMessage(sender, message) {
  const msg = document.createElement('div');
  msg.style.marginBottom = '10px';
  msg.innerHTML = `<strong>${sender}:</strong> ${message}`;
  landingChatWindow.appendChild(msg);
  landingChatWindow.scrollTop = landingChatWindow.scrollHeight;
}

// const sampleBtns = document.querySelectorAll('.sample-btn');

// sampleBtns.forEach((btn) => {
//   btn.addEventListener('click', () => {
//     const sampleQuestion = btn.textContent;
//     landingUserInput.value = sampleQuestion;
//     landingSendBtn.click(); // Simulate click
//   });
// });

function hideSampleQuestions() {
    const samples = document.getElementById('sampleQuestions');
    if (samples) samples.style.display = 'none';
  }
  
//   // Then call this inside your `landingSendBtn.addEventListener` logic:


// New Fresh logic for sample input:

// 🌿 Sample question pool
const allSampleQuestions = [
    "What is a carbon footprint?",
    "How can I reduce food waste?",
    "Is vegetarian diet better for the environment?",
    "How much CO2 does a car emit per km?",
    "What’s the best way to save energy at home?",
    "How does flying affect the environment?",
    "What’s the carbon footprint of electricity?",
    "Why should I care about climate change?",
    "How do public transport and biking help?",
    "Is going vegan better for the planet?"
  ];
  
  // 🎯 Display 3 random questions
  function showRandomSampleQuestions() {
    const sampleContainer = document.getElementById('sampleQuestions');
    if (!sampleContainer) return;
  
    sampleContainer.innerHTML = "<p><strong>Try asking:</strong></p>";
  
    const used = new Set();
    while (used.size < 3) {
      const randomIndex = Math.floor(Math.random() * allSampleQuestions.length);
      used.add(allSampleQuestions[randomIndex]);
    }
  
    used.forEach((question) => {
      const btn = document.createElement('button');
      btn.classList.add('sample-btn');
      btn.textContent = question;
      btn.addEventListener('click', () => {
        landingUserInput.value = question;
        landingSendBtn.click();
      });
      sampleContainer.appendChild(btn);
    });
  }
  
  // 🟢 Trigger sample suggestions on chatbot open
  chatToggle.addEventListener('click', () => {
    floatingChat.classList.remove('hidden');
    landingUserInput.focus();
    showRandomSampleQuestions(); // 👈 Here it gets called
  });
  
  

  
