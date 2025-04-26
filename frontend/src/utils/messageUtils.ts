
export const getInitialMessage = (persona: string): string => {
  switch (persona) {
    case 'child':
      return "Hi there! I'm Chloe, and I'm five years old. I'm really curious about everything! Can you explain this to me in a way I can understand?";
    case 'professor':
      return "Good day. I'm Dr. Maxwell. I'm quite knowledgeable on a variety of subjects, but I'm interested in hearing your explanation. Please proceed with your explanation, and don't shy away from technical details.";
    case 'historical':
      return "Greetings! I am Marie Curie, speaking to you from my time in the early 20th century. I'm fascinated by your modern knowledge. Please share what you know about this subject.";
    default:
      return "Hello! I'm excited to hear your explanation. Please begin whenever you're ready.";
  }
};

export const getFollowUpQuestion = (persona: string, topic: string): string => {
  const questions = {
    child: [
      `But why is ${topic} important? Can you explain it simpler?`,
      `I don't understand. Can you compare ${topic} to something I know, like toys or ice cream?`,
      `Hmm, that's interesting! But what happens if ${topic} stops working?`
    ],
    professor: [
      `Interesting perspective. Could you elaborate on how recent research has impacted our understanding of ${topic}?`,
      `What's your position on the controversies surrounding ${topic} in the academic literature?`,
      `That's a fair overview, but how would you respond to critiques regarding the limitations of ${topic}?`
    ],
    historical: [
      `In my time, we had no concept of ${topic}. How has this knowledge evolved over the centuries?`,
      `How fascinating! How would you explain the connection between ${topic} and the basic scientific principles we established in my era?`,
      `If we had understood ${topic} in my time, how might history have unfolded differently?`
    ]
  };
  
  const personaQuestions = questions[persona as keyof typeof questions] || questions.child;
  return personaQuestions[Math.floor(Math.random() * personaQuestions.length)];
};
