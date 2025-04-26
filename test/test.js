// create a session using start-session endpoint
const sessionResponse = await fetch(
  "http://localhost:8000/api/v1/start-session", // Updated URL based on curl command path
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // Added Content-Type header
    },
    body: JSON.stringify({
      persona_type: "tutor", // Added persona_type from curl command
      topic: "water cycle", // Updated topic from curl command
    }),
  }
);

const session = await sessionResponse.json();
const sessionId = session.session_id;

console.log("session", session);

// Get token
const tokenResponse = await fetch("http://localhost:8000/api/v1/ws-token");
const { token } = await tokenResponse.json();

const imageurl =
  "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png";
const base64EncodedImage = await fetch(imageurl)
  .then((res) => res.arrayBuffer())
  .then((buffer) => Buffer.from(buffer).toString("base64"));

// Connect to WebSocket with session_id and token
const ws = new WebSocket(
  `ws://localhost:8000/api/v1/ws/${sessionId}?token=${token}`
);

// Set up event handlers
ws.onopen = () => {
  console.log("WebSocket connection established");

  // Send a text message
  //   ws.send(
  //     JSON.stringify({
  //       type: "text",
  //       content: "Tell me about the water cycle!",
  //     })
  //   );

  // Send an image
  ws.send(
    JSON.stringify({
      type: "image",
      text: "What's in this image?",
      image: base64EncodedImage,
    })
  );
};

// Listen for responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

// Handle errors
ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = (event) => {
  console.log("WebSocket connection closed:", event.code, event.reason);
};
