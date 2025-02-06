

// Endpoint to generate ephemeral token for WebRTC session
exports.handler = async function(event, context) {
  try {
    try {
      console.log(process.env.NODE_API_KEY_NEW);

      // Parse the incoming request body (assuming it's JSON)
      const data = JSON.parse(event.body);  // equivalent to req.body in Express
      console.log('Requesting session from OpenAI...', data);

      const language = data.language || 'english';
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NODE_API_KEY}`,
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
    if (!responseData) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Invalid response from OpenAI',
          details: responseData
        })
      };
    }

    let data2;
    try {
      data2 = JSON.parse(responseData);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
    }

    if (!response.ok) {
      console.error('OpenAI API Error:', data2);
      if (data.error) {
        return {
          statusCode: response.status,
          body: JSON.stringify({
            error: data.error?.message || 'OpenAI API error',
            details: data2
          })
        };
      }
    }

    // The token might be in different locations in the response
    const token = data2.token || data2.access_token || 
                 (data2.client_secret && data2.client_secret.value) ||
                 (data2.session && data2.session.token);

    if (!token) {
      console.error('Response structure:', data2);
      if (!data2.token) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Token not found in response',
            details: data2
          })
        };
      }
    }

    console.log('Successfully obtained token');
    return {
      statusCode: 200,
      body: JSON.stringify({
        token: 'your_generated_token_here',  // Replace with your actual token
        session_id: data2.session_id || data2.id,
        expires_at: data2.expires_at
      })
    };

  } catch (error) {
    console.error("Error generating session:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'An unexpected error occurred',
        details: error.message
      })
    };
  }
} catch (error) {
  console.error("Error generating session:", error);
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: 'An unexpected error occurred',
      details: error.message
    })
  };
}}
