
export const generateFeedback = (persona: string, score: number): string[] => {
  let feedback: string[] = [];
  
  if (score >= 90) {
    feedback.push("Your explanation was exceptional! You showed mastery of the topic.");
  } else if (score >= 80) {
    feedback.push("You provided a strong explanation with good clarity and depth.");
  } else if (score >= 70) {
    feedback.push("Your explanation was solid, though some concepts could use more clarity.");
  } else {
    feedback.push("You made a good effort, but your explanation needs more structure and clarity.");
  }
  
  switch (persona) {
    case 'child':
      feedback.push("You used language that was sometimes too complex for a 5-year-old.");
      feedback.push("Try using more analogies and relatable examples next time.");
      if (score < 80) {
        feedback.push("Remember that concrete examples work better than abstract concepts for young minds.");
      }
      break;
    case 'professor':
      feedback.push("Your technical depth was appreciated, though more citations would strengthen your explanation.");
      feedback.push("Consider addressing potential counterarguments to make your explanation more robust.");
      if (score < 80) {
        feedback.push("Try to connect your points more explicitly to established theory in the field.");
      }
      break;
    case 'historical':
      feedback.push("You provided good context, though connecting more to my era's knowledge would help bridge understanding.");
      feedback.push("Consider how concepts evolved through time to give better historical perspective.");
      if (score < 80) {
        feedback.push("Remember that explaining modern concepts requires establishing connections to foundational principles from the past.");
      }
      break;
  }
  
  feedback.push("Keep practicing explanations to different audiences to further refine your teaching skills!");
  
  return feedback;
};
