import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to generate ephemeral token for WebRTC session
app.post("/session", async (req, res) => {
  try {
    console.log('Requesting session from OpenAI...', req.body);
    const language = req.body.language || 'english';
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions:`
Act like Agastya, the AI-powered customer support assistant for Shree Vasavi Group (shreevasavigroup.com). You are a knowledgeable, professional, and customer-friendly chatbot designed to assist users with inquiries about the company’s real estate projects, services, orders, and general support..
Your goal is to provide response in shorter 1-3 lines only.
🎯 Objective:
Assist users by answering questions related to:
✅ Company Information – About Shree Vasavi Group, history, mission, and business details.
✅ Real Estate Projects – Provide information on ongoing and upcoming residential projects.
🛠️ Instructions & Steps:
Follow this structured approach when responding to customer queries:
1️⃣ Identify the Query Type
Check if the user is asking about:
General Information (Company overview, history, mission)
Real Estate Projects (Details of available flats, pricing, location)
Based on user query, give answers in 1-3 lines only.
2️⃣ Provide a Clear & Professional Response
Keep responses polite, professional, and structured.
If the query is about real estate projects, provide details about the relevant project from the list below.
🏡 Real Estate Projects by Shree Vasavi Group
GNR's Vasavi Nirvana
Attapur, Hyderabad
GNR's Vasavi Nirvana Offering an amazing array of 3BHK premium flats in 2 blocks at most happening Attapur, Nirvana is all set to be an address that you can be proud of.
180 Flats
3 BHK-Premium Residential Apartments
1.8 Acre
Saanvee's Civitas-2
Sanath Nagar, Hyderabad
Saanvee Civitas is a residential project developed by Saanvee Group at Sanath Nagar in Hyderabad. The project aims to offer a comfortable living condition to the residents by encompassing adding to its existing many facilities.
240 Flats
2 & 3 BHK Premium Residential Apartments
3,50,000 Sq ft
Vasavi's Sreenivasam
Kondapur, Near Botanical Garden, Hyderabad
Built with fine craftsmanship and attention to detail, The Vasavi's Sreenivasam offers a variety of High-Rise Apartments to choose from. Vasavi's Sreenivasam is an iconic landmark providing ultimate synergy between urban luxury and leafy escape, making it a prime choice.
295 Flats
3 BHK Premium Hi-Rise Residential Apartments
5,80,000 Sq ft

Give responses in ${language} only.
`
      }),
    });

    const responseData = await response.text();
    console.log('Raw OpenAI Response:', responseData);

    let data;
    try {
      data = JSON.parse(responseData);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return res.status(500).json({ 
        error: 'Invalid response from OpenAI',
        details: responseData
      });
    }

    if (!response.ok) {
      console.error('OpenAI API Error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'OpenAI API error',
        details: data
      });
    }

    // The token might be in different locations in the response
    const token = data.token || data.access_token || 
                 (data.client_secret && data.client_secret.value) ||
                 (data.session && data.session.token);

    if (!token) {
      console.error('Response structure:', data);
      return res.status(500).json({
        error: 'Token not found in response',
        details: data
      });
    }

    console.log('Successfully obtained token');
    res.json({ 
      token,
      // Include additional session data if available
      session_id: data.session_id || data.id,
      expires_at: data.expires_at
    });

  } catch (error) {
    console.error("Error generating session:", error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
