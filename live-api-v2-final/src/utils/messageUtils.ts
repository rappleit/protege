export const getInitialMessage = (persona: string): string => {
  switch (persona) {
    case 'child':
      return "Hi there! I'm Chloe, and I'm five years old. I'm really curious about everything! Can you explain this to me in a way I can understand?";
    case 'professor':
      return "Good day. I'm Dr. Maxwell. I'm quite knowledgeable on a variety of subjects, but I'm interested in hearing your explanation. Please proceed with your explanation, and don't shy away from technical details.";
    case 'custom':
      return "Hello! I'm excited to hear your explanation. Please begin whenever you're ready.";
    default:
      return  "Greetings! I am George Washington, speaking to you from the 18th century. I am eager to learn about your modern knowledge. Please, share what you know about this subject.";
  }
};
